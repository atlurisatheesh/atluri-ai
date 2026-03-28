"""
Career Suite API Routes — Salary negotiation coaching and LinkedIn
profile optimization endpoints.
"""

from __future__ import annotations
import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.career_suite.negotiation_coach import (
    get_salary_benchmark,
    analyze_offer,
    generate_counter_scripts,
    build_negotiation_package,
)
from app.career_suite.linkedin_optimizer import (
    optimize_linkedin_profile,
    linkedin_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/career", tags=["career-suite"])


# ── Request Models ────────────────────────────────────────────────────

class BenchmarkRequest(BaseModel):
    role_category: str = Field(..., description="e.g. software_engineering, data_science")
    level: str = Field(..., description="e.g. junior, mid, senior, staff, principal")
    location: str = Field(default="US Average")


class OfferAnalysisRequest(BaseModel):
    role_category: str = Field(...)
    level: str = Field(...)
    location: str = Field(default="US Average")
    offered_base: float = Field(...)
    offered_total: float | None = None
    offered_equity: float | None = None
    offered_bonus: float | None = None
    offered_signing: float | None = None


class CounterScriptRequest(BaseModel):
    role_category: str = Field(...)
    level: str = Field(...)
    location: str = Field(default="US Average")
    offered_base: float = Field(...)
    offered_total: float | None = None
    target_base: float | None = None
    target_total: float | None = None
    company: str = Field(default="the company")
    competing_offers: bool = Field(default=False)


class NegotiationPackageRequest(BaseModel):
    role_category: str = Field(...)
    level: str = Field(...)
    location: str = Field(default="US Average")
    offered_base: float = Field(...)
    offered_total: float | None = None
    offered_equity: float | None = None
    offered_bonus: float | None = None
    offered_signing: float | None = None
    target_base: float | None = None
    target_total: float | None = None
    company: str = Field(default="the company")
    competing_offers: bool = Field(default=False)


class LinkedInOptimizeRequest(BaseModel):
    resume_text: str = Field(..., min_length=20)
    target_role: str = Field(default="Software Engineer")
    industry: str = Field(default="Technology")
    level: str = Field(default="Senior")


# ── Salary Benchmark ─────────────────────────────────────────────────

@router.post("/salary-benchmark")
async def salary_benchmark_endpoint(req: BenchmarkRequest):
    """
    Get market salary benchmarks for a role/level/location.
    Returns base + total comp ranges adjusted for location.
    """
    benchmark = get_salary_benchmark(
        role_category=req.role_category,
        level=req.level,
        location=req.location,
    )
    return benchmark


# ── Offer Analysis ────────────────────────────────────────────────────

@router.post("/analyze-offer")
async def analyze_offer_endpoint(req: OfferAnalysisRequest):
    """
    Analyze a job offer against market data. Returns percentile,
    gap analysis, lowball detection, and negotiation recommendations.
    """
    analysis = analyze_offer(
        role_category=req.role_category,
        level=req.level,
        location=req.location,
        offered_base=req.offered_base,
        offered_total=req.offered_total,
        offered_equity=req.offered_equity,
        offered_bonus=req.offered_bonus,
        offered_signing=req.offered_signing,
    )
    return analysis


# ── Counter-Offer Scripts ─────────────────────────────────────────────

@router.post("/counter-scripts")
async def counter_scripts_endpoint(req: CounterScriptRequest):
    """
    Generate verbal + email counter-offer scripts with specific
    dollar amounts and justification language.
    """
    scripts = generate_counter_scripts(
        role_category=req.role_category,
        level=req.level,
        location=req.location,
        offered_base=req.offered_base,
        offered_total=req.offered_total,
        target_base=req.target_base,
        target_total=req.target_total,
        company=req.company,
        competing_offers=req.competing_offers,
    )
    return scripts


# ── Full Negotiation Package ──────────────────────────────────────────

@router.post("/negotiation-package")
async def negotiation_package_endpoint(req: NegotiationPackageRequest):
    """
    Full negotiation toolkit: benchmark + offer analysis + counter scripts.
    One-stop endpoint for complete salary negotiation preparation.
    """
    package = build_negotiation_package(
        role_category=req.role_category,
        level=req.level,
        location=req.location,
        offered_base=req.offered_base,
        offered_total=req.offered_total,
        offered_equity=req.offered_equity,
        offered_bonus=req.offered_bonus,
        offered_signing=req.offered_signing,
        target_base=req.target_base,
        target_total=req.target_total,
        company=req.company,
        competing_offers=req.competing_offers,
    )
    return package


# ── LinkedIn Profile Optimizer ────────────────────────────────────────

@router.post("/optimize-linkedin")
async def optimize_linkedin_endpoint(req: LinkedInOptimizeRequest):
    """
    Optimize LinkedIn profile sections for maximum recruiter visibility.
    Returns optimized headline, about, bullets, skills, and profile score.
    """
    optimization = await optimize_linkedin_profile(
        resume_text=req.resume_text,
        target_role=req.target_role,
        industry=req.industry,
        level=req.level,
    )
    return linkedin_to_dict(optimization)
