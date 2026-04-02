# import os
# import asyncio
# from deepgram import DeepgramClient


# class DeepgramService:
#     def __init__(self):
#         self.client = DeepgramClient(
#             api_key=os.getenv("DEEPGRAM_API_KEY")
#         )
#         self.connection = None
#         self.queue: asyncio.Queue = asyncio.Queue()

#     async def connect(self):
#         """
#         Open a live Deepgram streaming connection
#         """
#         self.connection = self.client.listen.websocket.v("1")

#         # Register transcript callback
#         self.connection.on("transcript", self._on_transcript)

#         await self.connection.start({
#             "language": "en",
#             "encoding": "linear16",
#             "sample_rate": 16000,
#             "punctuate": True,
#             "interim_results": True,
#             "endpointing": 300,
#         })

#     async def _on_transcript(self, result):
#         """
#         Deepgram transcript callback → push into async queue
#         """
#         try:
#             channel = result.get("channel", {})
#             alternatives = channel.get("alternatives", [])

#             if not alternatives:
#                 return

#             alt = alternatives[0]
#             transcript = alt.get("transcript", "").strip()

#             if transcript:
#                 await self.queue.put({
#                     "text": transcript,
#                     "confidence": alt.get("confidence", 0.0),
#                     "words": alt.get("words", []),
#                     "is_final": result.get("is_final", False)
#                 })

#         except Exception as e:
#             print("❌ Deepgram transcript parse error:", e)

#     async def send_audio(self, data: bytes):
#         """
#         Send raw PCM audio to Deepgram
#         """
#         if self.connection:
#             await self.connection.send(data)

#     async def listen(self):
#         """
#         Async generator yielding transcript events
#         """
#         while True:
#             yield await self.queue.get()

#     async def close(self):
#         """
#         Clean shutdown
#         """
#         if self.connection:
#             await self.connection.finish()


# import os
# import asyncio
# from deepgram import DeepgramClient


# class DeepgramService:
#     def __init__(self):
#         self.client = DeepgramClient(
#             api_key=os.getenv("DEEPGRAM_API_KEY")
#         )
#         self.socket = None
#         self.queue: asyncio.Queue = asyncio.Queue()

#     async def connect(self):
#         # ✅ Correct v4.x usage
#         self.socket = self.client.listen.websocket.v("1")

#         async def on_message(message):
#             try:
#                 channel = message.get("channel", {})
#                 alternatives = channel.get("alternatives", [])

#                 if not alternatives:
#                     return

#                 alt = alternatives[0]
#                 transcript = alt.get("transcript", "").strip()

#                 if transcript:
#                     await self.queue.put({
#                         "text": transcript,
#                         "confidence": alt.get("confidence", 0.0),
#                         "is_final": message.get("is_final", False),
#                     })
#             except Exception as e:
#                 print("❌ Transcript parse error:", e)

#         self.socket.on("transcript", on_message)

#         await self.socket.start({
#             "language": "en",
#             "encoding": "linear16",
#             "sample_rate": 16000,
#             "interim_results": True,
#             "punctuate": True,
#             "endpointing": 300,
#         })

#     async def send_audio(self, data: bytes):
#         if self.socket:
#             await self.socket.send(data)

#     async def listen(self):
#         while True:
#             yield await self.queue.get()

#     async def close(self):
#         if self.socket:
#             await self.socket.finish()

######################################################################################
#####################V1##################################

# import os
# import asyncio
# from deepgram import (
#     DeepgramClient,
#     LiveOptions,
#     LiveTranscriptionEvents,
# )

# class DeepgramService:
#     def __init__(self):
#         self.client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
#         self.connection = None
#         self.transcript_queue = asyncio.Queue()

#     async def connect(self):
#         self.connection = self.client.listen.live.v("1")

#         # 🔥 REQUIRED EVENTS
#         self.connection.on(
#             LiveTranscriptionEvents.Transcript,
#             self._on_transcript
#         )
#         self.connection.on(
#             LiveTranscriptionEvents.Metadata,
#             self._on_metadata
#         )
#         self.connection.on(
#             LiveTranscriptionEvents.Error,
#             self._on_error
#         )

#         options = LiveOptions(
#             model="nova-2",
#             language="en-US",
#             encoding="linear16",
#             sample_rate=16000,
#             channels=1,
#             interim_results=True,
#             punctuate=True,
#             endpointing=300,
#         )

#         # start() is SYNC in 3.2.7
#         self.connection.start(options)

#         print("🟢 Deepgram connected (start called)")

#     # 🔥 MUST be NON-ASYNC
#     def send_audio(self, audio_bytes: bytes):
#         if not self.connection:
#             return

#         if isinstance(audio_bytes, bytearray):
#             audio_bytes = bytes(audio_bytes)

#         self.connection.send(audio_bytes)

#     def _on_metadata(self, client, metadata):
#         # 🔥 THIS CONFIRMS DEEPGRAM ACCEPTED THE STREAM
#         print("🧠 Deepgram metadata received:", metadata)

#     def _on_error(self, client, error):
#         print("❌ Deepgram error event:", error)

#     def _on_transcript(self, client, result):
#         try:
#             if not isinstance(result, dict):
#                 return

#             channel = result.get("channel")
#             if not channel:
#                 return

#             alternatives = channel.get("alternatives", [])
#             if not alternatives:
#                 return

#             text = alternatives[0].get("transcript", "").strip()
#             if not text:
#                 return

#             is_final = result.get("is_final", False)

#             self.transcript_queue.put_nowait({
#                 "text": text,
#                 "is_final": is_final,
#             })

#         except Exception as e:
#             print("❌ Deepgram transcript error:", e)

#     async def get_transcript(self):
#         return await self.transcript_queue.get()

#     async def close(self):
#         if self.connection:
#             self.connection.finish()
#             print("🔴 Deepgram closed")
############################################################################################################
########################v2####################

import os
import asyncio
import logging
from deepgram import DeepgramClient
from app.services.deepgram_stream import DeepgramStreamGuard
from core.config import QA_MODE

try:
    from deepgram import LiveOptions, LiveTranscriptionEvents
except ImportError:
    LiveOptions = None
    LiveTranscriptionEvents = None

logger = logging.getLogger("deepgram_service")
DEEPGRAM_ENDPOINTING_MS = max(500, int(os.getenv("DEEPGRAM_ENDPOINTING_MS", "700")))


class DeepgramService:
    def __init__(self, enabled: bool | None = None, language_mode: str = "multi"):
        """
        Initialize DeepgramService.
        
        Args:
            enabled: Whether the service is enabled (defaults to not QA_MODE)
            language_mode: "english" for faster en-only, "multi" for auto-detect all languages
        """
        self.enabled = (not QA_MODE) if enabled is None else enabled
        # Language optimization: "en" is faster, "multi" supports all languages
        self.language = "en" if language_mode == "english" else "multi"
        self.client = None
        if self.enabled:
            api_key = os.getenv("DEEPGRAM_API_KEY")
            logger.info("[DG] API key available: %s (len=%d) | language=%s", bool(api_key), len(api_key or ""), self.language)
            if not api_key:
                logger.error("[DG] DEEPGRAM_API_KEY not set - speech-to-text will NOT work")
                self.enabled = False
            else:
                try:
                    self.client = DeepgramClient(api_key=api_key)
                    logger.info("[DG] DeepgramClient created successfully")
                except TypeError:
                    self.client = DeepgramClient(api_key)
                    logger.info("[DG] DeepgramClient created (fallback init)")
                except Exception as exc:
                    logger.warning("Deepgram client init failed; disabling stream service: %s", exc)
                    self.enabled = False
        self.connection = None
        self.transcript_queue = asyncio.Queue()
        self.guard = DeepgramStreamGuard(self._reconnect, self._can_reconnect) if self.enabled else None
        self._watchdog_task = None
        self._reconnect_lock = asyncio.Lock()
        self.active = False
        self._closed = False
        self._degraded = False
        self._max_reconnect_attempts = 1
        self._reconnect_attempts = 0

    def _can_reconnect(self) -> bool:
        return self.enabled and self.active and (not self._closed) and (not self._degraded)

    def is_active(self) -> bool:
        return self.active and not self._closed and not self._degraded

    def _safe_finish_connection(self):
        if not self.connection:
            return
        try:
            self.connection.finish()
        except Exception as exc:
            message = str(exc or "")
            if "_keep_alive_thread" in message:
                logger.debug("Deepgram cleanup internal thread field missing; ignoring")
            else:
                logger.warning("Deepgram finish() ignored during cleanup: %s", exc)
        finally:
            self.connection = None

    async def _reconnect(self):
        if not self.active:
            logger.info("Reconnect skipped — service inactive")
            return False

        if not self._can_reconnect():
            return False

        if self._reconnect_lock.locked():
            return False

        async with self._reconnect_lock:
            if not self._can_reconnect():
                return False

            self._reconnect_attempts += 1
            logger.warning("Reconnecting Deepgram... attempt=%s", self._reconnect_attempts)
            try:
                self._safe_finish_connection()
                await asyncio.sleep(1)
                await self.connect()
                if self.guard:
                    self.guard.note_audio_activity()
                self._reconnect_attempts = 0
                return True
            except Exception as e:
                logger.error("Deepgram reconnect failed: %s", e)
                if self._reconnect_attempts >= self._max_reconnect_attempts:
                    self._degraded = True
                    self.active = False
                    if self.guard:
                        self.guard.stop()
                    logger.error("[DG] Reconnect budget exhausted — service degraded")
                return False

    async def connect(self):
        if not self.enabled:
            logger.info("[QA_MODE] Deepgram service disabled")
            return

        if LiveOptions is None or LiveTranscriptionEvents is None:
            logger.warning("Deepgram live streaming symbols unavailable in installed SDK; disabling service")
            self.enabled = False
            self.active = False
            return

        if self.client is None:
            logger.warning("Deepgram client unavailable; disabling service")
            self.enabled = False
            self.active = False
            return

        if self.connection:
            return

        self._closed = False
        self._degraded = False
        self.active = True
        self.connection = self.client.listen.live.v("1")

        # 🔥 REGISTER EVENTS
        self.connection.on(
            LiveTranscriptionEvents.Transcript,
            self._on_transcript,
        )
        self.connection.on(
            LiveTranscriptionEvents.Metadata,
            self._on_metadata,
        )
        self.connection.on(
            LiveTranscriptionEvents.Error,
            self._on_error,
        )

        # Use minimal options for SDK 3.2.7 compatibility
        # Language optimization: "en" is faster for English-only, "multi" for auto-detect
        #
        # keywords: Boost recognition of technical terms that Deepgram's base model
        # often misrecognizes (e.g. "ECS" → "CCS", "Kubernetes" → "Cooper Netties").
        # Each keyword can have an optional intensity from -10 to 10.
        tech_keywords = [
            # AWS
            "ECS:5", "ECR:5", "EKS:5", "S3:5", "EC2:5", "IAM:5", "VPC:5",
            "RDS:3", "SQS:3", "SNS:3", "Lambda:3", "CloudFront:3", "DynamoDB:3",
            "Fargate:3", "CDK:3", "CloudFormation:3", "ALB:3", "NLB:3",
            # GCP
            "GKE:3", "BigQuery:3", "Pub/Sub:3", "GCS:3", "Spanner:3",
            # Azure
            "AKS:3", "Cosmos DB:3", "Blob Storage:3",
            # Containers & orchestration
            "Kubernetes:3", "Docker:3", "Helm:3", "Istio:3", "Envoy:3",
            # Databases
            "PostgreSQL:3", "MySQL:3", "MongoDB:3", "Cassandra:3", "Redis:3",
            "Elasticsearch:3", "Kafka:3", "RabbitMQ:3", "NATS:3",
            # Programming
            "TypeScript:3", "JavaScript:3", "Python:3", "Golang:3", "Rust:3",
            "Node.js:3", "React:3", "Next.js:3", "FastAPI:3", "GraphQL:3",
            "gRPC:3", "REST API:3", "WebSocket:3",
            # System design concepts
            "microservices:2", "monolith:2", "event-driven:2", "CQRS:3",
            "saga pattern:2", "circuit breaker:2", "load balancer:2",
            "sharding:2", "replication:2", "CAP theorem:2", "ACID:3",
            "BASE:3", "idempotent:2", "eventual consistency:2",
            # CI/CD & DevOps
            "CI/CD:3", "GitHub Actions:3", "Terraform:3", "Ansible:3",
            "Prometheus:3", "Grafana:3", "Datadog:3", "Splunk:3",
            # Interview terms
            "STAR method:2", "behavioral:2", "system design:2",
            "LeetCode:3", "two sum:2", "binary search:2", "BFS:3", "DFS:3",
            "dynamic programming:2", "Big O:3", "O(n):3", "O(log n):3",
            # Company names
            "Google:2", "Amazon:2", "Meta:2", "Microsoft:2", "Apple:2",
            "Netflix:2", "Uber:2", "Airbnb:2", "Stripe:2", "OpenAI:2",
        ]
        options = LiveOptions(
            model="nova-2",
            language=self.language,  # "en" for faster English-only, "multi" for auto-detect all
            encoding="linear16",
            sample_rate=16000,
            channels=1,
            interim_results=True,
            punctuate=True,
            endpointing=DEEPGRAM_ENDPOINTING_MS,
            smart_format=True,
            keywords=tech_keywords,
        )
        logger.info("[DG] Using language mode: %s", self.language)

        # start() is SYNC in Deepgram SDK 3.x
        self.connection.start(options)

        if self._watchdog_task is None or self._watchdog_task.done():
            self._watchdog_task = asyncio.create_task(self.guard.watchdog())

        if self.guard:
            self.guard.note_audio_activity()

        logger.info("[DG] Service started")
        logger.info("Deepgram connected (start called)")

    def send_audio(self, audio_bytes: bytes):
        if not self.enabled or not self.active or not self.connection:
            return

        if self.guard:
            self.guard.note_audio_activity()

        if isinstance(audio_bytes, bytearray):
            audio_bytes = bytes(audio_bytes)

        self.connection.send(audio_bytes)

    # ==========================
    # 🔥 EVENT HANDLERS (MUST BE INSIDE CLASS)
    # ==========================

    def _on_transcript(self, client, result):
        try:
            if not self.enabled or not self.active:
                return

            if not self.connection:
                return

            channel = result.channel
            if not channel or not channel.alternatives:
                return

            alt = channel.alternatives[0]
            text = alt.transcript.strip()
            if not text:
                return

            is_final = result.is_final
            # VAD signal: True when Deepgram detects end of speech utterance
            speech_final = getattr(result, "speech_final", False)
            
            # Word-level data for detailed analysis
            words = getattr(alt, "words", []) or []
            word_count = len(words)
            
            # ISSUE 2 FIX: Use word-level average confidence (more stable than alternative-level)
            # Alternative-level confidence can fluctuate; word average is production-grade
            alt_confidence = getattr(alt, "confidence", 0.0) or 0.0
            if words and len(words) > 0:
                word_confidences = [getattr(w, "confidence", 0.0) or 0.0 for w in words]
                # Filter out zero confidences (missing data)
                valid_confs = [c for c in word_confidences if c > 0]
                word_avg_confidence = sum(valid_confs) / len(valid_confs) if valid_confs else alt_confidence
            else:
                word_avg_confidence = alt_confidence
            
            # Use word average as primary, fallback to alternative confidence
            confidence = word_avg_confidence if word_avg_confidence > 0 else alt_confidence

            message = {
                "text": text,
                "is_final": is_final,
                "speech_final": speech_final,
                "confidence": confidence,
                "alt_confidence": alt_confidence,  # Keep original for comparison
                "word_avg_confidence": word_avg_confidence,
                "word_count": word_count,
                "start": getattr(result, "start", 0),
            }

            if self.guard and not self.guard.is_in_order(message):
                return

            logger.info("DG TEXT: %s | final=%s | speech_final=%s | conf=%.2f | words=%d", 
                       text, is_final, speech_final, confidence, word_count)

            self.transcript_queue.put_nowait(message)

        except Exception as e:
            logger.error("Deepgram transcript parse error: %s", e)

    def _on_metadata(self, client, metadata):
        logger.info("Deepgram metadata received: %s", metadata)

    def _on_error(self, client, error):
        logger.error("Deepgram error event: %s", error)

    async def get_transcript(self):
        if not self.enabled:
            raise RuntimeError("Deepgram disabled in QA mode")
        return await self.transcript_queue.get()
    
    def stop(self):
            """
            Immediate shutdown hook (sync-safe).
            Used when WebSocket stops unexpectedly.
            """
            self.active = False
            self._closed = True
            if self.guard:
                self.guard.stop()
            self._safe_finish_connection()
            logger.info("[DG] Service stopped")


    async def close(self):
            """
            Graceful async shutdown.
            Safe to call multiple times.
            """
            self.active = False
            self._closed = True
            if self.guard:
                self.guard.stop()
            if self._watchdog_task and not self._watchdog_task.done():
                self._watchdog_task.cancel()
                try:
                    await self._watchdog_task
                except asyncio.CancelledError:
                    pass

            if self.connection:
                self._safe_finish_connection()
                logger.info("Deepgram closed")

            logger.info("[DG] Service stopped")

