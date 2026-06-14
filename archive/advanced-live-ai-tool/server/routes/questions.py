"""PrepVault™ — Question Bank routes."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Question, UserQuestionProgress
from auth_utils import get_current_user

router = APIRouter()


@router.get("/")
async def list_questions(
    category: str | None = None,
    difficulty: str | None = None,
    company: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """PrepVault™ — Browse and search question bank."""
    query = select(Question)
    if category:
        query = query.where(Question.category == category)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if company:
        query = query.where(Question.company == company)
    if search:
        query = query.where(Question.text.ilike(f"%{search}%"))

    query = query.order_by(Question.frequency.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    questions = result.scalars().all()

    return [
        {
            "id": q.id,
            "text": q.text,
            "category": q.category.value,
            "difficulty": q.difficulty.value,
            "company": q.company,
            "tags": q.tags,
            "frequency": q.frequency,
        }
        for q in questions
    ]


@router.post("/{question_id}/save")
async def save_question(
    question_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save/unsave a question to PrepVault."""
    result = await db.execute(
        select(UserQuestionProgress).where(
            UserQuestionProgress.user_id == user.id,
            UserQuestionProgress.question_id == question_id,
        )
    )
    progress = result.scalar_one_or_none()
    if progress:
        progress.is_saved = not progress.is_saved
    else:
        progress = UserQuestionProgress(
            user_id=user.id,
            question_id=question_id,
            is_saved=True,
        )
    db.add(progress)
    return {"saved": progress.is_saved}


@router.get("/saved")
async def get_saved_questions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserQuestionProgress)
        .where(UserQuestionProgress.user_id == user.id, UserQuestionProgress.is_saved == True)
    )
    saved = result.scalars().all()
    return [{"question_id": s.question_id, "best_score": s.best_score, "attempts": s.attempts} for s in saved]


@router.get("/due")
async def get_due_questions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get questions due for spaced repetition review."""
    from datetime import datetime

    result = await db.execute(
        select(UserQuestionProgress)
        .where(
            UserQuestionProgress.user_id == user.id,
            UserQuestionProgress.next_review <= datetime.utcnow(),
        )
        .limit(10)
    )
    due = result.scalars().all()
    return [{"question_id": d.question_id, "ease_factor": d.ease_factor} for d in due]
