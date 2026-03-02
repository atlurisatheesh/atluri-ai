"""
SimuDrill™ Mock interview routes — /api/mock prefix.
Start, answer, and complete AI-scored mock interviews.
"""

import logging
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, MockResult
from app.auth import get_user_id

logger = logging.getLogger("app.api.mock")
router = APIRouter(prefix="/api/mock", tags=["SimuDrill™"])

# ── Question pools ──
QUESTION_POOLS = {
    "technical": [
        "Explain the difference between TCP and UDP. When would you choose one over the other?",
        "How would you design a rate limiter for an API endpoint?",
        "What is the CAP theorem and how does it affect distributed system design?",
        "Explain how garbage collection works in your preferred language.",
        "Describe the differences between SQL and NoSQL databases. When would you use each?",
    ],
    "behavioral": [
        "Tell me about a time you disagreed with your manager. How did you handle it?",
        "Describe a situation where you had to meet a tight deadline with limited resources.",
        "Give an example of when you had to learn a new technology quickly for a project.",
        "Tell me about a time you failed. What did you learn from it?",
        "How do you handle receiving critical feedback on your work?",
    ],
    "system_design": [
        "Design a URL shortener like bit.ly that handles 100M URLs.",
        "How would you design a real-time chat application like Slack?",
        "Design a notification system that can handle 10M push notifications per hour.",
        "How would you architect a ride-sharing service like Uber?",
        "Design a distributed cache system that supports TTL and eviction policies.",
    ],
}


class StartMockRequest(BaseModel):
    interview_type: str = "technical"
    company: str | None = None
    difficulty: str = "mid"
    duration_minutes: int = 30

class AnswerRequest(BaseModel):
    mock_id: str
    question_index: int
    answer: str


@router.post("/start")
async def start_mock(req: StartMockRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Start a SimuDrill™ AI mock interview session."""
    pool_key = req.interview_type if req.interview_type in QUESTION_POOLS else "technical"
    questions = random.sample(QUESTION_POOLS[pool_key], min(3, len(QUESTION_POOLS[pool_key])))

    mock = MockResult(
        user_id=user_id,
        interview_type=req.interview_type,
        company=req.company,
        difficulty=req.difficulty,
        duration_minutes=req.duration_minutes,
        questions_data={"questions": questions, "answers": [], "scores": []},
    )
    db.add(mock)
    await db.commit()
    await db.refresh(mock)

    return {
        "mock_id": str(mock.id),
        "interview_type": req.interview_type,
        "company": req.company,
        "difficulty": req.difficulty,
        "questions": questions,
        "duration_minutes": req.duration_minutes,
    }


@router.post("/answer")
async def submit_answer(req: AnswerRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Submit an answer for scoring during a mock interview."""
    result = await db.execute(select(MockResult).where(MockResult.id == req.mock_id, MockResult.user_id == user_id))
    mock = result.scalars().first()
    if not mock:
        raise HTTPException(404, "Mock session not found")

    # Score (demo: random 70-95; production: GPT-4o evaluation)
    score = random.randint(70, 95)
    data = mock.questions_data or {"questions": [], "answers": [], "scores": []}
    data["answers"].append(req.answer)
    data["scores"].append(score)
    mock.questions_data = data
    await db.commit()

    return {
        "question_index": req.question_index,
        "score": score,
        "feedback": f"Good answer! Score: {score}/100. Consider adding more specific examples and quantifiable results.",
        "improvement": "Try to structure your answer using the STAR method for behavioral questions.",
    }


@router.post("/{mock_id}/complete")
async def complete_mock(mock_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Complete mock interview and generate final 6-dimension report."""
    result = await db.execute(select(MockResult).where(MockResult.id == mock_id, MockResult.user_id == user_id))
    mock = result.scalars().first()
    if not mock:
        raise HTTPException(404, "Mock session not found")

    # Generate 6-dimension scores
    mock.overall_score = round(random.uniform(75, 95), 1)
    mock.communication_score = round(random.uniform(70, 95), 1)
    mock.technical_score = round(random.uniform(72, 98), 1)
    mock.problem_solving_score = round(random.uniform(68, 93), 1)
    mock.confidence_score = round(random.uniform(65, 92), 1)
    mock.time_management_score = round(random.uniform(70, 96), 1)
    mock.ai_feedback = (
        f"Overall strong performance with a {mock.overall_score}/100 score. "
        "Your technical knowledge is solid. Focus on improving confidence and providing more structured answers. "
        "Consider practicing the STAR method for behavioral questions and drawing system diagrams for design questions."
    )
    await db.commit()

    return {
        "mock_id": str(mock.id),
        "overall_score": mock.overall_score,
        "communication_score": mock.communication_score,
        "technical_score": mock.technical_score,
        "problem_solving_score": mock.problem_solving_score,
        "confidence_score": mock.confidence_score,
        "time_management_score": mock.time_management_score,
        "ai_feedback": mock.ai_feedback,
        "interview_type": mock.interview_type,
        "company": mock.company,
    }
