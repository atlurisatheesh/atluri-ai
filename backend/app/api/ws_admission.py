"""
═══════════════════════════════════════════════════════════════════════
  WebSocket Admission Control — connection queuing & rate limiting.

  Prevents the server from being overwhelmed by too many concurrent
  WebSocket connections. Excess connections are queued with a timeout
  rather than being rejected immediately.

  Env vars:
    WS_MAX_CONCURRENT    – hard cap on simultaneous WS sessions (default: 100)
    WS_QUEUE_MAX_WAIT    – max seconds to wait in queue   (default: 10)
    WS_QUEUE_SIZE        – max pending queue depth         (default: 200)
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Optional

logger = logging.getLogger("ws_admission")

MAX_CONCURRENT = max(10, int(os.getenv("WS_MAX_CONCURRENT", "100")))
QUEUE_MAX_WAIT_SEC = max(1.0, float(os.getenv("WS_QUEUE_MAX_WAIT", "10")))
QUEUE_SIZE = max(10, int(os.getenv("WS_QUEUE_SIZE", "200")))


class AdmissionController:
    """Semaphore + waiting queue for WS connections."""

    def __init__(
        self,
        max_concurrent: int = MAX_CONCURRENT,
        queue_max_wait: float = QUEUE_MAX_WAIT_SEC,
        queue_size: int = QUEUE_SIZE,
    ):
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._max_concurrent = max_concurrent
        self._queue_max_wait = queue_max_wait
        self._queue_size = queue_size
        self._active = 0
        self._queued = 0
        self._total_admitted = 0
        self._total_rejected = 0
        self._total_timeout = 0
        self._lock = asyncio.Lock()

    @property
    def active_connections(self) -> int:
        return self._active

    @property
    def queued_connections(self) -> int:
        return self._queued

    def stats(self) -> dict:
        return {
            "max_concurrent": self._max_concurrent,
            "active": self._active,
            "queued": self._queued,
            "total_admitted": self._total_admitted,
            "total_rejected": self._total_rejected,
            "total_timeout": self._total_timeout,
        }

    async def acquire(self) -> bool:
        """Try to acquire a slot. Returns True on success, False if rejected/timed out."""
        async with self._lock:
            if self._queued >= self._queue_size:
                self._total_rejected += 1
                logger.warning(
                    "WS admission REJECTED: queue full (%d/%d active, %d queued)",
                    self._active, self._max_concurrent, self._queued,
                )
                return False
            self._queued += 1

        try:
            acquired = await asyncio.wait_for(
                self._semaphore.acquire(),
                timeout=self._queue_max_wait,
            )
        except asyncio.TimeoutError:
            async with self._lock:
                self._queued -= 1
                self._total_timeout += 1
            logger.warning(
                "WS admission TIMEOUT after %.1fs (%d/%d active)",
                self._queue_max_wait, self._active, self._max_concurrent,
            )
            return False

        async with self._lock:
            self._queued -= 1
            self._active += 1
            self._total_admitted += 1

        return True

    async def release(self) -> None:
        """Release a slot when a WS connection closes."""
        async with self._lock:
            self._active = max(0, self._active - 1)
        self._semaphore.release()


# ─── Singleton ────────────────────────────────────────────────────────
_admission: Optional[AdmissionController] = None


def get_admission_controller() -> AdmissionController:
    global _admission
    if _admission is None:
        _admission = AdmissionController()
        logger.info(
            "WS Admission Controller: max_concurrent=%d queue_size=%d queue_wait=%.1fs",
            _admission._max_concurrent, _admission._queue_size, _admission._queue_max_wait,
        )
    return _admission
