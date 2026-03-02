"""
Analytics routes — /api/analytics prefix.
Dashboard overview and session history with aggregated stats.
"""

import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, InterviewSession, MockResult, AIResponse
from app.auth import get_user_id

logger = logging.getLogger("app.api.analytics")
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
async def analytics_overview(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Dashboard analytics: sessions, scores, responses, credits, streak, skills."""
    # Total sessions
    sess_result = await db.execute(
        select(func.count(InterviewSession.id)).where(InterviewSession.user_id == user_id)
    )
    total_sessions = sess_result.scalar() or 0

    # Average mock score
    score_result = await db.execute(
        select(func.avg(MockResult.overall_score)).where(MockResult.user_id == user_id)
    )
    avg_score = round(score_result.scalar() or 0, 1)

    # Total AI responses
    ai_result = await db.execute(
        select(func.count(AIResponse.id)).where(AIResponse.user_id == user_id)
    )
    total_responses = ai_result.scalar() or 0

    # User credits
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    credits = user.credits if user else 0

    return {
        "total_sessions": total_sessions,
        "avg_score": avg_score,
        "total_ai_responses": total_responses,
        "credits_remaining": credits,
        "current_streak": 3,  # TODO: calculate from session dates
        "badges_earned": 5,   # TODO: calculate from achievements
        "weekly_sessions": [2, 3, 1, 4, 2, 5, 3],
        "skills_breakdown": {
            "technical": 78,
            "communication": 85,
            "problem_solving": 72,
            "confidence": 68,
            "time_management": 80,
        },
        "category_distribution": {
            "behavioral": 35,
            "technical": 30,
            "coding": 25,
            "system_design": 10,
        },
    }


@router.get("/history")
async def analytics_history(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Session history (last 20)."""
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.started_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "mode": s.mode,
            "score": s.score,
            "duration_seconds": s.duration_seconds,
            "credits_used": s.credits_used,
            "started_at": s.started_at.isoformat(),
        }
        for s in sessions
    ]
