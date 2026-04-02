"""
Hybrid STT Pipeline — Deepgram (speed) + Whisper (accuracy) + GPT Post-Correction

Architecture:
  1. Deepgram Nova-2 handles real-time streaming → instant partial transcripts
  2. When Deepgram returns is_final=True, the audio buffer for that utterance is sent
     to OpenAI Whisper API for a second-pass correction
  3. A lightweight GPT-4o-mini post-processor fixes remaining technical terms
  4. The corrected transcript replaces the Deepgram version in the pipeline

This gives Whisper-level accuracy with Deepgram-level latency for partials.

Config via environment:
  STT_MODE=hybrid         (default) Deepgram streaming + Whisper correction
  STT_MODE=deepgram       Deepgram only (fastest, less accurate on tech terms)
  STT_MODE=whisper        Whisper only via buffered chunks (most accurate, higher latency)
  STT_CORRECTION=gpt      (default) GPT post-correction enabled
  STT_CORRECTION=off      No post-correction
"""

import os
import io
import wave
import asyncio
import logging
import time
from typing import Optional, Dict, Any, List
from collections import deque

import httpx

logger = logging.getLogger("hybrid_stt")

# ─── Config ────────────────────────────────────────────────────────────
STT_MODE = os.getenv("STT_MODE", "hybrid").lower()
STT_CORRECTION = os.getenv("STT_CORRECTION", "gpt").lower()
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "whisper-1")
CORRECTION_MODEL = os.getenv("STT_CORRECTION_MODEL", "gpt-4o-mini")

# Audio buffer: accumulate PCM frames for each utterance so Whisper can re-transcribe
AUDIO_BUFFER_MAX_SEC = 30  # max seconds of audio to buffer per utterance
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2  # PCM16
MAX_BUFFER_BYTES = AUDIO_BUFFER_MAX_SEC * SAMPLE_RATE * BYTES_PER_SAMPLE

# Technical vocabulary for GPT correction
TECH_VOCABULARY = [
    # AWS
    "ECS", "ECR", "EKS", "EC2", "S3", "IAM", "VPC", "RDS", "SQS", "SNS",
    "Lambda", "CloudFront", "DynamoDB", "Fargate", "CDK", "CloudFormation",
    "ALB", "NLB", "API Gateway", "CloudWatch", "Kinesis", "Redshift",
    "SageMaker", "Bedrock", "Step Functions", "EventBridge",
    # GCP
    "GKE", "BigQuery", "Pub/Sub", "GCS", "Spanner", "Cloud Run",
    "Vertex AI", "Firestore", "Cloud Functions",
    # Azure
    "AKS", "Cosmos DB", "Blob Storage", "Azure DevOps", "App Service",
    # Containers & orchestration
    "Kubernetes", "Docker", "Helm", "Istio", "Envoy", "Linkerd",
    "containerd", "Podman", "ArgoCD", "FluxCD",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Cassandra", "Redis", "Memcached",
    "Elasticsearch", "OpenSearch", "Kafka", "RabbitMQ", "NATS", "Pulsar",
    "CockroachDB", "TiDB", "ScyllaDB", "ClickHouse",
    # Programming
    "TypeScript", "JavaScript", "Python", "Golang", "Rust", "Java", "Kotlin",
    "Node.js", "Deno", "Bun", "React", "Next.js", "Vue.js", "Svelte",
    "FastAPI", "Django", "Flask", "Spring Boot", "Express.js",
    "GraphQL", "gRPC", "tRPC", "REST API", "WebSocket", "SSE",
    # System design
    "microservices", "monolith", "event-driven", "CQRS", "event sourcing",
    "saga pattern", "circuit breaker", "load balancer", "reverse proxy",
    "sharding", "partitioning", "replication", "consensus",
    "CAP theorem", "ACID", "BASE", "idempotent", "eventual consistency",
    "distributed lock", "Raft", "Paxos", "two-phase commit",
    # Algorithms & DS
    "Big O", "O(n)", "O(log n)", "O(n log n)", "O(1)",
    "hash map", "hash table", "binary tree", "B-tree", "trie",
    "BFS", "DFS", "Dijkstra", "topological sort", "dynamic programming",
    "memoization", "sliding window", "two pointer", "backtracking",
    "LRU cache", "LFU cache", "bloom filter", "skip list",
    # CI/CD & DevOps
    "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "CircleCI",
    "Terraform", "Pulumi", "Ansible", "Chef", "Puppet",
    "Prometheus", "Grafana", "Datadog", "Splunk", "New Relic", "PagerDuty",
    # AI/ML
    "GPT", "GPT-4", "GPT-4o", "Claude", "Gemini", "LLaMA", "Mistral",
    "transformer", "attention mechanism", "RAG", "fine-tuning", "RLHF",
    "embeddings", "vector database", "Pinecone", "Weaviate", "Milvus",
    "LangChain", "LlamaIndex", "Hugging Face",
    # Companies
    "Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix",
    "Uber", "Airbnb", "Stripe", "Shopify", "Figma", "Notion",
    "Databricks", "Snowflake", "Confluent", "HashiCorp",
    # Interview
    "STAR method", "behavioral", "system design", "LeetCode", "HackerRank",
    "two sum", "binary search", "merge sort", "quick sort",
    "leadership principles", "ownership", "bias for action",
]


class AudioUtteranceBuffer:
    """Accumulates PCM16 audio frames for a single utterance (between is_final events)."""

    def __init__(self):
        self._chunks: List[bytes] = []
        self._total_bytes = 0

    def append(self, pcm_data: bytes):
        if self._total_bytes + len(pcm_data) > MAX_BUFFER_BYTES:
            return  # don't overflow
        self._chunks.append(pcm_data)
        self._total_bytes += len(pcm_data)

    def to_wav_bytes(self) -> bytes:
        """Convert accumulated PCM16 to a WAV file in memory."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(BYTES_PER_SAMPLE)
            wf.setframerate(SAMPLE_RATE)
            for chunk in self._chunks:
                wf.writeframes(chunk)
        return buf.getvalue()

    def clear(self):
        self._chunks.clear()
        self._total_bytes = 0

    @property
    def duration_sec(self) -> float:
        return self._total_bytes / (SAMPLE_RATE * BYTES_PER_SAMPLE)

    @property
    def is_empty(self) -> bool:
        return self._total_bytes == 0


class HybridSTTCorrector:
    """
    Runs Whisper second-pass + GPT correction on finalized Deepgram transcripts.

    Usage:
        corrector = HybridSTTCorrector()
        corrector.feed_audio(pcm_bytes)  # call on each audio frame

        # When Deepgram returns is_final=True:
        corrected = await corrector.correct(deepgram_text)
        # corrected is the Whisper + GPT refined version
    """

    def __init__(self):
        self.audio_buffer = AudioUtteranceBuffer()
        self._openai_key = os.getenv("OPENAI_API_KEY", "")
        self._http: Optional[httpx.AsyncClient] = None
        self._correction_cache: Dict[str, str] = {}
        self._stats = {
            "whisper_calls": 0,
            "gpt_corrections": 0,
            "corrections_made": 0,
            "avg_whisper_latency_ms": 0.0,
            "avg_gpt_latency_ms": 0.0,
        }
        self._whisper_latencies: deque = deque(maxlen=50)
        self._gpt_latencies: deque = deque(maxlen=50)

    async def _get_http(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(timeout=15.0)
        return self._http

    def feed_audio(self, pcm_data: bytes):
        """Feed raw PCM16 audio into the utterance buffer. Call on every audio frame."""
        self.audio_buffer.append(pcm_data)

    async def correct(self, deepgram_text: str) -> Dict[str, Any]:
        """
        Run Whisper + GPT correction on a finalized Deepgram transcript.

        Returns:
            {
                "text": corrected_text,
                "source": "whisper+gpt" | "whisper" | "deepgram",
                "deepgram_original": deepgram_text,
                "whisper_text": whisper_text | None,
                "corrections": [...],
                "latency_ms": total_latency,
            }
        """
        start = time.time()
        result = {
            "text": deepgram_text,
            "source": "deepgram",
            "deepgram_original": deepgram_text,
            "whisper_text": None,
            "corrections": [],
            "latency_ms": 0.0,
        }

        # ── Step 1: Whisper second-pass (if audio available) ──
        whisper_text = None
        if STT_MODE in ("hybrid", "whisper") and not self.audio_buffer.is_empty:
            whisper_text = await self._whisper_transcribe()
            if whisper_text:
                result["whisper_text"] = whisper_text
                result["text"] = whisper_text
                result["source"] = "whisper"
                logger.info(
                    "[HYBRID] Whisper correction: '%s' → '%s'",
                    deepgram_text[:60], whisper_text[:60],
                )

        # ── Step 2: GPT post-correction (for remaining technical terms) ──
        base_text = whisper_text or deepgram_text
        if STT_CORRECTION == "gpt" and base_text:
            corrected, corrections = await self._gpt_correct(base_text)
            if corrected != base_text:
                result["text"] = corrected
                result["corrections"] = corrections
                result["source"] = f"{result['source']}+gpt"
                logger.info(
                    "[HYBRID] GPT corrections: %s",
                    corrections,
                )

        # ── Cleanup ──
        self.audio_buffer.clear()
        result["latency_ms"] = (time.time() - start) * 1000

        return result

    async def _whisper_transcribe(self) -> Optional[str]:
        """Send buffered audio to OpenAI Whisper API."""
        if not self._openai_key:
            logger.warning("[HYBRID] No OPENAI_API_KEY — skipping Whisper pass")
            return None

        wav_bytes = self.audio_buffer.to_wav_bytes()
        if len(wav_bytes) < 1000:  # too short
            return None

        start = time.time()
        try:
            client = await self._get_http()
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {self._openai_key}"},
                files={"file": ("utterance.wav", wav_bytes, "audio/wav")},
                data={
                    "model": WHISPER_MODEL,
                    "language": "en",
                    "prompt": (
                        "Technical interview discussion about software engineering. "
                        "Common terms: " + ", ".join(TECH_VOCABULARY[:40])
                    ),
                },
            )
            resp.raise_for_status()
            text = resp.json().get("text", "").strip()

            latency = (time.time() - start) * 1000
            self._whisper_latencies.append(latency)
            self._stats["whisper_calls"] += 1
            self._stats["avg_whisper_latency_ms"] = (
                sum(self._whisper_latencies) / len(self._whisper_latencies)
            )
            logger.info("[HYBRID] Whisper transcribed in %.0fms: %s", latency, text[:80])
            return text if text else None

        except Exception as exc:
            logger.warning("[HYBRID] Whisper API failed: %s", exc)
            return None

    async def _gpt_correct(self, text: str) -> tuple[str, List[str]]:
        """Use GPT-4o-mini to fix technical term misrecognitions."""
        if not self._openai_key:
            return text, []

        # Skip very short texts
        if len(text.split()) < 3:
            return text, []

        # Check cache
        cache_key = text.lower().strip()
        if cache_key in self._correction_cache:
            cached = self._correction_cache[cache_key]
            return cached, [] if cached == text else [f"cached: {text} → {cached}"]

        start = time.time()
        try:
            client = await self._get_http()

            # Build a focused system prompt with vocabulary
            vocab_sample = ", ".join(TECH_VOCABULARY[:80])
            system_prompt = (
                "You are a speech-to-text post-processor for technical software engineering interviews. "
                "Your ONLY job is to fix misrecognized technical terms. Do NOT rephrase, summarize, or add words. "
                "Return ONLY the corrected transcript, nothing else.\n\n"
                "Common misrecognitions to fix:\n"
                "- 'CCS' → 'ECS' (AWS container service)\n"
                "- 'cooper netties' or 'kubernetes' → 'Kubernetes'\n"
                "- 'post grass' → 'PostgreSQL'\n"
                "- 'G RPC' or 'grpc' → 'gRPC'\n"
                "- 'dynamo db' → 'DynamoDB'\n"
                "- 'big oh' or 'big o of n' → 'Big O of n' or 'O(n)'\n"
                "- 'react js' → 'React.js' or 'React'\n"
                "- 'no js' → 'Node.js'\n"
                "- 'type script' → 'TypeScript'\n"
                "- 'LR you cash' → 'LRU cache'\n"
                "- 'bee first search' → 'BFS'\n"
                "- 'dee first search' → 'DFS'\n"
                "- 'two phase commit' → 'two-phase commit'\n"
                "- 'micro services' → 'microservices'\n"
                "- 'sequel' → 'SQL'\n"
                "- 'no sequel' → 'NoSQL'\n"
                "- 'see I see D' → 'CI/CD'\n"
                "- 'lamda' → 'Lambda'\n"
                "- 'terra form' → 'Terraform'\n"
                f"\nTechnical vocabulary for reference: {vocab_sample}\n\n"
                "Rules:\n"
                "1. Fix only clear misrecognitions of technical terms\n"
                "2. Preserve the speaker's original sentence structure\n"
                "3. Do not add punctuation that changes meaning\n"
                "4. If nothing needs fixing, return the input unchanged\n"
                "5. NEVER add explanations — return ONLY the corrected text"
            )

            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": CORRECTION_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": text},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.0,
                },
            )
            resp.raise_for_status()
            corrected = resp.json()["choices"][0]["message"]["content"].strip()

            latency = (time.time() - start) * 1000
            self._gpt_latencies.append(latency)
            self._stats["gpt_corrections"] += 1
            self._stats["avg_gpt_latency_ms"] = (
                sum(self._gpt_latencies) / len(self._gpt_latencies)
            )

            # Cache the result
            self._correction_cache[cache_key] = corrected

            # Detect what changed
            corrections = []
            if corrected.lower() != text.lower():
                self._stats["corrections_made"] += 1
                # Find specific word changes
                orig_words = text.split()
                corr_words = corrected.split()
                for i, (o, c) in enumerate(zip(orig_words, corr_words)):
                    if o.lower() != c.lower():
                        corrections.append(f"'{o}' → '{c}'")

            logger.info("[HYBRID] GPT corrected in %.0fms: %d changes", latency, len(corrections))
            return corrected, corrections

        except Exception as exc:
            logger.warning("[HYBRID] GPT correction failed: %s", exc)
            return text, []

    def get_stats(self) -> Dict[str, Any]:
        """Return accumulated statistics."""
        return dict(self._stats)

    async def close(self):
        """Cleanup HTTP client."""
        if self._http and not self._http.is_closed:
            await self._http.aclose()
