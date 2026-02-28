from __future__ import annotations

import asyncio
from dataclasses import dataclass
import json
import os
import time
from typing import Protocol


@dataclass
class RoomState:
    active_question: str = ""
    partial_answer: str = ""
    is_streaming: bool = False
    assist_intensity: int = 2
    updated_at: float = 0.0


class RoomStateStore(Protocol):
    async def get_state(self, room_id: str) -> RoomState:
        ...

    async def update_state(self, room_id: str, updates: dict) -> RoomState:
        ...

    async def add_connection(self, room_id: str, connection_id: str) -> None:
        ...

    async def remove_connection(self, room_id: str, connection_id: str) -> None:
        ...


class LocalRoomStateStore:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._states: dict[str, RoomState] = {}
        self._members: dict[str, set[str]] = {}

    async def get_state(self, room_id: str) -> RoomState:
        if not room_id:
            return RoomState()
        async with self._lock:
            state = self._states.get(room_id)
            if state is None:
                return RoomState()
            return RoomState(
                active_question=str(state.active_question or ""),
                partial_answer=str(state.partial_answer or ""),
                is_streaming=bool(state.is_streaming),
                assist_intensity=int(state.assist_intensity or 2),
                updated_at=float(state.updated_at or 0.0),
            )

    async def update_state(self, room_id: str, updates: dict) -> RoomState:
        if not room_id:
            return RoomState()
        async with self._lock:
            current = self._states.get(room_id) or RoomState()
            merged = RoomState(
                active_question=str(updates.get("active_question", current.active_question) or ""),
                partial_answer=str(updates.get("partial_answer", current.partial_answer) or ""),
                is_streaming=bool(updates.get("is_streaming", current.is_streaming)),
                assist_intensity=max(1, int(updates.get("assist_intensity", current.assist_intensity or 2))),
                updated_at=float(updates.get("updated_at") or time.time()),
            )
            self._states[room_id] = merged
            return RoomState(
                active_question=merged.active_question,
                partial_answer=merged.partial_answer,
                is_streaming=merged.is_streaming,
                assist_intensity=merged.assist_intensity,
                updated_at=merged.updated_at,
            )

    async def add_connection(self, room_id: str, connection_id: str) -> None:
        if not room_id or not connection_id:
            return
        async with self._lock:
            members = self._members.setdefault(room_id, set())
            members.add(connection_id)

    async def remove_connection(self, room_id: str, connection_id: str) -> None:
        if not room_id or not connection_id:
            return
        async with self._lock:
            members = self._members.get(room_id)
            if not members:
                return
            members.discard(connection_id)
            if not members:
                self._members.pop(room_id, None)


class RedisRoomStateStore:
    """Redis-backed distributed room/session state.

    Keys:
    - room:{room_id}:state (hash)
    - room:{room_id}:members (set)
    """

    def __init__(self, redis_url: str):
        try:
            import redis.asyncio as redis_async  # type: ignore
        except Exception as exc:
            raise RuntimeError("redis package not installed; install 'redis' to enable distributed room state") from exc

        self._redis = redis_async.from_url(redis_url, decode_responses=True)

    @staticmethod
    def _state_key(room_id: str) -> str:
        return f"room:{room_id}:state"

    @staticmethod
    def _members_key(room_id: str) -> str:
        return f"room:{room_id}:members"

    async def get_state(self, room_id: str) -> RoomState:
        if not room_id:
            return RoomState()
        data = await self._redis.hgetall(self._state_key(room_id))
        if not data:
            return RoomState()
        return RoomState(
            active_question=str(data.get("active_question") or ""),
            partial_answer=str(data.get("partial_answer") or ""),
            is_streaming=str(data.get("is_streaming") or "false").lower() in {"1", "true", "yes", "on"},
            assist_intensity=max(1, int(data.get("assist_intensity") or 2)),
            updated_at=float(data.get("updated_at") or 0.0),
        )

    async def update_state(self, room_id: str, updates: dict) -> RoomState:
        if not room_id:
            return RoomState()

        current = await self.get_state(room_id)
        merged = RoomState(
            active_question=str(updates.get("active_question", current.active_question) or ""),
            partial_answer=str(updates.get("partial_answer", current.partial_answer) or ""),
            is_streaming=bool(updates.get("is_streaming", current.is_streaming)),
            assist_intensity=max(1, int(updates.get("assist_intensity", current.assist_intensity or 2))),
            updated_at=float(updates.get("updated_at") or time.time()),
        )

        await self._redis.hset(
            self._state_key(room_id),
            mapping={
                "active_question": merged.active_question,
                "partial_answer": merged.partial_answer,
                "is_streaming": json.dumps(merged.is_streaming),
                "assist_intensity": str(merged.assist_intensity),
                "updated_at": str(merged.updated_at),
            },
        )
        return merged

    async def add_connection(self, room_id: str, connection_id: str) -> None:
        if not room_id or not connection_id:
            return
        await self._redis.sadd(self._members_key(room_id), connection_id)

    async def remove_connection(self, room_id: str, connection_id: str) -> None:
        if not room_id or not connection_id:
            return
        await self._redis.srem(self._members_key(room_id), connection_id)


def build_room_state_store() -> RoomStateStore:
    use_redis = str(os.getenv("USE_REDIS_ROOM_STATE", "false")).strip().lower() in {"1", "true", "yes", "on"}
    if not use_redis:
        return LocalRoomStateStore()

    redis_url = str(os.getenv("REDIS_URL") or "").strip()
    if not redis_url:
        raise RuntimeError("USE_REDIS_ROOM_STATE=true requires REDIS_URL")
    return RedisRoomStateStore(redis_url)
