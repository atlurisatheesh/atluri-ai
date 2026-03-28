"""Billing & Credits API routes: balance, packs, purchase, transactions."""

from fastapi import APIRouter, Query, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid

from app.auth import get_user_id
from app.plan_gates import get_user_plan, deduct_credits

router = APIRouter(prefix="/api/billing", tags=["billing"])

# ── In-memory store for transactions (swap to DB CreditTransaction later) ──
_transactions: dict[str, list[dict]] = {}

CREDIT_PACKS = [
    {"id": "starter", "name": "Starter", "credits": 10, "price_usd": 5.00},
    {"id": "power", "name": "Power", "credits": 50, "price_usd": 20.00},
    {"id": "bulk", "name": "Bulk", "credits": 200, "price_usd": 60.00},
    {"id": "max", "name": "Max", "credits": 500, "price_usd": 120.00},
]

PLANS = [
    {"id": "free", "name": "Free", "price_monthly": 0, "price_yearly": 0, "credits_monthly": 15},
    {"id": "pro", "name": "Pro", "price_monthly": 29, "price_yearly": 290, "credits_monthly": 999999},
    {"id": "enterprise", "name": "Enterprise", "price_monthly": 99, "price_yearly": 990, "credits_monthly": 999999},
]


# ── Models ──────────────────────────────────────────────
class BalanceOut(BaseModel):
    credits: int
    plan: str
    plan_name: str


class CreditPack(BaseModel):
    id: str
    name: str
    credits: int
    price_usd: float


class PlanOut(BaseModel):
    id: str
    name: str
    price_monthly: int
    price_yearly: int
    credits_monthly: int


class Transaction(BaseModel):
    id: str
    type: str  # "purchase" | "usage" | "bonus"
    credits: int
    description: str
    created_at: str


class PurchaseRequest(BaseModel):
    pack_id: str


class PurchaseOut(BaseModel):
    status: str
    credits_added: int
    new_balance: int


# ── Helper ──────────────────────────────────────────────
def _record_tx(user_id: str, tx_type: str, credits: int, description: str):
    if user_id not in _transactions:
        _transactions[user_id] = []
    _transactions[user_id].append({
        "id": str(uuid.uuid4()),
        "type": tx_type,
        "credits": credits,
        "description": description,
        "created_at": datetime.utcnow().isoformat(),
    })


# ── Routes ──────────────────────────────────────────────
@router.get("/balance", response_model=BalanceOut)
async def get_balance(request: Request, user_id: str = Depends(get_user_id)):
    """Get current credit balance and plan."""
    info = await get_user_plan(request)
    plan_name = next((p["name"] for p in PLANS if p["id"] == info["plan"]), "Free")
    return BalanceOut(credits=info["credits"], plan=info["plan"], plan_name=plan_name)


@router.get("/packs", response_model=List[CreditPack])
async def list_packs():
    """List available credit packs."""
    return [CreditPack(**p) for p in CREDIT_PACKS]


@router.get("/plans", response_model=List[PlanOut])
async def list_plans():
    """List available subscription plans."""
    return [PlanOut(**p) for p in PLANS]


@router.post("/purchase", response_model=PurchaseOut)
async def purchase_credits(req: PurchaseRequest, user_id: str = Depends(get_user_id)):
    """Purchase a credit pack (mock — no real payment yet)."""
    pack = next((p for p in CREDIT_PACKS if p["id"] == req.pack_id), None)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")

    # TODO: Integrate Stripe checkout here
    # For now, add credits directly (mock purchase)
    from sqlalchemy import update as sa_update, select
    from app.db.database import AsyncSessionLocal
    from app.db.models import User

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User.credits).where(User.id == user_id))
        row = result.first()
        current = int(row.credits or 0) if row else 0
        new_balance = current + pack["credits"]
        await session.execute(
            sa_update(User).where(User.id == user_id).values(credits=new_balance)
        )
        await session.commit()

    _record_tx(user_id, "purchase", pack["credits"], f"Purchased {pack['name']} pack (${pack['price_usd']})")

    return PurchaseOut(
        status="success",
        credits_added=pack["credits"],
        new_balance=new_balance,
    )


@router.post("/use")
async def use_credits(amount: int = Query(1, ge=1), user_id: str = Depends(get_user_id)):
    """Deduct credits (called internally when sessions are consumed)."""
    remaining = await deduct_credits(user_id, amount, reason="api_use")
    _record_tx(user_id, "usage", -amount, f"Used {amount} credit(s)")
    return {"status": "ok", "remaining": remaining}


@router.get("/transactions")
async def list_transactions(user_id: str = Depends(get_user_id)):
    """List user's credit transactions."""
    txs = _transactions.get(user_id, [])
    return {"transactions": txs[-50:]}


@router.get("/transactions", response_model=List[Transaction])
async def list_transactions(limit: int = Query(20, ge=1, le=100)):
    """Get recent transactions."""
    user_id = _get_user_id()
    txs = _transactions.get(user_id, [])
    # Most recent first
    return [Transaction(**t) for t in reversed(txs[-limit:])]
