"""
═══════════════════════════════════════════════════════════════════════
  Redis-backed User Context Store — replaces the JSON file store
  in state.py when REDIS_URL is configured.

  Keys:  user:{user_id}:context   (hash with 24h TTL)
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger("state.redis_store")

USER_CONTEXT_TTL_SEC = 86400  # 24 hours


class RedisUserContextStore:
    """Thread-safe, multi-worker-safe user context store backed by Redis."""

    def __init__(self, redis_sync):
        self._r = redis_sync

    @staticmethod
    def _key(user_id: str) -> str:
        return f"user:{user_id}:context"

    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            raw = self._r.get(self._key(user_id))
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Redis get context failed for %s: %s", user_id, exc)
            return None

    def put(self, user_id: str, context: Dict[str, Any]) -> None:
        try:
            self._r.setex(
                self._key(user_id),
                USER_CONTEXT_TTL_SEC,
                json.dumps(context, ensure_ascii=False, default=str),
            )
        except Exception as exc:
            logger.warning("Redis put context failed for %s: %s", user_id, exc)

    def delete(self, user_id: str) -> None:
        try:
            self._r.delete(self._key(user_id))
        except Exception as exc:
            logger.warning("Redis delete context failed for %s: %s", user_id, exc)
