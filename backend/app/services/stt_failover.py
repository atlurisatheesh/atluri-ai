"""
STT Failover Service - Production-Grade Speech-to-Text with Automatic Failover

Implements circuit breaker pattern with multi-provider failover:
  Primary: Deepgram Nova-2 (fastest, lowest latency)
  Secondary: OpenAI Whisper API (most accurate)
  Tertiary: Azure Speech (enterprise backup)

Features:
- Circuit breaker with configurable thresholds
- Automatic provider health monitoring
- Request-level failover (no session interruption)
- Metrics collection for observability
- Graceful degradation under load

Author: Production Engineering Team
Version: 1.0.0
"""

import asyncio
import os
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Callable, Any
from collections import deque
import json
import httpx

logger = logging.getLogger(__name__)


class STTProvider(Enum):
    """Available STT providers in priority order"""
    DEEPGRAM = "deepgram"
    OPENAI_WHISPER = "openai_whisper"
    AZURE_SPEECH = "azure_speech"
    LOCAL_WHISPER = "local_whisper"


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Provider failing, skip
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class ProviderHealth:
    """Health status for a single provider"""
    provider: STTProvider
    state: CircuitState = CircuitState.CLOSED
    
    # Failure tracking
    consecutive_failures: int = 0
    total_failures: int = 0
    total_requests: int = 0
    
    # Timing
    last_failure_time: Optional[float] = None
    last_success_time: Optional[float] = None
    circuit_opened_at: Optional[float] = None
    
    # Latency tracking (sliding window)
    latencies: deque = field(default_factory=lambda: deque(maxlen=100))
    
    # Configuration
    failure_threshold: int = 5       # Failures before opening circuit
    recovery_timeout_sec: float = 30  # Time before half-open
    success_threshold: int = 3        # Successes to close circuit
    
    @property
    def availability(self) -> float:
        """Current availability percentage"""
        if self.total_requests == 0:
            return 100.0
        return ((self.total_requests - self.total_failures) / self.total_requests) * 100
    
    @property
    def avg_latency_ms(self) -> float:
        """Average latency in ms"""
        if not self.latencies:
            return 0.0
        return sum(self.latencies) / len(self.latencies)
    
    @property
    def p95_latency_ms(self) -> float:
        """95th percentile latency"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        idx = int(len(sorted_latencies) * 0.95)
        return sorted_latencies[min(idx, len(sorted_latencies) - 1)]
    
    def record_success(self, latency_ms: float):
        """Record successful request"""
        self.total_requests += 1
        self.consecutive_failures = 0
        self.last_success_time = time.time()
        self.latencies.append(latency_ms)
        
        if self.state == CircuitState.HALF_OPEN:
            # Recovery in progress
            if self.consecutive_successes >= self.success_threshold:
                self.state = CircuitState.CLOSED
                logger.info("[STT-FAILOVER] Circuit CLOSED for %s (recovered)", self.provider.value)
    
    def record_failure(self, error: str):
        """Record failed request"""
        self.total_requests += 1
        self.total_failures += 1
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.CLOSED:
            if self.consecutive_failures >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.circuit_opened_at = time.time()
                logger.warning(
                    "[STT-FAILOVER] Circuit OPEN for %s after %d failures: %s",
                    self.provider.value, self.consecutive_failures, error
                )
        elif self.state == CircuitState.HALF_OPEN:
            # Failed during recovery - reopen
            self.state = CircuitState.OPEN
            self.circuit_opened_at = time.time()
            logger.warning("[STT-FAILOVER] Circuit reopened for %s", self.provider.value)
    
    @property
    def consecutive_successes(self) -> int:
        """Count of consecutive successes (inverse of failures)"""
        return self.failure_threshold - self.consecutive_failures if self.consecutive_failures < self.failure_threshold else 0
    
    def should_allow_request(self) -> bool:
        """Check if requests should be allowed"""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout elapsed
            if self.circuit_opened_at and (time.time() - self.circuit_opened_at) >= self.recovery_timeout_sec:
                self.state = CircuitState.HALF_OPEN
                logger.info("[STT-FAILOVER] Circuit HALF-OPEN for %s (testing recovery)", self.provider.value)
                return True
            return False
        
        # HALF_OPEN - allow limited requests
        return True


@dataclass
class TranscriptionResult:
    """Result from STT transcription"""
    text: str
    confidence: float
    provider: STTProvider
    latency_ms: float
    is_final: bool = True
    word_count: int = 0
    failover_used: bool = False
    original_provider: Optional[STTProvider] = None
    error: Optional[str] = None


class STTFailoverService:
    """
    Production-grade STT service with automatic failover.
    
    Usage:
        service = STTFailoverService()
        await service.initialize()
        
        result = await service.transcribe(audio_bytes)
        print(f"Text: {result.text} (via {result.provider.value})")
    """
    
    def __init__(
        self,
        primary_provider: STTProvider = STTProvider.DEEPGRAM,
        enable_openai: bool = True,
        enable_azure: bool = False,
        enable_local_whisper: bool = False,
        failure_threshold: int = 5,
        recovery_timeout_sec: float = 30,
    ):
        self.primary_provider = primary_provider
        
        # Provider priority order
        self.provider_order: List[STTProvider] = [primary_provider]
        if enable_openai:
            self.provider_order.append(STTProvider.OPENAI_WHISPER)
        if enable_azure:
            self.provider_order.append(STTProvider.AZURE_SPEECH)
        if enable_local_whisper:
            self.provider_order.append(STTProvider.LOCAL_WHISPER)
        
        # Health tracking per provider
        self.health: Dict[STTProvider, ProviderHealth] = {}
        for provider in self.provider_order:
            self.health[provider] = ProviderHealth(
                provider=provider,
                failure_threshold=failure_threshold,
                recovery_timeout_sec=recovery_timeout_sec,
            )
        
        # API clients (lazy initialized)
        self._deepgram_client = None
        self._openai_client = None
        self._azure_client = None
        self._local_whisper = None
        
        # Metrics
        self.total_requests = 0
        self.total_failovers = 0
        self.failover_history: deque = deque(maxlen=1000)
        
        self._initialized = False
    
    async def initialize(self):
        """Initialize API clients"""
        if self._initialized:
            return
        
        # Initialize available providers
        for provider in self.provider_order:
            try:
                if provider == STTProvider.DEEPGRAM:
                    api_key = os.getenv("DEEPGRAM_API_KEY")
                    if api_key:
                        logger.info("[STT-FAILOVER] Deepgram configured")
                    else:
                        logger.warning("[STT-FAILOVER] DEEPGRAM_API_KEY not set")
                        
                elif provider == STTProvider.OPENAI_WHISPER:
                    api_key = os.getenv("OPENAI_API_KEY")
                    if api_key:
                        logger.info("[STT-FAILOVER] OpenAI Whisper configured")
                    else:
                        logger.warning("[STT-FAILOVER] OPENAI_API_KEY not set")
                        
                elif provider == STTProvider.LOCAL_WHISPER:
                    try:
                        import whisper
                        self._local_whisper = whisper.load_model("base")
                        logger.info("[STT-FAILOVER] Local Whisper loaded")
                    except ImportError:
                        logger.warning("[STT-FAILOVER] Local Whisper not available")
                        
            except Exception as e:
                logger.error("[STT-FAILOVER] Failed to init %s: %s", provider.value, e)
        
        self._initialized = True
        logger.info("[STT-FAILOVER] Initialized with providers: %s", 
                   [p.value for p in self.provider_order])
    
    async def transcribe(
        self,
        audio_bytes: bytes,
        language: str = "en",
        timeout_sec: float = 10.0,
    ) -> TranscriptionResult:
        """
        Transcribe audio with automatic failover.
        
        Tries providers in order until one succeeds.
        """
        if not self._initialized:
            await self.initialize()
        
        self.total_requests += 1
        original_provider = None
        last_error = None
        
        for idx, provider in enumerate(self.provider_order):
            health = self.health[provider]
            
            # Check circuit breaker
            if not health.should_allow_request():
                logger.debug("[STT-FAILOVER] Skipping %s (circuit open)", provider.value)
                continue
            
            if original_provider is None:
                original_provider = provider
            
            try:
                start_time = time.time()
                
                result = await asyncio.wait_for(
                    self._transcribe_with_provider(provider, audio_bytes, language),
                    timeout=timeout_sec
                )
                
                latency_ms = (time.time() - start_time) * 1000
                health.record_success(latency_ms)
                
                # Check if failover was used
                failover_used = idx > 0
                if failover_used:
                    self.total_failovers += 1
                    self.failover_history.append({
                        "timestamp": datetime.now().isoformat(),
                        "from": original_provider.value if original_provider else "unknown",
                        "to": provider.value,
                        "reason": str(last_error) if last_error else "unknown",
                    })
                    logger.info(
                        "[STT-FAILOVER] Failover success: %s -> %s",
                        original_provider.value if original_provider else "unknown",
                        provider.value
                    )
                
                return TranscriptionResult(
                    text=result["text"],
                    confidence=result.get("confidence", 0.9),
                    provider=provider,
                    latency_ms=latency_ms,
                    is_final=result.get("is_final", True),
                    word_count=len(result["text"].split()),
                    failover_used=failover_used,
                    original_provider=original_provider if failover_used else None,
                )
                
            except asyncio.TimeoutError:
                last_error = f"Timeout after {timeout_sec}s"
                health.record_failure(last_error)
                logger.warning("[STT-FAILOVER] %s timeout, trying next", provider.value)
                
            except Exception as e:
                last_error = str(e)
                health.record_failure(last_error)
                logger.warning("[STT-FAILOVER] %s error: %s, trying next", provider.value, e)
        
        # All providers failed
        logger.error("[STT-FAILOVER] All providers failed. Last error: %s", last_error)
        return TranscriptionResult(
            text="",
            confidence=0.0,
            provider=original_provider or self.primary_provider,
            latency_ms=0.0,
            error=f"All STT providers failed: {last_error}",
        )
    
    async def _transcribe_with_provider(
        self,
        provider: STTProvider,
        audio_bytes: bytes,
        language: str,
    ) -> Dict[str, Any]:
        """Transcribe using specific provider"""
        
        if provider == STTProvider.DEEPGRAM:
            return await self._transcribe_deepgram(audio_bytes, language)
        
        elif provider == STTProvider.OPENAI_WHISPER:
            return await self._transcribe_openai_whisper(audio_bytes, language)
        
        elif provider == STTProvider.AZURE_SPEECH:
            return await self._transcribe_azure(audio_bytes, language)
        
        elif provider == STTProvider.LOCAL_WHISPER:
            return await self._transcribe_local_whisper(audio_bytes, language)
        
        raise ValueError(f"Unknown provider: {provider}")
    
    async def _transcribe_deepgram(self, audio_bytes: bytes, language: str) -> Dict[str, Any]:
        """Transcribe using Deepgram API"""
        api_key = os.getenv("DEEPGRAM_API_KEY")
        if not api_key:
            raise ValueError("DEEPGRAM_API_KEY not set")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepgram.com/v1/listen",
                params={
                    "model": "nova-2",
                    "language": language,
                    "punctuate": "true",
                    "smart_format": "true",
                },
                headers={
                    "Authorization": f"Token {api_key}",
                    "Content-Type": "audio/wav",
                },
                content=audio_bytes,
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract transcript
            channels = data.get("results", {}).get("channels", [])
            if not channels:
                return {"text": "", "confidence": 0.0}
            
            alt = channels[0].get("alternatives", [{}])[0]
            return {
                "text": alt.get("transcript", ""),
                "confidence": alt.get("confidence", 0.9),
                "is_final": True,
            }
    
    async def _transcribe_openai_whisper(self, audio_bytes: bytes, language: str) -> Dict[str, Any]:
        """Transcribe using OpenAI Whisper API"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        import tempfile
        import os as os_module
        
        # Write to temp file (Whisper API requires file)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            async with httpx.AsyncClient() as client:
                with open(temp_path, "rb") as audio_file:
                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {api_key}"},
                        files={"file": ("audio.wav", audio_file, "audio/wav")},
                        data={
                            "model": "whisper-1",
                            "language": language,
                        },
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    return {
                        "text": data.get("text", ""),
                        "confidence": 0.95,  # Whisper doesn't return confidence
                        "is_final": True,
                    }
        finally:
            os_module.unlink(temp_path)
    
    async def _transcribe_azure(self, audio_bytes: bytes, language: str) -> Dict[str, Any]:
        """Transcribe using Azure Speech Services"""
        subscription_key = os.getenv("AZURE_SPEECH_KEY")
        region = os.getenv("AZURE_SPEECH_REGION", "eastus")
        
        if not subscription_key:
            raise ValueError("AZURE_SPEECH_KEY not set")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1",
                params={
                    "language": f"{language}-US",
                },
                headers={
                    "Ocp-Apim-Subscription-Key": subscription_key,
                    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
                },
                content=audio_bytes,
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "text": data.get("DisplayText", ""),
                "confidence": data.get("Confidence", 0.9),
                "is_final": True,
            }
    
    async def _transcribe_local_whisper(self, audio_bytes: bytes, language: str) -> Dict[str, Any]:
        """Transcribe using local Whisper model"""
        if self._local_whisper is None:
            raise ValueError("Local Whisper not available")
        
        import tempfile
        import os as os_module
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            # Run in thread pool (Whisper is CPU-bound)
            result = await asyncio.to_thread(
                self._local_whisper.transcribe,
                temp_path,
                language=language,
            )
            
            return {
                "text": result.get("text", ""),
                "confidence": 0.85,
                "is_final": True,
            }
        finally:
            os_module.unlink(temp_path)
    
    def get_health_report(self) -> Dict[str, Any]:
        """Get health status of all providers"""
        providers = {}
        for provider, health in self.health.items():
            providers[provider.value] = {
                "state": health.state.value,
                "availability": round(health.availability, 2),
                "avg_latency_ms": round(health.avg_latency_ms, 1),
                "p95_latency_ms": round(health.p95_latency_ms, 1),
                "total_requests": health.total_requests,
                "total_failures": health.total_failures,
                "consecutive_failures": health.consecutive_failures,
            }
        
        return {
            "total_requests": self.total_requests,
            "total_failovers": self.total_failovers,
            "failover_rate": round(
                (self.total_failovers / max(self.total_requests, 1)) * 100, 2
            ),
            "providers": providers,
            "recent_failovers": list(self.failover_history)[-10:],
        }
    
    def reset_circuit(self, provider: STTProvider):
        """Manually reset circuit breaker for a provider"""
        if provider in self.health:
            self.health[provider].state = CircuitState.CLOSED
            self.health[provider].consecutive_failures = 0
            self.health[provider].circuit_opened_at = None
            logger.info("[STT-FAILOVER] Circuit manually reset for %s", provider.value)


# Singleton instance for app-wide use
_stt_service: Optional[STTFailoverService] = None


def get_stt_service() -> STTFailoverService:
    """Get or create singleton STT service"""
    global _stt_service
    if _stt_service is None:
        _stt_service = STTFailoverService()
    return _stt_service


async def transcribe_with_failover(
    audio_bytes: bytes,
    language: str = "en",
    timeout_sec: float = 10.0,
) -> TranscriptionResult:
    """Convenience function for transcription with failover"""
    service = get_stt_service()
    return await service.transcribe(audio_bytes, language, timeout_sec)


# CLI for testing
if __name__ == "__main__":
    import argparse
    
    async def test_failover():
        print("=" * 60)
        print("STT FAILOVER SERVICE TEST")
        print("=" * 60)
        
        service = STTFailoverService(
            enable_openai=True,
            enable_local_whisper=False,
        )
        await service.initialize()
        
        # Simulate test audio (silence)
        test_audio = b"\x00" * 16000 * 2  # 1 second of silence
        
        print("\n[Test 1] Normal transcription...")
        result = await service.transcribe(test_audio)
        print(f"  Provider: {result.provider.value}")
        print(f"  Latency: {result.latency_ms:.0f}ms")
        print(f"  Failover: {result.failover_used}")
        
        # Simulate Deepgram failure
        print("\n[Test 2] Simulating Deepgram failures...")
        for i in range(6):
            service.health[STTProvider.DEEPGRAM].record_failure(f"Simulated failure {i+1}")
        
        print(f"  Deepgram circuit state: {service.health[STTProvider.DEEPGRAM].state.value}")
        
        result = await service.transcribe(test_audio)
        print(f"  Provider used: {result.provider.value}")
        print(f"  Failover: {result.failover_used}")
        
        print("\n[Health Report]")
        report = service.get_health_report()
        for provider, stats in report["providers"].items():
            print(f"  {provider}: {stats['state']} | {stats['availability']}% available")
        
        print(f"\nTotal failovers: {report['total_failovers']}")
        print(f"Failover rate: {report['failover_rate']}%")
        
        print("\n" + "=" * 60)
        print("TEST COMPLETE")
        print("=" * 60)
    
    asyncio.run(test_failover())
