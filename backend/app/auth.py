"""
Auth module – local JWT verification (replaces Supabase auth).

Tokens are HS256 JWTs issued by /api/auth/login and /api/auth/signup.
The payload contains:
  - sub: user UUID
  - email: user email
  - iat / exp: timestamps
"""

from fastapi import HTTPException, Request
from jose import JWTError, jwt
import os
import logging

logger = logging.getLogger("app.auth")

JWT_SECRET = os.getenv("JWT_SECRET", "local-dev-jwt-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENV", "development").lower()
ALLOW_UNVERIFIED_JWT_DEV = str(os.getenv("ALLOW_UNVERIFIED_JWT_DEV", "false")).strip().lower() in {
    "1", "true", "yes", "on",
}


def _decode_token(token: str) -> dict:
    """Decode and verify a local JWT. Returns the payload dict or raises HTTPException."""
    # 1) Try verified decode with JWT_SECRET
    if JWT_SECRET and JWT_SECRET != "local-dev-jwt-secret-change-in-prod" or ENVIRONMENT == "production":
        try:
            return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except JWTError:
            raise HTTPException(401, "Invalid or expired token")

    # 2) Dev mode: try verified first, fall back to unverified if allowed
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        pass

    if ALLOW_UNVERIFIED_JWT_DEV:
        try:
            payload = jwt.get_unverified_claims(token)
            logger.warning("ALLOW_UNVERIFIED_JWT_DEV: accepted unverified token in dev mode")
            return payload
        except JWTError:
            raise HTTPException(401, "Invalid token")

    raise HTTPException(401, "Invalid or expired token")


def _extract_user_id(payload: dict) -> str:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Token missing 'sub' claim")
    return str(user_id)


def _extract_token(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth:
        raise HTTPException(401, "Unauthorized")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")
    return auth.replace("Bearer ", "", 1)


# ── Public API (used by route handlers) ──────────────────────

def get_user_id(request: Request) -> str:
    """Sync dependency – extracts user_id from JWT in Authorization header."""
    token = _extract_token(request)
    payload = _decode_token(token)
    return _extract_user_id(payload)


async def get_user_id_async(request: Request) -> str:
    """Async dependency – same logic, async signature for FastAPI."""
    token = _extract_token(request)
    payload = _decode_token(token)
    return _extract_user_id(payload)


async def resolve_user_id_from_token_async(token: str) -> str:
    """Resolve user_id from a raw token string (used by WebSocket handlers)."""
    payload = _decode_token(token)
    return _extract_user_id(payload)
