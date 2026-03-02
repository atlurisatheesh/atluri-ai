"""
Real-Time Observability Dashboard

Production-grade metrics and monitoring for the voice copilot system.

This is NOT UI polish. This is infrastructure.

Provides:
- VAD tier distribution per session
- Confidence distribution histograms
- Trigger type analysis
- Time-to-trigger latency (p50, p95, p99)
- Token budget consumption
- Semantic similarity hit rates
- Concurrent session tracking
- Event loop health

Usage:
    # Get dashboard singleton
    dashboard = get_observability_dashboard()
    
    # Record metrics
    dashboard.record_vad_event(session_id, quality="good", confidence=0.87)
    dashboard.record_trigger(session_id, trigger_type="VAD_TRIGGER", latency_ms=450)
    
    # Get dashboard snapshot
    snapshot = await dashboard.get_snapshot()

API Integration:
    Add to your FastAPI router:
    
    @router.get("/api/observability/dashboard")
    async def get_dashboard():
        return await get_observability_dashboard().get_snapshot()
"""

import logging
import asyncio
import time
import statistics
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any
from collections import defaultdict
from datetime import datetime
import os
import json

logger = logging.getLogger("observability")


@dataclass
class SessionMetrics:
    """Metrics for a single session"""
    session_id: str
    start_time: float
    end_time: Optional[float] = None
    
    # VAD metrics
    vad_quality_history: List[str] = field(default_factory=list)
    quality_changes: int = 0
    
    # Confidence metrics
    confidence_samples: List[float] = field(default_factory=list)
    
    # Trigger metrics
    triggers: List[Dict[str, Any]] = field(default_factory=list)
    trigger_latencies_ms: List[float] = field(default_factory=list)
    
    # Token metrics
    tokens_spent: int = 0
    pregen_hits: int = 0
    pregen_misses: int = 0
    
    # Transcript metrics
    total_utterances: int = 0
    total_words: int = 0
    
    def add_confidence(self, conf: float):
        self.confidence_samples.append(conf)
        if len(self.confidence_samples) > 100:
            self.confidence_samples.pop(0)
    
    def add_latency(self, latency_ms: float):
        self.trigger_latencies_ms.append(latency_ms)
        if len(self.trigger_latencies_ms) > 50:
            self.trigger_latencies_ms.pop(0)


@dataclass
class GlobalMetrics:
    """Global system metrics"""
    # Session counts
    total_sessions_started: int = 0
    active_sessions: int = 0
    peak_concurrent_sessions: int = 0
    
    # Error tracking
    errors: List[Dict[str, Any]] = field(default_factory=list)
    
    # System health
    last_health_check: float = 0.0
    event_loop_lag_ms: float = 0.0
    
    # Aggregate stats
    total_triggers: int = 0
    total_tokens_spent: int = 0
    total_pregen_hits: int = 0
    total_pregen_misses: int = 0


class ObservabilityDashboard:
    """
    Central observability dashboard for real-time monitoring.
    
    Designed for:
    - Production debugging
    - Performance optimization
    - Cost tracking
    - SLA monitoring
    """
    
    # Configuration
    MAX_SESSIONS_TRACKED = int(os.getenv("OBS_MAX_SESSIONS", "500"))
    SESSION_TTL_SEC = float(os.getenv("OBS_SESSION_TTL", "3600"))  # 1 hour
    HEALTH_CHECK_INTERVAL_SEC = 5.0
    
    def __init__(self):
        self._sessions: Dict[str, SessionMetrics] = {}
        self._global = GlobalMetrics()
        self._lock = asyncio.Lock()
        self._start_time = time.time()
        self._health_task: Optional[asyncio.Task] = None
        
        # Aggregated histograms
        self._confidence_histogram: Dict[str, int] = defaultdict(int)  # "0.6-0.7": count
        self._latency_histogram: Dict[str, int] = defaultdict(int)  # "100-200ms": count
        self._trigger_type_counts: Dict[str, int] = defaultdict(int)
        self._quality_distribution: Dict[str, int] = defaultdict(int)
    
    def _get_or_create_session(self, session_id: str) -> SessionMetrics:
        """Get or create session metrics"""
        if session_id not in self._sessions:
            # Evict oldest if at capacity
            if len(self._sessions) >= self.MAX_SESSIONS_TRACKED:
                oldest_id = min(self._sessions.keys(),
                              key=lambda k: self._sessions[k].start_time)
                del self._sessions[oldest_id]
            
            self._sessions[session_id] = SessionMetrics(
                session_id=session_id,
                start_time=time.time(),
            )
            self._global.total_sessions_started += 1
            self._global.active_sessions += 1
            self._global.peak_concurrent_sessions = max(
                self._global.peak_concurrent_sessions,
                self._global.active_sessions
            )
        return self._sessions[session_id]
    
    async def record_session_start(self, session_id: str):
        """Record session start"""
        async with self._lock:
            self._get_or_create_session(session_id)
            logger.debug("OBS session started | session=%s", session_id)
    
    async def record_session_end(self, session_id: str):
        """Record session end"""
        async with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id].end_time = time.time()
                self._global.active_sessions = max(0, self._global.active_sessions - 1)
    
    async def record_vad_event(
        self,
        session_id: str,
        quality: str,
        confidence: float,
        is_tier_change: bool = False,
    ):
        """Record VAD-related event"""
        async with self._lock:
            session = self._get_or_create_session(session_id)
            
            # Track quality
            session.vad_quality_history.append(quality)
            if len(session.vad_quality_history) > 20:
                session.vad_quality_history.pop(0)
            
            self._quality_distribution[quality] += 1
            
            if is_tier_change:
                session.quality_changes += 1
            
            # Track confidence
            if confidence > 0:
                session.add_confidence(confidence)
                bucket = f"{int(confidence * 10) / 10:.1f}-{int(confidence * 10) / 10 + 0.1:.1f}"
                self._confidence_histogram[bucket] += 1
    
    async def record_trigger(
        self,
        session_id: str,
        trigger_type: str,
        latency_ms: float,
        confidence: float = 0.0,
        word_count: int = 0,
        text_preview: str = "",
    ):
        """Record trigger event"""
        async with self._lock:
            session = self._get_or_create_session(session_id)
            
            # Record trigger details
            trigger = {
                "ts": time.time(),
                "type": trigger_type,
                "latency_ms": latency_ms,
                "confidence": confidence,
                "word_count": word_count,
                "text_preview": text_preview[:50],
            }
            session.triggers.append(trigger)
            if len(session.triggers) > 50:
                session.triggers.pop(0)
            
            session.add_latency(latency_ms)
            
            # Global tracking
            self._global.total_triggers += 1
            self._trigger_type_counts[trigger_type] += 1
            
            # Latency histogram
            if latency_ms < 200:
                bucket = "0-200ms"
            elif latency_ms < 500:
                bucket = "200-500ms"
            elif latency_ms < 1000:
                bucket = "500-1000ms"
            elif latency_ms < 2000:
                bucket = "1000-2000ms"
            else:
                bucket = ">2000ms"
            self._latency_histogram[bucket] += 1
    
    async def record_pregen_result(
        self,
        session_id: str,
        hit: bool,
        tokens_generated: int = 0,
        tokens_used: int = 0,
        similarity_score: float = 0.0,
    ):
        """Record pre-generation result"""
        async with self._lock:
            session = self._get_or_create_session(session_id)
            
            if hit:
                session.pregen_hits += 1
                self._global.total_pregen_hits += 1
            else:
                session.pregen_misses += 1
                self._global.total_pregen_misses += 1
            
            session.tokens_spent += tokens_generated
            self._global.total_tokens_spent += tokens_generated
    
    async def record_token_usage(self, session_id: str, tokens: int):
        """Record token usage"""
        async with self._lock:
            session = self._get_or_create_session(session_id)
            session.tokens_spent += tokens
            self._global.total_tokens_spent += tokens
    
    async def record_error(self, session_id: str, error_type: str, error_msg: str):
        """Record error for tracking"""
        async with self._lock:
            self._global.errors.append({
                "ts": time.time(),
                "session_id": session_id,
                "type": error_type,
                "message": error_msg[:200],
            })
            # Keep last 100 errors
            if len(self._global.errors) > 100:
                self._global.errors.pop(0)
    
    async def record_utterance(self, session_id: str, word_count: int):
        """Record utterance metrics"""
        async with self._lock:
            session = self._get_or_create_session(session_id)
            session.total_utterances += 1
            session.total_words += word_count
    
    async def _check_event_loop_health(self):
        """Check event loop lag"""
        while True:
            try:
                start = time.time()
                await asyncio.sleep(0.1)
                actual_delay = (time.time() - start) * 1000
                expected_delay = 100.0
                
                self._global.event_loop_lag_ms = actual_delay - expected_delay
                self._global.last_health_check = time.time()
                
                if self._global.event_loop_lag_ms > 100:
                    logger.warning("Event loop lag detected: %.1fms", self._global.event_loop_lag_ms)
                
                await asyncio.sleep(self.HEALTH_CHECK_INTERVAL_SEC)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Health check error: %s", e)
                await asyncio.sleep(5)
    
    def start_health_monitoring(self):
        """Start background health monitoring"""
        if self._health_task is None or self._health_task.done():
            self._health_task = asyncio.create_task(self._check_event_loop_health())
    
    def _calculate_percentiles(self, values: List[float]) -> Dict[str, float]:
        """Calculate p50, p95, p99 percentiles"""
        if not values:
            return {"p50": 0, "p95": 0, "p99": 0}
        
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        
        return {
            "p50": sorted_vals[int(n * 0.50)] if n > 0 else 0,
            "p95": sorted_vals[int(n * 0.95)] if n >= 20 else sorted_vals[-1],
            "p99": sorted_vals[int(n * 0.99)] if n >= 100 else sorted_vals[-1],
        }
    
    async def get_snapshot(self) -> Dict[str, Any]:
        """
        Get complete dashboard snapshot.
        
        Returns all metrics needed for production monitoring.
        """
        async with self._lock:
            now = time.time()
            uptime_sec = now - self._start_time
            
            # Aggregate latencies from all sessions
            all_latencies = []
            for session in self._sessions.values():
                all_latencies.extend(session.trigger_latencies_ms)
            
            # Aggregate confidences
            all_confidences = []
            for session in self._sessions.values():
                all_confidences.extend(session.confidence_samples)
            
            # Pregen hit rate
            total_pregen = self._global.total_pregen_hits + self._global.total_pregen_misses
            pregen_hit_rate = self._global.total_pregen_hits / total_pregen if total_pregen > 0 else 0
            
            # Recent errors (last 10)
            recent_errors = self._global.errors[-10:] if self._global.errors else []
            
            return {
                "timestamp": datetime.now().isoformat(),
                "uptime_seconds": round(uptime_sec, 1),
                
                # Session overview
                "sessions": {
                    "total_started": self._global.total_sessions_started,
                    "currently_active": self._global.active_sessions,
                    "peak_concurrent": self._global.peak_concurrent_sessions,
                },
                
                # VAD quality distribution
                "vad_quality": {
                    "distribution": dict(self._quality_distribution),
                    "total_samples": sum(self._quality_distribution.values()),
                },
                
                # Confidence analysis
                "confidence": {
                    "histogram": dict(sorted(self._confidence_histogram.items())),
                    "avg": round(statistics.mean(all_confidences), 3) if all_confidences else 0,
                    "std": round(statistics.stdev(all_confidences), 3) if len(all_confidences) > 1 else 0,
                },
                
                # Trigger analysis
                "triggers": {
                    "total": self._global.total_triggers,
                    "by_type": dict(self._trigger_type_counts),
                    "latency": {
                        "histogram": dict(self._latency_histogram),
                        "percentiles": self._calculate_percentiles(all_latencies),
                        "avg_ms": round(statistics.mean(all_latencies), 1) if all_latencies else 0,
                    },
                },
                
                # Pre-generation metrics
                "pregen": {
                    "total_attempts": total_pregen,
                    "hits": self._global.total_pregen_hits,
                    "misses": self._global.total_pregen_misses,
                    "hit_rate": round(pregen_hit_rate, 3),
                },
                
                # Token budget
                "tokens": {
                    "total_spent": self._global.total_tokens_spent,
                    "avg_per_session": round(
                        self._global.total_tokens_spent / max(1, self._global.total_sessions_started), 1
                    ),
                },
                
                # System health
                "health": {
                    "event_loop_lag_ms": round(self._global.event_loop_lag_ms, 1),
                    "last_check": self._global.last_health_check,
                    "status": "healthy" if self._global.event_loop_lag_ms < 50 else (
                        "degraded" if self._global.event_loop_lag_ms < 200 else "unhealthy"
                    ),
                },
                
                # Recent errors
                "errors": {
                    "total": len(self._global.errors),
                    "recent": recent_errors,
                },
                
                # Per-session details (most active sessions)
                "active_sessions": self._get_active_session_summaries(),
            }
    
    def _get_active_session_summaries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get summaries of most active sessions"""
        # Sort by number of triggers (most active first)
        active = [
            s for s in self._sessions.values()
            if s.end_time is None
        ]
        active.sort(key=lambda s: len(s.triggers), reverse=True)
        
        summaries = []
        for session in active[:limit]:
            latency_percentiles = self._calculate_percentiles(session.trigger_latencies_ms)
            summaries.append({
                "session_id": session.session_id,
                "duration_sec": round(time.time() - session.start_time, 1),
                "utterances": session.total_utterances,
                "triggers": len(session.triggers),
                "quality_changes": session.quality_changes,
                "current_quality": session.vad_quality_history[-1] if session.vad_quality_history else "unknown",
                "avg_confidence": round(
                    statistics.mean(session.confidence_samples), 3
                ) if session.confidence_samples else 0,
                "latency_p95_ms": round(latency_percentiles["p95"], 1),
                "tokens_spent": session.tokens_spent,
                "pregen_hit_rate": round(
                    session.pregen_hits / max(1, session.pregen_hits + session.pregen_misses), 3
                ),
            })
        
        return summaries
    
    async def get_session_detail(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed metrics for a specific session"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None
            
            return {
                "session_id": session_id,
                "start_time": session.start_time,
                "end_time": session.end_time,
                "duration_sec": (session.end_time or time.time()) - session.start_time,
                "vad_quality_history": session.vad_quality_history,
                "quality_changes": session.quality_changes,
                "confidence_samples": session.confidence_samples[-20:],  # Last 20
                "avg_confidence": round(
                    statistics.mean(session.confidence_samples), 3
                ) if session.confidence_samples else 0,
                "triggers": session.triggers[-20:],  # Last 20
                "latency_percentiles": self._calculate_percentiles(session.trigger_latencies_ms),
                "tokens_spent": session.tokens_spent,
                "pregen_hits": session.pregen_hits,
                "pregen_misses": session.pregen_misses,
                "total_utterances": session.total_utterances,
                "total_words": session.total_words,
            }
    
    async def cleanup_stale_sessions(self, max_age_sec: float = None):
        """Remove sessions older than max_age_sec"""
        max_age = max_age_sec or self.SESSION_TTL_SEC
        now = time.time()
        
        async with self._lock:
            stale = [
                sid for sid, session in self._sessions.items()
                if (session.end_time and now - session.end_time > max_age) or
                   (not session.end_time and now - session.start_time > max_age * 2)
            ]
            for sid in stale:
                del self._sessions[sid]
            
            if stale:
                logger.info("OBS cleanup | removed=%d stale sessions", len(stale))


# Singleton
_dashboard: Optional[ObservabilityDashboard] = None


def get_observability_dashboard() -> ObservabilityDashboard:
    """Get singleton observability dashboard"""
    global _dashboard
    if _dashboard is None:
        _dashboard = ObservabilityDashboard()
    return _dashboard


# FastAPI router integration
def create_observability_router():
    """Create FastAPI router for observability endpoints"""
    from fastapi import APIRouter
    
    obs_router = APIRouter(prefix="/api/observability", tags=["observability"])
    
    @obs_router.get("/dashboard")
    async def get_dashboard():
        """Get full dashboard snapshot"""
        return await get_observability_dashboard().get_snapshot()
    
    @obs_router.get("/session/{session_id}")
    async def get_session(session_id: str):
        """Get detailed metrics for a session"""
        detail = await get_observability_dashboard().get_session_detail(session_id)
        if detail is None:
            return {"error": "Session not found"}
        return detail
    
    @obs_router.get("/health")
    async def get_health():
        """Quick health check"""
        dashboard = get_observability_dashboard()
        snapshot = await dashboard.get_snapshot()
        return {
            "status": snapshot["health"]["status"],
            "event_loop_lag_ms": snapshot["health"]["event_loop_lag_ms"],
            "active_sessions": snapshot["sessions"]["currently_active"],
            "total_triggers": snapshot["triggers"]["total"],
        }
    
    return obs_router


# CLI test
if __name__ == "__main__":
    import asyncio
    import random
    
    async def test():
        dashboard = ObservabilityDashboard()
        
        # Simulate some sessions
        for i in range(5):
            session_id = f"test-session-{i}"
            await dashboard.record_session_start(session_id)
            
            # Simulate triggers
            for j in range(random.randint(5, 15)):
                await dashboard.record_vad_event(
                    session_id,
                    quality=random.choice(["excellent", "good", "fair", "poor"]),
                    confidence=random.uniform(0.65, 0.98),
                )
                await dashboard.record_trigger(
                    session_id,
                    trigger_type=random.choice(["VAD_TRIGGER", "FINAL_TRANSCRIPT", "SILENCE"]),
                    latency_ms=random.uniform(100, 1500),
                    confidence=random.uniform(0.7, 0.95),
                )
                await dashboard.record_pregen_result(
                    session_id,
                    hit=random.random() > 0.4,
                    tokens_generated=random.randint(30, 80),
                )
            
            await dashboard.record_session_end(session_id)
        
        # Keep some active
        await dashboard.record_session_start("active-session-1")
        await dashboard.record_session_start("active-session-2")
        
        snapshot = await dashboard.get_snapshot()
        print(json.dumps(snapshot, indent=2, default=str))
    
    asyncio.run(test())
