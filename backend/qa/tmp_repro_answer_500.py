import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("ENV", "development")
os.environ.setdefault("ALLOW_UNVERIFIED_JWT_DEV", "true")
os.environ.setdefault("SUPABASE_JWT_SECRET", "")
os.environ.setdefault("SUPABASE_URL", "")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "")
os.environ.setdefault("SUPABASE_ANON_KEY", "")
os.environ.setdefault("SUPABASE_KEY", "")

from fastapi.testclient import TestClient

from app.main import app


def _token(sub: str) -> str:
    import base64

    header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode("utf-8").rstrip("=")
    payload = base64.urlsafe_b64encode((f'{{"sub":"{sub}"}}').encode("utf-8")).decode("utf-8").rstrip("=")
    return f"{header}.{payload}."


def main() -> None:
    client = TestClient(app, raise_server_exceptions=True)
    headers = {"Authorization": f"Bearer {_token('testclient-user')}"}

    start = client.post("/api/interview/start", headers=headers, json={"role": "behavioral"})
    print("start", start.status_code)
    print(start.text)
    start.raise_for_status()

    session_id = start.json().get("session_id")

    answers = [
        "I led a migration plan across 4 teams and reduced deployment lead time by 37%.",
        "I improved availability to 99.99% and reduced latency 95% while cutting costs 70%.",
        "I ran incident command, restored service in 22 minutes, and prevented recurrence with guardrails.",
        "I evaluated trade-offs between cache invalidation and read-through, choosing read-through to stabilize p95.",
        "I aligned stakeholders on success metrics, wrote the design doc, and owned rollout checkpoints.",
    ]

    for idx, answer in enumerate(answers, start=1):
        resp = client.post(
            "/api/interview/answer",
            headers=headers,
            json={"session_id": session_id, "answer": answer},
        )
        print("answer", idx, resp.status_code)
        print(resp.text[:500])
        resp.raise_for_status()
        if bool(resp.json().get("done")):
            print("completed at", idx)
            break

    print("OK")


if __name__ == "__main__":
    main()
