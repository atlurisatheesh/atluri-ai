"""Billing & Credits routes — Stripe integration."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, CreditTransaction
from auth_utils import get_current_user

router = APIRouter()

CREDIT_PACKS = {
    "starter": {"credits": 500, "price_inr": 730},
    "standard": {"credits": 2500, "price_inr": 2920},
    "pro": {"credits": 8000, "price_inr": 6730},
    "unlimited": {"credits": 99999, "price_inr": 20180},
}


class PurchaseRequest(BaseModel):
    pack_name: str


@router.get("/credits")
async def get_credits(user: User = Depends(get_current_user)):
    return {"credits": user.credits, "plan": user.plan.value}


@router.get("/packs")
async def get_credit_packs():
    return CREDIT_PACKS


@router.post("/purchase")
async def purchase_credits(
    req: PurchaseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Purchase credit pack (demo — would integrate Stripe)."""
    pack = CREDIT_PACKS.get(req.pack_name)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")

    user.credits += pack["credits"]
    db.add(user)

    tx = CreditTransaction(
        user_id=user.id,
        amount=pack["credits"],
        balance_after=user.credits,
        description=f"{req.pack_name.title()} Credit Pack",
        transaction_type="purchase",
    )
    db.add(tx)

    return {"credits": user.credits, "purchased": pack["credits"]}


@router.get("/transactions")
async def get_transactions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user.id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(50)
    )
    txs = result.scalars().all()
    return [
        {
            "id": t.id,
            "amount": t.amount,
            "balance_after": t.balance_after,
            "description": t.description,
            "type": t.transaction_type,
            "created_at": t.created_at.isoformat(),
        }
        for t in txs
    ]
