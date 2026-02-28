# import tempfile
# import os
# from openai import OpenAI
# from core.config import OPENAI_API_KEY

# client = OpenAI(api_key=OPENAI_API_KEY)

# def transcribe_audio(audio_bytes: bytes) -> str:
#     with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
#         tmp.write(audio_bytes)
#         tmp_path = tmp.name

#     try:
#         with open(tmp_path, "rb") as f:
#             transcript = client.audio.transcriptions.create(
#                 file=f,
#                 model="whisper-1"
#             )

#         return transcript.text.strip()

#     finally:
#         try:
#             os.remove(tmp_path)
#         except:
#             pass


# # =============================
# # REAL-TIME STREAMING ASR (Deepgram)
# # =============================
# # from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
# import os
# import json
# import websockets
# import asyncio
# from app.ai_reasoning.engine import AIReasoningEngine


# DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# class StreamingASR:
#     def __init__(self, websocket):
#         self.client_ws = websocket
#         self.dg_ws = None
#         self.buffer = bytearray()

#         self.ai_engine = AIReasoningEngine()

#     async def start(self):
#         url = (
#             "wss://api.deepgram.com/v1/listen"
#             "?model=nova-2"
#             "&language=en-US"
#             "&punctuate=true"
#             "&interim_results=true"
#             "&encoding=linear16"
#             "&sample_rate=16000"
#         )

#         headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}

#         self.dg_ws = await websockets.connect(
#             url,
#             extra_headers=headers,
#             ping_interval=5,
#             ping_timeout=20,
#             max_size=None,
#         )

#         asyncio.create_task(self._receive_loop())
#         print("🎧 Deepgram streaming connected")

#     async def _receive_loop(self):
#         try:
#             async for message in self.dg_ws:
#                 data = json.loads(message)

#                 if "channel" in data:
#                     alt = data["channel"]["alternatives"][0]
#                     text = alt.get("transcript", "")

#                     # if text:
#                     #     await self.client_ws.send_json({
#                     #         "transcript": text,
#                     #         "final": data.get("is_final", False)
#                     #     })
#                     if text:
#                         is_final = data.get("is_final", False)

#                         # 1️⃣ Send transcript as usual
#                         await self.client_ws.send_json({
#                             "type": "transcript",
#                             "text": text,
#                             "final": is_final
#                         })

#                         # 2️⃣ ONLY when interviewer finishes speaking
#                         if is_final:
#                             decision = self.ai_engine.process_turn(
#                                 speaker="interviewer",
#                                 text=text
#                             )

#                             # 3️⃣ Send AI answer / guidance
#                             await self.client_ws.send_json({
#                                 "type": "ai_answer",
#                                 "payload": decision
#                             })


#         except Exception as e:
#             print("Deepgram closed:", e)

#     async def send_audio(self, pcm_bytes: bytes):
#         if not self.dg_ws:
#             return

#         self.buffer.extend(pcm_bytes)

#         # Send ~20ms frames = 640 bytes @16k
#         if len(self.buffer) >= 640:
#             await self.dg_ws.send(bytes(self.buffer))
#             self.buffer.clear()

#     async def close(self):
#         if self.dg_ws:
#             try:
#                 await self.dg_ws.send(json.dumps({"type": "CloseStream"}))
#             except:
#                 pass
#             await self.dg_ws.close()



import tempfile
import os
import json
import asyncio
import websockets
from openai import OpenAI

from core.config import OPENAI_API_KEY
from app.ai_copilot.engine import CopilotEngine


# =============================
# NON-STREAMING (Whisper)
# =============================

client = OpenAI(api_key=OPENAI_API_KEY)

def transcribe_audio(audio_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                file=f,
                model="whisper-1"
            )

        return transcript.text.strip()

    finally:
        try:
            os.remove(tmp_path)
        except:
            pass


# =============================
# REAL-TIME STREAMING ASR (Deepgram)
# =============================

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")


class StreamingASR:
    def __init__(self, websocket):
        self.client_ws = websocket
        self.dg_ws = None
        self.buffer = bytearray()

        # ✅ Copilot lives here (candidate helper)
        self.copilot = CopilotEngine()

    async def start(self):
        url = (
            "wss://api.deepgram.com/v1/listen"
            "?model=nova-2"
            "&language=en-US"
            "&punctuate=true"
            "&interim_results=true"
            "&endpointing=300"
            "&utterance_end_ms=1000"
            "&vad_events=true"
            "&encoding=linear16"
            "&sample_rate=16000"
        )


        headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}

        self.dg_ws = await websockets.connect(
            url,
            extra_headers=headers,
            ping_interval=5,
            ping_timeout=20,
            max_size=None,
        )

        asyncio.create_task(self._receive_loop())
        print("🎧 Deepgram streaming connected")

    async def _receive_loop(self):
        try:
            async for message in self.dg_ws:
                data = json.loads(message)

                if "channel" not in data:
                    continue

                alt = data["channel"]["alternatives"][0]
                text = alt.get("transcript", "").strip()

                if not text:
                    continue

                is_final = data.get("is_final", False)

                # # 1️⃣ Always stream transcript
                # await self.client_ws.send_json({
                #     "type": "transcript",
                #     "text": text,
                #     "final": is_final
                # })

                # # 2️⃣ On turn end → invoke CopilotEngine
                # if is_final:
                #     await self.client_ws.send_json({
                #         "type": "copilot_start"
                #     })

                #     async for chunk in self.copilot.stream(text):
                #         await self.client_ws.send_json({
                #             "type": "copilot_token",
                #             "token": chunk["token"] if isinstance(chunk, dict) else chunk
                #         })

                #     await self.client_ws.send_json({
                #         "type": "copilot_end"
                #     })
                # 1️⃣ Always stream transcript (TEXT frame)
                await self.client_ws.send_text(json.dumps({
                    "type": "transcript",
                    "text": text,
                    "final": is_final
                }))

                # 2️⃣ On turn end → invoke CopilotEngine
                if is_final:
                    await self.client_ws.send_text(json.dumps({
                        "type": "copilot_start"
                    }))

                    async for chunk in self.copilot.stream(text):
                        await self.client_ws.send_text(json.dumps({
                            "type": "copilot_token",
                            "token": chunk["token"] if isinstance(chunk, dict) else chunk
                        }))

                    await self.client_ws.send_text(json.dumps({
                        "type": "copilot_end"
                    }))


        except Exception as e:
            print("❌ Deepgram closed:", e)

    async def send_audio(self, pcm_bytes: bytes):
        if not self.dg_ws:
            return

        self.buffer.extend(pcm_bytes)

        # ~20ms frames = 640 bytes @16kHz
        if len(self.buffer) >= 640:
            await self.dg_ws.send(bytes(self.buffer))
            self.buffer.clear()

    async def close(self):
        if self.dg_ws:
            try:
                await self.dg_ws.send(json.dumps({"type": "CloseStream"}))
            except:
                pass
            await self.dg_ws.close()
