"""
AI Engine routes — NeuralWhisper™ transcription, Genius Response Engine™,
CodeForge™ analysis.  /api/ai prefix.
"""

import base64
import time
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, AIResponse, InterviewSession
from app.auth import get_user_id

logger = logging.getLogger("app.api.ai")
router = APIRouter(prefix="/api/ai", tags=["AI Engine"])


# ── Pydantic models ──
class TranscribeRequest(BaseModel):
    audio_base64: str | None = None
    text: str | None = None
    language: str = "en"

class AIResponseRequest(BaseModel):
    question: str
    context: str | None = None
    persona: str = "senior_faang"
    style: str = "balanced"  # fast | balanced | thorough
    session_id: str | None = None

class CodeAnalysisRequest(BaseModel):
    problem: str
    language: str = "python"
    code: str = ""


# ── Helper: build interview response (demo mode if no OpenAI) ──
async def _generate_interview_response(question: str, context: str, persona: str, style: str) -> dict:
    """GPT-4o structured interview answer. Falls back to demo response."""
    import os
    try:
        import openai
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key and not api_key.startswith("sk-"):
            raise ValueError("Invalid key")
        client = openai.AsyncOpenAI(api_key=api_key)
        system_prompt = (
            "You are an expert interview coach. The candidate is in a live interview.\n"
            f"Persona: {persona}. Style: {style}.\n"
            "Return JSON: {direct_answer, key_points[], star_example, avoid_saying[], confidence(0-1)}"
        )
        if context:
            system_prompt += f"\nContext: {context[:2000]}"
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1000,
        )
        import json
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        logger.warning(f"OpenAI fallback: {e}")
        return {
            "direct_answer": f"For '{question}', I would approach this by first understanding the core requirements, then systematically addressing each component with specific examples from my experience.",
            "key_points": [
                "Break down the problem into manageable components",
                "Apply relevant design patterns and best practices",
                "Consider scalability, maintainability, and edge cases",
                "Communicate your thought process clearly",
            ],
            "star_example": "In my previous role, I faced a similar challenge where I led the redesign of a critical system component, resulting in a 40% performance improvement and significantly reduced technical debt.",
            "avoid_saying": ["I don't know", "That's not my area", "I've never done that"],
            "confidence": 0.85,
        }


async def _analyze_code(problem: str, language: str, code: str) -> dict:
    """GPT-4o code analysis. Falls back to demo."""
    import os
    try:
        import openai
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or api_key.startswith("sk-proj-placeholder"):
            raise ValueError("No key")
        client = openai.AsyncOpenAI(api_key=api_key)
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert coding interviewer. Analyze the code. Return JSON: {pattern, time_complexity, space_complexity, hints[3], edge_cases[], solution_approach, communication_script}"},
                {"role": "user", "content": f"Problem: {problem}\nLanguage: {language}\nCode:\n{code}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=1500,
        )
        import json
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {
            "pattern": "Sliding Window / Two Pointer",
            "time_complexity": "O(n)",
            "space_complexity": "O(min(n, m))",
            "hints": [
                "Think about what information you need to track as you scan",
                "Consider using a hash map to track character positions",
                "The window shrinks from the left when a duplicate is found",
            ],
            "edge_cases": ["Empty string", "Single character", "All identical characters", "Unicode characters"],
            "solution_approach": "Use a sliding window with a hash set. Expand the window right, contract from left on duplicate.",
            "communication_script": "I'll use a sliding window approach. Let me walk through the key insight: we maintain a window of unique characters...",
        }


# ── Endpoints ──
@router.post("/transcribe")
async def transcribe_audio(req: TranscribeRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """NeuralWhisper™ — Real-time audio transcription."""
    if req.text:
        return {"text": req.text, "confidence": 1.0, "speakers": [], "source": "text_passthrough"}

    if not req.audio_base64:
        raise HTTPException(400, "Provide audio_base64 or text")

    # Try Deepgram, then OpenAI Whisper, then demo
    import os
    try:
        import httpx
        dg_key = os.getenv("DEEPGRAM_API_KEY", "")
        if dg_key:
            audio_bytes = base64.b64decode(req.audio_base64)
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&utterances=true",
                    content=audio_bytes,
                    headers={"Authorization": f"Token {dg_key}", "Content-Type": "audio/webm"},
                )
                data = resp.json()
                alt = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0]
                speakers = []
                for utt in data.get("results", {}).get("utterances", []):
                    speakers.append({"speaker": utt.get("speaker", 0), "text": utt.get("transcript", ""), "start": utt.get("start", 0), "end": utt.get("end", 0)})
                return {"text": alt.get("transcript", ""), "confidence": alt.get("confidence", 0), "speakers": speakers, "source": "deepgram"}
    except Exception as e:
        logger.warning(f"Deepgram fallback: {e}")

    return {"text": "Thank you for that question. Let me think about the best approach...", "confidence": 0.92, "speakers": [{"speaker": 0, "text": "Can you tell me about your experience?", "start": 0, "end": 3.2}], "source": "demo"}


@router.post("/generate-response")
async def generate_ai_response(req: AIResponseRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Genius Response Engine™ — Structured interview answer via GPT-4o."""
    start = time.time()
    result = await _generate_interview_response(req.question, req.context or "", req.persona, req.style)
    latency_ms = int((time.time() - start) * 1000)

    # Save to DB
    try:
        ai_resp = AIResponse(
            user_id=user_id,
            session_id=req.session_id if req.session_id else None,
            question_detected=req.question,
            direct_answer=result.get("direct_answer"),
            key_points=result.get("key_points"),
            star_example=result.get("star_example"),
            avoid_saying=result.get("avoid_saying"),
            confidence=result.get("confidence"),
            model_used="gpt-4o",
            latency_ms=latency_ms,
        )
        db.add(ai_resp)
        await db.commit()
    except Exception as e:
        logger.error(f"DB save error: {e}")

    return {**result, "latency_ms": latency_ms}


@router.post("/code-analysis")
async def analyze_code(req: CodeAnalysisRequest, request: Request):
    user_id = get_user_id(request)
    """CodeForge™ — AI coding analysis with patterns, hints, and communication scripts."""
    result = await _analyze_code(req.problem, req.language, req.code)
    return result
