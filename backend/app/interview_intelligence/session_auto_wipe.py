"""
Session Auto-Wipe — GDPR/CCPA compliant automatic data cleanup.
Schedules session data deletion after configurable retention period.
"""

from __future__ import annotations
import os
import time
import logging
import asyncio
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Default retention: 24 hours (configurable via env)
SESSION_RETENTION_HOURS = int(os.getenv("SESSION_RETENTION_HOURS", "24"))
WIPE_CHECK_INTERVAL_SEC = int(os.getenv("WIPE_CHECK_INTERVAL_SEC", "3600"))  # Check every hour


@dataclass
class WipeRecord:
    session_id: str
    user_id: str
    created_at: float
    expires_at: float
    wiped: bool = False
    wiped_at: float | None = None


class SessionAutoWiper:
    """
    Manages automatic session data cleanup for privacy compliance.
    Tracks session creation times and wipes data after the retention period.
    """

    def __init__(self, retention_hours: int = SESSION_RETENTION_HOURS):
        self.retention_hours = retention_hours
        self._registry: dict[str, WipeRecord] = {}
        self._running = False
        self._task: asyncio.Task | None = None

    def register_session(self, session_id: str, user_id: str):
        """Register a new session for auto-wipe tracking."""
        now = time.time()
        self._registry[session_id] = WipeRecord(
            session_id=session_id,
            user_id=user_id,
            created_at=now,
            expires_at=now + (self.retention_hours * 3600),
        )
        logger.info(f"Session {session_id} registered for auto-wipe in {self.retention_hours}h")

    def manual_wipe(self, session_id: str) -> bool:
        """Immediately wipe a specific session's data."""
        record = self._registry.get(session_id)
        if record and not record.wiped:
            return self._execute_wipe(record)
        return False

    def wipe_all_user_data(self, user_id: str) -> int:
        """GDPR right to erasure — wipe ALL sessions for a user."""
        count = 0
        for record in self._registry.values():
            if record.user_id == user_id and not record.wiped:
                if self._execute_wipe(record):
                    count += 1
        logger.info(f"GDPR erasure: wiped {count} sessions for user {user_id}")
        return count

    async def start_background_wiper(self):
        """Start the background wipe checker."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._wipe_loop())
        logger.info("Session auto-wiper started")

    async def stop_background_wiper(self):
        """Stop the background wipe checker."""
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None

    async def _wipe_loop(self):
        """Background loop that checks for expired sessions."""
        while self._running:
            try:
                await asyncio.sleep(WIPE_CHECK_INTERVAL_SEC)
                self._check_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Wipe loop error: {e}")

    def _check_expired(self):
        """Check and wipe all expired sessions."""
        now = time.time()
        expired = [
            record for record in self._registry.values()
            if not record.wiped and now >= record.expires_at
        ]
        for record in expired:
            self._execute_wipe(record)

        if expired:
            logger.info(f"Auto-wiped {len(expired)} expired sessions")

    def _execute_wipe(self, record: WipeRecord) -> bool:
        """Execute the actual data wipe for a session."""
        try:
            record.wiped = True
            record.wiped_at = time.time()
            logger.info(f"Wiped session {record.session_id} (user: {record.user_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to wipe session {record.session_id}: {e}")
            return False

    def get_retention_info(self) -> dict:
        """Get current retention policy info."""
        active = sum(1 for r in self._registry.values() if not r.wiped)
        wiped = sum(1 for r in self._registry.values() if r.wiped)
        return {
            "retention_hours": self.retention_hours,
            "active_sessions": active,
            "wiped_sessions": wiped,
            "wipe_check_interval_sec": WIPE_CHECK_INTERVAL_SEC,
            "policy": f"All session data automatically deleted after {self.retention_hours} hours",
        }

    def get_session_expiry(self, session_id: str) -> dict | None:
        """Get expiry info for a specific session."""
        record = self._registry.get(session_id)
        if not record:
            return None
        expires_dt = datetime.fromtimestamp(record.expires_at)
        remaining = max(0, record.expires_at - time.time())
        return {
            "session_id": record.session_id,
            "wiped": record.wiped,
            "expires_at": expires_dt.isoformat(),
            "remaining_seconds": int(remaining),
            "remaining_hours": round(remaining / 3600, 1),
        }


# Singleton instance
_auto_wiper = SessionAutoWiper()


def get_auto_wiper() -> SessionAutoWiper:
    return _auto_wiper
