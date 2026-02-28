import asyncio
from fastapi import WebSocket, WebSocketDisconnect

from core.state import VoiceSessionState
from app.services.deepgram_service import DeepgramService
from app.services.hesitation_service import HesitationDetector


async def stream_audio(ws: WebSocket):
    """
    WebSocket audio → Deepgram → transcripts
    """
    state = VoiceSessionState.CONNECTING
    dg = DeepgramService()
    hesitation = HesitationDetector()

    try:
        # ✅ MUST await
        await dg.connect()

        state = VoiceSessionState.LISTENING
        print("🎙 Voice session started")

        async def receive_audio():
            nonlocal state
            try:
                while True:
                    audio_chunk = await ws.receive_bytes()
                    state = VoiceSessionState.TRANSCRIBING

                    # ✅ MUST await
                    await dg.send_audio(audio_chunk)

            except WebSocketDisconnect:
                print("🔴 Client disconnected (audio)")
            except Exception as e:
                print("❌ Audio receive error:", e)

        async def receive_transcript():
            nonlocal state
            try:
                async for transcript in dg.listen():
                    state = VoiceSessionState.LISTENING

                    analysis = hesitation.analyze(transcript["text"])

                    await ws.send_json({
                        "type": "transcript",
                        "text": transcript["text"],
                        "confidence": transcript["confidence"],
                        "is_final": transcript["is_final"],
                        "analysis": analysis,
                    })

            except WebSocketDisconnect:
                print("🔴 Client disconnected (transcript)")
            except Exception as e:
                print("❌ Transcript error:", e)

        await asyncio.gather(
            receive_audio(),
            receive_transcript(),
        )

    finally:
        state = VoiceSessionState.CLOSED
        await dg.close()

        try:
            await ws.close()
        except Exception:
            pass

        print("✅ Voice session closed cleanly")
