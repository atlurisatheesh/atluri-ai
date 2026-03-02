"""
═══════════════════════════════════════════════════════════════════════
  Centralized Redis connection pool for horizontal scaling.
  All modules import `get_redis()` from here.

  Env vars:
    REDIS_URL           – redis://host:port/db  (required for multi-worker)
    REDIS_MAX_CONNECTIONS – pool size (default: 50)
    REDIS_SOCKET_TIMEOUT – per-call timeout in seconds (default: 2)
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("redis_pool")

_pool: Optional[object] = None   # redis.asyncio.Redis
_sync_pool: Optional[object] = None  # redis.Redis


def _redis_url() -> str:
    return (os.getenv("REDIS_URL") or "").strip()


def is_redis_enabled() -> bool:
    return bool(_redis_url())


def get_redis():
    """Return an async Redis client backed by a shared connection pool.
    Returns None if REDIS_URL is not set (graceful degradation to local)."""
    global _pool
    if _pool is not None:
        return _pool
    url = _redis_url()
    if not url:
        return None
    try:
        import redis.asyncio as aioredis
        max_conn = max(10, int(os.getenv("REDIS_MAX_CONNECTIONS", "50")))
        socket_timeout = max(0.5, float(os.getenv("REDIS_SOCKET_TIMEOUT", "2")))
        _pool = aioredis.from_url(
            url,
            decode_responses=True,
            max_connections=max_conn,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_timeout,
        )
        logger.info("Redis async pool created: %s (max_conn=%d)", url.split("@")[-1], max_conn)
        return _pool
    except Exception as exc:
        logger.warning("Redis async pool creation failed: %s", exc)
        return None


def get_redis_sync():
    """Return a sync Redis client (for thread-locked code paths).
    Returns None if REDIS_URL is not set."""
    global _sync_pool
    if _sync_pool is not None:
        return _sync_pool
    url = _redis_url()
    if not url:
        return None
    try:
        import redis as sync_redis
        max_conn = max(10, int(os.getenv("REDIS_MAX_CONNECTIONS", "50")))
        socket_timeout = max(0.5, float(os.getenv("REDIS_SOCKET_TIMEOUT", "2")))
        _sync_pool = sync_redis.from_url(
            url,
            decode_responses=True,
            max_connections=max_conn,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_timeout,
        )
        logger.info("Redis sync pool created: %s (max_conn=%d)", url.split("@")[-1], max_conn)
        return _sync_pool
    except Exception as exc:
        logger.warning("Redis sync pool creation failed: %s", exc)
        return None


async def close_pools():
    """Graceful shutdown — call from lifespan."""
    global _pool, _sync_pool
    if _pool is not None:
        try:
            await _pool.close()
        except Exception:
            pass
        _pool = None
    if _sync_pool is not None:
        try:
            _sync_pool.close()
        except Exception:
            pass
        _sync_pool = None
