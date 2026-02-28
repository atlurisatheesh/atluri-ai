from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Awaitable, Callable, Protocol


RoomEventHandler = Callable[[str, dict, str], Awaitable[None]]


class RoomEventBus(Protocol):
    async def publish(self, room_id: str, payload: dict) -> None:
        ...

    async def listen(self, handler: RoomEventHandler) -> None:
        ...


class LocalRoomEventBus:
    async def publish(self, room_id: str, payload: dict) -> None:
        return

    async def listen(self, handler: RoomEventHandler) -> None:
        while True:
            await asyncio.sleep(3600)


class RedisRoomEventBus:
    def __init__(self, redis_url: str, instance_id: str):
        try:
            import redis.asyncio as redis_async  # type: ignore
        except Exception as exc:
            raise RuntimeError("redis package not installed; install 'redis' to enable room event bus") from exc

        self._redis = redis_async.from_url(redis_url, decode_responses=True)
        self._instance_id = str(instance_id or "instance-unknown")
        self._pattern = "room:*:events"

    @staticmethod
    def _channel(room_id: str) -> str:
        return f"room:{room_id}:events"

    async def publish(self, room_id: str, payload: dict) -> None:
        if not room_id:
            return
        envelope = {
            "source_instance": self._instance_id,
            "published_at": time.time(),
            "payload": dict(payload or {}),
        }
        await self._redis.publish(self._channel(room_id), json.dumps(envelope))

    async def listen(self, handler: RoomEventHandler) -> None:
        pubsub = self._redis.pubsub()
        await pubsub.psubscribe(self._pattern)
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if not message:
                    continue
                if str(message.get("type") or "") not in {"message", "pmessage"}:
                    continue

                raw_channel = str(message.get("channel") or "")
                parts = raw_channel.split(":")
                if len(parts) < 3:
                    continue
                room_id = parts[1]

                raw_data = message.get("data")
                try:
                    data = json.loads(str(raw_data or "{}"))
                except Exception:
                    continue

                source_instance = str(data.get("source_instance") or "")
                payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
                payload["__bus_published_at"] = float(data.get("published_at") or 0.0)
                await handler(room_id, payload, source_instance)
        finally:
            await pubsub.close()


def build_room_event_bus(instance_id: str) -> RoomEventBus:
    enabled = str(os.getenv("ROOM_EVENT_BUS_ENABLED", "false")).strip().lower() in {"1", "true", "yes", "on"}
    if not enabled:
        return LocalRoomEventBus()

    redis_url = str(os.getenv("REDIS_URL") or "").strip()
    if not redis_url:
        raise RuntimeError("ROOM_EVENT_BUS_ENABLED=true requires REDIS_URL")

    return RedisRoomEventBus(redis_url=redis_url, instance_id=instance_id)
