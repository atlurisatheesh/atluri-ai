from __future__ import annotations

import time
from threading import Lock


class SessionRegistry:
    def __init__(self):
        self._lock = Lock()
        self._sessions: dict[str, dict] = {}

    def register(self, session_id: str, session_engine, session_controller) -> None:
        with self._lock:
            self._sessions[session_id] = {
                "session_engine": session_engine,
                "session_controller": session_controller,
                "created_at": time.time(),
                "updated_at": time.time(),
                "active": True,
            }

    def touch(self, session_id: str) -> None:
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["updated_at"] = time.time()

    def mark_inactive(self, session_id: str) -> None:
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["active"] = False
                self._sessions[session_id]["updated_at"] = time.time()

    def get(self, session_id: str) -> dict | None:
        with self._lock:
            item = self._sessions.get(session_id)
            return dict(item) if item else None

    def cleanup_inactive(self, ttl_sec: float) -> int:
        now_ts = time.time()
        cutoff = now_ts - max(30.0, float(ttl_sec or 900.0))
        removed = 0
        with self._lock:
            for session_id, data in list(self._sessions.items()):
                if bool((data or {}).get("active", False)):
                    continue
                updated_at = float((data or {}).get("updated_at") or 0.0)
                if updated_at <= cutoff:
                    self._sessions.pop(session_id, None)
                    removed += 1
        return removed


session_registry = SessionRegistry()
