"""MentorLink™ — Real-time human-assisted interview support via WebRTC."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import random
import string

from database import get_db
from models import User, MentorSession
from auth_utils import get_current_user

router = APIRouter()


def generate_session_code() -> str:
    return "".join(random.choices(string.digits, k=6))


class CreateMentorSessionRequest(BaseModel):
    pass  # no params needed


class JoinMentorSessionRequest(BaseModel):
    session_code: str


class SendHintRequest(BaseModel):
    session_code: str
    hint: str


@router.post("/create")
async def create_mentor_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """MentorLink™ — Create a new mentor session as candidate."""
    code = generate_session_code()
    session = MentorSession(
        candidate_id=user.id,
        session_code=code,
    )
    db.add(session)
    await db.flush()
    return {"session_id": session.id, "session_code": code, "status": "waiting"}


@router.post("/join")
async def join_mentor_session(
    req: JoinMentorSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """MentorLink™ — Join an existing session as helper."""
    result = await db.execute(
        select(MentorSession).where(
            MentorSession.session_code == req.session_code,
            MentorSession.status == "waiting",
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already connected")

    session.helper_id = user.id
    session.status = "connected"
    db.add(session)
    return {"session_id": session.id, "status": "connected"}


@router.post("/hint")
async def send_hint(
    req: SendHintRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a stealth hint to the candidate."""
    result = await db.execute(
        select(MentorSession).where(
            MentorSession.session_code == req.session_code,
            MentorSession.status == "connected",
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    hints = session.hints_sent or []
    hints.append({"text": req.hint, "from": user.id})
    session.hints_sent = hints
    db.add(session)
    return {"message": "Hint sent", "total_hints": len(hints)}


@router.post("/{session_code}/end")
async def end_mentor_session(
    session_code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime

    result = await db.execute(
        select(MentorSession).where(MentorSession.session_code == session_code)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "ended"
    session.ended_at = datetime.utcnow()
    db.add(session)
    return {"message": "MentorLink session ended"}
