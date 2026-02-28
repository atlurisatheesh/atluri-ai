import base64
import json
import os
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def _test_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("ALLOW_UNVERIFIED_JWT_DEV", "true")
    monkeypatch.setenv("QA_MODE", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


@pytest.fixture
def dev_jwt_token() -> str:
    def _enc(obj: dict) -> str:
        raw = json.dumps(obj, separators=(",", ":")).encode("utf-8")
        return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")

    header = _enc({"alg": "none", "typ": "JWT"})
    payload = _enc({"sub": "pytest-user", "iat": 0})
    return f"{header}.{payload}."
