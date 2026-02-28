from fastapi import WebSocket
from app.voice.stt import transcribe_audio
from app.interview.engine import start_interview, submit_answer


async def voice_ws_handler(ws: WebSocket):
    await ws.accept()

    user_id = "voice-user"
    buffer = b""

    # Start interview session automatically
    first_question = start_interview(user_id, "backend developer")

    await ws.send_json({
        "type": "question",
        "text": first_question
    })

    try:
        while True:
            chunk = await ws.receive_bytes()
            buffer += chunk

            # process every ~2 seconds of audio
            if len(buffer) > 32000:
                text = transcribe_audio(buffer)
                buffer = b""

                result = submit_answer(user_id, text)

                await ws.send_json({
                    "type": "answer",
                    "transcript": text
                })

                if result.get("done"):
                    await ws.send_json({
                        "type": "final",
                        "score": result["score"],
                        "decision": result["decision"]
                    })
                else:
                    await ws.send_json({
                        "type": "question",
                        "text": result["next_question"]
                    })

    except Exception as e:
        print("WebSocket voice error:", e)
        await ws.close()
