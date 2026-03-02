"""
Session management routes — /api/sessions prefix.
Create, list, and end interview sessions with duration tracking.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import InterviewSession, SessionStatus
from app.auth import get_user_id

logger = logging.getLogger("app.api.sessions")
router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


class CreateSessionRequest(BaseModel):
    title: str = "Untitled Session"
    platform: str | None = None
    mode: str = "neuralwhisper"  # neuralwhisper, codeforge, mentorlink


@router.post("/")
async def create_session(req: CreateSessionRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Create a new interview session."""
    session = InterviewSession(
        user_id=user_id,
        title=req.title,
        platform=req.platform,
        mode=req.mode,
        status=SessionStatus.active.value,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "id": str(session.id),
        "title": session.title,
        "platform": session.platform,
        "mode": session.mode,
        "status": session.status,
        "started_at": session.started_at.isoformat(),
    }


@router.get("/")
async def list_sessions(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """List user's interview sessions (most recent first)."""
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.started_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "platform": s.platform,
            "mode": s.mode,
            "status": s.status,
            "score": s.score,
            "duration_seconds": s.duration_seconds,
            "credits_used": s.credits_used,
            "started_at": s.started_at.isoformat(),
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        }
        for s in sessions
    ]


@router.post("/{session_id}/end")
async def end_session(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """End an interview session and calculate duration."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == user_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")

    now = datetime.now(timezone.utc)
    session.status = SessionStatus.completed.value
    session.ended_at = now
    if session.started_at:
        session.duration_seconds = int((now - session.started_at).total_seconds())
    await db.commit()

    return {
        "id": str(session.id),
        "status": session.status,
        "duration_seconds": session.duration_seconds,
        "ended_at": session.ended_at.isoformat(),
    }
