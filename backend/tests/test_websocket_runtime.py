import asyncio
import json

import pytest
from starlette.websockets import WebSocketState

from app.api import ws_voice


class FakeWebSocket:
    def __init__(self):
        self.client_state = WebSocketState.CONNECTED
        self.sent = []

    async def send_text(self, payload: str):
        await asyncio.sleep(0)
        self.sent.append(payload)


@pytest.mark.asyncio
async def test_send_text_with_lock_serializes_single_connection():
    ws = FakeWebSocket()
    ws_voice.websocket_send_locks[ws] = asyncio.Lock()

    async def _send(i: int):
        await ws_voice._send_text_with_lock(ws, json.dumps({"index": i}))

    await asyncio.gather(*[_send(i) for i in range(50)])
    assert len(ws.sent) == 50

    decoded = [json.loads(item)["index"] for item in ws.sent]
    assert sorted(decoded) == list(range(50))

    ws_voice.websocket_send_locks.pop(ws, None)


@pytest.mark.asyncio
async def test_broadcast_room_local_uses_per_connection_locks():
    room_id = "room-test"
    ws_a = FakeWebSocket()
    ws_b = FakeWebSocket()

    async with ws_voice.room_lock:
        ws_voice.room_connections[room_id].add(ws_a)
        ws_voice.room_connections[room_id].add(ws_b)
        ws_voice.websocket_send_locks[ws_a] = asyncio.Lock()
        ws_voice.websocket_send_locks[ws_b] = asyncio.Lock()

    await ws_voice._broadcast_room_local(room_id, {"type": "event", "v": 1}, exclude=None)

    assert len(ws_a.sent) == 1
    assert len(ws_b.sent) == 1
    assert json.loads(ws_a.sent[0])["type"] == "event"

    async with ws_voice.room_lock:
        ws_voice.room_connections[room_id].discard(ws_a)
        ws_voice.room_connections[room_id].discard(ws_b)
        ws_voice.room_connections.pop(room_id, None)
        ws_voice.websocket_send_locks.pop(ws_a, None)
        ws_voice.websocket_send_locks.pop(ws_b, None)
