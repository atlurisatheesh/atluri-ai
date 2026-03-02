"""
Multi-Model ASR Comparison Harness

Compares transcription quality between different ASR providers:
- Deepgram (primary, real-time)
- OpenAI Whisper (batch, high accuracy)
- Browser Web Speech API (fallback)

Use Cases:
1. Quality validation during development
2. Accuracy benchmarking
3. Fallback strategy testing
4. Confidence calibration

Usage:
    harness = ASRComparisonHarness()
    
    # Compare single audio
    result = await harness.compare_audio(audio_bytes)
    print(result.winner, result.confidence_delta)
    
    # Run benchmark suite
    report = await harness.run_benchmark(audio_files)
"""

import asyncio
import logging
import time
import os
import json
import hashlib
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path
from enum import Enum

logger = logging.getLogger("asr_comparison")


class ASRProvider(str, Enum):
    """Supported ASR providers"""
    DEEPGRAM = "deepgram"
    WHISPER = "whisper"
    WEB_SPEECH = "web_speech"


@dataclass
class TranscriptionResult:
    """Result from a single ASR provider"""
    provider: ASRProvider
    text: str
    confidence: float
    latency_ms: float
    word_count: int
    error: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["provider"] = self.provider.value
        return d


@dataclass
class ComparisonResult:
    """Result of comparing multiple ASR providers"""
    audio_hash: str
    audio_duration_ms: float
    results: Dict[str, TranscriptionResult] = field(default_factory=dict)
    winner: Optional[ASRProvider] = None
    confidence_delta: float = 0.0
    word_error_rate: Optional[float] = None  # If ground truth available
    ground_truth: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        d = {
            "audio_hash": self.audio_hash,
            "audio_duration_ms": self.audio_duration_ms,
            "results": {k: v.to_dict() for k, v in self.results.items()},
            "winner": self.winner.value if self.winner else None,
            "confidence_delta": self.confidence_delta,
            "word_error_rate": self.word_error_rate,
            "ground_truth": self.ground_truth,
            "timestamp": self.timestamp,
        }
        return d


@dataclass  
class BenchmarkReport:
    """Report from running a full benchmark suite"""
    total_samples: int
    provider_wins: Dict[str, int] = field(default_factory=dict)
    avg_confidence: Dict[str, float] = field(default_factory=dict)
    avg_latency_ms: Dict[str, float] = field(default_factory=dict)
    avg_word_error_rate: Dict[str, float] = field(default_factory=dict)
    failures: Dict[str, int] = field(default_factory=dict)
    comparisons: List[ComparisonResult] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_samples": self.total_samples,
            "provider_wins": self.provider_wins,
            "avg_confidence": self.avg_confidence,
            "avg_latency_ms": self.avg_latency_ms,
            "avg_word_error_rate": self.avg_word_error_rate,
            "failures": self.failures,
            "comparisons": [c.to_dict() for c in self.comparisons],
        }


def calculate_wer(reference: str, hypothesis: str) -> float:
    """
    Calculate Word Error Rate between reference and hypothesis.
    
    WER = (S + D + I) / N
    S = substitutions, D = deletions, I = insertions, N = words in reference
    """
    ref_words = reference.lower().split()
    hyp_words = hypothesis.lower().split()
    
    if not ref_words:
        return 1.0 if hyp_words else 0.0
    
    # Dynamic programming for Levenshtein distance
    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
    
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j
    
    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            if ref_words[i-1] == hyp_words[j-1]:
                d[i][j] = d[i-1][j-1]
            else:
                d[i][j] = min(
                    d[i-1][j] + 1,      # deletion
                    d[i][j-1] + 1,      # insertion
                    d[i-1][j-1] + 1,    # substitution
                )
    
    return d[len(ref_words)][len(hyp_words)] / len(ref_words)


class ASRComparisonHarness:
    """
    Harness for comparing ASR providers.
    """
    
    def __init__(
        self,
        enable_deepgram: bool = True,
        enable_whisper: bool = True,
        save_results: bool = True,
        results_dir: Optional[str] = None,
    ):
        self.enable_deepgram = enable_deepgram
        self.enable_whisper = enable_whisper
        self.save_results = save_results
        self.results_dir = Path(results_dir or "backend/data/asr_comparisons")
        
        # Initialize providers lazily
        self._deepgram_client = None
        self._openai_client = None
    
    def _get_audio_hash(self, audio_bytes: bytes) -> str:
        """Get hash of audio for deduplication"""
        return hashlib.md5(audio_bytes).hexdigest()[:16]
    
    async def _transcribe_deepgram(self, audio_bytes: bytes) -> TranscriptionResult:
        """Transcribe using Deepgram"""
        from deepgram import DeepgramClient, PrerecordedOptions
        
        try:
            start = time.time()
            
            if self._deepgram_client is None:
                api_key = os.getenv("DEEPGRAM_API_KEY")
                if not api_key:
                    raise ValueError("DEEPGRAM_API_KEY not set")
                self._deepgram_client = DeepgramClient(api_key)
            
            options = PrerecordedOptions(
                model="nova-2",
                language="en",
                smart_format=True,
                punctuate=True,
            )
            
            source = {"buffer": audio_bytes, "mimetype": "audio/wav"}
            response = await asyncio.to_thread(
                self._deepgram_client.listen.prerecorded.v("1").transcribe_file,
                source,
                options,
            )
            
            latency_ms = (time.time() - start) * 1000
            
            # Extract results
            channel = response.results.channels[0]
            alt = channel.alternatives[0]
            
            return TranscriptionResult(
                provider=ASRProvider.DEEPGRAM,
                text=alt.transcript,
                confidence=alt.confidence,
                latency_ms=latency_ms,
                word_count=len(alt.words) if alt.words else len(alt.transcript.split()),
                raw_response=response.to_dict() if hasattr(response, 'to_dict') else None,
            )
            
        except Exception as e:
            logger.error("Deepgram transcription error: %s", e)
            return TranscriptionResult(
                provider=ASRProvider.DEEPGRAM,
                text="",
                confidence=0.0,
                latency_ms=0.0,
                word_count=0,
                error=str(e),
            )
    
    async def _transcribe_whisper(self, audio_bytes: bytes) -> TranscriptionResult:
        """Transcribe using OpenAI Whisper"""
        import openai
        import tempfile
        
        try:
            start = time.time()
            
            if self._openai_client is None:
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not set")
                self._openai_client = openai.OpenAI(api_key=api_key)
            
            # Write audio to temp file (Whisper API needs file)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes)
                temp_path = f.name
            
            try:
                with open(temp_path, "rb") as audio_file:
                    response = await asyncio.to_thread(
                        self._openai_client.audio.transcriptions.create,
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",
                    )
                
                latency_ms = (time.time() - start) * 1000
                
                # Whisper doesn't return per-phrase confidence, estimate from segments
                text = response.text
                confidence = 0.90  # Whisper is generally high quality
                
                # Try to get segment-level confidence if available
                if hasattr(response, 'segments') and response.segments:
                    avg_probs = []
                    for seg in response.segments:
                        if hasattr(seg, 'avg_logprob'):
                            # Convert log prob to probability
                            import math
                            avg_probs.append(math.exp(seg.avg_logprob))
                    if avg_probs:
                        confidence = sum(avg_probs) / len(avg_probs)
                
                return TranscriptionResult(
                    provider=ASRProvider.WHISPER,
                    text=text,
                    confidence=min(confidence, 1.0),
                    latency_ms=latency_ms,
                    word_count=len(text.split()),
                    raw_response=response.model_dump() if hasattr(response, 'model_dump') else None,
                )
                
            finally:
                os.unlink(temp_path)
            
        except Exception as e:
            logger.error("Whisper transcription error: %s", e)
            return TranscriptionResult(
                provider=ASRProvider.WHISPER,
                text="",
                confidence=0.0,
                latency_ms=0.0,
                word_count=0,
                error=str(e),
            )
    
    async def compare_audio(
        self,
        audio_bytes: bytes,
        ground_truth: Optional[str] = None,
        audio_duration_ms: float = 0.0,
    ) -> ComparisonResult:
        """
        Compare transcription from all enabled providers.
        
        Args:
            audio_bytes: Raw audio bytes (WAV format)
            ground_truth: Optional reference transcript for WER calculation
            audio_duration_ms: Duration of audio for stats
            
        Returns:
            ComparisonResult with all transcriptions and winner
        """
        audio_hash = self._get_audio_hash(audio_bytes)
        
        # Run transcriptions in parallel
        tasks = []
        if self.enable_deepgram:
            tasks.append(self._transcribe_deepgram(audio_bytes))
        if self.enable_whisper:
            tasks.append(self._transcribe_whisper(audio_bytes))
        
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect results
        results: Dict[str, TranscriptionResult] = {}
        for result in results_list:
            if isinstance(result, TranscriptionResult):
                results[result.provider.value] = result
            elif isinstance(result, Exception):
                logger.error("Transcription failed: %s", result)
        
        # Determine winner (highest confidence without error)
        winner = None
        best_confidence = 0.0
        for provider, result in results.items():
            if not result.error and result.confidence > best_confidence:
                best_confidence = result.confidence
                winner = ASRProvider(provider)
        
        # Calculate confidence delta between top 2
        confidence_delta = 0.0
        sorted_results = sorted(
            [(p, r) for p, r in results.items() if not r.error],
            key=lambda x: x[1].confidence,
            reverse=True,
        )
        if len(sorted_results) >= 2:
            confidence_delta = sorted_results[0][1].confidence - sorted_results[1][1].confidence
        
        # Calculate WER if ground truth provided
        word_error_rate = None
        if ground_truth and winner:
            winner_result = results.get(winner.value)
            if winner_result and winner_result.text:
                word_error_rate = calculate_wer(ground_truth, winner_result.text)
        
        comparison = ComparisonResult(
            audio_hash=audio_hash,
            audio_duration_ms=audio_duration_ms,
            results=results,
            winner=winner,
            confidence_delta=confidence_delta,
            word_error_rate=word_error_rate,
            ground_truth=ground_truth,
        )
        
        # Save result
        if self.save_results:
            await self._save_comparison(comparison)
        
        logger.info("ASR_COMPARE | hash=%s winner=%s conf_delta=%.3f wer=%s",
                   audio_hash, winner.value if winner else "none",
                   confidence_delta, f"{word_error_rate:.3f}" if word_error_rate else "n/a")
        
        return comparison
    
    async def _save_comparison(self, comparison: ComparisonResult):
        """Save comparison result to file"""
        try:
            self.results_dir.mkdir(parents=True, exist_ok=True)
            filepath = self.results_dir / f"comparison_{comparison.audio_hash}.json"
            
            await asyncio.to_thread(
                filepath.write_text,
                json.dumps(comparison.to_dict(), indent=2),
            )
        except Exception as e:
            logger.warning("Failed to save comparison: %s", e)
    
    async def run_benchmark(
        self,
        audio_files: List[Tuple[str, Optional[str]]],  # (path, ground_truth)
    ) -> BenchmarkReport:
        """
        Run benchmark on multiple audio files.
        
        Args:
            audio_files: List of (audio_path, ground_truth) tuples
            
        Returns:
            BenchmarkReport with aggregated statistics
        """
        report = BenchmarkReport(total_samples=len(audio_files))
        
        for audio_path, ground_truth in audio_files:
            try:
                audio_bytes = Path(audio_path).read_bytes()
                comparison = await self.compare_audio(
                    audio_bytes=audio_bytes,
                    ground_truth=ground_truth,
                )
                report.comparisons.append(comparison)
                
                # Update stats
                if comparison.winner:
                    winner_key = comparison.winner.value
                    report.provider_wins[winner_key] = report.provider_wins.get(winner_key, 0) + 1
                
                for provider, result in comparison.results.items():
                    if result.error:
                        report.failures[provider] = report.failures.get(provider, 0) + 1
                    else:
                        # Running average for confidence
                        count = report.provider_wins.get(provider, 0) + 1
                        old_avg = report.avg_confidence.get(provider, 0.0)
                        report.avg_confidence[provider] = old_avg + (result.confidence - old_avg) / count
                        
                        # Running average for latency
                        old_lat = report.avg_latency_ms.get(provider, 0.0)
                        report.avg_latency_ms[provider] = old_lat + (result.latency_ms - old_lat) / count
                
            except Exception as e:
                logger.error("Benchmark error for %s: %s", audio_path, e)
        
        # Log summary
        logger.info("BENCHMARK_COMPLETE | samples=%d wins=%s avg_conf=%s",
                   report.total_samples, report.provider_wins,
                   {k: f"{v:.3f}" for k, v in report.avg_confidence.items()})
        
        return report


# CLI for running benchmarks
async def main():
    """CLI entry point for running ASR comparisons"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ASR Comparison Harness")
    parser.add_argument("audio_file", help="Path to audio file")
    parser.add_argument("--ground-truth", "-g", help="Ground truth transcript")
    parser.add_argument("--benchmark-dir", "-b", help="Directory with audio files for benchmark")
    
    args = parser.parse_args()
    
    harness = ASRComparisonHarness()
    
    if args.benchmark_dir:
        # Run benchmark on directory
        audio_dir = Path(args.benchmark_dir)
        audio_files = [(str(f), None) for f in audio_dir.glob("*.wav")]
        report = await harness.run_benchmark(audio_files)
        print(json.dumps(report.to_dict(), indent=2))
    else:
        # Single file comparison
        audio_bytes = Path(args.audio_file).read_bytes()
        result = await harness.compare_audio(audio_bytes, args.ground_truth)
        print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
