"""
Semantic Similarity Engine for Speculative Pre-Generation

Replaces Jaccard token overlap with embedding-based cosine similarity.

Why This Matters:
- Jaccard fails when word order changes: "What is AWS Lambda?" vs "Lambda in AWS, what is it?"
- Jaccard fails on synonyms: "Tell me about" vs "Explain to me"
- Semantic similarity captures meaning, not just tokens

Architecture:
- Uses sentence-transformers for fast local embeddings
- Falls back to OpenAI ada-002 if local model unavailable
- Caches embeddings per session to reduce compute
- Configurable similarity threshold (default 0.85)

Usage:
    engine = get_semantic_engine()
    
    # Get similarity between two texts
    score = await engine.similarity("What is AWS Lambda?", "Tell me about AWS Lambda")
    # score ≈ 0.92 (high similarity)
    
    # Check if pregen cache is valid
    if await engine.is_similar_enough(cached_question, new_question, threshold=0.85):
        use_cached_response()
"""

import logging
import asyncio
import hashlib
import time
import os
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, field
import numpy as np

logger = logging.getLogger("semantic_similarity")

# Try to import sentence-transformers (preferred for speed)
_sentence_transformer = None
_embedding_model = None

try:
    from sentence_transformers import SentenceTransformer
    _sentence_transformer = SentenceTransformer
except ImportError:
    logger.info("sentence-transformers not available, will use OpenAI embeddings")

# OpenAI fallback
_openai_client = None
try:
    from openai import AsyncOpenAI
    _openai_client = AsyncOpenAI()
except ImportError:
    pass


@dataclass
class EmbeddingCacheEntry:
    """Cached embedding with metadata"""
    text_hash: str
    embedding: np.ndarray
    created_at: float
    access_count: int = 0


class SemanticSimilarityEngine:
    """
    Production-grade semantic similarity engine.
    
    Features:
    - Local sentence-transformers for speed (<10ms)
    - OpenAI ada-002 fallback
    - LRU embedding cache per session
    - Batch embedding support
    """
    
    # Configuration
    DEFAULT_THRESHOLD = float(os.getenv("SEMANTIC_SIM_THRESHOLD", "0.85"))
    CACHE_MAX_SIZE = int(os.getenv("SEMANTIC_CACHE_SIZE", "100"))
    CACHE_TTL_SEC = float(os.getenv("SEMANTIC_CACHE_TTL", "300"))  # 5 min
    LOCAL_MODEL = os.getenv("SEMANTIC_MODEL", "all-MiniLM-L6-v2")  # Fast & good
    USE_LOCAL = os.getenv("SEMANTIC_USE_LOCAL", "true").lower() in {"1", "true", "yes"}
    
    def __init__(self):
        self._cache: Dict[str, EmbeddingCacheEntry] = {}
        self._model = None
        self._model_lock = asyncio.Lock()
        self._initialized = False
        self._use_openai = False
        self._stats = {
            "cache_hits": 0,
            "cache_misses": 0,
            "embeddings_computed": 0,
            "similarity_checks": 0,
            "openai_fallbacks": 0,
        }
    
    async def _ensure_initialized(self):
        """Lazy initialization of embedding model"""
        if self._initialized:
            return
        
        async with self._model_lock:
            if self._initialized:
                return
            
            # Try local model first
            if self.USE_LOCAL and _sentence_transformer is not None:
                try:
                    # Load in thread to avoid blocking event loop
                    loop = asyncio.get_event_loop()
                    self._model = await loop.run_in_executor(
                        None, 
                        lambda: _sentence_transformer(self.LOCAL_MODEL)
                    )
                    logger.info("Loaded local embedding model: %s", self.LOCAL_MODEL)
                    self._initialized = True
                    return
                except Exception as e:
                    logger.warning("Failed to load local model: %s", e)
            
            # Fallback to OpenAI
            if _openai_client is not None:
                self._use_openai = True
                logger.info("Using OpenAI embeddings (ada-002) as fallback")
                self._initialized = True
                return
            
            # No embedding source available - use basic fallback
            logger.warning("No embedding model available, using character-level fallback")
            self._initialized = True
    
    def _text_hash(self, text: str) -> str:
        """Create hash of normalized text"""
        normalized = text.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()[:16]
    
    def _get_cached(self, text: str) -> Optional[np.ndarray]:
        """Get cached embedding if available and fresh"""
        text_hash = self._text_hash(text)
        entry = self._cache.get(text_hash)
        
        if entry is None:
            return None
        
        # Check TTL
        if time.time() - entry.created_at > self.CACHE_TTL_SEC:
            del self._cache[text_hash]
            return None
        
        entry.access_count += 1
        self._stats["cache_hits"] += 1
        return entry.embedding
    
    def _set_cached(self, text: str, embedding: np.ndarray):
        """Cache embedding with LRU eviction"""
        # Evict oldest if at capacity
        if len(self._cache) >= self.CACHE_MAX_SIZE:
            oldest_key = min(self._cache.keys(), 
                           key=lambda k: self._cache[k].created_at)
            del self._cache[oldest_key]
        
        text_hash = self._text_hash(text)
        self._cache[text_hash] = EmbeddingCacheEntry(
            text_hash=text_hash,
            embedding=embedding,
            created_at=time.time(),
        )
        self._stats["cache_misses"] += 1
    
    async def _compute_embedding_local(self, text: str) -> np.ndarray:
        """Compute embedding using local model"""
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None,
            lambda: self._model.encode(text, normalize_embeddings=True)
        )
        return np.array(embedding)
    
    async def _compute_embedding_openai(self, text: str) -> np.ndarray:
        """Compute embedding using OpenAI ada-002"""
        self._stats["openai_fallbacks"] += 1
        try:
            response = await _openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text,
            )
            return np.array(response.data[0].embedding)
        except Exception as e:
            logger.error("OpenAI embedding failed: %s", e)
            # Ultimate fallback: character-level hash
            return self._char_level_embedding(text)
    
    def _char_level_embedding(self, text: str, dim: int = 384) -> np.ndarray:
        """
        Ultra-fallback: character frequency embedding.
        Not as good as real embeddings, but deterministic.
        """
        normalized = text.lower()
        freqs = np.zeros(dim)
        for i, char in enumerate(normalized[:dim]):
            freqs[i % dim] += ord(char) / 1000.0
        # Normalize
        norm = np.linalg.norm(freqs)
        if norm > 0:
            freqs = freqs / norm
        return freqs
    
    async def embed(self, text: str) -> np.ndarray:
        """
        Get embedding for text (cached or computed).
        
        Returns normalized embedding vector.
        """
        await self._ensure_initialized()
        
        # Check cache
        cached = self._get_cached(text)
        if cached is not None:
            return cached
        
        # Compute
        self._stats["embeddings_computed"] += 1
        
        if self._model is not None:
            embedding = await self._compute_embedding_local(text)
        elif self._use_openai:
            embedding = await self._compute_embedding_openai(text)
        else:
            embedding = self._char_level_embedding(text)
        
        # Cache
        self._set_cached(text, embedding)
        return embedding
    
    async def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        """Embed multiple texts efficiently"""
        await self._ensure_initialized()
        
        results = []
        to_compute = []
        to_compute_indices = []
        
        # Check cache first
        for i, text in enumerate(texts):
            cached = self._get_cached(text)
            if cached is not None:
                results.append((i, cached))
            else:
                to_compute.append(text)
                to_compute_indices.append(i)
        
        # Batch compute remaining
        if to_compute:
            if self._model is not None:
                loop = asyncio.get_event_loop()
                embeddings = await loop.run_in_executor(
                    None,
                    lambda: self._model.encode(to_compute, normalize_embeddings=True)
                )
                for idx, text, emb in zip(to_compute_indices, to_compute, embeddings):
                    emb_arr = np.array(emb)
                    self._set_cached(text, emb_arr)
                    results.append((idx, emb_arr))
                    self._stats["embeddings_computed"] += 1
            else:
                # Fall back to individual compute
                for idx, text in zip(to_compute_indices, to_compute):
                    emb = await self.embed(text)
                    results.append((idx, emb))
        
        # Sort by original index
        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]
    
    async def similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts.
        
        Returns:
            float: Similarity score 0.0 to 1.0
        """
        self._stats["similarity_checks"] += 1
        
        # Quick exact match check
        if text1.lower().strip() == text2.lower().strip():
            return 1.0
        
        # Get embeddings
        emb1, emb2 = await asyncio.gather(
            self.embed(text1),
            self.embed(text2),
        )
        
        # Cosine similarity (embeddings are normalized)
        score = float(np.dot(emb1, emb2))
        
        # Clamp to [0, 1]
        return max(0.0, min(1.0, score))
    
    async def is_similar_enough(
        self, 
        text1: str, 
        text2: str, 
        threshold: float = None,
    ) -> bool:
        """
        Check if two texts are semantically similar enough.
        
        Args:
            text1: First text
            text2: Second text  
            threshold: Similarity threshold (default: 0.85)
            
        Returns:
            bool: True if similarity >= threshold
        """
        threshold = threshold or self.DEFAULT_THRESHOLD
        score = await self.similarity(text1, text2)
        return score >= threshold
    
    async def find_best_match(
        self,
        query: str,
        candidates: List[str],
        threshold: float = None,
    ) -> Optional[Tuple[int, str, float]]:
        """
        Find best matching candidate for query.
        
        Args:
            query: Query text
            candidates: List of candidate texts
            threshold: Minimum similarity threshold
            
        Returns:
            Tuple of (index, text, score) or None if no match above threshold
        """
        threshold = threshold or self.DEFAULT_THRESHOLD
        
        if not candidates:
            return None
        
        # Embed query and all candidates
        query_emb = await self.embed(query)
        candidate_embs = await self.embed_batch(candidates)
        
        # Find best match
        best_idx = -1
        best_score = 0.0
        
        for i, cand_emb in enumerate(candidate_embs):
            score = float(np.dot(query_emb, cand_emb))
            if score > best_score:
                best_score = score
                best_idx = i
        
        if best_score >= threshold:
            return (best_idx, candidates[best_idx], best_score)
        
        return None
    
    def get_stats(self) -> dict:
        """Get engine statistics"""
        total_checks = self._stats["cache_hits"] + self._stats["cache_misses"]
        cache_hit_rate = self._stats["cache_hits"] / total_checks if total_checks > 0 else 0
        
        return {
            **self._stats,
            "cache_size": len(self._cache),
            "cache_hit_rate": round(cache_hit_rate, 3),
            "model_type": "local" if self._model else ("openai" if self._use_openai else "fallback"),
            "model_name": self.LOCAL_MODEL if self._model else "ada-002",
        }
    
    def clear_cache(self):
        """Clear embedding cache"""
        self._cache.clear()


# Singleton
_engine: Optional[SemanticSimilarityEngine] = None


def get_semantic_engine() -> SemanticSimilarityEngine:
    """Get singleton semantic similarity engine"""
    global _engine
    if _engine is None:
        _engine = SemanticSimilarityEngine()
    return _engine


# CLI test
if __name__ == "__main__":
    import asyncio
    
    async def test():
        engine = SemanticSimilarityEngine()
        
        test_pairs = [
            ("What is AWS Lambda?", "Tell me about AWS Lambda"),
            ("What is AWS Lambda?", "Explain Lambda functions in AWS"),
            ("What is AWS Lambda?", "What is Docker?"),
            ("Tell me about yourself", "Can you introduce yourself"),
            ("What are your strengths?", "What do you consider your greatest strength"),
        ]
        
        print("Semantic Similarity Tests")
        print("=" * 60)
        
        for text1, text2 in test_pairs:
            score = await engine.similarity(text1, text2)
            is_match = await engine.is_similar_enough(text1, text2)
            print(f"\n{text1}")
            print(f"vs")
            print(f"{text2}")
            print(f"Score: {score:.3f} | Match: {is_match}")
        
        print("\n" + "=" * 60)
        print("Stats:", engine.get_stats())
    
    asyncio.run(test())
