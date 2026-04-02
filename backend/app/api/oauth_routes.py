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


# ── Step 1: Redirect to provider ─────────────────────────────

@router.get("/{provider}")
async def oauth_redirect(provider: str, request: Request):
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unsupported provider: {provider}. Use: {', '.join(SUPPORTED_PROVIDERS)}")

    cfg = _provider_cfg(provider)
    if not cfg["client_id"] or not cfg["client_secret"]:
        raise HTTPException(
            501,
            f"{provider.title()} OAuth is not configured. "
            f"Set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET in .env",
        )

    # Build callback URL — use FRONTEND_URL so OAuth flows through Vercel proxy
    _public_base = os.getenv("BACKEND_PUBLIC_URL", "").rstrip("/") or FRONTEND_URL.rstrip("/")
    callback_url = _public_base + f"/api/auth/oauth/{provider}/callback"

    # CSRF state token
    state = secrets.token_urlsafe(32)
    next_path = request.query_params.get("next", "/app")
    _oauth_states[state] = {"provider": provider, "next": next_path}

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
        logger.warning("OAuth %s error: %s", provider, error)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=oauth_denied")

    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unsupported provider: {provider}")

    # Validate CSRF state
    state_data = _oauth_states.pop(state, None)
    if not state_data or state_data["provider"] != provider:
        logger.warning("OAuth %s: invalid state token", provider)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=invalid_state")

    next_path = state_data.get("next", "/app")

    if not code:
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
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(cfg["token_url"], data=token_data, headers=headers)
    except Exception as exc:
        logger.error("OAuth %s token exchange failed: %s", provider, exc)
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=token_exchange_failed")

    if token_resp.status_code != 200:
        logger.error("OAuth %s token response %s: %s", provider, token_resp.status_code, token_resp.text[:200])
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
