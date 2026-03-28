"""
ARIA API Routes — /api/resume/aria prefix.

7 endpoints powering the ARIA resume intelligence system:
  POST /intake      — Full 5-pass analysis pipeline
  POST /generate    — Complete resume generation
  POST /score       — 16-check dual-factor scoring
  POST /rewrite     — C·A·M bullet rewriting
  POST /keywords    — Keyword match matrix
  POST /gaps        — Gap intelligence brief
  POST /edits       — Top 3 precision edits
  GET  /history     — User's past analyses
  GET  /{id}        — Single analysis detail
"""

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import ResumeAnalysis
from app.auth import get_user_id

from app.resume.aria_engine import run_full_intake
from app.resume.aria_content import (
    generate_full_resume,
    generate_headline,
    generate_summary,
    generate_precision_edits,
    generate_keyword_matrix,
    rewrite_bullet_cam,
)
from app.resume.aria_scoring import run_16_check_scoring

logger = logging.getLogger("aria.routes")
router = APIRouter(prefix="/api/resume/aria", tags=["ARIA Intelligence"])


# ── Request models ────────────────────────────────────────

class IntakeRequest(BaseModel):
    resume_text: str = Field(..., min_length=50, description="Raw resume text or achievements")
    job_description: str = Field(default="", description="Target job description")
    target_company: str = Field(default="", description="Company name + stage")
    current_title: str = Field(default="", description="Current or last title")
    years_experience: int = Field(default=0, ge=0, le=50)
    career_situation: str = Field(default="standard", pattern="^(standard|pivot|promotion|gap|executive|entry)$")
    company_culture: str = Field(default="", description="startup|scaleup|enterprise|creative|agency|hybrid")
    tone_mode: str = Field(default="corporate", pattern="^(corporate|conversational|technical|narrative)$")
    skills_and_tools: str = Field(default="", description="Comma-separated skills")
    education: str = Field(default="", description="Degree · School · Year")
    certifications: str = Field(default="", description="Cert names")


class GenerateRequest(BaseModel):
    analysis_id: str = Field(..., description="ID from /intake response")
    tone_mode: str = Field(default="corporate", pattern="^(corporate|conversational|technical|narrative)$")


class BulletRewriteRequest(BaseModel):
    bullet: str = Field(..., min_length=5)
    job_context: dict | None = None


class ScoreRequest(BaseModel):
    analysis_id: str | None = Field(default=None, description="Use stored analysis")
    resume_json: dict | None = Field(default=None, description="Or provide resume JSON directly")
    job_signals: dict | None = None


# ── Endpoints ─────────────────────────────────────────────

@router.post("/intake")
async def aria_intake(req: IntakeRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Run ARIA 5-pass intelligence intake. Returns analysis ID + full breakdown."""
    uid = get_user_id(request)

    try:
        # Enrich resume text with extra fields
        enriched_text = req.resume_text
        if req.skills_and_tools:
            enriched_text += f"\n\nSkills: {req.skills_and_tools}"
        if req.education:
            enriched_text += f"\n\nEducation: {req.education}"
        if req.certifications:
            enriched_text += f"\n\nCertifications: {req.certifications}"

        intake = await run_full_intake(
            resume_text=enriched_text,
            job_description=req.job_description,
            current_title=req.current_title,
            years_experience=req.years_experience,
            career_situation=req.career_situation,
            company_culture=req.company_culture,
            target_company=req.target_company,
        )

        # Mark previous analyses as not latest
        await db.execute(
            update(ResumeAnalysis)
            .where(ResumeAnalysis.user_id == uuid.UUID(uid), ResumeAnalysis.is_latest == True)
            .values(is_latest=False)
        )

        # Save to DB
        analysis = ResumeAnalysis(
            user_id=uuid.UUID(uid),
            resume_text=req.resume_text,
            job_description=req.job_description or None,
            target_company=req.target_company or None,
            current_title=req.current_title or None,
            years_experience=req.years_experience or None,
            career_situation=req.career_situation,
            company_culture=req.company_culture or None,
            tone_mode=req.tone_mode,
            intake_analysis=intake,
            is_latest=True,
        )
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)

        return {
            "analysis_id": str(analysis.id),
            "intake": intake,
            "status": "intake_complete",
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"ARIA intake failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Intake analysis failed: {str(e)}")


@router.post("/generate")
async def aria_generate(req: GenerateRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate a complete ARIA-powered resume from a previous intake analysis."""
    uid = get_user_id(request)

    # Load analysis
    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == uuid.UUID(req.analysis_id),
            ResumeAnalysis.user_id == uuid.UUID(uid),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    if not analysis.intake_analysis:
        raise HTTPException(400, "Run /intake first before generating")

    try:
        intake = analysis.intake_analysis

        # Generate full resume
        resume = await generate_full_resume(intake, req.tone_mode)

        # Run 16-check scoring
        score_card = run_16_check_scoring(
            resume,
            job_signals=intake.get("job_signals", {}),
            candidate_signals=intake.get("candidate_signals", {}),
            personality_layer=intake.get("personality_layer", {}),
        )

        # Generate keyword matrix
        keyword_matrix = await generate_keyword_matrix(intake, resume)

        # Generate precision edits
        edits = await generate_precision_edits(intake, resume)

        # Gap brief is already in intake
        gap_brief = intake.get("gap_intelligence", {})

        # Update DB
        analysis.generated_resume = resume
        analysis.score_card = score_card
        analysis.keyword_matrix = keyword_matrix
        analysis.gap_brief = gap_brief
        analysis.precision_edits = edits
        analysis.ats_score = score_card.get("ats_score")
        analysis.content_score = score_card.get("content_score")
        analysis.total_score = score_card.get("total_score")
        analysis.tone_mode = req.tone_mode

        await db.commit()
        await db.refresh(analysis)

        return {
            "analysis_id": str(analysis.id),
            "resume": resume,
            "score_card": score_card,
            "keyword_matrix": keyword_matrix,
            "gap_brief": gap_brief,
            "precision_edits": edits,
            "status": "generation_complete",
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"ARIA generate failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resume generation failed: {str(e)}")


@router.post("/score")
async def aria_score(req: ScoreRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Run 16-check scoring on a resume."""
    uid = get_user_id(request)

    if req.analysis_id:
        result = await db.execute(
            select(ResumeAnalysis).where(
                ResumeAnalysis.id == uuid.UUID(req.analysis_id),
                ResumeAnalysis.user_id == uuid.UUID(uid),
            )
        )
        analysis = result.scalar_one_or_none()
        if not analysis or not analysis.generated_resume:
            raise HTTPException(404, "Analysis with generated resume not found")

        resume = analysis.generated_resume
        job_signals = (analysis.intake_analysis or {}).get("job_signals", {})
        candidate_signals = (analysis.intake_analysis or {}).get("candidate_signals", {})
        personality = (analysis.intake_analysis or {}).get("personality_layer", {})
    elif req.resume_json:
        resume = req.resume_json
        job_signals = req.job_signals or {}
        candidate_signals = {}
        personality = {}
    else:
        raise HTTPException(400, "Provide analysis_id or resume_json")

    score_card = run_16_check_scoring(resume, job_signals, candidate_signals, personality)
    return {"score_card": score_card}


@router.post("/rewrite")
async def aria_rewrite_bullet(req: BulletRewriteRequest, request: Request):
    """Rewrite a single bullet using C·A·M formula."""
    get_user_id(request)
    try:
        result = await rewrite_bullet_cam(req.bullet, req.job_context)
        return result
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/keywords")
async def aria_keywords(req: GenerateRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate keyword match matrix for an analysis."""
    uid = get_user_id(request)

    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == uuid.UUID(req.analysis_id),
            ResumeAnalysis.user_id == uuid.UUID(uid),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis or not analysis.generated_resume:
        raise HTTPException(404, "Generate a resume first")

    matrix = await generate_keyword_matrix(analysis.intake_analysis or {}, analysis.generated_resume)

    analysis.keyword_matrix = matrix
    await db.commit()

    return {"keyword_matrix": matrix}


@router.post("/gaps")
async def aria_gaps(req: GenerateRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Return the gap intelligence brief."""
    uid = get_user_id(request)

    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == uuid.UUID(req.analysis_id),
            ResumeAnalysis.user_id == uuid.UUID(uid),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    gap_brief = (analysis.intake_analysis or {}).get("gap_intelligence", {})
    return {"gap_brief": gap_brief}


@router.post("/edits")
async def aria_edits(req: GenerateRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate the top 3 precision edits."""
    uid = get_user_id(request)

    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == uuid.UUID(req.analysis_id),
            ResumeAnalysis.user_id == uuid.UUID(uid),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis or not analysis.generated_resume:
        raise HTTPException(404, "Generate a resume first")

    edits = await generate_precision_edits(analysis.intake_analysis or {}, analysis.generated_resume)

    analysis.precision_edits = edits
    await db.commit()

    return {"precision_edits": edits}


@router.get("/history")
async def aria_history(request: Request, db: AsyncSession = Depends(get_db)):
    """List user's ARIA resume analyses."""
    uid = get_user_id(request)

    result = await db.execute(
        select(ResumeAnalysis)
        .where(ResumeAnalysis.user_id == uuid.UUID(uid))
        .order_by(ResumeAnalysis.created_at.desc())
        .limit(20)
    )
    analyses = result.scalars().all()

    return {
        "analyses": [
            {
                "id": str(a.id),
                "target_company": a.target_company,
                "current_title": a.current_title,
                "career_situation": a.career_situation,
                "ats_score": a.ats_score,
                "content_score": a.content_score,
                "total_score": a.total_score,
                "is_latest": a.is_latest,
                "version": a.version,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in analyses
        ]
    }


@router.get("/{analysis_id}")
async def aria_detail(analysis_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Get full detail of a single ARIA analysis."""
    uid = get_user_id(request)

    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == uuid.UUID(analysis_id),
            ResumeAnalysis.user_id == uuid.UUID(uid),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    return {
        "id": str(analysis.id),
        "intake_analysis": analysis.intake_analysis,
        "generated_resume": analysis.generated_resume,
        "score_card": analysis.score_card,
        "keyword_matrix": analysis.keyword_matrix,
        "gap_brief": analysis.gap_brief,
        "precision_edits": analysis.precision_edits,
        "ats_score": analysis.ats_score,
        "content_score": analysis.content_score,
        "total_score": analysis.total_score,
        "target_company": analysis.target_company,
        "current_title": analysis.current_title,
        "career_situation": analysis.career_situation,
        "tone_mode": analysis.tone_mode,
        "version": analysis.version,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
    }
