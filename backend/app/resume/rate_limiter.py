"""
ARIA API Rate Limiting & Versioning Middleware.

Per-user rate limiting for ARIA endpoints:
  - Standard tier: 30 req/min
  - Premium tier: 120 req/min
  - Burst allowance: 5 extra in any 10-sec window

API versioning via header: X-ARIA-Version (default: v2)
"""

import asyncio
import logging
import time
from collections import defaultdict
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("aria.middleware")

# ═══════════════════════════════════════════════════════════
# RATE LIMITER — Token Bucket per user
# ═══════════════════════════════════════════════════════════

class _TokenBucket:
    """Simple token bucket rate limiter."""
    __slots__ = ("capacity", "tokens", "refill_rate", "last_refill")

    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = time.monotonic()

    def consume(self, n: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= n:
            self.tokens -= n
            return True
        return False

    @property
    def remaining(self) -> int:
        now = time.monotonic()
        elapsed = now - self.last_refill
        return int(min(self.capacity, self.tokens + elapsed * self.refill_rate))


class ARIARateLimiter:
    """Per-user token-bucket rate limiter for ARIA endpoints."""

    def __init__(
        self,
        standard_rpm: int = 30,
        premium_rpm: int = 120,
        burst_extra: int = 5,
    ):
        self.standard_rpm = standard_rpm
        self.premium_rpm = premium_rpm
        self.burst_extra = burst_extra
        self._buckets: dict[str, _TokenBucket] = {}
        self._lock = asyncio.Lock()

    def _get_bucket(self, user_id: str, is_premium: bool = False) -> _TokenBucket:
        if user_id not in self._buckets:
            capacity = self.premium_rpm if is_premium else self.standard_rpm
            capacity += self.burst_extra
            refill_rate = capacity / 60.0  # tokens per second
            self._buckets[user_id] = _TokenBucket(capacity, refill_rate)
        return self._buckets[user_id]

    async def check(self, user_id: str, is_premium: bool = False) -> tuple[bool, int, int]:
        """Check and consume a token. Returns (allowed, remaining, limit)."""
        async with self._lock:
            bucket = self._get_bucket(user_id, is_premium)
            allowed = bucket.consume(1)
            limit = self.premium_rpm if is_premium else self.standard_rpm
            return allowed, bucket.remaining, limit

    def cleanup(self, max_age_sec: float = 300):
        """Remove stale buckets."""
        now = time.monotonic()
        stale = [uid for uid, b in self._buckets.items() if now - b.last_refill > max_age_sec]
        for uid in stale:
            del self._buckets[uid]


# Global instance
rate_limiter = ARIARateLimiter()


# ═══════════════════════════════════════════════════════════
# MIDDLEWARE
# ═══════════════════════════════════════════════════════════

class ARIARateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware that applies rate limiting to /api/resume/ endpoints."""

    PROTECTED_PREFIXES = ("/api/resume/aria/", "/api/resume/v2/")

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Only rate-limit ARIA endpoints
        if not any(path.startswith(p) for p in self.PROTECTED_PREFIXES):
            return await call_next(request)

        # Extract user ID from auth header
        user_id = self._extract_user_id(request)
        if not user_id:
            # No auth — let the route handler reject it
            return await call_next(request)

        # Check rate limit
        allowed, remaining, limit = await rate_limiter.check(user_id)

        if not allowed:
            logger.warning(f"Rate limit exceeded for user {user_id[:8]}... on {path}")
            return Response(
                content='{"detail": "Rate limit exceeded. Please wait before making more requests."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": "10",
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        # Add API version header
        response.headers["X-ARIA-Version"] = "v2"

        return response

    @staticmethod
    def _extract_user_id(request: Request) -> str | None:
        """Extract user ID from auth header without full auth validation."""
        auth = request.headers.get("authorization", "")
        if not auth:
            return None
        # Use a hash of the token as the rate limit key
        import hashlib
        token = auth.replace("Bearer ", "").strip()
        if not token:
            return None
        return hashlib.sha256(token.encode()).hexdigest()[:16]
