import asyncio
import json
import uuid
import websockets


async def run() -> None:
    room_id = str(uuid.uuid4())
    base = f"ws://127.0.0.1:9010/ws/voice?room_id={room_id}&assist_intensity=2"
    interviewer = await websockets.connect(base + "&participant=interviewer")
    candidate = await websockets.connect(base + "&participant=candidate")

    async def recv_some(ws, label: str, n: int = 16):
        seen: list[str] = []
        for _ in range(n):
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=8)
            except Exception:
                break
            data = json.loads(msg)
            event_type = str(data.get("type") or "")
            seen.append(event_type)
            if event_type in {"interviewer_question", "answer_suggestion_start", "answer_suggestion_chunk", "answer_suggestion_done", "answer_suggestion"}:
                print(label, event_type)
        return seen

    await interviewer.send(
        json.dumps(
            {
                "type": "interviewer_question",
                "text": "Give one example where you reduced AWS costs with measurable impact",
            }
        )
    )

    interviewer_types = await recv_some(interviewer, "I")
    candidate_types = await recv_some(candidate, "C")

    print("INTERVIEWER_TYPES", interviewer_types)
    print("CANDIDATE_TYPES", candidate_types)

    required = {"interviewer_question", "answer_suggestion_start", "answer_suggestion_done", "answer_suggestion"}
    missing_i = sorted(required - set(interviewer_types))
    missing_c = sorted(required - set(candidate_types))
    if missing_i or missing_c:
        raise RuntimeError(f"Missing events interviewer={missing_i} candidate={missing_c}")

    await interviewer.close()
    await candidate.close()


if __name__ == "__main__":
    asyncio.run(run())
