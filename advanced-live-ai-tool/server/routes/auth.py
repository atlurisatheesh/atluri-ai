"""Authentication routes: register, login, OAuth, refresh, profile."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    plan: str
    credits: int
    avatar_url: str | None


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check existing
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        credits=100,  # free trial bonus
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "email": user.email, "full_name": user.full_name, "plan": user.plan.value, "credits": user.credits},
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "email": user.email, "full_name": user.full_name, "plan": user.plan.value, "credits": user.credits},
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        plan=user.plan.value,
        credits=user.credits,
        avatar_url=user.avatar_url,
    )


@router.put("/me")
async def update_profile(
    full_name: str | None = None,
    avatar_url: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if full_name:
        user.full_name = full_name
    if avatar_url:
        user.avatar_url = avatar_url
    db.add(user)
    return {"message": "Profile updated"}
