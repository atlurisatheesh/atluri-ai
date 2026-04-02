"""
Voice Profiler API — exposes voice profile readiness for the UI's
"Voice Profile Readiness" widget in the Setup/IntelligenceTerminal tab.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.auth import get_user_id
from app.personalization.profile_store import get_profile_store
from app.personalization.voice_profiler import VoiceProfile, VoiceProfiler

logger = logging.getLogger("app.api.voice_profiler")
router = APIRouter(prefix="/api/voice-profile", tags=["Voice Profile"])

_profiler = VoiceProfiler()


class VoiceProfileReadiness(BaseModel):
    """Response schema for the readiness endpoint."""
    score: int
    maturity: str
    sessions_analyzed: int
    sessions_needed: int
    has_voice_signature: bool
    highlights: list[str]
    next_action: str


@router.get("/readiness", response_model=VoiceProfileReadiness)
async def get_voice_profile_readiness(request: Request) -> dict[str, Any]:
    """
    Return the current user's Voice Profile Readiness score and metadata.
    Used by the IntelligenceTerminal Setup tab to show personalisation status.
    """
    user_id = get_user_id(request)
    store = get_profile_store()

    try:
        raw = await store.get_profile(user_id)
        profile = VoiceProfile.from_dict(raw) if raw else VoiceProfile(user_id=user_id)
    except Exception as exc:
        logger.warning("Failed to load voice profile for user=%s: %s", user_id, exc)
        profile = VoiceProfile(user_id=user_id)

    return _profiler.get_readiness(profile)
