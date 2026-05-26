"""
OAuth routes – Google, GitHub, Microsoft sign-in.

Flow:
  1. GET  /api/auth/oauth/{provider}            → redirect to provider auth URL
  2. GET  /api/auth/oauth/{provider}/callback    → exchange code, upsert user, issue JWT
     then redirect to frontend with token+user in query params
"""

import os
import uuid
import json
import logging
import secrets
import time
from datetime import datetime, timezone
from urllib.parse import urlencode, quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User
from app.api.auth_routes import _create_access_token, _user_dict

logger = logging.getLogger("app.api.oauth_routes")

router = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ── Provider configs ──────────────────────────────────────────

_PROVIDERS: dict[str, dict] = {}


def _provider_cfg(name: str) -> dict:
    """Lazy-load provider config from env vars."""
    if name in _PROVIDERS:
        return _PROVIDERS[name]

    if name == "google":
        cfg = {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scopes": "openid email profile",
        }
    elif name == "github":
        cfg = {
            "client_id": os.getenv("GITHUB_CLIENT_ID", ""),
            "client_secret": os.getenv("GITHUB_CLIENT_SECRET", ""),
            "authorize_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "userinfo_url": "https://api.github.com/user",
            "emails_url": "https://api.github.com/user/emails",
            "scopes": "read:user user:email",
        }
    elif name == "microsoft":
        tenant = os.getenv("MICROSOFT_TENANT_ID", "common")
        cfg = {
            "client_id": os.getenv("MICROSOFT_CLIENT_ID", ""),
            "client_secret": os.getenv("MICROSOFT_CLIENT_SECRET", ""),
            "authorize_url": f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
            "token_url": f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            "userinfo_url": "https://graph.microsoft.com/v1.0/me",
            "scopes": "openid email profile User.Read",
        }
    else:
        raise HTTPException(400, f"Unknown provider: {name}")

    _PROVIDERS[name] = cfg
    return cfg


SUPPORTED_PROVIDERS = {"google", "github", "microsoft"}

# ── State tokens (CSRF protection) ───────────────────────────
# In production, use Redis or DB. For local dev, in-memory is fine.
_oauth_states: dict[str, dict] = {}
STATE_TOKEN_TTL_SEC = int(os.getenv("OAUTH_STATE_TTL_SEC", "600"))  # 10 min default


def _cleanup_expired_states() -> None:
    """Remove state tokens older than TTL to prevent memory leaks."""
    now = time.time()
    expired = [
        key for key, val in _oauth_states.items()
        if now - val.get("created_at", 0) > STATE_TOKEN_TTL_SEC
    ]
    for key in expired:
        _oauth_states.pop(key, None)
    if expired:
        logger.info("OAuth state cleanup: removed %d expired tokens", len(expired))


# ── Diagnostic endpoint ──────────────────────────────────────

@router.get("/status")
async def oauth_status():
    """Diagnostic endpoint — shows which OAuth providers are configured (no secrets exposed)."""
    providers_status = {}
    for name in SUPPORTED_PROVIDERS:
        try:
            cfg = _provider_cfg(name)
            has_id = bool(cfg.get("client_id", "").strip())
            has_secret = bool(cfg.get("client_secret", "").strip())
            providers_status[name] = {
                "client_id_set": has_id,
                "client_secret_set": has_secret,
                "ready": has_id and has_secret,
                "client_id_prefix": cfg["client_id"][:12] + "..." if has_id else None,
            }
        except Exception:
            providers_status[name] = {"ready": False, "error": "config_load_failed"}

    _public_base = os.getenv("BACKEND_PUBLIC_URL", "").rstrip("/") or FRONTEND_URL.rstrip("/")
    return {
        "frontend_url": FRONTEND_URL,
        "backend_public_url": os.getenv("BACKEND_PUBLIC_URL", "(not set)"),
        "callback_base_url": _public_base,
        "example_callback": _public_base + "/api/auth/oauth/google/callback",
        "providers": providers_status,
        "active_state_tokens": len(_oauth_states),
        "note": "Add the 'example_callback' URL as an Authorized redirect URI in Google Cloud Console.",
    }


# ── Step 1: Redirect to provider ─────────────────────────────

@router.get("/{provider}")
async def oauth_redirect(provider: str, request: Request):
    # Skip the diagnostic endpoint — it's handled above
    if provider == "status":
        return await oauth_status()

    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unsupported provider: {provider}. Use: {', '.join(SUPPORTED_PROVIDERS)}")

    cfg = _provider_cfg(provider)
    if not cfg["client_id"] or not cfg["client_secret"]:
        logger.error(
            "OAuth %s not configured: client_id=%s client_secret=%s",
            provider,
            "SET" if cfg["client_id"] else "MISSING",
            "SET" if cfg["client_secret"] else "MISSING",
        )
        raise HTTPException(
            501,
            f"{provider.title()} OAuth is not configured. "
            f"Set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET in .env",
        )

    # Cleanup expired state tokens periodically
    _cleanup_expired_states()

    # Build callback URL — use FRONTEND_URL so OAuth flows through Vercel proxy
    _public_base = os.getenv("BACKEND_PUBLIC_URL", "").rstrip("/") or FRONTEND_URL.rstrip("/")
    callback_url = _public_base + f"/api/auth/oauth/{provider}/callback"

    # CSRF state token with timestamp
    state = secrets.token_urlsafe(32)
    next_path = request.query_params.get("next", "/app")
    _oauth_states[state] = {
        "provider": provider,
        "next": next_path,
        "created_at": time.time(),
    }

    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": callback_url,
        "scope": cfg["scopes"],
        "state": state,
        "response_type": "code",
    }

    # Provider-specific extras
    if provider == "google":
        params["access_type"] = "offline"
        params["prompt"] = "select_account"
    elif provider == "microsoft":
        params["response_mode"] = "query"

    auth_url = f"{cfg['authorize_url']}?{urlencode(params)}"
    logger.info(
        "OAuth %s redirect: callback_url=%s state_tokens_active=%d",
        provider, callback_url, len(_oauth_states),
    )
    return RedirectResponse(auth_url)


# ── Step 2: Handle callback ──────────────────────────────────

@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: str = "",
    state: str = "",
    error: str = "",
    db: AsyncSession = Depends(get_db),
):
    # Handle provider-side errors
    if error:
        error_desc = request.query_params.get("error_description", "")
        logger.warning(
            "OAuth %s provider error: error=%s description=%s",
            provider, error, error_desc,
        )
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error=oauth_denied"
            f"&error_detail={quote(error_desc or error)}"
        )

    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unsupported provider: {provider}")

    # Validate CSRF state
    state_data = _oauth_states.pop(state, None)
    if not state_data or state_data["provider"] != provider:
        # Check if state expired vs never existed
        is_expired = state and any(
            state == k for k in list(_oauth_states.keys())
        )
        logger.warning(
            "OAuth %s: invalid state token (state_present=%s, data_found=%s, "
            "active_tokens=%d, may_be_expired=%s)",
            provider, bool(state), bool(state_data),
            len(_oauth_states), is_expired,
        )
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=invalid_state")

    # Check if state token expired
    state_age = time.time() - state_data.get("created_at", 0)
    if state_age > STATE_TOKEN_TTL_SEC:
        logger.warning(
            "OAuth %s: state token expired (age=%.0fs, ttl=%ds)",
            provider, state_age, STATE_TOKEN_TTL_SEC,
        )
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=state_expired")

    next_path = state_data.get("next", "/app")

    if not code:
        logger.warning("OAuth %s: callback received without authorization code", provider)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=no_code")

    cfg = _provider_cfg(provider)
    _public_base = os.getenv("BACKEND_PUBLIC_URL", "").rstrip("/") or FRONTEND_URL.rstrip("/")
    callback_url = _public_base + f"/api/auth/oauth/{provider}/callback"

    # ── Exchange code for access token ────────────────────────
    token_data = {
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "code": code,
        "redirect_uri": callback_url,
        "grant_type": "authorization_code",
    }

    headers = {"Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(cfg["token_url"], data=token_data, headers=headers)
    except Exception as exc:
        logger.error("OAuth %s token exchange network error: %s", provider, exc, exc_info=True)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=token_exchange_failed")

    if token_resp.status_code != 200:
        logger.error(
            "OAuth %s token exchange failed: status=%s body=%s redirect_uri=%s",
            provider, token_resp.status_code, token_resp.text[:500], callback_url,
        )
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=token_exchange_failed")

    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    if not access_token:
        logger.error("OAuth %s: no access_token in response", provider)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=no_access_token")

    # ── Fetch user info ───────────────────────────────────────
    try:
        email, name, avatar, provider_uid = await _fetch_user_info(provider, cfg, access_token)
    except Exception as exc:
        logger.error("OAuth %s user info failed: %s", provider, exc)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=userinfo_failed")

    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=no_email")

    # ── Upsert user ───────────────────────────────────────────
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        # Update provider info if not set
        changed = False
        if not user.auth_provider:
            user.auth_provider = provider
            changed = True
        if not user.provider_id and provider_uid:
            user.provider_id = provider_uid
            changed = True
        if not user.avatar_url and avatar:
            user.avatar_url = avatar
            changed = True
        if not user.display_name and name:
            user.display_name = name
            changed = True
        if changed:
            user.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user)
    else:
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=None,
            display_name=name or email.split("@")[0],
            avatar_url=avatar,
            auth_provider=provider,
            provider_id=provider_uid,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("OAuth user created: %s via %s", email, provider)

    # ── Issue JWT + redirect to frontend ──────────────────────
    jwt_token = _create_access_token(str(user.id), user.email)
    user_json = quote(json.dumps(_user_dict(user)))

    redirect_url = (
        f"{FRONTEND_URL}/auth/callback"
        f"?token={jwt_token}"
        f"&user={user_json}"
        f"&next={quote(next_path)}"
    )
    logger.info(
        "OAuth %s login success: email=%s user_id=%s is_new=%s",
        provider, email, user.id, not bool(state_data),  # approximate
    )
    return RedirectResponse(redirect_url)


# ── Provider-specific user info fetchers ──────────────────────

async def _fetch_user_info(
    provider: str, cfg: dict, access_token: str
) -> tuple[str, str, str, str]:
    """Returns (email, display_name, avatar_url, provider_uid)."""

    async with httpx.AsyncClient(timeout=10.0) as client:
        if provider == "google":
            resp = await client.get(
                cfg["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return (
                data.get("email", ""),
                data.get("name", ""),
                data.get("picture", ""),
                str(data.get("id", "")),
            )

        elif provider == "github":
            # Main profile
            resp = await client.get(
                cfg["userinfo_url"],
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

            email = data.get("email") or ""
            name = data.get("name") or data.get("login") or ""
            avatar = data.get("avatar_url") or ""
            uid = str(data.get("id", ""))

            # GitHub may not return email in profile — fetch from /user/emails
            if not email:
                emails_resp = await client.get(
                    cfg["emails_url"],
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                )
                if emails_resp.status_code == 200:
                    emails = emails_resp.json()
                    # Prefer primary+verified, then any verified, then first
                    for entry in emails:
                        if entry.get("primary") and entry.get("verified"):
                            email = entry["email"]
                            break
                    if not email:
                        for entry in emails:
                            if entry.get("verified"):
                                email = entry["email"]
                                break
                    if not email and emails:
                        email = emails[0].get("email", "")

            return email, name, avatar, uid

        elif provider == "microsoft":
            resp = await client.get(
                cfg["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            email = data.get("mail") or data.get("userPrincipalName") or ""
            name = data.get("displayName") or ""
            uid = data.get("id") or ""
            return email, name, "", uid

        else:
            raise ValueError(f"Unknown provider: {provider}")
