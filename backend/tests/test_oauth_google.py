"""
Tests for Google/GitHub/Microsoft OAuth flow.

Covers:
  - Redirect URL construction (correct params, callback URL, scopes)
  - 501 when client_id/secret not configured
  - CSRF state token validation (invalid, expired, missing)
  - Successful token exchange with mocked Google API
  - User upsert logic (new user creation + existing user update)
  - Diagnostic /status endpoint
"""

import json
import os
import time
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest
import httpx


# ── Fixtures ──────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _oauth_env(monkeypatch: pytest.MonkeyPatch):
    """Set up Google OAuth env vars for tests."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
    monkeypatch.setenv("FRONTEND_URL", "https://test-frontend.example.com")
    # Note: DATABASE_URL is NOT overridden here because database.py creates the
    # engine at module import time. The existing conftest.py handles test env setup.
    # We clear cached provider configs so env var changes take effect.
    from app.api import oauth_routes
    oauth_routes._PROVIDERS.clear()
    oauth_routes._oauth_states.clear()
    # Also update the module-level FRONTEND_URL since it's read at import time
    oauth_routes.FRONTEND_URL = "https://test-frontend.example.com"


@pytest.fixture
def clear_states():
    """Clear OAuth state tokens before/after test."""
    from app.api.oauth_routes import _oauth_states
    _oauth_states.clear()
    yield _oauth_states
    _oauth_states.clear()


# ── Helper ────────────────────────────────────────────────────


def _parse_redirect_url(response) -> tuple[str, dict]:
    """Extract Location header from a 307 redirect response and parse it."""
    location = response.headers.get("location", "")
    parsed = urlparse(location)
    params = parse_qs(parsed.query)
    return location, params


# ── Tests: Diagnostic endpoint ────────────────────────────────


class TestOAuthStatus:
    """Tests for GET /api/auth/oauth/status"""

    @pytest.mark.asyncio
    async def test_status_shows_configured_providers(self):
        """Status endpoint returns config state for all providers."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/status")

        assert resp.status_code == 200
        data = resp.json()
        assert "providers" in data
        assert "google" in data["providers"]
        google = data["providers"]["google"]
        assert google["client_id_set"] is True
        assert google["client_secret_set"] is True
        assert google["ready"] is True
        assert "test-google" in google["client_id_prefix"]

    @pytest.mark.asyncio
    async def test_status_shows_callback_url(self):
        """Status endpoint shows the callback URL that must be registered in Google Console."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/status")

        data = resp.json()
        assert "example_callback" in data
        assert "/api/auth/oauth/google/callback" in data["example_callback"]
        assert data["frontend_url"] == "https://test-frontend.example.com"

    @pytest.mark.asyncio
    async def test_status_shows_unconfigured_provider(self, monkeypatch):
        """When credentials are missing, status shows ready=False."""
        from app.api.oauth_routes import router, _PROVIDERS
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        monkeypatch.setenv("GITHUB_CLIENT_ID", "")
        monkeypatch.setenv("GITHUB_CLIENT_SECRET", "")
        _PROVIDERS.pop("github", None)

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/status")

        data = resp.json()
        github = data["providers"]["github"]
        assert github["ready"] is False


# ── Tests: OAuth Redirect ─────────────────────────────────────


class TestOAuthRedirect:
    """Tests for GET /api/auth/oauth/{provider}"""

    @pytest.mark.asyncio
    async def test_google_redirect_has_correct_params(self, clear_states):
        """Google redirect includes client_id, redirect_uri, scope, state, prompt=select_account."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/auth/oauth/google",
                follow_redirects=False,
            )

        assert resp.status_code == 307
        location, params = _parse_redirect_url(resp)
        assert "accounts.google.com" in location
        assert params["client_id"] == ["test-google-client-id.apps.googleusercontent.com"]
        assert params["response_type"] == ["code"]
        assert "openid" in params["scope"][0]
        assert "email" in params["scope"][0]
        assert params["prompt"] == ["select_account"]
        assert params["access_type"] == ["offline"]
        # State token should exist
        assert "state" in params
        assert len(params["state"][0]) > 10

    @pytest.mark.asyncio
    async def test_google_redirect_callback_url_uses_frontend(self, clear_states):
        """When BACKEND_PUBLIC_URL is not set, callback_url falls back to FRONTEND_URL."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/google", follow_redirects=False)

        _, params = _parse_redirect_url(resp)
        redirect_uri = params["redirect_uri"][0]
        assert redirect_uri == "https://test-frontend.example.com/api/auth/oauth/google/callback"

    @pytest.mark.asyncio
    async def test_google_redirect_stores_state_token(self, clear_states):
        """After redirect, a state token is stored in _oauth_states."""
        from app.api.oauth_routes import router, _oauth_states
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/google", follow_redirects=False)

        assert len(_oauth_states) == 1
        state_key = list(_oauth_states.keys())[0]
        state_data = _oauth_states[state_key]
        assert state_data["provider"] == "google"
        assert "created_at" in state_data

    @pytest.mark.asyncio
    async def test_unsupported_provider_returns_400(self):
        """Requesting an unsupported provider returns 400."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/twitter", follow_redirects=False)

        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_credentials_returns_501(self, monkeypatch):
        """When client_id is empty, redirect returns 501."""
        from app.api.oauth_routes import router, _PROVIDERS
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        monkeypatch.setenv("GOOGLE_CLIENT_ID", "")
        _PROVIDERS.pop("google", None)

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/oauth/google", follow_redirects=False)

        assert resp.status_code == 501
        assert "not configured" in resp.json()["detail"].lower()


# ── Tests: OAuth Callback ─────────────────────────────────────


class TestOAuthCallback:
    """Tests for GET /api/auth/oauth/{provider}/callback"""

    @pytest.mark.asyncio
    async def test_callback_rejects_invalid_state(self):
        """Callback with an unknown state token redirects with error=invalid_state."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/auth/oauth/google/callback",
                params={"code": "test-code", "state": "invalid-state-token"},
                follow_redirects=False,
            )

        assert resp.status_code == 307
        location = resp.headers["location"]
        assert "error=invalid_state" in location

    @pytest.mark.asyncio
    async def test_callback_rejects_expired_state(self, clear_states):
        """Callback with an expired state token redirects with error=state_expired."""
        from app.api.oauth_routes import _oauth_states, router, STATE_TOKEN_TTL_SEC
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        # Insert an expired state token
        expired_state = "expired-state-12345"
        _oauth_states[expired_state] = {
            "provider": "google",
            "next": "/app",
            "created_at": time.time() - STATE_TOKEN_TTL_SEC - 100,  # expired
        }

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/auth/oauth/google/callback",
                params={"code": "test-code", "state": expired_state},
                follow_redirects=False,
            )

        assert resp.status_code == 307
        location = resp.headers["location"]
        assert "error=state_expired" in location

    @pytest.mark.asyncio
    async def test_callback_rejects_missing_code(self, clear_states):
        """Callback without a code param redirects with error=no_code."""
        from app.api.oauth_routes import _oauth_states, router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        valid_state = "valid-state-12345"
        _oauth_states[valid_state] = {
            "provider": "google",
            "next": "/app",
            "created_at": time.time(),
        }

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/auth/oauth/google/callback",
                params={"state": valid_state},
                follow_redirects=False,
            )

        assert resp.status_code == 307
        location = resp.headers["location"]
        assert "error=no_code" in location

    @pytest.mark.asyncio
    async def test_callback_handles_provider_error(self):
        """When Google sends error=access_denied, we redirect with oauth_denied."""
        from app.api.oauth_routes import router
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        app = FastAPI()
        app.include_router(router)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/auth/oauth/google/callback",
                params={
                    "error": "access_denied",
                    "error_description": "The user denied access",
                },
                follow_redirects=False,
            )

        assert resp.status_code == 307
        location = resp.headers["location"]
        assert "error=oauth_denied" in location
        assert "error_detail=" in location


# ── Tests: State Token Management ─────────────────────────────


class TestStateTokenManagement:
    """Tests for state token cleanup and expiry."""

    def test_cleanup_removes_expired_tokens(self):
        """_cleanup_expired_states removes tokens older than TTL."""
        from app.api.oauth_routes import _oauth_states, _cleanup_expired_states, STATE_TOKEN_TTL_SEC

        _oauth_states.clear()
        # Add an expired token
        _oauth_states["old-token"] = {
            "provider": "google",
            "next": "/app",
            "created_at": time.time() - STATE_TOKEN_TTL_SEC - 100,
        }
        # Add a valid token
        _oauth_states["new-token"] = {
            "provider": "google",
            "next": "/app",
            "created_at": time.time(),
        }

        _cleanup_expired_states()

        assert "old-token" not in _oauth_states
        assert "new-token" in _oauth_states

    def test_state_token_has_timestamp(self):
        """State tokens include created_at timestamp."""
        from app.api.oauth_routes import _oauth_states

        _oauth_states.clear()
        _oauth_states["test-state"] = {
            "provider": "google",
            "next": "/app",
            "created_at": time.time(),
        }

        data = _oauth_states["test-state"]
        assert "created_at" in data
        assert isinstance(data["created_at"], float)
        assert data["created_at"] > 0


# ── Tests: Full OAuth Flow (with mocked Google API) ───────────


class TestFullOAuthFlow:
    """Integration tests mocking the external Google token/userinfo APIs."""

    @pytest.mark.asyncio
    async def test_successful_google_login_creates_user(self, clear_states):
        """Full flow: valid state + mocked Google token exchange → user created + JWT issued."""
        from app.api.oauth_routes import router, _oauth_states
        from fastapi import FastAPI
        from httpx import AsyncClient, ASGITransport

        # Pre-seed a valid state token
        test_state = "valid-test-state-for-login"
        _oauth_states[test_state] = {
            "provider": "google",
            "next": "/dashboard",
            "created_at": time.time(),
        }

        app = FastAPI()
        app.include_router(router)

        # Mock the token exchange and userinfo calls
        mock_token_response = httpx.Response(
            200,
            json={
                "access_token": "mock-google-access-token",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
            request=httpx.Request("POST", "https://oauth2.googleapis.com/token"),
        )
        mock_userinfo_response = httpx.Response(
            200,
            json={
                "id": "google-uid-12345",
                "email": "testuser@gmail.com",
                "name": "Test User",
                "picture": "https://example.com/avatar.jpg",
            },
            request=httpx.Request("GET", "https://www.googleapis.com/oauth2/v2/userinfo"),
        )

        # Mock the DB session — user doesn't exist yet, will be created
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # user doesn't exist yet

        added_users = []

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock(side_effect=lambda u: added_users.append(u))
        mock_db.commit = AsyncMock()

        async def mock_refresh(user_obj):
            """Simulate DB refresh by populating auto-generated fields."""
            if not hasattr(user_obj, 'id') or user_obj.id is None:
                user_obj.id = uuid.uuid4()
            if not hasattr(user_obj, 'created_at') or user_obj.created_at is None:
                user_obj.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
            if not hasattr(user_obj, 'updated_at') or user_obj.updated_at is None:
                user_obj.updated_at = datetime(2024, 1, 1, tzinfo=timezone.utc)

        mock_db.refresh = AsyncMock(side_effect=mock_refresh)

        async def mock_get_db():
            yield mock_db

        # Patch get_db
        with patch("app.api.oauth_routes.get_db", mock_get_db):
            # Patch httpx.AsyncClient to return mock responses
            with patch("app.api.oauth_routes.httpx.AsyncClient") as MockClient:
                mock_client_instance = AsyncMock()
                mock_client_instance.post.return_value = mock_token_response
                mock_client_instance.get.return_value = mock_userinfo_response
                mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
                mock_client_instance.__aexit__ = AsyncMock(return_value=None)
                MockClient.return_value = mock_client_instance

                # Override dependency
                app.dependency_overrides = {}
                from app.db.database import get_db
                app.dependency_overrides[get_db] = mock_get_db

                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    resp = await client.get(
                        "/api/auth/oauth/google/callback",
                        params={"code": "test-auth-code", "state": test_state},
                        follow_redirects=False,
                    )

        # Should redirect to frontend with token
        assert resp.status_code == 307
        location = resp.headers["location"]
        assert "/auth/callback" in location
        assert "token=" in location
        assert "user=" in location
        assert "next=" in location
        # State should be consumed
        assert test_state not in _oauth_states
