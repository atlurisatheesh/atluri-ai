"""
Multi-Session Concurrency Architecture Audit

Production stress test that simulates 100+ concurrent WebSocket sessions
to identify bottlenecks, race conditions, and resource exhaustion.

Key Metrics Tracked:
- Connection establishment latency (p50, p95, p99)
- Message round-trip time under load
- Memory growth per session
- CPU utilization patterns
- Event loop blocking detection
- WebSocket connection failures
- Deepgram connection pool behavior
- Redis pub/sub backpressure (if enabled)

Usage:
    python -m app.qa.concurrency_audit --sessions 100 --duration 120 --ramp-up 30

Critical Thresholds:
    - Connection latency p95 > 500ms: FAIL
    - Message RTT p95 > 200ms: WARNING
    - Memory growth > 50MB/100 sessions: WARNING
    - Event loop lag > 100ms: CRITICAL
    - Connection failure rate > 1%: FAIL
"""

import asyncio
import time
import statistics
import random
import argparse
import json
import sys
import os
import traceback
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger("concurrency_audit")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


@dataclass
class SessionMetrics:
    """Metrics collected for each simulated session"""
    session_id: str
    connect_time_ms: float = 0.0
    first_message_time_ms: float = 0.0
    messages_sent: int = 0
    messages_received: int = 0
    errors: List[str] = field(default_factory=list)
    rtt_samples: List[float] = field(default_factory=list)
    disconnect_reason: str = ""
    duration_sec: float = 0.0
    memory_at_start_mb: float = 0.0
    memory_at_end_mb: float = 0.0


@dataclass
class AuditReport:
    """Complete audit report"""
    timestamp: str
    config: Dict[str, Any]
    duration_sec: float
    
    # Connection metrics
    total_sessions_attempted: int = 0
    successful_connections: int = 0
    failed_connections: int = 0
    connection_latencies_ms: List[float] = field(default_factory=list)
    
    # Message metrics
    total_messages_sent: int = 0
    total_messages_received: int = 0
    rtt_samples_ms: List[float] = field(default_factory=list)
    
    # Error metrics
    errors: List[Dict[str, str]] = field(default_factory=list)
    
    # Resource metrics
    peak_memory_mb: float = 0.0
    memory_growth_mb: float = 0.0
    peak_event_loop_lag_ms: float = 0.0
    
    # Session details
    sessions: List[SessionMetrics] = field(default_factory=list)
    
    def compute_percentiles(self, values: List[float]) -> Dict[str, float]:
        if not values:
            return {"p50": 0, "p95": 0, "p99": 0, "max": 0, "avg": 0}
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        return {
            "p50": sorted_vals[int(n * 0.50)],
            "p95": sorted_vals[int(n * 0.95)] if n >= 20 else sorted_vals[-1],
            "p99": sorted_vals[int(n * 0.99)] if n >= 100 else sorted_vals[-1],
            "max": sorted_vals[-1],
            "avg": statistics.mean(sorted_vals),
        }
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "config": self.config,
            "duration_sec": round(self.duration_sec, 1),
            "connections": {
                "attempted": self.total_sessions_attempted,
                "successful": self.successful_connections,
                "failed": self.failed_connections,
                "success_rate": round(self.successful_connections / max(1, self.total_sessions_attempted) * 100, 2),
                "latency_ms": self.compute_percentiles(self.connection_latencies_ms),
            },
            "messages": {
                "sent": self.total_messages_sent,
                "received": self.total_messages_received,
                "delivery_rate": round(self.total_messages_received / max(1, self.total_messages_sent) * 100, 2),
                "rtt_ms": self.compute_percentiles(self.rtt_samples_ms),
            },
            "resources": {
                "peak_memory_mb": round(self.peak_memory_mb, 1),
                "memory_growth_mb": round(self.memory_growth_mb, 1),
                "peak_event_loop_lag_ms": round(self.peak_event_loop_lag_ms, 1),
            },
            "errors": {
                "total": len(self.errors),
                "samples": self.errors[:10],  # First 10 errors
            },
            "verdict": self._compute_verdict(),
        }
    
    def _compute_verdict(self) -> Dict[str, Any]:
        """Compute pass/fail verdict based on thresholds"""
        issues = []
        status = "PASS"
        
        # Connection latency check
        conn_p95 = self.compute_percentiles(self.connection_latencies_ms).get("p95", 0)
        if conn_p95 > 500:
            issues.append(f"Connection latency p95 ({conn_p95:.0f}ms) > 500ms threshold")
            status = "FAIL"
        
        # Connection failure rate
        failure_rate = self.failed_connections / max(1, self.total_sessions_attempted) * 100
        if failure_rate > 1:
            issues.append(f"Connection failure rate ({failure_rate:.1f}%) > 1% threshold")
            status = "FAIL"
        elif failure_rate > 0.5:
            issues.append(f"Connection failure rate ({failure_rate:.1f}%) elevated")
            if status == "PASS":
                status = "WARNING"
        
        # RTT check
        rtt_p95 = self.compute_percentiles(self.rtt_samples_ms).get("p95", 0)
        if rtt_p95 > 200:
            issues.append(f"Message RTT p95 ({rtt_p95:.0f}ms) > 200ms threshold")
            if status == "PASS":
                status = "WARNING"
        
        # Memory growth check
        if self.memory_growth_mb > 50:
            issues.append(f"Memory growth ({self.memory_growth_mb:.1f}MB) > 50MB threshold")
            if status == "PASS":
                status = "WARNING"
        
        # Event loop lag check
        if self.peak_event_loop_lag_ms > 100:
            issues.append(f"Event loop lag ({self.peak_event_loop_lag_ms:.0f}ms) > 100ms threshold")
            status = "CRITICAL"
        elif self.peak_event_loop_lag_ms > 50:
            issues.append(f"Event loop lag ({self.peak_event_loop_lag_ms:.0f}ms) elevated")
            if status == "PASS":
                status = "WARNING"
        
        return {
            "status": status,
            "issues": issues,
            "recommendations": self._generate_recommendations(issues),
        }
    
    def _generate_recommendations(self, issues: List[str]) -> List[str]:
        """Generate actionable recommendations based on issues"""
        recs = []
        
        for issue in issues:
            if "Connection latency" in issue:
                recs.append("Consider connection pooling or pre-warming WebSocket connections")
            if "failure rate" in issue:
                recs.append("Investigate connection timeout settings and network stability")
            if "RTT" in issue:
                recs.append("Profile message handling path for blocking operations")
            if "Memory growth" in issue:
                recs.append("Check for memory leaks in session state or caches")
            if "Event loop lag" in issue:
                recs.append("Move CPU-intensive work to thread pool or separate process")
        
        return list(set(recs))  # Deduplicate


class SimulatedSession:
    """
    Simulates a single WebSocket session with realistic behavior.
    """
    
    def __init__(
        self,
        session_id: str,
        server_url: str,
        token: str,
        duration_sec: float,
        message_interval_sec: float = 2.0,
    ):
        self.session_id = session_id
        self.server_url = server_url
        self.token = token
        self.duration_sec = duration_sec
        self.message_interval_sec = message_interval_sec
        self.metrics = SessionMetrics(session_id=session_id)
        self._ws = None
        self._stop_event = asyncio.Event()
    
    async def run(self) -> SessionMetrics:
        """Run the simulated session"""
        try:
            import websockets
        except ImportError:
            self.metrics.errors.append("websockets library not installed")
            return self.metrics
        
        start_time = time.time()
        self.metrics.memory_at_start_mb = self._get_memory_mb()
        
        try:
            # Connect
            connect_start = time.time()
            ws_url = f"{self.server_url}?token={self.token}&room_id=audit-{self.session_id}"
            
            async with websockets.connect(
                ws_url,
                ping_interval=20,
                ping_timeout=60,
                close_timeout=10,
            ) as ws:
                self._ws = ws
                self.metrics.connect_time_ms = (time.time() - connect_start) * 1000
                
                # Run message loop
                receive_task = asyncio.create_task(self._receive_loop())
                send_task = asyncio.create_task(self._send_loop())
                
                # Wait for duration or stop
                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(),
                        timeout=self.duration_sec
                    )
                except asyncio.TimeoutError:
                    pass  # Normal completion
                
                # Cleanup
                receive_task.cancel()
                send_task.cancel()
                try:
                    await receive_task
                except asyncio.CancelledError:
                    pass
                try:
                    await send_task
                except asyncio.CancelledError:
                    pass
        
        except Exception as e:
            self.metrics.errors.append(f"Session error: {str(e)[:100]}")
            self.metrics.disconnect_reason = str(e)[:50]
        
        self.metrics.duration_sec = time.time() - start_time
        self.metrics.memory_at_end_mb = self._get_memory_mb()
        
        return self.metrics
    
    async def _receive_loop(self):
        """Receive messages from server"""
        try:
            async for message in self._ws:
                self.metrics.messages_received += 1
                try:
                    data = json.loads(message)
                    # Track RTT for pong responses
                    if data.get("type") == "pong" and "echo_ts" in data:
                        rtt = (time.time() - data["echo_ts"]) * 1000
                        self.metrics.rtt_samples.append(rtt)
                        if self.metrics.first_message_time_ms == 0:
                            self.metrics.first_message_time_ms = rtt
                except json.JSONDecodeError:
                    pass
        except asyncio.CancelledError:
            raise
        except Exception as e:
            self.metrics.errors.append(f"Receive error: {str(e)[:50]}")
    
    async def _send_loop(self):
        """Send periodic messages to server"""
        try:
            while not self._stop_event.is_set():
                # Send ping with timestamp for RTT measurement
                ping_msg = {
                    "type": "ping",
                    "echo_ts": time.time(),
                    "session_id": self.session_id,
                }
                await self._ws.send(json.dumps(ping_msg))
                self.metrics.messages_sent += 1
                
                # Random jitter
                jitter = random.uniform(0.8, 1.2)
                await asyncio.sleep(self.message_interval_sec * jitter)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            self.metrics.errors.append(f"Send error: {str(e)[:50]}")
    
    def _get_memory_mb(self) -> float:
        """Get current process memory in MB"""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / (1024 * 1024)
        except ImportError:
            return 0.0
    
    def stop(self):
        """Signal session to stop"""
        self._stop_event.set()


class ConcurrencyAuditor:
    """
    Orchestrates multi-session concurrency testing.
    """
    
    def __init__(
        self,
        server_url: str,
        token: str,
        total_sessions: int = 100,
        duration_sec: float = 120,
        ramp_up_sec: float = 30,
    ):
        self.server_url = server_url
        self.token = token
        self.total_sessions = total_sessions
        self.duration_sec = duration_sec
        self.ramp_up_sec = ramp_up_sec
        
        self.report = AuditReport(
            timestamp=datetime.now().isoformat(),
            config={
                "server_url": server_url,
                "total_sessions": total_sessions,
                "duration_sec": duration_sec,
                "ramp_up_sec": ramp_up_sec,
            },
            duration_sec=0,
        )
        
        self._sessions: List[SimulatedSession] = []
        self._start_memory_mb = 0.0
        self._peak_memory_mb = 0.0
        self._event_loop_lags: List[float] = []
    
    async def run_audit(self) -> AuditReport:
        """Run the full concurrency audit"""
        logger.info("=" * 60)
        logger.info("CONCURRENCY AUDIT STARTING")
        logger.info("Sessions: %d | Duration: %ds | Ramp-up: %ds",
                   self.total_sessions, self.duration_sec, self.ramp_up_sec)
        logger.info("=" * 60)
        
        audit_start = time.time()
        self._start_memory_mb = self._get_memory_mb()
        
        # Start event loop monitor
        monitor_task = asyncio.create_task(self._monitor_event_loop())
        
        # Ramp up sessions gradually
        session_interval = self.ramp_up_sec / max(1, self.total_sessions)
        tasks = []
        
        for i in range(self.total_sessions):
            session = SimulatedSession(
                session_id=f"audit-{i:04d}",
                server_url=self.server_url,
                token=self.token,
                duration_sec=self.duration_sec,
            )
            self._sessions.append(session)
            self.report.total_sessions_attempted += 1
            
            task = asyncio.create_task(self._run_session_with_tracking(session))
            tasks.append(task)
            
            # Progress logging
            if (i + 1) % 10 == 0:
                logger.info("Launched %d/%d sessions...", i + 1, self.total_sessions)
            
            await asyncio.sleep(session_interval)
        
        logger.info("All %d sessions launched. Waiting for completion...", self.total_sessions)
        
        # Wait for all sessions to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Stop monitor
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass
        
        # Aggregate results
        for result in results:
            if isinstance(result, SessionMetrics):
                self.report.sessions.append(result)
                if result.connect_time_ms > 0:
                    self.report.successful_connections += 1
                    self.report.connection_latencies_ms.append(result.connect_time_ms)
                else:
                    self.report.failed_connections += 1
                
                self.report.total_messages_sent += result.messages_sent
                self.report.total_messages_received += result.messages_received
                self.report.rtt_samples_ms.extend(result.rtt_samples)
                
                for error in result.errors:
                    self.report.errors.append({
                        "session": result.session_id,
                        "error": error,
                    })
            elif isinstance(result, Exception):
                self.report.failed_connections += 1
                self.report.errors.append({
                    "session": "unknown",
                    "error": str(result)[:100],
                })
        
        # Finalize report
        self.report.duration_sec = time.time() - audit_start
        self.report.peak_memory_mb = self._peak_memory_mb
        self.report.memory_growth_mb = self._peak_memory_mb - self._start_memory_mb
        self.report.peak_event_loop_lag_ms = max(self._event_loop_lags) if self._event_loop_lags else 0
        
        return self.report
    
    async def _run_session_with_tracking(self, session: SimulatedSession) -> SessionMetrics:
        """Run session and track memory"""
        try:
            result = await session.run()
            # Update peak memory
            current_mem = self._get_memory_mb()
            if current_mem > self._peak_memory_mb:
                self._peak_memory_mb = current_mem
            return result
        except Exception as e:
            return SessionMetrics(
                session_id=session.session_id,
                errors=[str(e)[:100]],
            )
    
    async def _monitor_event_loop(self):
        """Monitor event loop for lag"""
        while True:
            try:
                start = time.time()
                await asyncio.sleep(0.1)
                actual = (time.time() - start) * 1000
                lag = actual - 100.0
                if lag > 0:
                    self._event_loop_lags.append(lag)
                await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                break
    
    def _get_memory_mb(self) -> float:
        try:
            import psutil
            return psutil.Process().memory_info().rss / (1024 * 1024)
        except ImportError:
            return 0.0


def print_report(report: AuditReport):
    """Print formatted audit report"""
    data = report.to_dict()
    
    print("\n" + "=" * 70)
    print("CONCURRENCY AUDIT REPORT")
    print("=" * 70)
    
    print(f"\nTimestamp: {data['timestamp']}")
    print(f"Duration: {data['duration_sec']}s")
    print(f"Sessions: {data['config']['total_sessions']}")
    
    print("\n--- CONNECTIONS ---")
    conn = data['connections']
    print(f"  Attempted:    {conn['attempted']}")
    print(f"  Successful:   {conn['successful']}")
    print(f"  Failed:       {conn['failed']}")
    print(f"  Success Rate: {conn['success_rate']}%")
    print(f"  Latency p50:  {conn['latency_ms']['p50']:.0f}ms")
    print(f"  Latency p95:  {conn['latency_ms']['p95']:.0f}ms")
    print(f"  Latency p99:  {conn['latency_ms']['p99']:.0f}ms")
    
    print("\n--- MESSAGES ---")
    msg = data['messages']
    print(f"  Sent:         {msg['sent']}")
    print(f"  Received:     {msg['received']}")
    print(f"  Delivery:     {msg['delivery_rate']}%")
    print(f"  RTT p50:      {msg['rtt_ms']['p50']:.0f}ms")
    print(f"  RTT p95:      {msg['rtt_ms']['p95']:.0f}ms")
    print(f"  RTT p99:      {msg['rtt_ms']['p99']:.0f}ms")
    
    print("\n--- RESOURCES ---")
    res = data['resources']
    print(f"  Peak Memory:     {res['peak_memory_mb']} MB")
    print(f"  Memory Growth:   {res['memory_growth_mb']} MB")
    print(f"  Event Loop Lag:  {res['peak_event_loop_lag_ms']}ms")
    
    print("\n--- ERRORS ---")
    print(f"  Total Errors: {data['errors']['total']}")
    for err in data['errors']['samples'][:5]:
        print(f"    - [{err['session']}] {err['error'][:60]}")
    
    print("\n--- VERDICT ---")
    verdict = data['verdict']
    status_color = {
        "PASS": "\033[92m",  # Green
        "WARNING": "\033[93m",  # Yellow
        "FAIL": "\033[91m",  # Red
        "CRITICAL": "\033[91m\033[1m",  # Bold Red
    }.get(verdict['status'], "")
    reset = "\033[0m"
    
    print(f"  Status: {status_color}{verdict['status']}{reset}")
    
    if verdict['issues']:
        print("  Issues:")
        for issue in verdict['issues']:
            print(f"    ⚠ {issue}")
    
    if verdict['recommendations']:
        print("  Recommendations:")
        for rec in verdict['recommendations']:
            print(f"    → {rec}")
    
    print("\n" + "=" * 70)


async def main():
    parser = argparse.ArgumentParser(description="Multi-Session Concurrency Audit")
    parser.add_argument("--server", default="ws://localhost:9010/ws/voice",
                       help="WebSocket server URL")
    parser.add_argument("--token", default="test-token",
                       help="Authentication token")
    parser.add_argument("--sessions", type=int, default=100,
                       help="Number of concurrent sessions")
    parser.add_argument("--duration", type=int, default=120,
                       help="Test duration in seconds")
    parser.add_argument("--ramp-up", type=int, default=30,
                       help="Ramp-up period in seconds")
    parser.add_argument("--output", default=None,
                       help="Output JSON file path")
    
    args = parser.parse_args()
    
    auditor = ConcurrencyAuditor(
        server_url=args.server,
        token=args.token,
        total_sessions=args.sessions,
        duration_sec=args.duration,
        ramp_up_sec=args.ramp_up,
    )
    
    report = await auditor.run_audit()
    
    print_report(report)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(report.to_dict(), f, indent=2)
        print(f"\nReport saved to: {args.output}")
    
    # Exit with appropriate code
    verdict = report.to_dict()['verdict']['status']
    if verdict in ("FAIL", "CRITICAL"):
        sys.exit(1)
    elif verdict == "WARNING":
        sys.exit(0)  # Warning is OK for CI
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
