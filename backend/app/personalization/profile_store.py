"""
Profile Store — Redis-backed persistence for VoiceProfile.

Stores and retrieves VoiceProfile per user_id. Uses Redis for fast access
with an in-memory fallback for local dev.

Usage:
    store = get_profile_store()
    await store.save(profile)
    profile = await store.load(user_id)
"""

import json
import logging
import time
from typing import Optional

from app.personalization.voice_profiler import VoiceProfile

logger = logging.getLogger("profile_store")


class ProfileStore:
    """Redis-backed VoiceProfile persistence with in-memory fallback."""

    REDIS_PREFIX = "voice_profile:"
    TTL_SECONDS = 60 * 60 * 24 * 90  # 90 days

    def __init__(self):
        self._memory_cache: dict[str, dict] = {}
        self._redis = None
        self._redis_checked = False

    async def _get_redis(self):
        """Lazy Redis connection."""
        if self._redis_checked:
            return self._redis
        self._redis_checked = True
        try:
            from core.redis_pool import get_redis
            self._redis = await get_redis()
        except Exception:
            logger.info("Redis unavailable — using in-memory profile store")
            self._redis = None
        return self._redis

    async def save(self, profile: VoiceProfile) -> None:
        """Save a voice profile."""
        data = profile.to_dict()
        data["updated_at"] = time.time()
        key = self.REDIS_PREFIX + profile.user_id

        redis = await self._get_redis()
        if redis:
            try:
                await redis.setex(key, self.TTL_SECONDS, json.dumps(data))
                return
            except Exception as e:
                logger.warning("Redis save failed, falling back to memory: %s", e)

        self._memory_cache[profile.user_id] = data

    async def load(self, user_id: str) -> Optional[VoiceProfile]:
        """Load a voice profile by user_id."""
        key = self.REDIS_PREFIX + user_id

        redis = await self._get_redis()
        if redis:
            try:
                raw = await redis.get(key)
                if raw:
                    data = json.loads(raw)
                    return VoiceProfile.from_dict(data)
            except Exception as e:
                logger.warning("Redis load failed: %s", e)

        # Memory fallback
        data = self._memory_cache.get(user_id)
        if data:
            return VoiceProfile.from_dict(data)

        return None

    async def delete(self, user_id: str) -> None:
        """Delete a voice profile."""
        key = self.REDIS_PREFIX + user_id

        redis = await self._get_redis()
        if redis:
            try:
                await redis.delete(key)
            except Exception:
                pass

        self._memory_cache.pop(user_id, None)

    async def update_from_session(
        self,
        user_id: str,
        new_answers: list[str],
        new_questions: list[str] | None = None,
        all_answers: list[str] | None = None,
        all_questions: list[str] | None = None,
    ) -> VoiceProfile:
        """
        Incrementally update a voice profile after a session.
        
        If all_answers provided, does full rebuild. Otherwise merges new
        answers into existing profile.
        """
        from app.personalization.voice_profiler import VoiceProfiler

        existing = await self.load(user_id)
        profiler = VoiceProfiler()

        sessions_count = (existing.sessions_analyzed + 1) if existing else 1

        # Full rebuild is more accurate
        answers = all_answers if all_answers else new_answers
        questions = all_questions if all_questions else new_questions

        profile = profiler.build_profile(
            user_id=user_id,
            answers=answers,
            questions=questions,
            sessions_count=sessions_count,
        )

        await self.save(profile)
        logger.info(
            "Updated voice profile for %s — maturity: %s, sessions: %d",
            user_id, profile.maturity, profile.sessions_analyzed,
        )
        return profile


def get_profile_store() -> ProfileStore:
    """Singleton factory."""
    if not hasattr(get_profile_store, "_instance"):
        get_profile_store._instance = ProfileStore()
    return get_profile_store._instance
