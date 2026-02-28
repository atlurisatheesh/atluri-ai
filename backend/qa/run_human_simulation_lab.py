import json
import os
import sys
import time
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

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

from app.main import app
from app.analytics.session_analytics_store import save_session_analytics

REPORT_DIR = Path(__file__).resolve().parents[0] / "reports"
REPORT_PATH = REPORT_DIR / "human_simulation_lab_report.json"


def _unsigned_token(user_id: str) -> str:
    header = "eyJhbGciOiJub25lIn0"
    payload = f'{{"sub":"{user_id}"}}'.encode("utf-8")
    payload_b64 = __import__("base64").urlsafe_b64encode(payload).decode("utf-8").rstrip("=")
    return f"{header}.{payload_b64}."


def _seed_session(
    user_id: str,
    session_index: int,
    *,
    score: float,
    metric: float,
    ownership: float,
    contradictions: int,
    drift: float,
    decision: str = "borderline",
    metric_inflation_flags: int = 0,
) -> str:
    session_id = f"sim-{user_id}-{session_index}-{uuid.uuid4().hex[:6]}"
    now_ts = time.time() + (session_index * 0.01)
    payload = {
        "session_id": session_id,
        "role": "behavioral",
        "generated_at": now_ts,
        "user_id": user_id,
        "summary": {
            "decision": decision,
            "score": score,
            "strengths": ["Structured story"] if score >= 65 else ["Potential under pressure"],
            "risk_flags": ["Contradictions detected"] if contradictions > 0 else [],
            "contradictions_detected": contradictions,
            "metric_usage_score": metric,
            "metric_inflation_flags": metric_inflation_flags,
            "ownership_clarity_score": ownership,
            "tradeoff_depth_score": max(25.0, min(95.0, (ownership * 0.5) + 20.0)),
            "drift_frequency": drift,
            "speaking_time_ratio": 0.58,
            "confidence_drop_moments": 1 if score < 65 else 0,
            "rambling_bursts": 1 if drift > 0.25 else 0,
            "assist_high_severity_spikes": 1 if drift > 0.3 else 0,
        },
        "timeline": [
            {
                "index": 1,
                "question": "Describe a high pressure interview moment",
                "confidence": max(25.0, min(95.0, score - 4.0)),
                "clarity": max(25.0, min(95.0, ownership)),
                "communication": max(25.0, min(95.0, score - 2.0)),
                "technical": max(25.0, min(95.0, metric)),
                "metric_signal": max(10.0, min(95.0, metric)),
                "rambling": drift > 0.25,
            }
        ],
    }
    save_session_analytics(session_id=session_id, payload=payload, user_id=user_id)
    return session_id


def _call_json(client: TestClient, method: str, path: str, token: str, body: dict | None = None) -> tuple[int, dict, float]:
    started = time.perf_counter()
    headers = {"Authorization": f"Bearer {token}"}
    if method.upper() == "GET":
        resp = client.get(path, headers=headers)
    else:
        resp = client.post(path, headers=headers, json=body or {})
    elapsed_ms = round((time.perf_counter() - started) * 1000.0, 2)
    try:
        data = resp.json()
    except Exception:
        data = {}
    return resp.status_code, data if isinstance(data, dict) else {}, elapsed_ms


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    started = time.time()

    run_id = str(int(started))
    users = {
        "faang_anxious": f"sim-{run_id}-faang",
        "mba": f"sim-{run_id}-mba",
        "student": f"sim-{run_id}-student",
        "senior_manager": f"sim-{run_id}-senior",
        "career_switcher": f"sim-{run_id}-switch",
        "cheater": f"sim-{run_id}-cheat",
        "high_performer": f"sim-{run_id}-high",
        "overthinker": f"sim-{run_id}-overthink",
        "confidence_seeker": f"sim-{run_id}-confidence",
        "power_user": f"sim-{run_id}-power",
        "plateau_user": f"sim-{run_id}-plateau",
    }

    # Seed archetype trajectories
    _seed_session(users["faang_anxious"], 1, score=74, metric=78, ownership=72, contradictions=1, drift=0.14, decision="hire")
    _seed_session(users["mba"], 1, score=76, metric=64, ownership=82, contradictions=0, drift=0.12, decision="hire")
    _seed_session(users["student"], 1, score=36, metric=22, ownership=28, contradictions=2, drift=0.45, decision="reject")
    _seed_session(users["senior_manager"], 1, score=81, metric=74, ownership=79, contradictions=0, drift=0.08, decision="strong_hire")
    _seed_session(users["career_switcher"], 1, score=48, metric=33, ownership=45, contradictions=1, drift=0.28, decision="reject")
    _seed_session(users["cheater"], 1, score=62, metric=96, ownership=41, contradictions=2, drift=0.37, decision="borderline", metric_inflation_flags=2)
    _seed_session(users["high_performer"], 1, score=86, metric=85, ownership=84, contradictions=0, drift=0.05, decision="strong_hire")
    _seed_session(users["overthinker"], 1, score=69, metric=58, ownership=66, contradictions=1, drift=0.17, decision="hire")
    _seed_session(users["confidence_seeker"], 1, score=52, metric=46, ownership=49, contradictions=1, drift=0.23, decision="borderline")
    for index, values in enumerate([(55, 52, 50, 1, 0.24), (61, 58, 59, 1, 0.18), (68, 64, 65, 0, 0.12), (72, 68, 70, 0, 0.10), (76, 72, 74, 0, 0.08)], start=1):
        score, metric, ownership, contradictions, drift = values
        _seed_session(users["power_user"], index, score=score, metric=metric, ownership=ownership, contradictions=contradictions, drift=drift, decision="hire" if score >= 65 else "borderline")

    # Plateau archetype: already high, expects small incremental movement with explicit plateau framing.
    for index, values in enumerate([(82, 80, 82, 0, 0.07), (83, 81, 83, 0, 0.07), (83.5, 81.5, 83.5, 0, 0.07), (83.8, 82, 84, 0, 0.06), (84, 82, 84, 0, 0.06)], start=1):
        score, metric, ownership, contradictions, drift = values
        _seed_session(users["plateau_user"], index, score=score, metric=metric, ownership=ownership, contradictions=contradictions, drift=drift, decision="strong_hire")

    client = TestClient(app)
    offer_by_label: dict[str, dict] = {}
    latency_by_label: dict[str, dict] = {}

    for label, user_id in users.items():
        token = _unsigned_token(user_id)
        status_offer, offer_payload, offer_ms = _call_json(client, "GET", "/api/user/offer-probability?limit=40", token)
        status_dash, dash_payload, dash_ms = _call_json(client, "GET", "/api/dashboard/overview", token)

        if status_offer == 200:
            offer_by_label[label] = offer_payload
        latency_by_label[label] = {
            "offer_status": status_offer,
            "offer_ms": offer_ms,
            "dashboard_status": status_dash,
            "dashboard_ms": dash_ms,
            "dashboard_sessions": ((dash_payload.get("sessions") or {}).get("total") if status_dash == 200 else None),
        }

        if status_offer == 200:
            _call_json(
                client,
                "POST",
                "/api/user/offer-probability/feedback",
                token,
                body={
                    "session_id": str(offer_payload.get("latest_session_id") or ""),
                    "offer_probability": float(offer_payload.get("offer_probability") or 0.0),
                    "confidence_band": str(offer_payload.get("confidence_band") or "low"),
                    "felt_accuracy": label not in {"cheater", "student"},
                    "label": "accurate" if label not in {"cheater", "student"} else "inaccurate",
                },
            )

    def _offer(label: str) -> float:
        return float((offer_by_label.get(label) or {}).get("offer_probability") or 0.0)

    def _delta(label: str) -> float:
        return float((offer_by_label.get(label) or {}).get("delta_vs_last_session") or 0.0)

    def _velocity(label: str) -> float:
        return float((offer_by_label.get(label) or {}).get("improvement_velocity_pp_per_session") or 0.0)

    def _has_integrity_surface(label: str) -> bool:
        payload = offer_by_label.get(label) or {}
        drivers_neg = [str(item) for item in (payload.get("drivers_negative") or [])]
        actions = [str(item) for item in (payload.get("what_to_fix_next") or [])]
        driver_hit = any("Evidence Integrity" in item for item in drivers_neg)
        action_hit = any("verifiable" in item.lower() or "unsupported" in item.lower() for item in actions)
        return driver_hit or action_hit

    checks = {
        "first_impression_latency_under_3000ms": all((item.get("offer_ms") or 9999) <= 3000 for item in latency_by_label.values()),
        "too_low_attack_has_context_fields": all(
            bool((offer_by_label.get("faang_anxious") or {}).get(key))
            for key in ["baseline_range_hint", "target_ladder", "how_it_works"]
        ),
        "too_high_attack_penalized": _offer("cheater") <= 70.0,
        "too_high_attack_integrity_surface": _has_integrity_surface("cheater"),
        "no_movement_has_plateau_or_velocity": bool((offer_by_label.get("plateau_user") or {}).get("plateau_note")) or abs(_velocity("plateau_user")) <= 2.0,
        "social_comparison_has_percentile": all((offer_by_label.get(label) or {}).get("beta_percentile") is not None for label in ["faang_anxious", "student", "power_user"]),
        "rage_quit_context_for_low_baseline": _offer("student") < 55.0 and bool((offer_by_label.get("student") or {}).get("baseline_range_hint")),
        "high_performer_plateau_guard": _offer("high_performer") >= 70.0 and (
            bool((offer_by_label.get("high_performer") or {}).get("plateau_note"))
            or abs(_delta("high_performer")) <= 2.0
        ),
        "power_user_velocity_positive": _velocity("power_user") >= 0.0,
        "determinism_field_available": all("improvement_velocity_pp_per_session" in payload for payload in offer_by_label.values()),
        "feedback_summary_endpoint_alive": True,
    }

    # Probe one summary response for trust KPI health
    sample_user = users["power_user"]
    sample_token = _unsigned_token(sample_user)
    summary_status, summary_payload, summary_ms = _call_json(client, "GET", "/api/user/offer-probability/feedback-summary?limit=50", sample_token)
    checks["feedback_summary_endpoint_alive"] = summary_status == 200 and "accurate_rate_pct" in summary_payload

    total = len(checks)
    passed = sum(1 for value in checks.values() if bool(value))

    technical_readiness = round((passed / total) * 10.0, 2)
    trust_framing = round((sum(1 for key in checks if "context" in key or "percentile" in key or "baseline" in key) and 0 or 0), 2)
    # Derived scores aligned to simulation framing
    trust_checks = [
        checks["too_low_attack_has_context_fields"],
        checks["social_comparison_has_percentile"],
        checks["rage_quit_context_for_low_baseline"],
        checks["determinism_field_available"],
    ]
    trust_framing = round((sum(1 for item in trust_checks if item) / len(trust_checks)) * 10.0, 2)

    psych_checks = [
        checks["too_high_attack_penalized"],
        checks["no_movement_has_plateau_or_velocity"],
        checks["high_performer_plateau_guard"],
        checks["power_user_velocity_positive"],
    ]
    psychological_resilience = round((sum(1 for item in psych_checks if item) / len(psych_checks)) * 10.0, 2)

    social_checks = [
        checks["social_comparison_has_percentile"],
        checks["feedback_summary_endpoint_alive"],
        checks["power_user_velocity_positive"],
    ]
    social_stress_tolerance = round((sum(1 for item in social_checks if item) / len(social_checks)) * 10.0, 2)

    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "duration_sec": round(time.time() - started, 2),
        "objective": "Pre-beta hard-mode behavioral + trust simulation",
        "all_pass": passed == total,
        "scores": {
            "technical_readiness_10": technical_readiness,
            "trust_framing_10": trust_framing,
            "psychological_resilience_10": psychological_resilience,
            "social_stress_tolerance_10": social_stress_tolerance,
        },
        "checks": checks,
        "summary_probe": {
            "status": summary_status,
            "latency_ms": summary_ms,
            "payload": summary_payload,
        },
        "archetype_offers": {
            label: {
                "offer_probability": float(payload.get("offer_probability") or 0.0),
                "delta_vs_last_session": float(payload.get("delta_vs_last_session") or 0.0),
                "velocity": float(payload.get("improvement_velocity_pp_per_session") or 0.0),
                "confidence_band": str(payload.get("confidence_band") or "low"),
                "beta_percentile": payload.get("beta_percentile"),
            }
            for label, payload in offer_by_label.items()
        },
        "latency": latency_by_label,
        "notes": [
            "Latency measurements use in-process TestClient and are directional, not browser/network true latency.",
            "UI overload and emotional perception still require live moderated sessions to validate micro-interaction timing.",
        ],
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"REPORT={REPORT_PATH}")

    if not report["all_pass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
