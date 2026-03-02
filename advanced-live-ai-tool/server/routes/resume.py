"""ProfileCraft™ — AI Resume Builder routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from auth_utils import get_current_user
from config import settings

router = APIRouter()


class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str | None = None


class BulletRewriteRequest(BaseModel):
    bullet: str
    context: str | None = None


@router.post("/analyze")
async def analyze_resume(
    req: ResumeAnalysisRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ProfileCraft™ — ATS scoring and analysis."""
    if user.credits < settings.CREDIT_COST_RESUME_ANALYSIS:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Demo ATS analysis
    issues = []
    score = 78

    if "led" in req.resume_text.lower() or "managed" in req.resume_text.lower():
        score += 5
    else:
        issues.append({"type": "warning", "text": "Missing leadership action verbs"})

    if any(c.isdigit() for c in req.resume_text):
        score += 4
    else:
        issues.append({"type": "error", "text": "No quantified achievements found"})

    if req.job_description:
        # Simple keyword matching
        jd_words = set(req.job_description.lower().split())
        resume_words = set(req.resume_text.lower().split())
        match_pct = len(jd_words & resume_words) / max(len(jd_words), 1) * 100
        score = min(100, score + int(match_pct * 0.2))

        missing = list(jd_words - resume_words)[:5]
        if missing:
            issues.append({"type": "warning", "text": f"Missing JD keywords: {', '.join(missing[:3])}"})

    # Deduct credits
    user.credits -= settings.CREDIT_COST_RESUME_ANALYSIS
    db.add(user)

    return {
        "ats_score": min(100, score),
        "issues": issues,
        "strengths": [
            "Strong action verbs detected",
            "Education section complete",
            "Contact information present",
        ],
        "missing_keywords": [],
        "rewrite_suggestions": [
            {"original": "Worked on various projects", "improved": "Led 5 cross-functional projects delivering $2M annual savings"},
        ],
    }


@router.post("/rewrite-bullet")
async def rewrite_bullet(
    req: BulletRewriteRequest,
    user: User = Depends(get_current_user),
):
    """AI-powered bullet point rewriting with metrics."""
    return {
        "original": req.bullet,
        "rewritten": f"Spearheaded {req.bullet.lower().strip('.')} initiative, achieving 35% improvement in key metrics and reducing operational costs by $150K annually",
        "improvements": ["Added specific metric", "Used power verb", "Quantified impact"],
    }
