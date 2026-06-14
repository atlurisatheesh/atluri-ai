"""
Unit tests for canonical (Supabase-first) JWT verification in app.auth.

Identity is owned by Supabase; the backend must verify Supabase access tokens
(HS256, aud="authenticated") while still accepting legacy local tokens during
migration, and must reject tampered / expired / unverified tokens once a real
secret is configured.

Module-level secret config is read at import time, so each test monkeypatches
app.auth globals to simulate different deployment configs.
"""
import base64
import json
import time

import pytest
from fastapi import HTTPException
from jose import jwt as jose_jwt

from app import auth

SUPA = "supabase-project-jwt-secret"
LOCAL = "legacy-local-secret"


def _supabase_token(secret: str, sub: str = "user-123", exp_offset: int = 3600) -> str:
    return jose_jwt.encode(
        {"sub": sub, "aud": "authenticated", "email": "a@b.com",
         "iat": int(time.time()), "exp": int(time.time()) + exp_offset},
        secret, algorithm="HS256",
    )


def _b64(d: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()


def _unsigned_token(sub: str = "dev-user") -> str:
    # Mirrors the E2E dev bypass token (alg "none").
    return f"{_b64({'alg': 'none', 'typ': 'JWT'})}.{_b64({'sub': sub})}."


@pytest.fixture
def cfg(monkeypatch):
    """Helper to set app.auth config for a test."""
    def _apply(supabase="", local=auth._DEFAULT_LOCAL_SECRET, env="development", allow_unverified=False):
        monkeypatch.setattr(auth, "SUPABASE_JWT_SECRET", supabase)
        monkeypatch.setattr(auth, "JWT_SECRET", local)
        monkeypatch.setattr(auth, "ENVIRONMENT", env)
        monkeypatch.setattr(auth, "ALLOW_UNVERIFIED_JWT_DEV", allow_unverified)
    return _apply


def test_supabase_token_is_accepted(cfg):
    cfg(supabase=SUPA, env="production")
    payload = auth._decode_token(_supabase_token(SUPA))
    assert payload["sub"] == "user-123"


def test_legacy_local_token_still_accepted(cfg):
    cfg(supabase=SUPA, local=LOCAL, env="production")
    payload = auth._decode_token(_supabase_token(LOCAL, sub="legacy-1"))
    assert payload["sub"] == "legacy-1"


def test_audience_claim_does_not_break_verification(cfg):
    # Regression: Supabase tokens carry aud="authenticated"; verify_aud must be off.
    cfg(supabase=SUPA, env="production")
    assert auth._decode_token(_supabase_token(SUPA))["aud"] == "authenticated"


def test_wrong_secret_is_rejected(cfg):
    cfg(supabase=SUPA, local=LOCAL, env="production")
    with pytest.raises(HTTPException) as exc:
        auth._decode_token(_supabase_token("attacker-secret"))
    assert exc.value.status_code == 401


def test_expired_token_is_rejected(cfg):
    cfg(supabase=SUPA, env="production")
    with pytest.raises(HTTPException) as exc:
        auth._decode_token(_supabase_token(SUPA, exp_offset=-10))
    assert exc.value.status_code == 401


def test_unverified_rejected_when_real_secret_configured(cfg):
    # Even with the dev flag on, a real secret means no unverified tokens.
    cfg(supabase=SUPA, env="development", allow_unverified=True)
    with pytest.raises(HTTPException):
        auth._decode_token(_unsigned_token())


def test_unverified_allowed_only_in_dev_without_secret(cfg):
    cfg(supabase="", local=auth._DEFAULT_LOCAL_SECRET, env="development", allow_unverified=True)
    assert auth._decode_token(_unsigned_token("dev-7"))["sub"] == "dev-7"


def test_missing_sub_claim_rejected(cfg):
    cfg(supabase=SUPA, env="production")
    tok = jose_jwt.encode({"aud": "authenticated", "exp": int(time.time()) + 60}, SUPA, algorithm="HS256")
    with pytest.raises(HTTPException):
        auth._extract_user_id(auth._decode_token(tok))
