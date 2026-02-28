import asyncio
import base64
import json
import uuid
import websockets


def token(sub='runtime-tester'):
    enc = lambda o: base64.urlsafe_b64encode(json.dumps(o, separators=(',', ':')).encode()).decode().rstrip('=')
    return f"{enc({'alg':'none','typ':'JWT'})}.{enc({'sub':sub,'iat':0})}."


async def recv_until(ws, wanted: set[str], timeout: float = 20.0):
    end = asyncio.get_event_loop().time() + timeout
    seen = []
    while asyncio.get_event_loop().time() < end:
        rem = max(0.1, end - asyncio.get_event_loop().time())
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=rem)
        except Exception:
            break
        data = json.loads(raw)
        seen.append(data)
        if data.get('type') in wanted:
            return data, seen
    return None, seen


async def run_single(room_id: str, marker: str):
    t = token(marker)
    base = f"ws://127.0.0.1:9010/ws/voice?room_id={room_id}&token={t}"
    interviewer = await websockets.connect(base + "&participant=interviewer", open_timeout=20)
    candidate = await websockets.connect(base + "&participant=candidate", open_timeout=20)

    await recv_until(interviewer, {'question'}, timeout=8)
    await recv_until(candidate, {'question'}, timeout=8)

    cand_events = []
    for i in range(5):
        q = f"{marker}-Q{i}: explain design tradeoff"
        await interviewer.send(json.dumps({'type': 'interviewer_question', 'text': q}))
        await recv_until(candidate, {'interviewer_question'}, timeout=8)
        await candidate.send(json.dumps({'type': 'qa_transcript', 'text': f'{marker}-A{i} shipped with measurable impact'}))
        _, seen = await recv_until(candidate, {'ai_decision', 'waiting_for_interviewer', 'final_summary'}, timeout=20)
        cand_events.extend(seen)

    summary, seen2 = await recv_until(candidate, {'final_summary'}, timeout=25)
    cand_events.extend(seen2)

    await interviewer.close()
    await candidate.close()

    transcripts = [str(e.get('text') or '') for e in cand_events if e.get('type') == 'transcript']
    decisions = [e for e in cand_events if e.get('type') == 'ai_decision']

    return {
        'summary': summary is not None,
        'decisions': len(decisions),
        'transcripts': transcripts,
        'events_tail': [e.get('type') for e in cand_events[-20:]],
    }


async def main():
    t1 = await run_single(str(uuid.uuid4()), 'T1')
    print('TEST1', json.dumps(t1))

    room_a = str(uuid.uuid4())
    room_b = str(uuid.uuid4())
    a, b = await asyncio.gather(run_single(room_a, 'A'), run_single(room_b, 'B'))

    leakage = any('B-' in t for t in a['transcripts']) or any('A-' in t for t in b['transcripts'])
    dropped = a['decisions'] < 3 or b['decisions'] < 3

    print('TEST2', json.dumps({
        'ok': (not leakage) and (not dropped),
        'leakage': leakage,
        'dropped': dropped,
        'a_decisions': a['decisions'],
        'b_decisions': b['decisions'],
        'a_summary': a['summary'],
        'b_summary': b['summary'],
    }))


if __name__ == '__main__':
    asyncio.run(main())
