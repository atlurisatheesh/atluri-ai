"""Billing & Credits routes — Stripe integration."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, CreditTransaction
from auth_utils import get_current_user
from config import settings

router = APIRouter()

CREDIT_PACKS = {
    "starter": {"credits": 500, "price_inr": 730},
    "standard": {"credits": 2500, "price_inr": 2920},
    "pro": {"credits": 8000, "price_inr": 6730},
    "unlimited": {"credits": 99999, "price_inr": 20180},
}


class PurchaseRequest(BaseModel):
    pack_name: str
    stripe_payment_intent_id: str  # must be provided and verified


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
    """Purchase credit pack — verifies Stripe payment intent before crediting."""
    pack = CREDIT_PACKS.get(req.pack_name)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")

    # Verify payment with Stripe before granting credits
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment processing not configured")

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.retrieve(req.stripe_payment_intent_id)
        expected_amount = pack["price_inr"] * 100  # paise
        if intent.status != "succeeded" or intent.currency not in ("inr",) or intent.amount < expected_amount:
            raise HTTPException(status_code=402, detail="Payment not verified")
        # Prevent double-crediting: check if this intent was already used
        existing = await db.execute(
            select(CreditTransaction).where(CreditTransaction.description == f"stripe:{req.stripe_payment_intent_id}")
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Payment already applied")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=402, detail=f"Payment verification failed: {e.user_message}")

    # Atomic credit increment at DB level to prevent race conditions
    await db.execute(
        update(User).where(User.id == user.id).values(credits=User.credits + pack["credits"])
    )
    await db.flush()

    # Re-read the updated balance
    result = await db.execute(select(User.credits).where(User.id == user.id))
    new_balance = result.scalar_one()

    tx = CreditTransaction(
        user_id=user.id,
        amount=pack["credits"],
        balance_after=new_balance,
        description=f"stripe:{req.stripe_payment_intent_id}",
        transaction_type="purchase",
    )
    db.add(tx)

    return {"credits": new_balance, "purchased": pack["credits"]}


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
