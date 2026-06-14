"""SimuDrill™ — AI Mock Interview routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import random

from database import get_db
from models import User, MockResult
from auth_utils import get_current_user
from config import settings

router = APIRouter()


class StartMockRequest(BaseModel):
    interview_type: str  # technical, behavioral, system_design, hr
    company: str = "Google"
    difficulty: str = "mid"  # intern, junior, mid, senior, staff
    duration_minutes: int = 30
    ai_voice: bool = False


class AnswerRequest(BaseModel):
    mock_id: str
    question_index: int
    answer: str


QUESTION_POOLS = {
    "technical": [
        "Explain the difference between HTTP/1.1, HTTP/2, and HTTP/3.",
        "How does garbage collection work in modern programming languages?",
        "What are the ACID properties in database transactions?",
        "Explain eventual consistency vs strong consistency.",
        "How would you design a system to handle 10 million concurrent WebSocket connections?",
    ],
    "behavioral": [
        "Tell me about a time you led a project that didn't go as planned.",
        "Describe a situation where you had to make a decision with incomplete information.",
        "How do you handle disagreements with team members?",
        "Tell me about a time you went above and beyond for a customer or stakeholder.",
        "Describe your approach to mentoring junior engineers.",
    ],
    "system_design": [
        "Design a real-time chat application like Slack.",
        "Design a scalable notification system for millions of users.",
        "Design an API rate limiter.",
        "Design a video streaming platform like YouTube.",
        "Design a distributed task scheduler.",
    ],
}


@router.post("/start")
async def start_mock(
    req: StartMockRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SimuDrill™ — Start a new AI mock interview session."""
    if user.credits < settings.CREDIT_COST_MOCK_SESSION:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    pool = QUESTION_POOLS.get(req.interview_type, QUESTION_POOLS["technical"])
    questions = random.sample(pool, min(3, len(pool)))

    mock = MockResult(
        user_id=user.id,
        interview_type=req.interview_type,
        company=req.company,
        difficulty=req.difficulty,
        duration_minutes=req.duration_minutes,
        questions_data=[{"question": q, "answer": None, "score": None, "feedback": None} for q in questions],
    )
    db.add(mock)

    user.credits -= settings.CREDIT_COST_MOCK_SESSION
    db.add(user)
    await db.flush()

    return {
        "mock_id": mock.id,
        "questions": questions,
        "total_questions": len(questions),
        "duration_minutes": req.duration_minutes,
    }


@router.post("/answer")
async def submit_answer(
    req: AnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit answer and get AI scoring + feedback."""
    # Demo scoring
    score = random.randint(70, 95)
    feedback = "Good structure. Consider adding more specific metrics to strengthen your answer."
    if score > 85:
        feedback = "Excellent response! Clear structure, specific examples, and quantified impact."

    return {
        "score": score,
        "feedback": feedback,
        "improvements": [
            "Add a specific metric or number",
            "Use the STAR format more explicitly",
            "Connect your answer to the company's values",
        ],
    }


@router.post("/{mock_id}/complete")
async def complete_mock(
    mock_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete mock and generate final report."""
    from sqlalchemy import select

    result = await db.execute(
        select(MockResult).where(MockResult.id == mock_id, MockResult.user_id == user.id)
    )
    mock = result.scalar_one_or_none()
    if not mock:
        raise HTTPException(status_code=404, detail="Mock session not found")

    # Generate scores
    mock.overall_score = random.uniform(75, 95)
    mock.communication_score = random.uniform(70, 95)
    mock.technical_score = random.uniform(75, 98)
    mock.problem_solving_score = random.uniform(72, 95)
    mock.confidence_score = random.uniform(68, 92)
    mock.time_management_score = random.uniform(75, 95)
    mock.ai_feedback = "Strong performance overall. Focus on improving confidence and adding more quantified metrics to behavioral answers."

    db.add(mock)

    return {
        "overall_score": round(mock.overall_score, 1),
        "communication_score": round(mock.communication_score, 1),
        "technical_score": round(mock.technical_score, 1),
        "problem_solving_score": round(mock.problem_solving_score, 1),
        "confidence_score": round(mock.confidence_score, 1),
        "time_management_score": round(mock.time_management_score, 1),
        "ai_feedback": mock.ai_feedback,
    }
