"""
Session Snapshot Service — Reconnection State Preservation

Captures full session state before disconnect so that a reconnecting client
can resume exactly where it left off with zero visible interruption.

Architecture:
    1. Periodically snapshots session state in-memory (+ optional Redis)
    2. On disconnect, snapshot is frozen
    3. On reconnect (same session_id), snapshot is restored
    4. Client receives a "session_restored" event with missed data

State Preserved:
    - transcript_buffer (all text so far)
    - current question
    - turn count & turn state
    - active engines state
    - pregen cache status
    - coaching tips emitted
    - room membership
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("session_snapshot")

# Try Redis, fall back to in-memory
try:
    from core.redis_pool import get_redis
    _REDIS_AVAILABLE = True
except Exception:
    _REDIS_AVAILABLE = False


@dataclass
class SessionSnapshot:
    """Complete session state for reconnection."""
    session_id: str
    room_id: str = ""
    transcript_buffer: str = ""
    current_question: str = ""
    turn_count: int = 0
    difficulty_level: int = 2
    assist_intensity: int = 2
    role: str = "general"
    participant: str = "candidate"
    last_answer_suggestion: str = ""
    coaching_emitted_turn_ids: list = field(default_factory=list)
    active_question: str = ""
    partial_answer: str = ""
    is_streaming: bool = False
    answer_language: str = "english"
    company: str = ""
    position: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "room_id": self.room_id,
            "transcript_buffer": self.transcript_buffer,
            "current_question": self.current_question,
            "turn_count": self.turn_count,
            "difficulty_level": self.difficulty_level,
            "assist_intensity": self.assist_intensity,
            "role": self.role,
            "participant": self.participant,
            "last_answer_suggestion": self.last_answer_suggestion,
            "coaching_emitted_turn_ids": list(self.coaching_emitted_turn_ids),
            "active_question": self.active_question,
            "partial_answer": self.partial_answer,
            "is_streaming": self.is_streaming,
            "answer_language": self.answer_language,
            "company": self.company,
            "position": self.position,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "SessionSnapshot":
        return cls(
            session_id=str(data.get("session_id", "")),
            room_id=str(data.get("room_id", "")),
            transcript_buffer=str(data.get("transcript_buffer", "")),
            current_question=str(data.get("current_question", "")),
            turn_count=int(data.get("turn_count", 0)),
            difficulty_level=int(data.get("difficulty_level", 2)),
            assist_intensity=int(data.get("assist_intensity", 2)),
            role=str(data.get("role", "general")),
            participant=str(data.get("participant", "candidate")),
            last_answer_suggestion=str(data.get("last_answer_suggestion", "")),
            coaching_emitted_turn_ids=list(data.get("coaching_emitted_turn_ids", [])),
            active_question=str(data.get("active_question", "")),
            partial_answer=str(data.get("partial_answer", "")),
            is_streaming=bool(data.get("is_streaming", False)),
            answer_language=str(data.get("answer_language", "english")),
            company=str(data.get("company", "")),
            position=str(data.get("position", "")),
            created_at=float(data.get("created_at", time.time())),
            updated_at=float(data.get("updated_at", time.time())),
        )


class SessionSnapshotStore:
    """In-memory session snapshot store with optional Redis backing."""

    SNAPSHOT_TTL_SEC = 300  # 5 minutes — enough for reconnection window
    MAX_SNAPSHOTS = 500  # Prevent memory leak

    def __init__(self):
        self._snapshots: dict[str, SessionSnapshot] = {}
        self._lock = asyncio.Lock()

    async def save(self, snapshot: SessionSnapshot) -> None:
        """Save or update a session snapshot."""
        snapshot.updated_at = time.time()
        async with self._lock:
            self._snapshots[snapshot.session_id] = snapshot
            # Evict old entries if over limit
            if len(self._snapshots) > self.MAX_SNAPSHOTS:
                await self._evict_oldest()

        # Optionally persist to Redis for multi-instance deployments
        if _REDIS_AVAILABLE:
            try:
                import json
                redis = get_redis()
                if redis:
                    key = f"session_snapshot:{snapshot.session_id}"
                    await redis.set(key, json.dumps(snapshot.to_dict()), ex=self.SNAPSHOT_TTL_SEC)
            except Exception as e:
                logger.debug("Redis snapshot save failed (non-fatal): %s", e)

    async def get(self, session_id: str) -> Optional[SessionSnapshot]:
        """Retrieve a session snapshot for reconnection."""
        async with self._lock:
            snapshot = self._snapshots.get(session_id)
            if snapshot:
                age = time.time() - snapshot.updated_at
                if age <= self.SNAPSHOT_TTL_SEC:
                    return snapshot
                # Expired
                self._snapshots.pop(session_id, None)

        # Try Redis fallback
        if _REDIS_AVAILABLE:
            try:
                import json
                redis = get_redis()
                if redis:
                    key = f"session_snapshot:{session_id}"
                    data = await redis.get(key)
                    if data:
                        return SessionSnapshot.from_dict(json.loads(data))
            except Exception as e:
                logger.debug("Redis snapshot get failed (non-fatal): %s", e)

        return None

    async def remove(self, session_id: str) -> None:
        """Remove a snapshot (session ended cleanly)."""
        async with self._lock:
            self._snapshots.pop(session_id, None)

        if _REDIS_AVAILABLE:
            try:
                redis = get_redis()
                if redis:
                    await redis.delete(f"session_snapshot:{session_id}")
            except Exception:
                pass

    async def _evict_oldest(self) -> None:
        """Evict oldest snapshots to stay under MAX_SNAPSHOTS."""
        if len(self._snapshots) <= self.MAX_SNAPSHOTS:
            return
        sorted_keys = sorted(
            self._snapshots.keys(),
            key=lambda k: self._snapshots[k].updated_at,
        )
        evict_count = len(self._snapshots) - self.MAX_SNAPSHOTS + 10
        for key in sorted_keys[:evict_count]:
            self._snapshots.pop(key, None)


# Singleton
_snapshot_store: Optional[SessionSnapshotStore] = None


def get_snapshot_store() -> SessionSnapshotStore:
    global _snapshot_store
    if _snapshot_store is None:
        _snapshot_store = SessionSnapshotStore()
    return _snapshot_store
