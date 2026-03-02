"""
Token Budget-Aware Speculative Generation Controller

Prevents cost explosion from speculative pre-generation by:
- Tracking token usage per session
- Setting per-session and global budgets
- Throttling pregen when approaching limits
- Measuring pregen hit rate to optimize spend

Why This Matters:
- Speculative generation can waste 60-80% of tokens if not controlled
- OpenAI costs scale linearly with tokens
- A session with 50 utterances × 50 tokens pregen × 80% waste = 2000 wasted tokens
- At scale, this becomes $$$

This controller ensures:
1. Each session has a token budget
2. Pregen is disabled when budget exhausted
3. Hit rate tracking shows ROI of speculation
4. Real-time alerts on unusual usage
"""

import logging
import time
import asyncio
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Callable, Any
from enum import Enum
import os
import json
from datetime import datetime

logger = logging.getLogger("token_budget")


class BudgetStatus(str, Enum):
    """Budget consumption status"""
    HEALTHY = "healthy"  # < 50% used
    WARNING = "warning"  # 50-80% used
    CRITICAL = "critical"  # > 80% used
    EXHAUSTED = "exhausted"  # 100% used


@dataclass
class TokenUsageRecord:
    """Single pregen usage record"""
    timestamp: float
    tokens_generated: int
    tokens_used: int  # Actually used in response
    hit: bool  # Was pregen cache hit?
    hit_ratio: float  # How much of pregen was useful
    transcript_preview: str  # For debugging
    
    @property
    def tokens_wasted(self) -> int:
        return self.tokens_generated - self.tokens_used


@dataclass
class SessionBudget:
    """Token budget for a single session"""
    session_id: str
    max_tokens: int = 5000  # Per-session limit
    tokens_spent: int = 0
    tokens_wasted: int = 0
    pregen_attempts: int = 0
    pregen_hits: int = 0
    pregen_misses: int = 0
    usage_records: List[TokenUsageRecord] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    throttled: bool = False
    
    @property
    def tokens_remaining(self) -> int:
        return max(0, self.max_tokens - self.tokens_spent)
    
    @property
    def usage_percent(self) -> float:
        return (self.tokens_spent / self.max_tokens * 100) if self.max_tokens > 0 else 100
    
    @property
    def hit_rate(self) -> float:
        total = self.pregen_hits + self.pregen_misses
        return self.pregen_hits / total if total > 0 else 0.0
    
    @property
    def efficiency(self) -> float:
        """Ratio of used vs generated tokens"""
        total_generated = sum(r.tokens_generated for r in self.usage_records)
        total_used = sum(r.tokens_used for r in self.usage_records)
        return total_used / total_generated if total_generated > 0 else 0.0
    
    @property
    def status(self) -> BudgetStatus:
        pct = self.usage_percent
        if pct >= 100:
            return BudgetStatus.EXHAUSTED
        elif pct >= 80:
            return BudgetStatus.CRITICAL
        elif pct >= 50:
            return BudgetStatus.WARNING
        return BudgetStatus.HEALTHY
    
    def add_record(self, record: TokenUsageRecord):
        self.usage_records.append(record)
        # Keep last 100 records
        if len(self.usage_records) > 100:
            self.usage_records.pop(0)


class TokenBudgetController:
    """
    Controls token spending for speculative pre-generation.
    
    Usage:
        controller = TokenBudgetController()
        
        # Check before pregen
        if controller.can_pregen(session_id):
            # Do speculative generation
            tokens = generate_speculative(...)
            controller.record_pregen(session_id, tokens_generated=50)
        
        # After response, record actual usage
        controller.record_hit(session_id, tokens_used=30)  # or record_miss()
    """
    
    # Configuration
    DEFAULT_SESSION_BUDGET = int(os.getenv("PREGEN_SESSION_BUDGET", "5000"))
    GLOBAL_HOURLY_BUDGET = int(os.getenv("PREGEN_HOURLY_BUDGET", "100000"))
    MIN_HIT_RATE_THRESHOLD = float(os.getenv("PREGEN_MIN_HIT_RATE", "0.20"))  # Disable if < 20% hits
    EFFICIENCY_THRESHOLD = float(os.getenv("PREGEN_MIN_EFFICIENCY", "0.30"))  # Alert if < 30%
    
    def __init__(
        self,
        session_budget: int = None,
        hourly_budget: int = None,
    ):
        self._session_budget = session_budget or self.DEFAULT_SESSION_BUDGET
        self._hourly_budget = hourly_budget or self.GLOBAL_HOURLY_BUDGET
        
        self._sessions: Dict[str, SessionBudget] = {}
        self._global_tokens_this_hour: int = 0
        self._hour_start: float = time.time()
        
        # Callbacks for alerts
        self._alert_callbacks: List[Callable] = []
        
        self._lock = asyncio.Lock()
    
    def register_alert_callback(self, callback: Callable[[str, Dict], Any]):
        """Register callback for budget alerts"""
        self._alert_callbacks.append(callback)
    
    async def _emit_alert(self, alert_type: str, data: dict):
        """Emit alert to registered callbacks"""
        for callback in self._alert_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(alert_type, data)
                else:
                    callback(alert_type, data)
            except Exception as e:
                logger.warning("Alert callback error: %s", e)
    
    def _get_or_create_session(self, session_id: str) -> SessionBudget:
        """Get or create session budget"""
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionBudget(
                session_id=session_id,
                max_tokens=self._session_budget,
            )
        return self._sessions[session_id]
    
    def _check_hourly_reset(self):
        """Reset hourly counter if hour passed"""
        now = time.time()
        if now - self._hour_start >= 3600:  # 1 hour
            self._global_tokens_this_hour = 0
            self._hour_start = now
    
    async def can_pregen(self, session_id: str, tokens_requested: int = 50) -> bool:
        """
        Check if speculative pregen is allowed for this session.
        
        Returns False if:
        - Session budget exhausted
        - Global hourly budget exhausted
        - Session hit rate too low
        - Session efficiency too low
        """
        async with self._lock:
            self._check_hourly_reset()
            
            session = self._get_or_create_session(session_id)
            
            # Check session budget
            if session.tokens_remaining < tokens_requested:
                logger.debug("PREGEN_BLOCKED | session=%s | reason=session_budget_exhausted", session_id)
                session.throttled = True
                return False
            
            # Check global budget
            if self._global_tokens_this_hour + tokens_requested > self._hourly_budget:
                logger.warning("PREGEN_BLOCKED | session=%s | reason=global_hourly_budget", session_id)
                await self._emit_alert("global_budget_warning", {
                    "tokens_this_hour": self._global_tokens_this_hour,
                    "hourly_budget": self._hourly_budget,
                })
                return False
            
            # Check hit rate (after 5 attempts)
            if session.pregen_attempts >= 5:
                if session.hit_rate < self.MIN_HIT_RATE_THRESHOLD:
                    logger.info("PREGEN_BLOCKED | session=%s | reason=low_hit_rate | hit_rate=%.2f",
                               session_id, session.hit_rate)
                    session.throttled = True
                    return False
            
            # Check efficiency (after 10 records)
            if len(session.usage_records) >= 10:
                if session.efficiency < self.EFFICIENCY_THRESHOLD:
                    logger.info("PREGEN_BLOCKED | session=%s | reason=low_efficiency | efficiency=%.2f",
                               session_id, session.efficiency)
                    await self._emit_alert("low_efficiency_alert", {
                        "session_id": session_id,
                        "efficiency": session.efficiency,
                        "threshold": self.EFFICIENCY_THRESHOLD,
                    })
            
            return True
    
    async def record_pregen(
        self,
        session_id: str,
        tokens_generated: int,
        transcript_preview: str = "",
    ) -> TokenUsageRecord:
        """
        Record a speculative generation attempt.
        
        Call this immediately after generating speculative tokens.
        Record will be updated when hit/miss is determined.
        """
        async with self._lock:
            session = self._get_or_create_session(session_id)
            
            # Debit tokens
            session.tokens_spent += tokens_generated
            session.pregen_attempts += 1
            session.last_activity = time.time()
            
            # Update global
            self._global_tokens_this_hour += tokens_generated
            
            # Create record (hit/tokens_used will be updated later)
            record = TokenUsageRecord(
                timestamp=time.time(),
                tokens_generated=tokens_generated,
                tokens_used=0,
                hit=False,
                hit_ratio=0.0,
                transcript_preview=transcript_preview[:50],
            )
            session.add_record(record)
            
            # Check for budget warnings
            if session.status == BudgetStatus.CRITICAL:
                logger.warning("PREGEN_BUDGET_CRITICAL | session=%s | usage=%.1f%%",
                             session_id, session.usage_percent)
                await self._emit_alert("session_budget_critical", {
                    "session_id": session_id,
                    "usage_percent": session.usage_percent,
                    "tokens_remaining": session.tokens_remaining,
                })
            
            return record
    
    async def record_hit(
        self,
        session_id: str,
        tokens_used: int,
        similarity_score: float = 1.0,
    ):
        """
        Record a successful pregen hit.
        
        Call this when speculative generation was used in the response.
        """
        async with self._lock:
            session = self._get_or_create_session(session_id)
            session.pregen_hits += 1
            
            # Update last record
            if session.usage_records:
                record = session.usage_records[-1]
                record.hit = True
                record.tokens_used = tokens_used
                record.hit_ratio = tokens_used / record.tokens_generated if record.tokens_generated > 0 else 0
            
            logger.debug("PREGEN_HIT | session=%s | tokens_used=%d | similarity=%.2f",
                        session_id, tokens_used, similarity_score)
    
    async def record_miss(self, session_id: str):
        """
        Record a pregen miss.
        
        Call this when speculative generation was NOT used.
        """
        async with self._lock:
            session = self._get_or_create_session(session_id)
            session.pregen_misses += 1
            
            # Update wasted tokens
            if session.usage_records:
                record = session.usage_records[-1]
                session.tokens_wasted += record.tokens_generated
            
            logger.debug("PREGEN_MISS | session=%s | total_misses=%d",
                        session_id, session.pregen_misses)
    
    def get_session_status(self, session_id: str) -> Optional[dict]:
        """Get budget status for a session"""
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        return {
            "session_id": session_id,
            "status": session.status.value,
            "tokens_spent": session.tokens_spent,
            "tokens_remaining": session.tokens_remaining,
            "tokens_wasted": session.tokens_wasted,
            "usage_percent": round(session.usage_percent, 1),
            "pregen_attempts": session.pregen_attempts,
            "pregen_hits": session.pregen_hits,
            "pregen_misses": session.pregen_misses,
            "hit_rate": round(session.hit_rate, 3),
            "efficiency": round(session.efficiency, 3),
            "throttled": session.throttled,
        }
    
    def get_global_status(self) -> dict:
        """Get global budget status"""
        self._check_hourly_reset()
        
        total_sessions = len(self._sessions)
        active_sessions = sum(1 for s in self._sessions.values() 
                             if time.time() - s.last_activity < 300)  # Active in last 5 min
        
        total_spent = sum(s.tokens_spent for s in self._sessions.values())
        total_hits = sum(s.pregen_hits for s in self._sessions.values())
        total_misses = sum(s.pregen_misses for s in self._sessions.values())
        total_attempts = total_hits + total_misses
        
        return {
            "global_tokens_this_hour": self._global_tokens_this_hour,
            "hourly_budget": self._hourly_budget,
            "hourly_usage_percent": round(self._global_tokens_this_hour / self._hourly_budget * 100, 1),
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "total_tokens_spent": total_spent,
            "global_hit_rate": round(total_hits / total_attempts, 3) if total_attempts > 0 else 0,
            "throttled_sessions": sum(1 for s in self._sessions.values() if s.throttled),
        }
    
    def export_analytics(self) -> dict:
        """Export full analytics for reporting"""
        return {
            "timestamp": datetime.now().isoformat(),
            "global": self.get_global_status(),
            "sessions": {
                sid: self.get_session_status(sid)
                for sid in self._sessions
            }
        }
    
    async def cleanup_stale_sessions(self, max_age_sec: float = 3600):
        """Remove sessions inactive for max_age_sec"""
        async with self._lock:
            now = time.time()
            stale = [
                sid for sid, session in self._sessions.items()
                if now - session.last_activity > max_age_sec
            ]
            for sid in stale:
                del self._sessions[sid]
            
            if stale:
                logger.info("BUDGET_CLEANUP | removed=%d stale sessions", len(stale))


# Singleton instance
_controller: Optional[TokenBudgetController] = None


def get_token_budget_controller() -> TokenBudgetController:
    """Get the singleton token budget controller"""
    global _controller
    if _controller is None:
        _controller = TokenBudgetController()
    return _controller


# CLI for testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        controller = TokenBudgetController(session_budget=500, hourly_budget=1000)
        session = "test-session-1"
        
        # Simulate pregen attempts
        for i in range(10):
            if await controller.can_pregen(session, tokens_requested=50):
                await controller.record_pregen(session, tokens_generated=50, transcript_preview=f"test {i}")
                
                # Simulate 30% hit rate
                if i % 3 == 0:
                    await controller.record_hit(session, tokens_used=30)
                else:
                    await controller.record_miss(session)
        
        print("Session status:")
        print(json.dumps(controller.get_session_status(session), indent=2))
        print("\nGlobal status:")
        print(json.dumps(controller.get_global_status(), indent=2))
    
    asyncio.run(test())
