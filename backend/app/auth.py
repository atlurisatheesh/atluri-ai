"""
Auth module – canonical JWT verification.

Identity is owned by Supabase: the web frontend signs in via Supabase and sends
its access_token (an HS256 JWT carrying aud="authenticated") on every request.
We verify that token here. For backward compatibility we also accept tokens
issued by the legacy local /api/auth/login + /api/auth/signup endpoints (same
HS256 scheme, different secret), so nothing breaks during the migration.

Configure secrets via env:
  - SUPABASE_JWT_SECRET : your Supabase project's JWT secret (preferred)
  - JWT_SECRET          : legacy/local secret (fallback)

The payload contains: sub (user id), email, iat/exp.
"""

from fastapi import HTTPException, Request
from jose import JWTError, jwt
import os
import logging

logger = logging.getLogger("app.auth")

_DEFAULT_LOCAL_SECRET = "local-dev-jwt-secret-change-in-prod"
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
JWT_SECRET = os.getenv("JWT_SECRET", _DEFAULT_LOCAL_SECRET)
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENV", "development").lower()
# Supabase tokens carry aud="authenticated"; we don't pin audience here.
_DECODE_OPTIONS = {"verify_aud": False}
ALLOW_UNVERIFIED_JWT_DEV = str(os.getenv("ALLOW_UNVERIFIED_JWT_DEV", "false")).strip().lower() in {
    "1", "true", "yes", "on",
}


def _candidate_secrets() -> list[str]:
    """Secrets to try, in priority order: Supabase first, then legacy local."""
    secrets: list[str] = []
    if SUPABASE_JWT_SECRET:
        secrets.append(SUPABASE_JWT_SECRET)
    if JWT_SECRET and JWT_SECRET not in secrets:
        secrets.append(JWT_SECRET)
    return secrets


def _has_real_secret() -> bool:
    """True once any non-placeholder signing secret is configured."""
    return bool(SUPABASE_JWT_SECRET) or JWT_SECRET != _DEFAULT_LOCAL_SECRET


def _decode_token(token: str) -> dict:
    """Decode and verify a JWT. Returns the payload dict or raises HTTPException."""
    # 1) Verified decode — try each configured secret (Supabase, then legacy local).
    for secret in _candidate_secrets():
        try:
            return jwt.decode(token, secret, algorithms=[JWT_ALGORITHM], options=_DECODE_OPTIONS)
        except JWTError:
            continue

    # 2) If a real secret is configured (or we're in prod), never accept unverified tokens.
    if ENVIRONMENT == "production" or _has_real_secret():
        raise HTTPException(401, "Invalid or expired token")

    # 3) Dev-only escape hatch: accept unverified claims when explicitly allowed.
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
