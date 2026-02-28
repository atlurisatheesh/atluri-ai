# from fastapi import WebSocket
# from app.voice.stt import transcribe_audio
# from app.services.openai_service import get_ai_reply

# async def voice_ws_handler(ws: WebSocket):
#     await ws.accept()

#     buffer = b""

#     try:
#         while True:
#             data = await ws.receive_bytes()   # RAW AUDIO BYTES
#             buffer += data

#             # Process every ~1.5 seconds of audio
#             if len(buffer) > 24000:
#                 text = transcribe_audio(buffer)
#                 buffer = b""

#                 if not text.strip():
#                     continue

#                 print("🎤 You:", text)

#                 ai_reply = get_ai_reply(text)

#                 print("🤖 AI:", ai_reply)

#                 await ws.send_json({
#                     "transcript": text,
#                     "ai": reply
#                 })


#                 # await ws.send_text(ai_reply)

#     except Exception as e:
#         print("WebSocket voice error:", e)

#     finally:
#         await ws.close()


from fastapi import WebSocket, WebSocketDisconnect
from app.voice.stt import StreamingASR

BUFFER_TARGET = 640  # 20ms PCM @ 16kHz mono 16-bit


async def voice_ws_handler(ws: WebSocket):
    await ws.accept()
    print("🎙 Voice WebSocket connected")

    asr = StreamingASR(ws)
    await asr.start()

    buffer = bytearray()

    try:
        while True:
            msg = await ws.receive()

            # 🎧 AUDIO FRAME
            if "bytes" in msg:
                buffer.extend(msg["bytes"])

                if len(buffer) >= BUFFER_TARGET:
                    print("🎧 Sending audio to Deepgram:", len(buffer))
                    await asr.send_audio(bytes(buffer))
                    buffer.clear()

            # 🛑 STOP / FLUSH
            elif "text" in msg and msg["text"] == "STOP":
                print("🛑 Stop received — flushing audio")

                if buffer:
                    await asr.send_audio(bytes(buffer))
                    buffer.clear()

                break

    except WebSocketDisconnect:
        print("🔴 Client disconnected")

    except Exception as e:
        print("Voice WS error:", e)

    finally:
        await asr.close()
        print("🛑 Voice WS closed")
