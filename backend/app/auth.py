from fastapi import HTTPException, Request
from jose import JWTError, jwt
import os
import logging
import httpx

logger = logging.getLogger("app.auth")

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
ENVIRONMENT = os.getenv("ENV", "development").lower()
ALLOW_UNVERIFIED_JWT_DEV = str(os.getenv("ALLOW_UNVERIFIED_JWT_DEV", "false")).strip().lower() in {"1", "true", "yes", "on"}


def _verify_with_supabase(token: str) -> str | None:
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return None

    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    try:
        with httpx.Client(timeout=6.0) as client:
            response = client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_API_KEY,
                },
            )
    except Exception:
        return None

    if response.status_code != 200:
        return None

    try:
        data = response.json()
    except Exception:
        return None

    user_id = data.get("id")
    return str(user_id) if user_id else None


async def _verify_with_supabase_async(token: str) -> str | None:
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return None

    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_API_KEY,
                },
            )
    except Exception:
        return None

    if response.status_code != 200:
        return None

    try:
        data = response.json()
    except Exception:
        return None

    user_id = data.get("id")
    return str(user_id) if user_id else None


def _resolve_payload_from_token(token: str) -> dict:
    payload = None
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        except JWTError:
            raise HTTPException(401, "Invalid token")
    else:
        user_id = _verify_with_supabase(token)
        if user_id:
            payload = {"sub": user_id}
        else:
            if ENVIRONMENT == "production":
                raise HTTPException(500, "SUPABASE_JWT_SECRET is not configured")
            if not ALLOW_UNVERIFIED_JWT_DEV:
                raise HTTPException(
                    401,
                    "Token verification unavailable in development; configure SUPABASE_JWT_SECRET or set ALLOW_UNVERIFIED_JWT_DEV=true",
                )
            try:
                payload = jwt.get_unverified_claims(token)
                logger.warning("ALLOW_UNVERIFIED_JWT_DEV enabled; using unverified token claims in non-production mode")
            except JWTError:
                raise HTTPException(401, "Invalid token")
    return payload


async def resolve_user_id_from_token_async(token: str) -> str:
    payload = None
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        except JWTError:
            raise HTTPException(401, "Invalid token")
    else:
        user_id = await _verify_with_supabase_async(token)
        if user_id:
            payload = {"sub": user_id}
        else:
            if ENVIRONMENT == "production":
                raise HTTPException(500, "SUPABASE_JWT_SECRET is not configured")
            if not ALLOW_UNVERIFIED_JWT_DEV:
                raise HTTPException(
                    401,
                    "Token verification unavailable in development; configure SUPABASE_JWT_SECRET or set ALLOW_UNVERIFIED_JWT_DEV=true",
                )
            try:
                payload = jwt.get_unverified_claims(token)
                logger.warning("ALLOW_UNVERIFIED_JWT_DEV enabled; using unverified token claims in non-production mode")
            except JWTError:
                raise HTTPException(401, "Invalid token")

    user_id = (payload or {}).get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token")
    return str(user_id)


def get_user_id(request: Request):
    auth = request.headers.get("Authorization")
    if not auth:
        raise HTTPException(401, "Unauthorized")

    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")

    token = auth.replace("Bearer ", "", 1)
    payload = _resolve_payload_from_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token")

    return user_id


async def get_user_id_async(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth:
        raise HTTPException(401, "Unauthorized")

    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")

    token = auth.replace("Bearer ", "", 1)
    return await resolve_user_id_from_token_async(token)
