# from fastapi import APIRouter, WebSocket
# from app.voice.stt import StreamingASR

# router = APIRouter()

# @router.websocket("/ws/voice")
# async def voice_ws(websocket: WebSocket):
#     await websocket.accept()

#     asr = StreamingASR(websocket)
#     await asr.start()

#     try:
#         while True:
#             data = await websocket.receive_bytes()
#             await asr.send_audio(data)
#     except:
#         await asr.close()


# backend/app/voice_route.py

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
import asyncio
import json

from .session_controller import SessionController
from .state import TranscriptState
from .deepgram_client import create_deepgram_socket

router = APIRouter()


@router.websocket("/ws/voice")
async def voice_ws(websocket: WebSocket):
    await websocket.accept()

    controller = SessionController()
    state = TranscriptState()

    deepgram_ws = None

    try:
        # 1️⃣ Create Deepgram connection
        deepgram_ws = await create_deepgram_socket(
            on_transcript=lambda data: handle_transcript(data, state, websocket),
            stop_event=controller.stop_event,
        )

        # 2️⃣ Start Deepgram receive loop
        controller.create_task(
            deepgram_receiver_loop(deepgram_ws, controller.stop_event)
        )

        # 3️⃣ Main WebSocket receive loop
        while not controller.stop_event.is_set():
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    audio = message["bytes"]

                    if deepgram_ws and not controller.stop_event.is_set():
                        await deepgram_ws.send(audio)

                elif "text" in message:
                    data = json.loads(message["text"])
                    if data.get("event") == "stop":
                        break

    except WebSocketDisconnect:
        pass

    except Exception as e:
        print("WS error:", e)

    finally:
        # 4️⃣ HARD STOP
        await controller.stop()

        if deepgram_ws:
            await deepgram_ws.close()

        await websocket.close()


# ==========================================================
# 🔽 ADD THESE FUNCTIONS BELOW (SAME FILE)
# ==========================================================

async def handle_transcript(data, state, websocket: WebSocket):
    if "channel" not in data:
        return

    alternatives = data["channel"].get("alternatives", [])
    if not alternatives:
        return

    transcript = alternatives[0].get("transcript", "")
    if not transcript:
        return

    state.last_transcript_time = asyncio.get_event_loop().time()

    await websocket.send_json({
        "type": "transcript",
        "text": transcript,
        "is_final": data.get("is_final", False)
    })


async def deepgram_receiver_loop(deepgram_ws, stop_event: asyncio.Event):
    try:
        async for _ in deepgram_ws:
            if stop_event.is_set():
                break
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print("Deepgram receive error:", e)
