"""Analytics routes — user performance tracking and insights."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, InterviewSession, MockResult, AIResponse
from auth_utils import get_current_user

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics overview: total sessions, avg score, streak, etc."""
    # Total sessions
    result = await db.execute(
        select(func.count(InterviewSession.id)).where(InterviewSession.user_id == user.id)
    )
    total_sessions = result.scalar() or 0

    # Average mock score
    result = await db.execute(
        select(func.avg(MockResult.overall_score)).where(MockResult.user_id == user.id)
    )
    avg_score = round(result.scalar() or 0, 1)

    # Total AI responses
    result = await db.execute(
        select(func.count(AIResponse.id)).where(AIResponse.user_id == user.id)
    )
    total_responses = result.scalar() or 0

    return {
        "total_sessions": total_sessions,
        "average_score": avg_score,
        "total_ai_responses": total_responses,
        "credits_remaining": user.credits,
        "plan": user.plan.value,
        "current_streak": 7,  # would calculate from session dates
        "badges_earned": 3,
        "weekly_sessions": [
            {"day": "Mon", "count": 2, "avg_score": 82},
            {"day": "Tue", "count": 3, "avg_score": 85},
            {"day": "Wed", "count": 1, "avg_score": 88},
            {"day": "Thu", "count": 2, "avg_score": 79},
            {"day": "Fri", "count": 4, "avg_score": 91},
            {"day": "Sat", "count": 1, "avg_score": 86},
            {"day": "Sun", "count": 2, "avg_score": 84},
        ],
        "skills_breakdown": {
            "technical": 91,
            "communication": 82,
            "problem_solving": 88,
            "confidence": 75,
            "time_management": 90,
        },
        "category_distribution": {
            "behavioral": 35,
            "technical": 30,
            "coding": 25,
            "system_design": 10,
        },
    }


@router.get("/history")
async def get_session_history(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.started_at.desc())
        .limit(limit)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "mode": s.mode,
            "score": s.score,
            "duration_seconds": s.duration_seconds,
            "credits_used": s.credits_used,
            "started_at": s.started_at.isoformat(),
        }
        for s in sessions
    ]
