"""
Plan Gates — FastAPI dependencies for plan/credit enforcement.

Usage in routes:
    from app.plan_gates import require_plan, require_credits, get_user_plan

    @router.post("/expensive-feature")
    async def expensive(user_id: str = Depends(get_user_id), _ = Depends(require_plan("pro"))):
        ...

    @router.post("/use-credits")
    async def use(user_id: str = Depends(get_user_id), _ = Depends(require_credits(5))):
        ...
"""

import logging
from typing import Callable

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_user_id
from app.db.database import AsyncSessionLocal
from app.db.models import User

logger = logging.getLogger("app.plan_gates")

# ── Plan hierarchy (higher = more features) ──
PLAN_LEVELS = {
    "free": 0,
    "pro": 1,
    "enterprise": 2,
}

# ── Feature → minimum plan mapping ──
FEATURE_GATES = {
    "voice_interview": "free",
    "mock_interview": "free",
    "resume_analysis": "free",
    "company_research": "pro",
    "voice_personalization": "pro",
    "deep_company_packs": "pro",
    "stealth_mode": "pro",
    "cross_session_learning": "pro",
    "unlimited_sessions": "pro",
    "priority_support": "enterprise",
    "team_analytics": "enterprise",
    "api_access": "enterprise",
}

# ── Credit costs per action ──
CREDIT_COSTS = {
    "voice_session": 1,
    "mock_session": 2,
    "resume_rewrite": 3,
    "company_pack": 5,
    "duo_session": 2,
}


async def get_user_plan(request: Request) -> dict:
    """
    Dependency that returns user plan info: {user_id, plan, credits}.
    """
    user_id = get_user_id(request)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User.plan, User.credits).where(User.id == user_id)
        )
        row = result.first()
        if not row:
            return {"user_id": user_id, "plan": "free", "credits": 0}
        return {
            "user_id": user_id,
            "plan": str(row.plan or "free"),
            "credits": int(row.credits or 0),
        }


def require_plan(min_plan: str) -> Callable:
    """
    Returns a FastAPI dependency that blocks users below min_plan.
    
    Usage:  _ = Depends(require_plan("pro"))
    """
    min_level = PLAN_LEVELS.get(min_plan, 0)

    async def _check(request: Request):
        info = await get_user_plan(request)
        user_level = PLAN_LEVELS.get(info["plan"], 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "plan_required",
                    "required_plan": min_plan,
                    "current_plan": info["plan"],
                    "message": f"This feature requires the {min_plan.title()} plan.",
                    "upgrade_url": "/billing",
                },
            )
        return info

    return _check


def require_feature(feature: str) -> Callable:
    """
    Returns a FastAPI dependency that checks if user's plan includes a feature.
    
    Usage:  _ = Depends(require_feature("stealth_mode"))
    """
    min_plan = FEATURE_GATES.get(feature, "enterprise")
    return require_plan(min_plan)


def require_credits(amount: int) -> Callable:
    """
    Returns a FastAPI dependency that checks if user has enough credits.
    Does NOT deduct — call deduct_credits() after the action succeeds.
    
    Usage:  _ = Depends(require_credits(5))
    """
    async def _check(request: Request):
        info = await get_user_plan(request)
        # Pro/Enterprise have unlimited credits
        if PLAN_LEVELS.get(info["plan"], 0) >= PLAN_LEVELS["pro"]:
            return info
        if info["credits"] < amount:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_credits",
                    "required": amount,
                    "available": info["credits"],
                    "message": f"This action requires {amount} credit(s). You have {info['credits']}.",
                    "purchase_url": "/billing",
                },
            )
        return info

    return _check


async def deduct_credits(user_id: str, amount: int, reason: str = "") -> int:
    """
    Deduct credits from a user. Returns new balance.
    Call AFTER the action succeeds to avoid charging for failures.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User.credits, User.plan).where(User.id == user_id)
        )
        row = result.first()
        if not row:
            return 0

        # Pro/Enterprise don't consume credits
        if PLAN_LEVELS.get(str(row.plan or "free"), 0) >= PLAN_LEVELS["pro"]:
            return int(row.credits or 0)

        new_balance = max(0, int(row.credits or 0) - amount)
        await session.execute(
            update(User).where(User.id == user_id).values(credits=new_balance)
        )
        await session.commit()
        logger.info("CREDITS_DEDUCTED | user=%s amount=%d balance=%d reason=%s",
                     user_id, amount, new_balance, reason)
        return new_balance
