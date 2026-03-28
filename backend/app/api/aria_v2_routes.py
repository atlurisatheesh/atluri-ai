"""
ARIA Extended Routes — /api/resume/v2 prefix.

New endpoints for:
  - Cover Letter (3 variants)
  - ATS Platform Simulation (8 platforms)
  - Page Anatomy Analysis
  - Industry Tone Matrix
  - Multi-Framework Bullet Variants
  - PDF Export
"""

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import ResumeAnalysis
from app.auth import get_user_id

from app.resume.cover_letter import (
    generate_traditional,
    generate_story,
    generate_cold_email,
    generate_all_variants as generate_all_cover_letters,
)
from app.resume.ats_platforms import simulate_all_platforms, score_for_platform, PLATFORMS
from app.resume.page_anatomy import analyze_page_anatomy, ZONES, PLACEMENT_RULES
from app.resume.tone_matrix import get_tone_profile, get_all_industries, INDUSTRY_PROFILES
from app.resume.bullet_variants import generate_variants, get_framework_info
from app.resume.pdf_export import export_pdf_bytes, export_html

logger = logging.getLogger("aria.v2.routes")
router = APIRouter(prefix="/api/resume/v2", tags=["ARIA v2 — Extended"])


# ── Request Models ────────────────────────────────────────

class CoverLetterRequest(BaseModel):
    analysis_id: str = Field(..., description="ARIA analysis ID")
    variant: str = Field(default="all", pattern="^(traditional|story|cold_email|all)$")
    hiring_manager: str = Field(default="", description="Hiring manager name (optional)")


class PlatformScoreRequest(BaseModel):
    analysis_id: str | None = Field(default=None)
    resume_json: dict | None = Field(default=None)
    platform: str = Field(default="all", description="Platform key or 'all'")


class PageAnatomyRequest(BaseModel):
    analysis_id: str | None = Field(default=None)
    resume_json: dict | None = Field(default=None)
    career_situation: str = Field(default="standard")
    seniority: str = Field(default="mid")


class ToneMatrixRequest(BaseModel):
    industry: str | None = Field(default=None, description="Industry key or name")
    base_tone: str = Field(default="corporate")
    company_culture: str = Field(default="")


class BulletVariantsRequest(BaseModel):
    bullet: str = Field(..., min_length=5)
    frameworks: list[str] | None = Field(default=None, description="Specific frameworks or null for all 5")
    context: dict | None = Field(default=None, description="Job context for targeting")


class PDFExportRequest(BaseModel):
    analysis_id: str = Field(..., description="ARIA analysis ID")
    style: str = Field(default="classic", pattern="^(classic|modern|minimal|executive|tech)$")


# ── Helper to load analysis ──────────────────────────────

async def _load_analysis(analysis_id: str, uid: str, db: AsyncSession) -> ResumeAnalysis:
    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == uuid.UUID(analysis_id),
            ResumeAnalysis.user_id == uuid.UUID(uid),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    return analysis


# ═══════════════════════════════════════════════════════════
# COVER LETTER ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/cover-letter")
async def generate_cover_letter(req: CoverLetterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate cover letter(s) from an ARIA analysis."""
    uid = get_user_id(request)
    analysis = await _load_analysis(req.analysis_id, uid, db)

    if not analysis.intake_analysis:
        raise HTTPException(400, "Run ARIA intake first")

    intake = analysis.intake_analysis
    resume = analysis.generated_resume

    try:
        if req.variant == "all":
            result = await generate_all_cover_letters(intake, resume, req.hiring_manager)
        elif req.variant == "traditional":
            result = {"traditional": await generate_traditional(intake, resume, req.hiring_manager)}
        elif req.variant == "story":
            result = {"story": await generate_story(intake, resume, req.hiring_manager)}
        elif req.variant == "cold_email":
            result = {"cold_email": await generate_cold_email(intake, resume, req.hiring_manager)}
        else:
            raise HTTPException(400, f"Unknown variant: {req.variant}")

        return {"analysis_id": req.analysis_id, "cover_letters": result}
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        logger.error(f"Cover letter generation failed: {e}", exc_info=True)
        raise HTTPException(500, f"Cover letter generation failed: {str(e)}")


# ═══════════════════════════════════════════════════════════
# ATS PLATFORM SIMULATION ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/ats-platforms")
async def ats_platform_simulation(req: PlatformScoreRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Score resume against 8 ATS platforms."""
    uid = get_user_id(request)

    if req.analysis_id:
        analysis = await _load_analysis(req.analysis_id, uid, db)
        if not analysis.generated_resume:
            raise HTTPException(400, "Generate a resume first")
        resume = analysis.generated_resume
        job_signals = (analysis.intake_analysis or {}).get("job_signals", {})
    elif req.resume_json:
        resume = req.resume_json
        job_signals = {}
    else:
        raise HTTPException(400, "Provide analysis_id or resume_json")

    if req.platform == "all":
        result = simulate_all_platforms(resume, job_signals)
    else:
        if req.platform not in PLATFORMS:
            raise HTTPException(400, f"Unknown platform: {req.platform}. Valid: {', '.join(PLATFORMS.keys())}")
        result = score_for_platform(req.platform, resume, job_signals)

    return result


@router.get("/ats-platforms/list")
async def list_ats_platforms(request: Request):
    """List all supported ATS platforms."""
    get_user_id(request)
    return {
        "platforms": [
            {
                "key": key,
                "name": p["name"],
                "strictness": p["strictness"],
                "market": p["market"],
            }
            for key, p in PLATFORMS.items()
        ]
    }


# ═══════════════════════════════════════════════════════════
# PAGE ANATOMY ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/page-anatomy")
async def page_anatomy_analysis(req: PageAnatomyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Analyze resume content placement against attention zones."""
    uid = get_user_id(request)

    if req.analysis_id:
        analysis = await _load_analysis(req.analysis_id, uid, db)
        if not analysis.generated_resume:
            raise HTTPException(400, "Generate a resume first")
        resume = analysis.generated_resume
        career_sit = analysis.career_situation or req.career_situation
        seniority_sig = (analysis.intake_analysis or {}).get("job_signals", {}).get("seniority_fingerprint", req.seniority)
    elif req.resume_json:
        resume = req.resume_json
        career_sit = req.career_situation
        seniority_sig = req.seniority
    else:
        raise HTTPException(400, "Provide analysis_id or resume_json")

    result = analyze_page_anatomy(resume, career_sit, seniority_sig)
    return result


@router.get("/page-anatomy/zones")
async def list_zones(request: Request):
    """List all 5 attention zones with weights and rules."""
    get_user_id(request)
    return {"zones": ZONES, "placement_rules": PLACEMENT_RULES}


# ═══════════════════════════════════════════════════════════
# INDUSTRY TONE MATRIX ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/tone-matrix")
async def get_tone(req: ToneMatrixRequest, request: Request):
    """Get industry-specific tone profile."""
    get_user_id(request)
    profile = get_tone_profile(req.industry, req.base_tone, req.company_culture)
    return {"tone_profile": profile}


@router.get("/tone-matrix/industries")
async def list_industries(request: Request):
    """List all available industry tone profiles."""
    get_user_id(request)
    return {"industries": get_all_industries()}


# ═══════════════════════════════════════════════════════════
# MULTI-FRAMEWORK BULLET VARIANTS
# ═══════════════════════════════════════════════════════════

@router.post("/bullet-variants")
async def bullet_variants(req: BulletVariantsRequest, request: Request):
    """Generate a bullet in 5 different frameworks (C·A·M, XYZ, CAR, SAI, STAR)."""
    get_user_id(request)
    try:
        result = await generate_variants(req.bullet, req.context, req.frameworks)
        return result
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.get("/bullet-variants/frameworks")
async def list_frameworks(request: Request):
    """List all available bullet frameworks with formulas and examples."""
    get_user_id(request)
    return {"frameworks": get_framework_info()}


# ═══════════════════════════════════════════════════════════
# PDF EXPORT ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/export/pdf")
async def export_resume_pdf(req: PDFExportRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Export ARIA resume to PDF."""
    uid = get_user_id(request)
    analysis = await _load_analysis(req.analysis_id, uid, db)

    if not analysis.generated_resume:
        raise HTTPException(400, "Generate a resume first via /aria/generate")

    pdf_bytes = export_pdf_bytes(analysis.generated_resume, req.style)

    # Detect if we got HTML fallback
    is_html = pdf_bytes[:5] == b"<!DOC"
    content_type = "text/html" if is_html else "application/pdf"
    ext = "html" if is_html else "pdf"

    name = analysis.generated_resume.get("header", {}).get("name", "resume").replace(" ", "_")
    filename = f"{name}_resume.{ext}"

    return Response(
        content=pdf_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/html")
async def export_resume_html(req: PDFExportRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Export ARIA resume to HTML."""
    uid = get_user_id(request)
    analysis = await _load_analysis(req.analysis_id, uid, db)

    if not analysis.generated_resume:
        raise HTTPException(400, "Generate a resume first via /aria/generate")

    html_str = export_html(analysis.generated_resume, req.style)
    name = analysis.generated_resume.get("header", {}).get("name", "resume").replace(" ", "_")

    return Response(
        content=html_str.encode("utf-8"),
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="{name}_resume.html"'},
    )
