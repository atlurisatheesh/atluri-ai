"""
MentorLink™ Duo routes — /api/duo prefix.
Real-time collaborative interview help via session codes.
"""

import logging
import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import MentorSession
from app.auth import get_user_id

logger = logging.getLogger("app.api.duo")
router = APIRouter(prefix="/api/duo", tags=["MentorLink™"])


class SendHintRequest(BaseModel):
    session_code: str
    hint: str
    sender: str = "helper"


def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


@router.post("/create")
async def create_mentor_session(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Create a new MentorLink™ session as candidate. Returns 6-digit code."""
    code = _generate_code()
    # Ensure uniqueness
    for _ in range(10):
        existing = await db.execute(select(MentorSession).where(MentorSession.session_code == code, MentorSession.status != "ended"))
        if not existing.scalars().first():
            break
        code = _generate_code()

    session = MentorSession(
        candidate_id=user_id,
        session_code=code,
        status="waiting",
        hints_sent=[],
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_code": code,
        "status": "waiting",
        "expires_in_minutes": 30,
        "id": str(session.id),
    }


@router.post("/join")
async def join_mentor_session(session_code: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Join a MentorLink™ session as helper via 6-digit code."""
    result = await db.execute(
        select(MentorSession).where(MentorSession.session_code == session_code, MentorSession.status == "waiting")
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found or already connected")

    session.helper_id = user_id
    session.status = "connected"
    await db.commit()

    return {
        "session_code": session_code,
        "status": "connected",
        "id": str(session.id),
    }


@router.post("/hint")
async def send_hint(req: SendHintRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Send a stealth hint to the candidate."""
    result = await db.execute(
        select(MentorSession).where(MentorSession.session_code == req.session_code, MentorSession.status == "connected")
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Active session not found")

    hints = session.hints_sent or []
    hints.append({
        "text": req.hint,
        "sender": req.sender,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    session.hints_sent = hints
    await db.commit()

    return {"sent": True, "total_hints": len(hints)}


@router.post("/{session_code}/end")
async def end_mentor_session(session_code: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """End a MentorLink™ session."""
    result = await db.execute(
        select(MentorSession).where(MentorSession.session_code == session_code)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")

    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()

    return {"ended": True, "session_code": session_code, "total_hints": len(session.hints_sent or [])}
