"""
═══════════════════════════════════════════════════════════════════════
  Redis-backed Session Registry — drop-in replacement for the
  in-memory SessionRegistry when running multi-worker.

  Keys:   session:{session_id}   (hash with TTL)
  Index:  session:index           (sorted set by updated_at)
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import json
import logging
import time
from typing import Optional

from core.redis_pool import get_redis_sync, is_redis_enabled

logger = logging.getLogger("session.redis_registry")

SESSION_TTL_SEC = 3600  # 1 hour


class RedisSessionRegistry:
    """Thread-safe, multi-worker-safe session registry backed by Redis."""

    def _r(self):
        return get_redis_sync()

    @staticmethod
    def _key(session_id: str) -> str:
        return f"session:{session_id}"

    def register(self, session_id: str, session_engine, session_controller) -> None:
        r = self._r()
        if r is None:
            return
        now = time.time()
        data = {
            "created_at": str(now),
            "updated_at": str(now),
            "active": "1",
            "engine_class": type(session_engine).__name__ if session_engine else "",
            "controller_class": type(session_controller).__name__ if session_controller else "",
        }
        try:
            pipe = r.pipeline()
            pipe.hset(self._key(session_id), mapping=data)
            pipe.expire(self._key(session_id), SESSION_TTL_SEC)
            pipe.zadd("session:index", {session_id: now})
            pipe.execute()
        except Exception as exc:
            logger.warning("Redis register failed for %s: %s", session_id, exc)

    def touch(self, session_id: str) -> None:
        r = self._r()
        if r is None:
            return
        now = time.time()
        try:
            pipe = r.pipeline()
            pipe.hset(self._key(session_id), "updated_at", str(now))
            pipe.expire(self._key(session_id), SESSION_TTL_SEC)
            pipe.zadd("session:index", {session_id: now})
            pipe.execute()
        except Exception as exc:
            logger.warning("Redis touch failed for %s: %s", session_id, exc)

    def mark_inactive(self, session_id: str) -> None:
        r = self._r()
        if r is None:
            return
        try:
            pipe = r.pipeline()
            pipe.hset(self._key(session_id), mapping={
                "active": "0",
                "updated_at": str(time.time()),
            })
            pipe.expire(self._key(session_id), SESSION_TTL_SEC)
            pipe.execute()
        except Exception as exc:
            logger.warning("Redis mark_inactive failed for %s: %s", session_id, exc)

    def get(self, session_id: str) -> Optional[dict]:
        r = self._r()
        if r is None:
            return None
        try:
            data = r.hgetall(self._key(session_id))
            if not data:
                return None
            return {
                "created_at": float(data.get("created_at", 0)),
                "updated_at": float(data.get("updated_at", 0)),
                "active": data.get("active") == "1",
                "session_engine": None,  # can't serialize engine objects
                "session_controller": None,
            }
        except Exception as exc:
            logger.warning("Redis get failed for %s: %s", session_id, exc)
            return None

    def cleanup_inactive(self, ttl_sec: float) -> int:
        r = self._r()
        if r is None:
            return 0
        cutoff = time.time() - max(30.0, float(ttl_sec or 900.0))
        removed = 0
        try:
            stale = r.zrangebyscore("session:index", "-inf", str(cutoff))
            for session_id in stale:
                data = r.hgetall(self._key(session_id))
                if not data:
                    r.zrem("session:index", session_id)
                    removed += 1
                    continue
                if data.get("active") == "0":
                    pipe = r.pipeline()
                    pipe.delete(self._key(session_id))
                    pipe.zrem("session:index", session_id)
                    pipe.execute()
                    removed += 1
        except Exception as exc:
            logger.warning("Redis cleanup failed: %s", exc)
        return removed

    def count_active(self) -> int:
        """Count active sessions (approximate for monitoring)."""
        r = self._r()
        if r is None:
            return 0
        try:
            return r.zcard("session:index")
        except Exception:
            return 0
