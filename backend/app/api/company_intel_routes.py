"""Company Intelligence Pack API routes."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth import get_user_id
from app.plan_gates import require_feature, require_credits, deduct_credits
from app.company_intel import get_pack_engine

router = APIRouter(prefix="/api/company-intel", tags=["Company Intelligence"])


class PackRequest(BaseModel):
    company: str
    role: str = ""
    jd_text: str = ""


@router.post("/pack")
async def generate_company_pack(
    req: PackRequest,
    request: Request,
    user_id: str = Depends(get_user_id),
    _plan: dict = Depends(require_feature("company_research")),
    _credits: dict = Depends(require_credits(5)),
):
    """Generate a deep company intelligence pack. Costs 5 credits (free tier)."""
    if not req.company or len(req.company.strip()) < 2:
        raise HTTPException(400, "Company name required")

    engine = get_pack_engine()
    pack = await engine.generate_pack(
        company=req.company.strip(),
        role=req.role.strip(),
        jd_text=req.jd_text.strip(),
    )

    # Deduct credits after successful generation
    await deduct_credits(user_id, 5, reason=f"company_pack:{req.company}")

    return pack.to_dict()


@router.get("/pack/{company}")
async def get_cached_pack(
    company: str,
    request: Request,
    user_id: str = Depends(get_user_id),
):
    """Get a cached company pack (no credit cost)."""
    engine = get_pack_engine()
    pack = engine.get_cached(company)
    if not pack:
        raise HTTPException(404, "No cached pack for this company. Use POST to generate.")
    return pack.to_dict()
