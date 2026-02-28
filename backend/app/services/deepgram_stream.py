import asyncio
import logging
import time

logging.basicConfig(
	format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
	level=logging.INFO,
)

logger = logging.getLogger("deepgram_stream")


class DeepgramStreamGuard:
	"""
	Reliability helper for Deepgram stream consumers.
	Tracks event ordering and supports watchdog-triggered reconnect.
	"""

	def __init__(self, reconnect_coro, should_reconnect=None):
		self._reconnect_coro = reconnect_coro
		self._should_reconnect = should_reconnect
		self.last_event_ts = 0.0
		self.last_audio_time = time.monotonic()
		self._stopped = False

	def note_audio_activity(self):
		self.last_audio_time = time.monotonic()

	def stop(self):
		self._stopped = True

	def is_in_order(self, message: dict) -> bool:
		event_ts = message.get("start", 0) or 0
		if event_ts < self.last_event_ts:
			logger.warning("Deepgram out-of-order event ignored")
			return False
		self.last_event_ts = event_ts
		return True

	async def watchdog(self):
		try:
			while not self._stopped:
				await asyncio.sleep(5)
				if self._stopped:
					break

				if self._should_reconnect and not self._should_reconnect():
					break

				if time.monotonic() - self.last_audio_time > 10:
					logger.error("Deepgram stalled — reconnecting")
					success = await self._reconnect_coro()
					if not success:
						logger.error("[DG] Reconnect failed — disabling watchdog")
						self._stopped = True
		finally:
			logger.info("[DG] Watchdog terminated")

# from deepgram import DeepgramClient, LiveOptions
# import os

# dg = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

# class StreamingASR:
#     def __init__(self, websocket):
#         self.ws = websocket
#         self.dg_connection = None

#     async def start(self):
#         self.dg_connection = dg.listen.asyncwebsocket.v("1")

#         options = LiveOptions(
#             model="nova-2",
#             language="en-US",
#             punctuate=True,
#             interim_results=True,
#             encoding="linear16",
#             sample_rate=16000,
#             vad_events=True,
#             utterance_end_ms=1000
#         )

#         await self.dg_connection.start(options)

#         async for message in self.dg_connection:
#             result = message

#             if "channel" in result:
#                 alt = result["channel"]["alternatives"][0]
#                 text = alt.get("transcript", "")

#                 if text:
#                     await self.ws.send_json({
#                         "type": "transcript",
#                         "text": text,
#                         "is_final": result.get("is_final", False)
#                     })

#     async def send_audio(self, pcm_bytes: bytes):
#         await self.dg_connection.send(pcm_bytes)

#     async def close(self):
#         if self.dg_connection:
#             await self.dg_connection.finish()
