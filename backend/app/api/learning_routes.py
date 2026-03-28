"""Cross-Session Learning API routes."""

from fastapi import APIRouter, Depends, Request
from app.auth import get_user_id
from app.learning import get_learning_engine

router = APIRouter(prefix="/api/learning", tags=["Learning"])


@router.get("/profile")
async def get_learning_profile(request: Request, user_id: str = Depends(get_user_id)):
    """Get the user's cross-session learning profile."""
    engine = get_learning_engine()
    profile = engine.get_learning_profile(user_id)
    if not profile:
        return {
            "user_id": user_id,
            "sessions_completed": 0,
            "skills": {},
            "weak_areas": [],
            "strong_areas": [],
            "improvement_rate": 0,
            "recommended_focus": ["Complete your first session to start tracking"],
            "difficulty_level": "medium",
        }
    return profile.to_dict()


@router.get("/recommendations")
async def get_recommendations(request: Request, user_id: str = Depends(get_user_id)):
    """Get targeted practice recommendations."""
    engine = get_learning_engine()
    profile = engine.get_learning_profile(user_id)
    if not profile:
        return {
            "recommendations": ["Complete your first interview session to get personalized recommendations"],
            "difficulty_level": "medium",
            "sessions_completed": 0,
        }
    return {
        "recommendations": profile.recommended_focus,
        "difficulty_level": profile.difficulty_level,
        "sessions_completed": profile.sessions_completed,
        "weak_areas": profile.weak_areas,
        "strong_areas": profile.strong_areas,
        "improvement_rate": round(profile.improvement_rate, 2),
    }
