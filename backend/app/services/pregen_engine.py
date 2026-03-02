"""
Partial Pre-generation Engine

Starts LLM generation speculatively on high-confidence partials before final transcript.
This reduces perceived latency by ~500-1000ms in optimal conditions.

Strategy:
1. At high-confidence partial (>=0.85), start speculative LLM generation
2. Cache the streaming response
3. When final arrives:
   - If final matches partial (semantic similarity): immediately emit cached tokens
   - If final differs significantly: discard cache, start fresh

Safety:
- Only pre-generate on questions with >85% confidence
- Only cache first N tokens (configurable)
- Abort if transcript mutates significantly
- Never show user unverified content

V2 Upgrade:
- Uses semantic similarity (embedding-based) instead of Jaccard
- More robust to word order changes and synonyms
"""

import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Callable, Awaitable, List, Dict, Any
import os

logger = logging.getLogger("pregen")

# Import semantic similarity engine
from app.services.semantic_similarity import get_semantic_engine


class PregenState(str, Enum):
    """States for pre-generation"""
    IDLE = "idle"
    GENERATING = "generating"
    CACHED = "cached"
    ABORTED = "aborted"
    DELIVERED = "delivered"


@dataclass
class PregenCache:
    """Cache for a single pre-generation attempt"""
    question_hash: str
    question_text: str
    confidence: float
    start_time: float
    tokens: List[str] = field(default_factory=list)
    full_text: str = ""
    state: PregenState = PregenState.IDLE
    task: Optional[asyncio.Task] = None
    abort_event: Optional[asyncio.Event] = None
    
    def similarity_to(self, other_text: str) -> float:
        """
        Calculate similarity between cached question and new text (0.0-1.0)
        
        DEPRECATED: Now using semantic similarity in try_use_cache.
        This is kept as fast fallback when semantic engine unavailable.
        """
        # Normalize texts
        cached_words = set(self.question_text.lower().split())
        other_words = set(other_text.lower().split())
        
        if not cached_words or not other_words:
            return 0.0
        
        # Jaccard similarity (fallback only)
        intersection = len(cached_words & other_words)
        union = len(cached_words | other_words)
        
        return intersection / union if union > 0 else 0.0


class PartialPregenEngine:
    """
    Engine for speculative pre-generation of LLM responses.
    
    Usage:
        pregen = PartialPregenEngine(generate_fn=my_llm_fn)
        
        # On high-confidence partial:
        await pregen.start_pregen(question, confidence)
        
        # On final transcript:
        cached_tokens = await pregen.try_use_cache(final_question)
        if cached_tokens:
            # Emit cached tokens immediately
            for token in cached_tokens:
                yield token
            # Continue with remaining generation
        else:
            # Start fresh generation
    """
    
    # Configuration
    MIN_PREGEN_CONFIDENCE = float(os.getenv("PREGEN_MIN_CONFIDENCE", "0.85"))
    MAX_CACHED_TOKENS = int(os.getenv("PREGEN_MAX_TOKENS", "50"))  # Cache first N tokens
    SIMILARITY_THRESHOLD = float(os.getenv("PREGEN_SIMILARITY", "0.80"))  # Min similarity to use cache
    PREGEN_TIMEOUT_SEC = float(os.getenv("PREGEN_TIMEOUT_SEC", "3.0"))  # Max time to pre-generate
    
    def __init__(
        self,
        generate_fn: Callable[[str, str], Awaitable[Any]],
        session_id: str = "",
    ):
        """
        Args:
            generate_fn: Async function that takes (question, context) and yields tokens
            session_id: For logging
        """
        self.generate_fn = generate_fn
        self.session_id = session_id
        self._cache: Optional[PregenCache] = None
        self._lock = asyncio.Lock()
        self._stats = {
            "pregen_attempts": 0,
            "pregen_hits": 0,
            "pregen_misses": 0,
            "pregen_aborts": 0,
            "avg_latency_saved_ms": 0.0,
        }
    
    def _hash_question(self, text: str) -> str:
        """Create hash for question text"""
        normalized = " ".join(text.lower().split())
        return hashlib.md5(normalized.encode()).hexdigest()[:16]
    
    async def start_pregen(
        self,
        question: str,
        confidence: float,
        context: str = "",
    ) -> bool:
        """
        Start speculative pre-generation for a high-confidence partial.
        
        Args:
            question: Partial question text
            confidence: STT confidence (0.0-1.0)
            context: Additional context for LLM
            
        Returns:
            True if pre-generation started, False if skipped
        """
        # Check confidence threshold
        if confidence < self.MIN_PREGEN_CONFIDENCE:
            logger.debug("Pregen skipped (conf=%.2f < %.2f)", confidence, self.MIN_PREGEN_CONFIDENCE)
            return False
        
        async with self._lock:
            # Cancel existing pregen if any
            if self._cache and self._cache.task and not self._cache.task.done():
                if self._cache.abort_event:
                    self._cache.abort_event.set()
                self._cache.task.cancel()
                try:
                    await self._cache.task
                except asyncio.CancelledError:
                    pass
            
            # Create new cache
            question_hash = self._hash_question(question)
            abort_event = asyncio.Event()
            
            self._cache = PregenCache(
                question_hash=question_hash,
                question_text=question,
                confidence=confidence,
                start_time=time.time(),
                state=PregenState.GENERATING,
                abort_event=abort_event,
            )
            
            # Start generation task
            self._cache.task = asyncio.create_task(
                self._run_pregen(question, context, abort_event)
            )
            
            self._stats["pregen_attempts"] += 1
            logger.info("PREGEN_START | session=%s conf=%.2f hash=%s text=%s",
                       self.session_id, confidence, question_hash, question[:50])
            
            return True
    
    async def _run_pregen(self, question: str, context: str, abort_event: asyncio.Event):
        """Run pre-generation and cache tokens"""
        try:
            tokens_collected = []
            full_text_parts = []
            
            async def timeout_wrapper():
                """Wrap generation with timeout"""
                try:
                    async for token in self.generate_fn(question, context):
                        if abort_event.is_set():
                            logger.debug("Pregen aborted during generation")
                            return
                        
                        tokens_collected.append(token)
                        full_text_parts.append(token)
                        
                        # Stop caching after max tokens
                        if len(tokens_collected) >= self.MAX_CACHED_TOKENS:
                            break
                except Exception as gen_err:
                    logger.warning("Pregen generation error: %s", gen_err)
                    return
            
            # Run with timeout
            try:
                await asyncio.wait_for(timeout_wrapper(), timeout=self.PREGEN_TIMEOUT_SEC)
            except asyncio.TimeoutError:
                logger.debug("Pregen timed out after %.1fs", self.PREGEN_TIMEOUT_SEC)
            
            # Update cache if not aborted
            if not abort_event.is_set() and self._cache:
                async with self._lock:
                    if self._cache and not abort_event.is_set():
                        self._cache.tokens = tokens_collected
                        self._cache.full_text = "".join(full_text_parts)
                        self._cache.state = PregenState.CACHED
                        logger.info("PREGEN_CACHED | session=%s tokens=%d text_preview=%s",
                                   self.session_id, len(tokens_collected), 
                                   self._cache.full_text[:50] if self._cache.full_text else "")
            
        except asyncio.CancelledError:
            logger.debug("Pregen task cancelled")
            raise
        except Exception as e:
            logger.warning("Pregen error: %s", e)
            if self._cache:
                self._cache.state = PregenState.ABORTED
    
    async def abort_pregen(self, reason: str = ""):
        """Abort current pre-generation"""
        async with self._lock:
            if self._cache:
                if self._cache.abort_event:
                    self._cache.abort_event.set()
                if self._cache.task and not self._cache.task.done():
                    self._cache.task.cancel()
                    try:
                        await self._cache.task
                    except asyncio.CancelledError:
                        pass
                self._cache.state = PregenState.ABORTED
                self._stats["pregen_aborts"] += 1
                logger.info("PREGEN_ABORTED | session=%s reason=%s", self.session_id, reason)
                self._cache = None
    
    async def try_use_cache(self, final_question: str) -> Optional[List[str]]:
        """
        Try to use cached pre-generation for final question.
        
        Uses semantic similarity (embedding-based) for robust matching.
        Falls back to Jaccard if semantic engine fails.
        
        Args:
            final_question: The final transcript text
            
        Returns:
            List of cached tokens if cache is valid, None otherwise
        """
        async with self._lock:
            if not self._cache:
                return None
            
            if self._cache.state != PregenState.CACHED:
                # Still generating or aborted
                if self._cache.state == PregenState.GENERATING:
                    # Wait briefly for completion
                    try:
                        await asyncio.wait_for(
                            asyncio.shield(self._cache.task) if self._cache.task else asyncio.sleep(0),
                            timeout=0.5
                        )
                    except (asyncio.TimeoutError, asyncio.CancelledError):
                        pass
                
                if self._cache.state != PregenState.CACHED:
                    self._stats["pregen_misses"] += 1
                    return None
            
            # Use semantic similarity (V2 upgrade)
            try:
                semantic_engine = get_semantic_engine()
                similarity = await semantic_engine.similarity(
                    self._cache.question_text,
                    final_question
                )
                similarity_method = "semantic"
            except Exception as sem_err:
                # Fallback to Jaccard
                logger.warning("Semantic similarity failed, using Jaccard: %s", sem_err)
                similarity = self._cache.similarity_to(final_question)
                similarity_method = "jaccard"
            
            if similarity < self.SIMILARITY_THRESHOLD:
                logger.info("PREGEN_MISS | session=%s similarity=%.2f (<%s>) method=%s | cached=%s | final=%s",
                           self.session_id, similarity, self.SIMILARITY_THRESHOLD, similarity_method,
                           self._cache.question_text[:30], final_question[:30])
                self._stats["pregen_misses"] += 1
                self._cache = None
                return None
            
            # Cache hit!
            tokens = self._cache.tokens.copy()
            latency_saved_ms = (time.time() - self._cache.start_time) * 1000
            
            self._cache.state = PregenState.DELIVERED
            self._stats["pregen_hits"] += 1
            self._stats["avg_latency_saved_ms"] = (
                (self._stats["avg_latency_saved_ms"] * (self._stats["pregen_hits"] - 1) + latency_saved_ms)
                / self._stats["pregen_hits"]
            )
            
            logger.info("PREGEN_HIT | session=%s similarity=%.2f method=%s tokens=%d latency_saved_ms=%.1f",
                       self.session_id, similarity, similarity_method, len(tokens), latency_saved_ms)
            
            # Clear cache after use
            self._cache = None
            
            return tokens
    
    def get_stats(self) -> Dict[str, Any]:
        """Get pre-generation statistics"""
        return self._stats.copy()
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.abort_pregen("cleanup")


# Factory for creating pregen engines
def create_pregen_engine(
    generate_fn: Callable[[str, str], Awaitable[Any]],
    session_id: str = "",
) -> PartialPregenEngine:
    """Create a new pre-generation engine"""
    return PartialPregenEngine(generate_fn=generate_fn, session_id=session_id)
