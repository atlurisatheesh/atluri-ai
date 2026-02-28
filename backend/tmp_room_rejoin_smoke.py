import asyncio
import json
import uuid

import websockets


async def _read_until(ws, wanted: set[str], timeout_sec: float = 10.0):
    end_at = asyncio.get_event_loop().time() + timeout_sec
    seen: list[str] = []
    while asyncio.get_event_loop().time() < end_at:
        remaining = max(0.1, end_at - asyncio.get_event_loop().time())
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except Exception:
            break
        data = json.loads(msg)
        event_type = str(data.get("type") or "")
        seen.append(event_type)
        if event_type in wanted:
            return data, seen
    return None, seen


async def run() -> None:
    room_id = str(uuid.uuid4())
    base = f"ws://127.0.0.1:9010/ws/voice?room_id={room_id}&assist_intensity=2"

    interviewer = await websockets.connect(base + "&participant=interviewer")
    candidate = await websockets.connect(base + "&participant=candidate")

    await _read_until(interviewer, {"question"}, timeout_sec=3)
    await _read_until(candidate, {"question"}, timeout_sec=3)

    question = "How did you improve API latency in production with measurable impact?"
    await interviewer.send(json.dumps({"type": "interviewer_question", "text": question}))

    chunk_data, seen_before = await _read_until(candidate, {"answer_suggestion_chunk"}, timeout_sec=12)
    if not chunk_data:
        raise RuntimeError(f"Did not receive answer_suggestion_chunk before reconnect. Seen={seen_before}")

    await candidate.close()

    candidate_rejoin = await websockets.connect(base + "&participant=candidate")
    await _read_until(candidate_rejoin, {"question"}, timeout_sec=3)

    await candidate_rejoin.send(json.dumps({"type": "sync_state_request"}))
    sync_data, seen_after = await _read_until(candidate_rejoin, {"sync_state"}, timeout_sec=8)
    if not sync_data:
        raise RuntimeError(f"Did not receive sync_state after rejoin. Seen={seen_after}")

    active_question = str(sync_data.get("active_question") or "")
    partial_answer = str(sync_data.get("partial_answer") or "")
    is_streaming = bool(sync_data.get("is_streaming"))

    if question not in active_question:
        raise RuntimeError(f"Unexpected active_question after rejoin: {active_question}")

    print("ROOM_REJOIN_OK")
    print("SYNC_ACTIVE_QUESTION", active_question)
    print("SYNC_IS_STREAMING", is_streaming)
    print("SYNC_PARTIAL_ANSWER_LEN", len(partial_answer))

    await interviewer.close()
    await candidate_rejoin.close()


if __name__ == "__main__":
    asyncio.run(run())
