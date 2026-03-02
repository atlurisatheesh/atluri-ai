"""
Concurrency Stress Harness

Simulates multiple parallel voice sessions to stress test the ASR pipeline.

Test Scenarios:
1. N concurrent WebSocket connections
2. Burst audio uploads
3. Rapid question sequences
4. Mixed fast/slow speakers
5. Connection churn (connect/disconnect cycles)

Metrics:
- Latency under load (p50, p95, p99)
- Trigger accuracy under load
- Memory usage
- Error rates
- Connection success rate

Usage:
    # Run 10 concurrent sessions for 60 seconds
    python -m app.services.stress_harness --sessions 10 --duration 60
    
    # Burst test: 50 connections in 5 seconds
    python -m app.services.stress_harness --burst 50 --burst-window 5
"""

import asyncio
import logging
import time
import json
import uuid
import random
import statistics
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Callable, Awaitable
from enum import Enum
import websockets
from pathlib import Path

logger = logging.getLogger("stress_harness")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")


class TestScenario(str, Enum):
    """Stress test scenarios"""
    SUSTAINED_LOAD = "sustained_load"  # N sessions for T seconds
    BURST = "burst"  # Many connections at once
    CHURN = "churn"  # Rapid connect/disconnect
    MIXED_SPEED = "mixed_speed"  # Fast and slow speakers
    RAPID_QUESTIONS = "rapid_questions"  # Quick question sequences


@dataclass
class SessionMetrics:
    """Metrics for a single simulated session"""
    session_id: str
    connected: bool = False
    connect_time_ms: float = 0.0
    messages_sent: int = 0
    messages_received: int = 0
    questions_triggered: int = 0
    answers_received: int = 0
    errors: List[str] = field(default_factory=list)
    latencies_ms: List[float] = field(default_factory=list)
    start_time: float = field(default_factory=time.time)
    end_time: float = 0.0
    
    @property
    def duration_sec(self) -> float:
        return (self.end_time or time.time()) - self.start_time
    
    @property
    def avg_latency_ms(self) -> float:
        return statistics.mean(self.latencies_ms) if self.latencies_ms else 0.0
    
    @property
    def p95_latency_ms(self) -> float:
        if len(self.latencies_ms) < 2:
            return self.avg_latency_ms
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "connected": self.connected,
            "connect_time_ms": self.connect_time_ms,
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "questions_triggered": self.questions_triggered,
            "answers_received": self.answers_received,
            "errors": self.errors,
            "avg_latency_ms": self.avg_latency_ms,
            "p95_latency_ms": self.p95_latency_ms,
            "duration_sec": self.duration_sec,
        }


@dataclass
class StressTestReport:
    """Report from a stress test run"""
    scenario: str
    target_sessions: int
    duration_sec: float
    successful_connections: int = 0
    failed_connections: int = 0
    total_messages_sent: int = 0
    total_messages_received: int = 0
    total_questions_triggered: int = 0
    total_answers_received: int = 0
    total_errors: int = 0
    avg_latency_ms: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    sessions: List[SessionMetrics] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario": self.scenario,
            "target_sessions": self.target_sessions,
            "duration_sec": self.duration_sec,
            "successful_connections": self.successful_connections,
            "failed_connections": self.failed_connections,
            "total_messages_sent": self.total_messages_sent,
            "total_messages_received": self.total_messages_received,
            "total_questions_triggered": self.total_questions_triggered,
            "total_answers_received": self.total_answers_received,
            "total_errors": self.total_errors,
            "avg_latency_ms": self.avg_latency_ms,
            "p50_latency_ms": self.p50_latency_ms,
            "p95_latency_ms": self.p95_latency_ms,
            "p99_latency_ms": self.p99_latency_ms,
            "connection_success_rate": (
                self.successful_connections / self.target_sessions * 100
                if self.target_sessions > 0 else 0
            ),
        }


# Sample questions for testing
SAMPLE_QUESTIONS = [
    "What is your experience with leadership?",
    "Tell me about a time you handled conflict.",
    "How do you prioritize tasks under pressure?",
    "What are your strengths and weaknesses?",
    "Describe your management style.",
    "How do you handle feedback?",
    "What motivates you at work?",
    "Tell me about a challenging project.",
    "How do you build team culture?",
    "What's your approach to problem solving?",
]


class SimulatedSession:
    """Simulates a single voice session"""
    
    def __init__(
        self,
        ws_url: str,
        session_id: Optional[str] = None,
        speak_interval_sec: float = 3.0,
        speak_variance_sec: float = 1.0,
    ):
        self.ws_url = ws_url
        self.session_id = session_id or str(uuid.uuid4())
        self.speak_interval = speak_interval_sec
        self.speak_variance = speak_variance_sec
        self.metrics = SessionMetrics(session_id=self.session_id)
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._stop_event = asyncio.Event()
        self._pending_questions: Dict[str, float] = {}  # question_hash -> send_time
    
    async def connect(self) -> bool:
        """Connect to WebSocket server"""
        try:
            start = time.time()
            
            url = f"{self.ws_url}?session_id={self.session_id}&participant=candidate"
            self._ws = await asyncio.wait_for(
                websockets.connect(url),
                timeout=10.0,
            )
            
            self.metrics.connect_time_ms = (time.time() - start) * 1000
            self.metrics.connected = True
            logger.debug("Session %s connected in %.1fms", self.session_id, self.metrics.connect_time_ms)
            return True
            
        except Exception as e:
            self.metrics.errors.append(f"connect: {e}")
            logger.warning("Session %s connect failed: %s", self.session_id, e)
            return False
    
    async def disconnect(self):
        """Disconnect from WebSocket server"""
        self._stop_event.set()
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
        self.metrics.end_time = time.time()
    
    async def send_question(self, question: str):
        """Simulate sending a question via transcript"""
        if not self._ws or not self.metrics.connected:
            return
        
        try:
            # Simulate browser sending transcript
            question_hash = str(hash(question))[:16]
            self._pending_questions[question_hash] = time.time()
            
            # Send as simulated transcript message
            msg = json.dumps({
                "type": "transcript",
                "text": question,
                "is_final": True,
                "speech_final": True,
                "confidence": 0.92,
            })
            
            await self._ws.send(msg)
            self.metrics.messages_sent += 1
            
        except Exception as e:
            self.metrics.errors.append(f"send: {e}")
    
    async def receive_loop(self):
        """Receive messages from server"""
        if not self._ws:
            return
        
        try:
            async for message in self._ws:
                if self._stop_event.is_set():
                    break
                
                self.metrics.messages_received += 1
                
                try:
                    data = json.loads(message)
                    msg_type = data.get("type", "")
                    
                    if msg_type == "interviewer_question":
                        self.metrics.questions_triggered += 1
                        
                    elif msg_type in ("answer_chunk", "answer_partial"):
                        # Check latency if we have a pending question
                        if self._pending_questions:
                            oldest_send_time = min(self._pending_questions.values())
                            latency_ms = (time.time() - oldest_send_time) * 1000
                            self.metrics.latencies_ms.append(latency_ms)
                        
                    elif msg_type == "answer_complete":
                        self.metrics.answers_received += 1
                        # Clear pending questions
                        self._pending_questions.clear()
                        
                except json.JSONDecodeError:
                    pass
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            self.metrics.errors.append(f"receive: {e}")
    
    async def speak_loop(self, duration_sec: float):
        """Simulate speaking questions over time"""
        end_time = time.time() + duration_sec
        question_idx = 0
        
        while time.time() < end_time and not self._stop_event.is_set():
            # Pick a question
            question = SAMPLE_QUESTIONS[question_idx % len(SAMPLE_QUESTIONS)]
            question_idx += 1
            
            await self.send_question(question)
            
            # Wait before next question
            wait_time = self.speak_interval + random.uniform(-self.speak_variance, self.speak_variance)
            await asyncio.sleep(max(0.5, wait_time))
    
    async def run(self, duration_sec: float):
        """Run the full simulated session"""
        if not await self.connect():
            return self.metrics
        
        try:
            # Run receive and speak loops concurrently
            await asyncio.gather(
                self.receive_loop(),
                self.speak_loop(duration_sec),
            )
        finally:
            await self.disconnect()
        
        return self.metrics


class StressHarness:
    """
    Stress testing harness for the ASR pipeline.
    """
    
    def __init__(
        self,
        ws_url: str = "ws://localhost:9010/ws/voice",
        results_dir: Optional[str] = None,
    ):
        self.ws_url = ws_url
        self.results_dir = Path(results_dir or "backend/data/stress_tests")
    
    async def run_sustained_load(
        self,
        num_sessions: int,
        duration_sec: float,
        speak_interval_sec: float = 3.0,
    ) -> StressTestReport:
        """
        Run sustained load test with N concurrent sessions.
        
        Args:
            num_sessions: Number of concurrent sessions
            duration_sec: How long to run each session
            speak_interval_sec: Time between questions
            
        Returns:
            StressTestReport with results
        """
        logger.info("Starting sustained load test: %d sessions for %.1fs", num_sessions, duration_sec)
        
        # Create sessions
        sessions = [
            SimulatedSession(
                ws_url=self.ws_url,
                speak_interval_sec=speak_interval_sec,
                speak_variance_sec=speak_interval_sec * 0.3,
            )
            for _ in range(num_sessions)
        ]
        
        # Run all sessions concurrently
        start_time = time.time()
        results = await asyncio.gather(
            *[s.run(duration_sec) for s in sessions],
            return_exceptions=True,
        )
        total_duration = time.time() - start_time
        
        # Build report
        report = StressTestReport(
            scenario=TestScenario.SUSTAINED_LOAD.value,
            target_sessions=num_sessions,
            duration_sec=total_duration,
        )
        
        all_latencies = []
        for result in results:
            if isinstance(result, SessionMetrics):
                report.sessions.append(result)
                if result.connected:
                    report.successful_connections += 1
                else:
                    report.failed_connections += 1
                report.total_messages_sent += result.messages_sent
                report.total_messages_received += result.messages_received
                report.total_questions_triggered += result.questions_triggered
                report.total_answers_received += result.answers_received
                report.total_errors += len(result.errors)
                all_latencies.extend(result.latencies_ms)
            elif isinstance(result, Exception):
                report.failed_connections += 1
                report.total_errors += 1
        
        # Calculate latency percentiles
        if all_latencies:
            sorted_lat = sorted(all_latencies)
            report.avg_latency_ms = statistics.mean(sorted_lat)
            report.p50_latency_ms = sorted_lat[len(sorted_lat) // 2]
            report.p95_latency_ms = sorted_lat[int(len(sorted_lat) * 0.95)]
            report.p99_latency_ms = sorted_lat[int(len(sorted_lat) * 0.99)]
        
        # Save report
        await self._save_report(report)
        
        logger.info("Stress test complete: %d/%d connected, avg_latency=%.1fms, p95=%.1fms",
                   report.successful_connections, report.target_sessions,
                   report.avg_latency_ms, report.p95_latency_ms)
        
        return report
    
    async def run_burst(
        self,
        num_connections: int,
        burst_window_sec: float,
        hold_duration_sec: float = 10.0,
    ) -> StressTestReport:
        """
        Run burst test - many connections in a short window.
        
        Args:
            num_connections: Total connections to make
            burst_window_sec: Time window to establish all connections
            hold_duration_sec: How long to hold connections
            
        Returns:
            StressTestReport with results
        """
        logger.info("Starting burst test: %d connections in %.1fs window", num_connections, burst_window_sec)
        
        # Calculate connection interval
        interval = burst_window_sec / num_connections
        
        sessions = []
        tasks = []
        
        async def delayed_session(delay: float):
            await asyncio.sleep(delay)
            session = SimulatedSession(ws_url=self.ws_url)
            sessions.append(session)
            return await session.run(hold_duration_sec)
        
        # Stagger connection starts
        start_time = time.time()
        for i in range(num_connections):
            tasks.append(delayed_session(i * interval))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_duration = time.time() - start_time
        
        # Build report (same as sustained_load)
        report = StressTestReport(
            scenario=TestScenario.BURST.value,
            target_sessions=num_connections,
            duration_sec=total_duration,
        )
        
        for result in results:
            if isinstance(result, SessionMetrics):
                report.sessions.append(result)
                report.successful_connections += 1 if result.connected else 0
                report.failed_connections += 0 if result.connected else 1
        
        await self._save_report(report)
        
        return report
    
    async def run_churn(
        self,
        num_cycles: int,
        sessions_per_cycle: int,
        cycle_duration_sec: float,
    ) -> StressTestReport:
        """
        Run churn test - rapid connect/disconnect cycles.
        
        Args:
            num_cycles: Number of connect/disconnect cycles
            sessions_per_cycle: Sessions per cycle
            cycle_duration_sec: Duration of each cycle
            
        Returns:
            StressTestReport with results
        """
        logger.info("Starting churn test: %d cycles, %d sessions/cycle", num_cycles, sessions_per_cycle)
        
        all_sessions = []
        start_time = time.time()
        
        for cycle in range(num_cycles):
            logger.debug("Churn cycle %d/%d", cycle + 1, num_cycles)
            
            sessions = [
                SimulatedSession(ws_url=self.ws_url)
                for _ in range(sessions_per_cycle)
            ]
            
            results = await asyncio.gather(
                *[s.run(cycle_duration_sec) for s in sessions],
                return_exceptions=True,
            )
            
            for r in results:
                if isinstance(r, SessionMetrics):
                    all_sessions.append(r)
        
        total_duration = time.time() - start_time
        
        # Build report
        report = StressTestReport(
            scenario=TestScenario.CHURN.value,
            target_sessions=num_cycles * sessions_per_cycle,
            duration_sec=total_duration,
            sessions=all_sessions,
        )
        
        report.successful_connections = sum(1 for s in all_sessions if s.connected)
        report.failed_connections = len(all_sessions) - report.successful_connections
        
        await self._save_report(report)
        
        return report
    
    async def _save_report(self, report: StressTestReport):
        """Save report to file"""
        try:
            self.results_dir.mkdir(parents=True, exist_ok=True)
            timestamp = int(time.time())
            filepath = self.results_dir / f"stress_{report.scenario}_{timestamp}.json"
            
            await asyncio.to_thread(
                filepath.write_text,
                json.dumps(report.to_dict(), indent=2),
            )
            logger.info("Report saved to %s", filepath)
        except Exception as e:
            logger.warning("Failed to save report: %s", e)


# CLI entry point
async def main():
    """CLI entry point for stress testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ASR Pipeline Stress Harness")
    parser.add_argument("--url", default="ws://localhost:9010/ws/voice", help="WebSocket URL")
    parser.add_argument("--sessions", "-n", type=int, default=10, help="Number of concurrent sessions")
    parser.add_argument("--duration", "-d", type=float, default=60.0, help="Test duration in seconds")
    parser.add_argument("--burst", type=int, help="Run burst test with N connections")
    parser.add_argument("--burst-window", type=float, default=5.0, help="Burst window in seconds")
    parser.add_argument("--churn", action="store_true", help="Run churn test")
    parser.add_argument("--churn-cycles", type=int, default=10, help="Number of churn cycles")
    
    args = parser.parse_args()
    
    harness = StressHarness(ws_url=args.url)
    
    if args.burst:
        report = await harness.run_burst(
            num_connections=args.burst,
            burst_window_sec=args.burst_window,
            hold_duration_sec=args.duration,
        )
    elif args.churn:
        report = await harness.run_churn(
            num_cycles=args.churn_cycles,
            sessions_per_cycle=args.sessions,
            cycle_duration_sec=args.duration / args.churn_cycles,
        )
    else:
        report = await harness.run_sustained_load(
            num_sessions=args.sessions,
            duration_sec=args.duration,
        )
    
    print("\n" + "=" * 60)
    print("STRESS TEST REPORT")
    print("=" * 60)
    print(json.dumps(report.to_dict(), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
