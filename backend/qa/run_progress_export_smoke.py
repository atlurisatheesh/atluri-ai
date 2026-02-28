import json
import sys
import time
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.analytics.session_analytics_store import save_session_analytics
from app.main import app


REPORT_DIR = Path(__file__).resolve().parents[0] / "reports"
REPORT_PATH = REPORT_DIR / "progress_export_smoke_report.json"
DEV_USER_ID = "dev-user"
DEV_TOKEN = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZXYtdXNlciJ9."


def _seed_session(score: float, metric: float, ownership: float, contradictions: int, drift: float) -> str:
    session_id = str(uuid.uuid4())
    now_ts = time.time()
    payload = {
        "session_id": session_id,
        "role": "backend",
        "generated_at": now_ts,
        "user_id": DEV_USER_ID,
        "summary": {
            "decision": "pass" if score >= 70 else "borderline",
            "score": score,
            "strengths": ["Structured delivery"],
            "risk_flags": ["Confidence volatility"] if contradictions > 0 else [],
            "contradictions_detected": contradictions,
            "metric_usage_score": metric,
            "ownership_clarity_score": ownership,
            "tradeoff_depth_score": 62.0,
            "drift_frequency": drift,
            "speaking_time_ratio": 0.58,
            "confidence_drop_moments": 1,
            "rambling_bursts": 0,
            "assist_high_severity_spikes": 1,
        },
        "timeline": [
            {
                "index": 1,
                "question": "Describe a high-scale architecture decision",
                "confidence": 74,
                "clarity": 72,
                "communication": 70,
                "technical": 76,
                "metric_signal": 61,
                "rambling": False,
            }
        ],
    }
    save_session_analytics(session_id=session_id, payload=payload, user_id=DEV_USER_ID)
    return session_id


def main() -> None:
    started = time.time()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    session_a = _seed_session(score=66.0, metric=48.0, ownership=44.0, contradictions=2, drift=0.40)
    session_b = _seed_session(score=78.0, metric=68.0, ownership=62.0, contradictions=1, drift=0.16)

    headers = {"Authorization": f"Bearer {DEV_TOKEN}"}
    client = TestClient(app)
    steps = []

    resp = client.get("/api/user/progress?limit=20", headers=headers)
    progress_ok = resp.status_code == 200 and isinstance(resp.json().get("points"), list) and len(resp.json().get("points", [])) >= 2
    steps.append({
        "name": "user_progress",
        "ok": progress_ok,
        "detail": f"status={resp.status_code}, points={len(resp.json().get('points', [])) if resp.status_code == 200 else 0}",
    })

    csv_resp = client.get(f"/api/session/{session_b}/export?format=csv", headers=headers)
    csv_body = csv_resp.text or ""
    csv_ok = csv_resp.status_code == 200 and "session_id" in csv_body and session_b in csv_body
    steps.append({
        "name": "session_export_csv",
        "ok": csv_ok,
        "detail": f"status={csv_resp.status_code}, bytes={len(csv_body)}",
    })

    share_resp = client.post(f"/api/session/{session_b}/share", headers=headers)
    share_data = share_resp.json() if share_resp.status_code == 200 else {}
    token = str(share_data.get("share_token") or "")
    share_ok = (
        share_resp.status_code == 200
        and bool(token)
        and str(share_data.get("share_path") or "").startswith("/interview/public/")
    )
    steps.append({
        "name": "session_share",
        "ok": share_ok,
        "detail": f"status={share_resp.status_code}, has_token={bool(token)}",
    })

    public_resp = client.get(f"/api/public/session/{session_b}/snapshot?token={token}")
    public_data = public_resp.json() if public_resp.status_code == 200 else {}
    public_ok = (
        public_resp.status_code == 200
        and str(public_data.get("session_id") or "") == session_b
        and isinstance((public_data.get("summary") or {}).get("integrity_score"), (int, float))
    )
    steps.append({
        "name": "public_snapshot",
        "ok": public_ok,
        "detail": f"status={public_resp.status_code}, integrity={((public_data.get('summary') or {}).get('integrity_score') if public_resp.status_code == 200 else None)}",
    })

    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "duration_sec": round(time.time() - started, 2),
        "all_pass": all(bool(item.get("ok")) for item in steps),
        "seeded_sessions": [session_a, session_b],
        "steps": steps,
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"REPORT={REPORT_PATH}")

    if not report["all_pass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
