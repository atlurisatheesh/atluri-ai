"""NeuralWhisper™ AI Engine routes: transcription, AI response generation, coding analysis."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import base64
import time

from database import get_db
from models import User, AIResponse, InterviewSession
from auth_utils import get_current_user
from config import settings

router = APIRouter()


class TranscribeRequest(BaseModel):
    audio_base64: str | None = None
    text: str | None = None  # direct text input
    session_id: str
    source: str = "microphone"  # microphone, system_audio


class AIResponseRequest(BaseModel):
    session_id: str
    question: str
    context: dict | None = None  # resume, jd, company data
    response_style: str = "balanced"  # fast, balanced, thorough
    persona: str = "senior_faang"


class CodeAnalysisRequest(BaseModel):
    problem: str
    language: str = "python"
    code: str | None = None
    analysis_type: str = "full"  # hint, analysis, solution, communication


class AIResponseData(BaseModel):
    question_detected: str
    direct_answer: str
    key_points: list[str]
    star_example: str | None
    avoid_saying: list[str]
    confidence: float
    latency_ms: int


@router.post("/transcribe")
async def transcribe_audio(
    req: TranscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """NeuralWhisper™ — Real-time audio transcription via Deepgram Nova-2 or OpenAI Whisper."""

    # If text was sent directly (e.g. from browser SpeechRecognition), just return it
    if req.text:
        return {
            "text": req.text,
            "confidence": 1.0,
            "speaker": "user",
            "timestamp": datetime.utcnow().isoformat(),
        }

    # If audio_base64 was sent, decode and transcribe
    if req.audio_base64:
        audio_bytes = base64.b64decode(req.audio_base64)

        # Try Deepgram first (faster, better speaker diarization)
        if settings.DEEPGRAM_API_KEY:
            from deepgram_client import transcribe_audio_deepgram
            result = await transcribe_audio_deepgram(audio_bytes)
            if result.get("text"):
                return {
                    "text": result["text"],
                    "confidence": result.get("confidence", 0.95),
                    "speakers": result.get("speakers", []),
                    "timestamp": datetime.utcnow().isoformat(),
                }

        # Fallback to OpenAI Whisper
        if settings.OPENAI_API_KEY:
            from deepgram_client import transcribe_audio_openai
            result = await transcribe_audio_openai(audio_bytes)
            return {
                "text": result.get("text", ""),
                "confidence": result.get("confidence", 0.95),
                "timestamp": datetime.utcnow().isoformat(),
            }

    # Demo mode
    return {
        "text": "Configure DEEPGRAM_API_KEY or OPENAI_API_KEY for live transcription.",
        "confidence": 0.0,
        "timestamp": datetime.utcnow().isoformat(),
        "demo": True,
    }


@router.post("/generate-response", response_model=AIResponseData)
async def generate_ai_response(
    req: AIResponseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Genius Response Engine™ — Generate structured interview answer using GPT-4o."""
    start = time.time()

    # Check credits
    if user.credits < settings.CREDIT_COST_AI_RESPONSE:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Use real OpenAI if configured
    if settings.OPENAI_API_KEY:
        from openai_client import generate_interview_response
        result = await generate_interview_response(
            question=req.question,
            context=req.context,
            persona=req.persona,
            style=req.response_style,
        )
        latency = int((time.time() - start) * 1000)

        response_data = AIResponseData(
            question_detected=req.question,
            direct_answer=result.get("direct_answer", ""),
            key_points=result.get("key_points", []),
            star_example=result.get("star_example"),
            avoid_saying=result.get("avoid_saying", []),
            confidence=result.get("confidence", 0.9),
            latency_ms=latency,
        )
    else:
        # Demo fallback
        response_data = AIResponseData(
            question_detected=req.question,
            direct_answer=f"Based on my experience, {req.question.lower().rstrip('?')} involves a structured approach with measurable outcomes.",
            key_points=["Structured approach", "Cross-functional collaboration", "40% improvement", "Industry best practices"],
            star_example="S: Faced a complex challenge. T: Deliver under tight timeline. A: Led team of 6, agile methodology. R: 40% improvement.",
            avoid_saying=["Don't be vague", "Use specific numbers"],
            confidence=0.75,
            latency_ms=int((time.time() - start) * 1000),
        )

    # Deduct credits
    user.credits -= settings.CREDIT_COST_AI_RESPONSE
    db.add(user)

    # Save response
    ai_resp = AIResponse(
        session_id=req.session_id,
        user_id=user.id,
        question_detected=response_data.question_detected,
        direct_answer=response_data.direct_answer,
        key_points=response_data.key_points,
        star_example=response_data.star_example,
        avoid_saying=response_data.avoid_saying,
        confidence=response_data.confidence,
        latency_ms=response_data.latency_ms,
    )
    db.add(ai_resp)

    return response_data


@router.post("/code-analysis")
async def analyze_code(
    req: CodeAnalysisRequest,
    user: User = Depends(get_current_user),
):
    """CodeForge™ — AI coding analysis with Big-O, hints, and communication tips."""
    if settings.OPENAI_API_KEY:
        from openai_client import analyze_code_with_ai
        return await analyze_code_with_ai(req.problem, req.language, req.code)

    # Demo fallback
    return {
        "pattern": "Sliding Window + Hash Map",
        "time_complexity": "O(n)",
        "space_complexity": "O(min(n, m))",
        "hints": [
            {"level": 1, "text": "Think about what defines a valid window."},
            {"level": 2, "text": "Can you track character positions efficiently?"},
            {"level": 3, "text": "Use a hash map to store last seen index of each character."},
        ],
        "edge_cases": ["Empty string", "Single character", "All same characters", "All unique characters"],
        "communication_script": [
            "I recognize this as a sliding window problem...",
            "Let me start with the brute force, then optimize...",
            f"The optimal solution in {req.language} uses a hash map for O(n) time...",
        ],
    }
