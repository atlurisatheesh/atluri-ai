import json
import math
import time
from pathlib import Path
from threading import Lock
from typing import Any, Dict
from app.company_modes import normalize_company_mode


def _empty_context() -> Dict[str, Any]:
    return {
        "resume_text": "",
        "job_description": "",
        "company_mode": "general",
        "assist": {
            "intensity": 2,
        },
        "interview": {
            "session_id": "",
            "role": "",
            "active": False,
            "done": False,
            "last_question": "",
            "last_payload": None,
            "updated_at": 0.0,
        },
        "interview_history": [],
        "credibility": {
            "last_snapshot": None,
            "updated_at": 0.0,
        },
        "credibility_history": [],
    }


_state_lock = Lock()
_store_path = Path(__file__).resolve().parents[1] / "data" / "user_context_store.json"
user_context_by_user_id: Dict[str, Dict[str, Any]] = {}


def _sanitize_context(raw: Any) -> Dict[str, Any]:
    base = _empty_context()
    if not isinstance(raw, dict):
        return base

    base["resume_text"] = str(raw.get("resume_text") or "")
    base["job_description"] = str(raw.get("job_description") or "")
    base["company_mode"] = str(raw.get("company_mode") or "general").lower()

    assist = raw.get("assist") if isinstance(raw.get("assist"), dict) else {}
    try:
        assist_intensity = int(assist.get("intensity") or 2)
    except Exception:
        assist_intensity = 2
    base["assist"]["intensity"] = max(1, min(assist_intensity, 3))

    interview = raw.get("interview") if isinstance(raw.get("interview"), dict) else {}
    base["interview"].update({
        "session_id": str(interview.get("session_id") or ""),
        "role": str(interview.get("role") or ""),
        "active": bool(interview.get("active", False)),
        "done": bool(interview.get("done", False)),
        "last_question": str(interview.get("last_question") or ""),
        "last_payload": interview.get("last_payload"),
        "updated_at": float(interview.get("updated_at") or 0.0),
    })

    credibility = raw.get("credibility") if isinstance(raw.get("credibility"), dict) else {}
    base["credibility"].update({
        "last_snapshot": credibility.get("last_snapshot"),
        "updated_at": float(credibility.get("updated_at") or 0.0),
    })

    interview_history = raw.get("interview_history")
    if isinstance(interview_history, list):
        base["interview_history"] = [item for item in interview_history if isinstance(item, dict)][-50:]

    credibility_history = raw.get("credibility_history")
    if isinstance(credibility_history, list):
        base["credibility_history"] = [item for item in credibility_history if isinstance(item, dict)][-100:]

    return base


def _load_store() -> None:
    global user_context_by_user_id
    if not _store_path.exists():
        user_context_by_user_id = {}
        return

    try:
        payload = json.loads(_store_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            user_context_by_user_id = {}
            return

        loaded: Dict[str, Dict[str, Any]] = {}
        for key, value in payload.items():
            if isinstance(key, str) and key.strip():
                loaded[key] = _sanitize_context(value)
        user_context_by_user_id = loaded
    except Exception:
        user_context_by_user_id = {}


def _persist_store() -> None:
    _store_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = _store_path.with_suffix(".tmp")
    temp_path.write_text(json.dumps(user_context_by_user_id, ensure_ascii=False), encoding="utf-8")
    temp_path.replace(_store_path)


def get_user_context(user_id: str) -> Dict[str, Any]:
    with _state_lock:
        if user_id not in user_context_by_user_id:
            user_context_by_user_id[user_id] = _empty_context()
            _persist_store()
        return user_context_by_user_id[user_id]


def set_resume_text(user_id: str, text: str) -> None:
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        context["resume_text"] = text
        _persist_store()


def set_job_description(user_id: str, description: str) -> None:
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        context["job_description"] = description
        _persist_store()


def mark_interview_started(user_id: str, session_id: str, role: str, question: str) -> None:
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        context["interview"] = {
            "session_id": session_id,
            "role": role,
            "active": True,
            "done": False,
            "last_question": question,
            "last_payload": None,
            "updated_at": time.time(),
        }
        _persist_store()


def mark_interview_update(user_id: str, session_id: str, payload: dict) -> None:
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        interview = context.get("interview") if isinstance(context.get("interview"), dict) else {}
        interview["session_id"] = session_id
        interview["last_payload"] = payload
        interview["done"] = bool(payload.get("done", False))
        interview["active"] = not interview["done"]
        if payload.get("next_question"):
            interview["last_question"] = str(payload.get("next_question") or "")
        interview["updated_at"] = time.time()
        context["interview"] = interview

        if interview["done"]:
            history = context.get("interview_history") if isinstance(context.get("interview_history"), list) else []
            history.append({
                "session_id": session_id,
                "role": str(interview.get("role") or ""),
                "score": payload.get("score"),
                "decision": payload.get("decision"),
                "evaluations_count": len(payload.get("evaluations") or []),
                "finished_at": interview["updated_at"],
            })
            context["interview_history"] = history[-50:]

        _persist_store()


def mark_credibility_snapshot(user_id: str, snapshot: dict) -> None:
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        now = time.time()
        context["credibility"] = {
            "last_snapshot": snapshot,
            "updated_at": now,
        }

        history = context.get("credibility_history") if isinstance(context.get("credibility_history"), list) else []
        history.append({
            "session_id": str(snapshot.get("session_id") or ""),
            "consistency_score": float(snapshot.get("consistency_score") or 0.0),
            "leadership_credibility": float(snapshot.get("leadership_credibility") or 0.0),
            "overclaim_index": float(snapshot.get("overclaim_index") or 0.0),
            "blind_spot_index": float(snapshot.get("blind_spot_index") or 0.0),
            "risk_count": len(snapshot.get("high_risk_skills") or []),
            "captured_at": now,
        })
        context["credibility_history"] = history[-100:]
        _persist_store()


def set_company_mode(user_id: str, company_mode: str) -> str:
    normalized = normalize_company_mode(company_mode)
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        context["company_mode"] = normalized
        _persist_store()
    return normalized


def get_company_mode(user_id: str) -> str:
    context = get_user_context(user_id)
    return str(context.get("company_mode") or "general")


def get_interview_history(user_id: str, limit: int = 20) -> list[dict]:
    context = get_user_context(user_id)
    history = context.get("interview_history") if isinstance(context.get("interview_history"), list) else []
    normalized_limit = max(1, min(int(limit or 20), 100))
    return list(reversed(history[-normalized_limit:]))


def get_credibility_history(user_id: str, limit: int = 30) -> list[dict]:
    context = get_user_context(user_id)
    history = context.get("credibility_history") if isinstance(context.get("credibility_history"), list) else []
    normalized_limit = max(1, min(int(limit or 30), 200))
    return list(reversed(history[-normalized_limit:]))


def get_dashboard_overview(user_id: str) -> dict:
    interviews = get_interview_history(user_id, limit=20)
    credibility = get_credibility_history(user_id, limit=30)

    avg_score = 0.0
    scored = [float(item.get("score") or 0.0) for item in interviews if item.get("score") is not None]
    if scored:
        avg_score = sum(scored) / len(scored)

    latest_cred = credibility[0] if credibility else {}

    return {
        "sessions": {
            "total": len(interviews),
            "average_score": round(avg_score, 2),
            "latest_decision": interviews[0].get("decision") if interviews else None,
        },
        "consistency": {
            "latest": float(latest_cred.get("consistency_score") or 0.0),
            "trend": [float(item.get("consistency_score") or 0.0) for item in reversed(credibility[:10])],
        },
        "risk": {
            "latest_overclaim_index": float(latest_cred.get("overclaim_index") or 0.0),
            "latest_blind_spot_index": float(latest_cred.get("blind_spot_index") or 0.0),
            "latest_risk_count": int(latest_cred.get("risk_count") or 0),
        },
        "persona": {
            "latest_leadership_credibility": float(latest_cred.get("leadership_credibility") or 0.0),
            "company_mode": get_company_mode(user_id),
            "assist_intensity": get_assist_intensity(user_id),
        },
        "heatmap": [
            {
                "label": f"S{idx + 1}",
                "consistency": float(item.get("consistency_score") or 0.0),
                "leadership": float(item.get("leadership_credibility") or 0.0),
                "risk": int(item.get("risk_count") or 0),
            }
            for idx, item in enumerate(reversed(credibility[:12]))
        ],
    }


def get_context_status(user_id: str) -> Dict[str, int | bool]:
    context = get_user_context(user_id)
    resume_text = str(context.get("resume_text") or "")
    job_description = str(context.get("job_description") or "")
    interview = context.get("interview") if isinstance(context.get("interview"), dict) else {}

    return {
        "resume_loaded": bool(resume_text.strip()),
        "resume_chars": len(resume_text),
        "job_loaded": bool(job_description.strip()),
        "job_chars": len(job_description),
        "interview_active": bool(interview.get("active", False)),
        "interview_done": bool(interview.get("done", False)),
    }


def get_user_snapshot(user_id: str) -> Dict[str, Any]:
    context = get_user_context(user_id)
    interview = context.get("interview") if isinstance(context.get("interview"), dict) else {}
    credibility = context.get("credibility") if isinstance(context.get("credibility"), dict) else {}

    resume_text = str(context.get("resume_text") or "")
    job_description = str(context.get("job_description") or "")

    return {
        "company_mode": get_company_mode(user_id),
        "resume": {
            "loaded": bool(resume_text.strip()),
            "chars": len(resume_text),
        },
        "job": {
            "loaded": bool(job_description.strip()),
            "chars": len(job_description),
        },
        "interview": {
            "session_id": str(interview.get("session_id") or ""),
            "role": str(interview.get("role") or ""),
            "active": bool(interview.get("active", False)),
            "done": bool(interview.get("done", False)),
            "last_question": str(interview.get("last_question") or ""),
            "updated_at": float(interview.get("updated_at") or 0.0),
        },
        "credibility": {
            "updated_at": float(credibility.get("updated_at") or 0.0),
            "has_snapshot": credibility.get("last_snapshot") is not None,
        },
        "history": {
            "interview_sessions": len(context.get("interview_history") or []),
            "credibility_snapshots": len(context.get("credibility_history") or []),
        },
        "assist": {
            "intensity": get_assist_intensity(user_id),
        },
    }


def set_assist_intensity(user_id: str, level: int) -> int:
    normalized = max(1, min(int(level or 2), 3))
    with _state_lock:
        context = user_context_by_user_id.setdefault(user_id, _empty_context())
        assist = context.get("assist") if isinstance(context.get("assist"), dict) else {}
        assist["intensity"] = normalized
        context["assist"] = assist
        _persist_store()
    return normalized


def get_assist_intensity(user_id: str) -> int:
    context = get_user_context(user_id)
    assist = context.get("assist") if isinstance(context.get("assist"), dict) else {}
    try:
        value = int(assist.get("intensity") or 2)
    except Exception:
        value = 2
    return max(1, min(value, 3))


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _sigmoid(x: float) -> float:
    bounded = _clamp(x, -24.0, 24.0)
    return 1.0 / (1.0 + math.exp(-bounded))


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _stddev(values: list[float]) -> float:
    if len(values) <= 1:
        return 0.0
    avg = _mean(values)
    variance = sum((item - avg) ** 2 for item in values) / len(values)
    return math.sqrt(max(0.0, variance))


def _mode_multiplier(company_mode: str) -> float:
    normalized = normalize_company_mode(company_mode)
    if normalized == "google":
        return 0.94
    if normalized == "amazon":
        return 0.95
    if normalized == "meta":
        return 0.95
    return 1.0


def _extract_session_features(session_row: dict[str, Any]) -> dict[str, float]:
    summary = dict(session_row.get("summary") or {})
    score = _clamp(_safe_float(summary.get("score"), 0.0), 0.0, 100.0)
    ownership = _clamp(_safe_float(summary.get("ownership_clarity_score"), 0.0), 0.0, 100.0)
    metric_usage = _clamp(_safe_float(summary.get("metric_usage_score"), 0.0), 0.0, 100.0)
    metric_inflation_flags = max(0.0, _safe_float(summary.get("metric_inflation_flags"), 0.0))
    tradeoff_depth = _clamp(_safe_float(summary.get("tradeoff_depth_score"), 0.0), 0.0, 100.0)
    contradictions = max(0.0, _safe_float(summary.get("contradictions_detected"), 0.0))
    drift_frequency = _clamp(_safe_float(summary.get("drift_frequency"), 0.0), 0.0, 1.0)
    confidence_drop_moments = max(0.0, _safe_float(summary.get("confidence_drop_moments"), 0.0))
    assist_spikes = max(0.0, _safe_float(summary.get("assist_high_severity_spikes"), 0.0))

    credibility_index = _clamp((score * 0.65) + (ownership * 0.35), 0.0, 100.0)
    structure_star_score = _clamp((ownership * 0.55) + (tradeoff_depth * 0.45), 0.0, 100.0)
    pressure_stability = _clamp(100.0 - (confidence_drop_moments * 9.0) - (assist_spikes * 12.0), 0.0, 100.0)
    impact_density_score = metric_usage
    risk_drift_inverse = _clamp(100.0 - ((drift_frequency * 100.0) * 0.72) - (contradictions * 11.0), 0.0, 100.0)

    evidence_integrity_score = 100.0
    if metric_inflation_flags > 0:
        evidence_integrity_score -= min(40.0, metric_inflation_flags * 20.0)
    if metric_usage >= 78.0 and ownership <= 42.0:
        evidence_integrity_score -= 18.0
    evidence_integrity_score = _clamp(evidence_integrity_score, 0.0, 100.0)

    return {
        "credibility_index": credibility_index,
        "structure_star_score": structure_star_score,
        "pressure_stability": pressure_stability,
        "impact_density_score": impact_density_score,
        "risk_drift_inverse": risk_drift_inverse,
        "evidence_integrity_score": evidence_integrity_score,
        "contradictions": contradictions,
        "drift_frequency": drift_frequency,
    }


def compute_offer_probability(sessions: list[dict[str, Any]], company_mode: str) -> dict[str, Any]:
    rows = [item for item in sessions if isinstance(item, dict)]
    if not rows:
        return {
            "offer_probability": 42.0,
            "confidence_band": "low",
            "drivers_positive": ["Baseline interview readiness detected"],
            "drivers_negative": ["Need at least one completed session for calibrated estimate"],
            "delta_vs_last_session": 0.0,
            "what_to_fix_next": [
                "Complete one pressure round to initialize your probability baseline",
                "Use one measurable impact statement in each answer",
            ],
            "session_count": 0,
            "latest_session_id": None,
        }

    features = [_extract_session_features(item) for item in rows]
    score_series = [_clamp(_safe_float(dict(item.get("summary") or {}).get("score"), 0.0), 0.0, 100.0) for item in rows]

    consistency_raw = 100.0 - min(100.0, _stddev(score_series[-6:]) * 2.0)
    longitudinal_consistency = _clamp(consistency_raw, 0.0, 100.0)
    multiplier = _mode_multiplier(company_mode)

    probabilities: list[float] = []
    for feature in features:
        credibility = feature["credibility_index"] / 100.0
        structure = feature["structure_star_score"] / 100.0
        pressure = feature["pressure_stability"] / 100.0
        impact = feature["impact_density_score"] / 100.0
        consistency = longitudinal_consistency / 100.0
        risk_inverse = feature["risk_drift_inverse"] / 100.0
        evidence_integrity = feature["evidence_integrity_score"] / 100.0

        base_weighted = (
            (0.26 * credibility)
            + (0.18 * structure)
            + (0.16 * pressure)
            + (0.16 * impact)
            + (0.12 * consistency)
            + (0.12 * risk_inverse)
        )

        contradiction_penalty = min(0.22, feature["contradictions"] * 0.03)
        severe_drift_penalty = 0.08 if feature["drift_frequency"] >= 0.42 else 0.0

        integrity_penalty = min(0.06, (1.0 - evidence_integrity) * 0.06)

        calibrated = max(0.0, (base_weighted - contradiction_penalty - severe_drift_penalty - integrity_penalty) * multiplier)
        probability = _sigmoid((calibrated - 0.5) * 6.0) * 100.0

        if probabilities:
            previous = probabilities[-1]
            probability = _clamp(probability, previous - 8.0, previous + 8.0)

        probabilities.append(round(probability, 2))

    latest_probability = probabilities[-1]
    previous_probability = probabilities[-2] if len(probabilities) > 1 else latest_probability
    delta = round(latest_probability - previous_probability, 2)
    if len(probabilities) >= 3:
        recent = probabilities[-3:]
        velocity = round((recent[-1] - recent[0]) / 2.0, 2)
    else:
        velocity = round(delta, 2)

    latest = features[-1]
    feature_map = {
        "Credibility": latest["credibility_index"],
        "STAR Structure": latest["structure_star_score"],
        "Confidence Stability": latest["pressure_stability"],
        "Impact Strength": latest["impact_density_score"],
        "Risk Control": latest["risk_drift_inverse"],
        "Evidence Integrity": latest["evidence_integrity_score"],
    }

    positive = sorted(feature_map.items(), key=lambda item: item[1], reverse=True)[:3]
    negative = sorted(feature_map.items(), key=lambda item: item[1])[:3]

    positive_drivers = [f"{name} strong ({round(value, 1)}%)" for name, value in positive]
    negative_drivers = [f"{name} lagging ({round(value, 1)}%)" for name, value in negative]

    actions: list[str] = []
    for name, _value in negative:
        if name == "Impact Strength":
            actions.append("Add one measurable business outcome in your next answer")
        elif name == "STAR Structure":
            actions.append("Use explicit Context → Action → Result flow before reflection")
        elif name == "Confidence Stability":
            actions.append("Reduce mid-answer pivots and keep response under 140 words")
        elif name == "Risk Control":
            actions.append("Avoid unsupported claims and close contradiction gaps")
        elif name == "Evidence Integrity":
            actions.append("Replace extreme claims with verifiable metrics and concrete ownership detail")
        else:
            actions.append("Increase ownership clarity with first-person execution detail")

    deduped_actions: list[str] = []
    for action in actions:
        if action not in deduped_actions:
            deduped_actions.append(action)

    variability = _stddev(probabilities[-6:]) if probabilities else 0.0
    if len(probabilities) >= 8 and variability <= 6.0:
        confidence_band = "high"
    elif len(probabilities) >= 4 and variability <= 12.0:
        confidence_band = "medium"
    else:
        confidence_band = "low"

    latest_session = rows[-1]
    return {
        "offer_probability": round(latest_probability, 2),
        "confidence_band": confidence_band,
        "drivers_positive": positive_drivers,
        "drivers_negative": negative_drivers,
        "delta_vs_last_session": delta,
        "improvement_velocity_pp_per_session": velocity,
        "what_to_fix_next": deduped_actions[:2],
        "session_count": len(rows),
        "latest_session_id": str(latest_session.get("session_id") or "") or None,
    }


def reset_user_context(user_id: str) -> None:
    with _state_lock:
        user_context_by_user_id[user_id] = _empty_context()
        _persist_store()


_load_store()
