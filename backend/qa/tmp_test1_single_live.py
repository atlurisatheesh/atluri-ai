import asyncio
import base64
import json
import time
import uuid
import websockets


def token(sub='runtime-tester'):
    enc = lambda o: base64.urlsafe_b64encode(json.dumps(o,separators=(',',':')).encode()).decode().rstrip('=')
    return f"{enc({'alg':'none','typ':'JWT'})}.{enc({'sub':sub,'iat':0})}."


async def main():
    t = token()
    room_id = str(uuid.uuid4())
    ws_url = f"ws://127.0.0.1:9010/ws/voice?room_id={room_id}&participant=candidate&role=devops&token={t}"
    async with websockets.connect(ws_url, open_timeout=20) as ws:
        events = []
        answers_sent = 0
        end = time.time() + 90
        while time.time() < end:
            raw = await asyncio.wait_for(ws.recv(), timeout=20)
            data = json.loads(raw)
            et = data.get('type')
            events.append(et)
            print('EV', et)
            if et in {'question','next_question'} and answers_sent < 5:
                await ws.send(json.dumps({'type':'qa_transcript','text':f'answer-{answers_sent} with impact and ownership'}))
                answers_sent += 1
            if et == 'final_summary':
                print('FINAL_SUMMARY_OK', answers_sent)
                print('TAIL', events[-20:])
                return
        print('FINAL_SUMMARY_MISSING', answers_sent)
        print('TAIL', events[-30:])


if __name__ == '__main__':
    asyncio.run(main())
