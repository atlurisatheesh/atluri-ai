from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable


RegisterFn = Callable[[str, object, str], Awaitable[None]]
UnregisterFn = Callable[[str, object, str], Awaitable[None]]
BroadcastFn = Callable[[str, dict, object | None], Awaitable[None]]
SendFn = Callable[[dict], Awaitable[None]]


@dataclass
class ConnectionLifecycleManager:
    register_fn: RegisterFn
    unregister_fn: UnregisterFn

    async def register(self, room_id: str, websocket: object, connection_id: str) -> None:
        await self.register_fn(room_id, websocket, connection_id)

    async def unregister(self, room_id: str, websocket: object, connection_id: str) -> None:
        await self.unregister_fn(room_id, websocket, connection_id)


@dataclass
class RoomBroadcaster:
    send_fn: SendFn
    broadcast_fn: BroadcastFn

    async def emit_local(self, payload: dict) -> None:
        await self.send_fn(payload)

    async def emit_room(self, room_id: str, payload: dict, exclude: object | None = None) -> None:
        await self.broadcast_fn(room_id, payload, exclude)


@dataclass
class TurnDecisionPipeline:
    compute_fn: Callable[[str], Awaitable[object]]

    async def run(self, transcript_text: str):
        return await self.compute_fn(transcript_text)


@dataclass
class TranscriptRouter:
    on_payload_fn: Callable[[dict], Awaitable[None]]

    async def route(self, payload: dict) -> None:
        await self.on_payload_fn(payload)


@dataclass
class CoachingEmitter:
    send_fn: SendFn

    async def emit(self, session_id: str, tips: list[str]) -> None:
        await self.send_fn({
            "type": "live_coaching",
            "session_id": session_id,
            "tips": tips,
        })
