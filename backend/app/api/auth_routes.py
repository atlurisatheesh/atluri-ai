"""
Local auth API – signup, login, me, refresh.
Replaces Supabase auth entirely with local PostgreSQL + JWT.
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from jose import jwt as jose_jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User

logger = logging.getLogger("app.api.auth_routes")

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── JWT config ────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "local-dev-jwt-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "1440"))  # 24 h default


# ── Request / response schemas ───────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MeResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    created_at: str


# ── Helpers ───────────────────────────────────────────────────
def _hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(raw: str, hashed: str) -> bool:
    return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))


def _create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_ACCESS_EXPIRE_MINUTES),
    }
    return jose_jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "auth_provider": user.auth_provider,
        "created_at": user.created_at.isoformat(),
    }


# ── Endpoints ─────────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if email already taken
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Email already registered")

    if len(body.password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters")

    user = User(
        id=uuid.uuid4(),
        email=body.email,
        hashed_password=_hash_password(body.password),
        display_name=body.display_name or body.email.split("@")[0],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = _create_access_token(str(user.id), user.email)
    logger.info("User signed up: %s", user.email)
    return AuthResponse(access_token=token, user=_user_dict(user))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not _check_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")

    if not user.is_active:
        raise HTTPException(403, "Account is disabled")

    token = _create_access_token(str(user.id), user.email)
    logger.info("User logged in: %s", user.email)
    return AuthResponse(access_token=token, user=_user_dict(user))


@router.get("/me", response_model=MeResponse)
async def me(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return current user profile from JWT."""
    from app.auth import get_user_id_async
    user_id = await get_user_id_async(request)
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return MeResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at.isoformat(),
    )


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


@router.put("/me")
async def update_me(
    body: UpdateProfileRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile (display_name, avatar_url)."""
    from app.auth import get_user_id_async
    user_id = await get_user_id_async(request)
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    await db.commit()
    return _user_dict(user)


# Keep register_me_endpoint for backward compatibility but it's no longer needed
def register_me_endpoint(app_router, get_current_user_id):
    """No longer needed — /me is handled directly by the router above."""
    pass
