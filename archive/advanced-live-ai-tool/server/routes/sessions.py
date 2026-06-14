"""Interview session management routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from database import get_db
from models import User, InterviewSession, SessionStatus
from auth_utils import get_current_user

router = APIRouter()


class CreateSessionRequest(BaseModel):
    title: str = "Untitled Session"
    platform: str | None = None
    mode: str = "neuralwhisper"


@router.post("/")
async def create_session(
    req: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = InterviewSession(
        user_id=user.id,
        title=req.title,
        platform=req.platform,
        mode=req.mode,
    )
    db.add(session)
    await db.flush()
    return {"id": session.id, "status": session.status.value}


@router.get("/")
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.started_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "platform": s.platform,
            "mode": s.mode,
            "status": s.status.value,
            "duration_seconds": s.duration_seconds,
            "credits_used": s.credits_used,
            "score": s.score,
            "started_at": s.started_at.isoformat(),
        }
        for s in sessions
    ]


@router.post("/{session_id}/end")
async def end_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.COMPLETED
    session.ended_at = datetime.utcnow()
    if session.started_at:
        session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())
    db.add(session)
    return {"message": "Session ended", "duration_seconds": session.duration_seconds}
