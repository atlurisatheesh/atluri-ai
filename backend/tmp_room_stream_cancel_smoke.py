import asyncio
import json
import uuid

import websockets


async def _drain_events(ws, timeout_sec: float = 12.0):
    events = []
    end_at = asyncio.get_event_loop().time() + timeout_sec
    while asyncio.get_event_loop().time() < end_at:
        remaining = max(0.1, end_at - asyncio.get_event_loop().time())
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except Exception:
            break
        data = json.loads(msg)
        events.append(data)
    return events


async def run() -> None:
    room_id = str(uuid.uuid4())
    base = f"ws://127.0.0.1:9010/ws/voice?room_id={room_id}&assist_intensity=2"

    interviewer = await websockets.connect(base + "&participant=interviewer")
    candidate = await websockets.connect(base + "&participant=candidate")

    await asyncio.sleep(0.6)

    question_1 = "How did you optimize cloud cost with metrics?"
    question_2 = "How did you improve API reliability under load?"

    await interviewer.send(json.dumps({"type": "interviewer_question", "text": question_1}))
    await asyncio.sleep(0.2)
    await interviewer.send(json.dumps({"type": "interviewer_question", "text": question_2}))

    candidate_events = await _drain_events(candidate, timeout_sec=14.0)

    q1_cancelled = False
    q2_completed = False
    q2_final = False

    for evt in candidate_events:
        event_type = str(evt.get("type") or "")
        event_question = str(evt.get("question") or "")
        if event_type == "answer_suggestion_done" and event_question == question_1 and str(evt.get("reason") or "") == "cancelled":
            q1_cancelled = True
        if event_type == "answer_suggestion_done" and event_question == question_2 and str(evt.get("reason") or "") == "completed":
            q2_completed = True
        if event_type == "answer_suggestion" and event_question == question_2 and str(evt.get("suggestion") or "").strip():
            q2_final = True

    if not q1_cancelled:
        raise RuntimeError("Expected cancelled done event for first question stream")
    if not q2_completed:
        raise RuntimeError("Expected completed done event for second question stream")
    if not q2_final:
        raise RuntimeError("Expected final answer_suggestion for second question")

    print("ROOM_STREAM_CANCEL_OK")

    await interviewer.close()
    await candidate.close()


if __name__ == "__main__":
    asyncio.run(run())
