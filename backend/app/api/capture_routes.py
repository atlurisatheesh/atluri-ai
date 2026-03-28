"""
Screen Capture Analysis routes — Vision AI for screen region analysis.
POST /api/capture/analyze — accepts base64 screenshot, returns AI analysis.

Uses GPT-4o vision to analyze coding questions, system design diagrams,
or any on-screen content captured from the desktop overlay.
"""

import os
import logging
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_user_id

logger = logging.getLogger("app.api.capture")
router = APIRouter(prefix="/api/capture", tags=["Screen Capture"])


# ── Request / Response models ──

class CaptureContext(BaseModel):
    role: str = "behavioral"
    question: str = ""
    transcript: str = ""
    resume: str = ""
    job_description: str = ""

class CaptureAnalyzeRequest(BaseModel):
    image_base64: str
    context: CaptureContext | None = None

class CaptureAnalyzeResponse(BaseModel):
    analysis: str
    question_type: str = "unknown"
    extracted_text: str = ""
    duration_ms: int = 0


# ── Prompt templates per detected question type ──

VISION_SYSTEM_PROMPT = """You are a real-time interview assistant analyzing a screenshot from a live interview.
The candidate needs help RIGHT NOW. Be concise and actionable.

ROLE: {role}

INSTRUCTIONS:
- First, identify what is shown: code editor, system design diagram, whiteboard, chat, or text question.
- Extract any visible question or problem statement.
- Provide a clear, structured answer.

For CODING questions:
1. Approach (1 line)
2. Optimal solution (pseudocode or key algorithm steps)
3. Time: O(?), Space: O(?)
Keep it under 20 lines.

For SYSTEM DESIGN:
1. Core components (3 max, 8 words each)
2. Key trade-off to mention
3. Scale number to anchor the design

For TEXT/BEHAVIORAL questions:
- Answer in max 3 bullet points
- Each bullet max 15 words
- If behavioral: use STAR format briefly

For any other content:
- Extract and summarize the key information
- Suggest what the candidate should address
"""

CURRENT_CONTEXT_TEMPLATE = """
CURRENT INTERVIEW CONTEXT:
- Question detected from audio: "{question}"
- Recent transcript: "{transcript}"
{resume_section}{jd_section}
Analyze the screenshot and provide actionable guidance for the candidate.
"""


async def _analyze_with_vision(image_base64: str, context: CaptureContext | None) -> dict:
    """Send screenshot to GPT-4o Vision for analysis."""
    try:
        import openai
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or api_key.startswith("sk-proj-placeholder"):
            raise ValueError("No valid OpenAI API key configured")

        client = openai.AsyncOpenAI(api_key=api_key)

        role = context.role if context else "behavioral"
        question = context.question if context else ""
        transcript = context.transcript if context else ""
        resume = context.resume if context else ""
        job_description = context.job_description if context else ""

        system_prompt = VISION_SYSTEM_PROMPT.format(role=role)

        # Build resume/JD sections for context injection
        resume_section = ""
        if resume:
            resume_section = f"\n- Candidate Resume/Experience:\n{resume[:1500]}\n"
        jd_section = ""
        if job_description:
            jd_section = f"\n- Target Job Description:\n{job_description[:1500]}\n"

        user_content = []

        # Add context text if available
        if question or transcript:
            user_content.append({
                "type": "text",
                "text": CURRENT_CONTEXT_TEMPLATE.format(
                    question=question[:500],
                    transcript=transcript[:1000],
                    resume_section=resume_section,
                    jd_section=jd_section,
                ),
            })
        else:
            user_content.append({
                "type": "text",
                "text": "Analyze this screenshot from a live interview and provide actionable guidance.",
            })

        # Add the screenshot image
        # Ensure proper base64 data URL format
        if not image_base64.startswith("data:"):
            image_url = f"data:image/png;base64,{image_base64}"
        else:
            image_url = image_base64

        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": image_url,
                "detail": "high",  # high detail for code readability
            },
        })

        start = time.monotonic()
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            max_tokens=1000,
            temperature=0.3,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)

        analysis_text = resp.choices[0].message.content or ""

        # Detect question type from analysis
        analysis_lower = analysis_text.lower()
        if any(kw in analysis_lower for kw in ["o(n)", "o(1)", "time complexity", "algorithm", "function", "def ", "class "]):
            q_type = "coding"
        elif any(kw in analysis_lower for kw in ["component", "architecture", "scale", "load balancer", "database", "microservice"]):
            q_type = "system_design"
        elif any(kw in analysis_lower for kw in ["star", "situation", "action", "result", "tell me about"]):
            q_type = "behavioral"
        else:
            q_type = "general"

        return {
            "analysis": analysis_text,
            "question_type": q_type,
            "extracted_text": "",  # Could add OCR extraction in future
            "duration_ms": elapsed_ms,
        }

    except ImportError:
        logger.warning("openai package not installed for vision analysis")
        return {
            "analysis": "Vision analysis unavailable — OpenAI package not installed.",
            "question_type": "unknown",
            "extracted_text": "",
            "duration_ms": 0,
        }
    except Exception as e:
        logger.warning(f"Vision analysis failed: {e}")
        return {
            "analysis": f"Vision analysis error: {str(e)}",
            "question_type": "unknown",
            "extracted_text": "",
            "duration_ms": 0,
        }


# ── Routes ──

@router.post("/analyze", response_model=CaptureAnalyzeResponse)
async def analyze_capture(
    req: CaptureAnalyzeRequest,
    user_id: str = Depends(get_user_id),
):
    """Analyze a screen capture using GPT-4o Vision.
    
    Accepts a base64-encoded PNG screenshot and optional interview context.
    Returns structured analysis with question type detection.
    """
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    # Limit image size (base64 ~1.33x raw; cap at ~10MB image)
    if len(req.image_base64) > 14_000_000:
        raise HTTPException(status_code=413, detail="Image too large (max ~10MB)")

    logger.info(f"Analyzing capture for user={user_id}, context_role={req.context.role if req.context else 'none'}")

    result = await _analyze_with_vision(req.image_base64, req.context)
    return CaptureAnalyzeResponse(**result)
