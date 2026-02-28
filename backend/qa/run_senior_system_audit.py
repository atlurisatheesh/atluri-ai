import json
import subprocess
import sys
import time
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.analytics.session_analytics_store import save_session_analytics
from app.main import app, _share_tokens

DEV_TOKEN = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZXYtdXNlciJ9."
OTHER_TOKEN = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhdWRpdC11c2VyLTIifQ."
REPORT_DIR = ROOT / "qa" / "reports"
REPORT_PATH = REPORT_DIR / "senior_system_audit_report.json"


def run_python_script(path: Path) -> dict:
    started = time.time()
    proc = subprocess.run(
        [sys.executable, str(path)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "script": str(path),
        "exit_code": int(proc.returncode),
        "duration_sec": round(time.time() - started, 2),
        "stdout_tail": "\n".join((proc.stdout or "").splitlines()[-25:]),
        "stderr_tail": "\n".join((proc.stderr or "").splitlines()[-25:]),
    }


def seed_session(user_id: str, score: float) -> str:
    session_id = str(uuid.uuid4())
    payload = {
        "session_id": session_id,
        "role": "backend",
        "generated_at": time.time(),
        "user_id": user_id,
        "summary": {
            "decision": "pass" if score >= 70 else "borderline",
            "score": score,
            "strengths": ["Clear structure"],
            "risk_flags": [],
            "contradictions_detected": 0,
            "metric_usage_score": 66.0,
            "ownership_clarity_score": 62.0,
            "tradeoff_depth_score": 60.0,
            "drift_frequency": 0.1,
            "speaking_time_ratio": 0.58,
            "confidence_drop_moments": 0,
            "rambling_bursts": 0,
            "assist_high_severity_spikes": 1,
        },
        "timeline": [],
    }
    save_session_analytics(session_id=session_id, payload=payload, user_id=user_id)
    return session_id


def api_security_checks() -> dict:
    client = TestClient(app)

    dev_session = seed_session("dev-user", 78.0)
    other_session = seed_session("audit-user-2", 63.0)

    checks = []

    no_auth = client.get("/api/user/progress?limit=10")
    checks.append({
        "name": "progress_requires_auth",
        "ok": no_auth.status_code == 401,
        "detail": f"status={no_auth.status_code}",
    })

    dev_progress = client.get("/api/user/progress?limit=50", headers={"Authorization": f"Bearer {DEV_TOKEN}"})
    dev_points = dev_progress.json().get("points", []) if dev_progress.status_code == 200 else []
    dev_ids = {str(item.get("session_id") or "") for item in dev_points}
    checks.append({
        "name": "progress_user_scope_dev",
        "ok": (dev_progress.status_code == 200 and dev_session in dev_ids and other_session not in dev_ids),
        "detail": f"status={dev_progress.status_code}, points={len(dev_points)}",
    })

    other_progress = client.get("/api/user/progress?limit=50", headers={"Authorization": f"Bearer {OTHER_TOKEN}"})
    other_points = other_progress.json().get("points", []) if other_progress.status_code == 200 else []
    other_ids = {str(item.get("session_id") or "") for item in other_points}
    checks.append({
        "name": "progress_user_scope_other",
        "ok": (other_progress.status_code == 200 and other_session in other_ids and dev_session not in other_ids),
        "detail": f"status={other_progress.status_code}, points={len(other_points)}",
    })

    share_resp = client.post(f"/api/session/{dev_session}/share", headers={"Authorization": f"Bearer {DEV_TOKEN}"})
    share_data = share_resp.json() if share_resp.status_code == 200 else {}
    token = str(share_data.get("share_token") or "")
    checks.append({
        "name": "share_create_authorized",
        "ok": share_resp.status_code == 200 and bool(token),
        "detail": f"status={share_resp.status_code}, token={bool(token)}",
    })

    public_valid = client.get(f"/api/public/session/{dev_session}/snapshot?token={token}")
    checks.append({
        "name": "public_snapshot_valid_token",
        "ok": public_valid.status_code == 200,
        "detail": f"status={public_valid.status_code}",
    })

    public_missing = client.get(f"/api/public/session/{dev_session}/snapshot")
    checks.append({
        "name": "public_snapshot_missing_token_blocked",
        "ok": public_missing.status_code in {403, 422},
        "detail": f"status={public_missing.status_code}",
    })

    public_invalid = client.get(f"/api/public/session/{dev_session}/snapshot?token=invalid-token")
    checks.append({
        "name": "public_snapshot_invalid_token_blocked",
        "ok": public_invalid.status_code == 403,
        "detail": f"status={public_invalid.status_code}",
    })

    public_wrong_session = client.get(f"/api/public/session/{other_session}/snapshot?token={token}")
    checks.append({
        "name": "public_snapshot_token_session_bound",
        "ok": public_wrong_session.status_code == 403,
        "detail": f"status={public_wrong_session.status_code}",
    })

    revoke_resp = client.post(
        f"/api/share/{dev_session}/revoke",
        headers={"Authorization": f"Bearer {DEV_TOKEN}"},
    )
    revoked_count = int((revoke_resp.json() or {}).get("revoked_count") or 0) if revoke_resp.status_code == 200 else 0
    checks.append({
        "name": "share_revoke_endpoint",
        "ok": revoke_resp.status_code == 200 and revoked_count >= 1,
        "detail": f"status={revoke_resp.status_code}, revoked_count={revoked_count}",
    })

    public_after_revoke = client.get(f"/api/public/session/{dev_session}/snapshot?token={token}")
    checks.append({
        "name": "public_snapshot_revoked_token_blocked",
        "ok": public_after_revoke.status_code == 403,
        "detail": f"status={public_after_revoke.status_code}",
    })

    share_resp_2 = client.post(f"/api/session/{dev_session}/share", headers={"Authorization": f"Bearer {DEV_TOKEN}"})
    share_data_2 = share_resp_2.json() if share_resp_2.status_code == 200 else {}
    token_2 = str(share_data_2.get("share_token") or "")
    if token_2 in _share_tokens:
        _share_tokens[token_2]["expires_at"] = time.time() - 1.0

    public_after_expire = client.get(f"/api/public/session/{dev_session}/snapshot?token={token_2}")
    checks.append({
        "name": "public_snapshot_expired_token_blocked",
        "ok": public_after_expire.status_code == 403,
        "detail": f"status={public_after_expire.status_code}",
    })

    metrics_no_auth = client.get("/api/system/metrics")
    checks.append({
        "name": "system_metrics_requires_auth",
        "ok": metrics_no_auth.status_code == 401,
        "detail": f"status={metrics_no_auth.status_code}",
    })

    metrics_auth = client.get("/api/system/metrics", headers={"Authorization": f"Bearer {DEV_TOKEN}"})
    metrics_data = metrics_auth.json() if metrics_auth.status_code == 200 else {}
    required_metric_keys = {
        "ws_connections_active",
        "answer_streams_started",
        "answer_streams_cancelled",
        "emotional_events_emitted",
        "assist_hints_emitted",
        "share_tokens_active",
        "share_tokens_revoked",
        "avg_stream_duration",
        "avg_latency_ms",
    }
    checks.append({
        "name": "system_metrics_shape",
        "ok": metrics_auth.status_code == 200 and required_metric_keys.issubset(set(metrics_data.keys())),
        "detail": f"status={metrics_auth.status_code}, keys={len(metrics_data.keys()) if isinstance(metrics_data, dict) else 0}",
    })

    return {
        "checks": checks,
        "all_pass": all(bool(c.get("ok")) for c in checks),
    }


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    started = time.time()

    room_hardening = run_python_script(ROOT / "qa" / "run_room_hardening_smokes.py")
    manual_live_room = run_python_script(ROOT / "tmp_room_ws_smoke.py")
    api_security = api_security_checks()

    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "duration_sec": round(time.time() - started, 2),
        "required_actions": {
            "room_hardening_smokes": room_hardening,
            "manual_live_room_test": manual_live_room,
            "progress_and_public_security": api_security,
        },
        "all_pass": (
            room_hardening.get("exit_code") == 0
            and manual_live_room.get("exit_code") == 0
            and bool(api_security.get("all_pass"))
        ),
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"REPORT={REPORT_PATH}")

    if not report["all_pass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
