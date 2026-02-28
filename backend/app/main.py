from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, JSONResponse
import asyncio
import logging
import os
import sys
import io
import csv
import secrets
import time

from app.schemas import ChatRequest, OfferProbabilityResponse
from app.memory import clear_memory
from app.state import (
    get_assist_intensity,
    get_company_mode,
    get_context_status as get_user_context_status,
    compute_offer_probability,
    get_credibility_history,
    get_dashboard_overview,
    get_interview_history,
    get_user_snapshot,
    mark_interview_started,
    mark_interview_update,
    reset_user_context,
    set_assist_intensity,
    set_company_mode,
    set_job_description,
    set_resume_text,
)
from app.services.openai_service import get_ai_reply, stream_ai_reply
from app.resume.parser import parse_resume
from app.db.chat_repo import get_chat_history, save_message_async
from app.auth import get_user_id, get_user_id_async
from app.interview.engine import AIInterviewEngine
from app.interview.session import get_session
from app.session.registry import session_registry
from app.analytics.session_analytics_builder import build_session_analytics
from app.analytics.session_analytics_store import get_session_analytics, save_session_analytics, list_user_session_analytics, list_all_user_ids
from app.analytics.offer_probability_feedback_store import (
    save_offer_probability_feedback,
    get_offer_probability_feedback_summary,
)
from app.api.ws_voice import router as voice_ws_router
from app.api.credibility import router as credibility_router
from app.company_modes import list_company_modes
from app.system_metrics import set_metric, get_metrics_snapshot
from core.config import QA_MODE

app = FastAPI(title="AtluriIn AI – Phase 2")
logger = logging.getLogger("app.main")


def _get_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if not raw:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
    return [item.strip() for item in raw.split(",") if item.strip()]


_allowed_origins = _get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

interview_engine = AIInterviewEngine()
_share_tokens: dict[str, dict] = {}
SHARE_TOKEN_TTL_SEC = max(60, int(os.getenv("SHARE_TOKEN_TTL_SEC", "86400")))
RATE_LIMIT_ENABLED = str(os.getenv("RATE_LIMIT_ENABLED", "true")).strip().lower() in {"1", "true", "yes", "on"}
RATE_LIMIT_WINDOW_SEC = max(10, int(os.getenv("RATE_LIMIT_WINDOW_SEC", "60")))
RATE_LIMIT_MAX_REQUESTS = max(20, int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "300")))
_rate_limit_lock = asyncio.Lock()
_rate_limit_buckets: dict[str, dict[str, float]] = {}
SESSION_CLEANUP_TTL_SEC = max(60, int(os.getenv("SESSION_CLEANUP_TTL_SEC", "1800")))
SESSION_CLEANUP_INTERVAL_SEC = max(30, int(os.getenv("SESSION_CLEANUP_INTERVAL_SEC", "120")))
_session_cleanup_task: asyncio.Task | None = None


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _trend_direction(values: list[float]) -> str:
    if len(values) < 2:
        return "stable"
    delta = values[-1] - values[0]
    if delta >= 3:
        return "up"
    if delta <= -3:
        return "down"
    return "stable"


def _estimate_beta_percentile(own_offer_probability: float) -> tuple[float | None, int]:
    user_ids = list_all_user_ids()
    if not user_ids:
        return None, 0

    cohort_scores: list[float] = []
    for uid in user_ids:
        rows = list_user_session_analytics(uid, limit=40)
        if not rows:
            continue
        snapshot = compute_offer_probability(sessions=rows, company_mode="general")
        cohort_scores.append(_safe_float(snapshot.get("offer_probability"), 0.0))

    cohort_size = len(cohort_scores)
    if cohort_size < 5:
        return None, cohort_size

    less_or_equal = sum(1 for value in cohort_scores if value <= own_offer_probability)
    percentile = round((less_or_equal / cohort_size) * 100.0, 2)
    return percentile, cohort_size


def _prune_expired_share_tokens(now_ts: float | None = None) -> None:
    now_value = float(now_ts or time.time())
    expired_tokens = [
        token
        for token, metadata in list(_share_tokens.items())
        if float((metadata or {}).get("expires_at") or 0.0) <= now_value
    ]
    for token in expired_tokens:
        _share_tokens.pop(token, None)


def _share_token_counts() -> tuple[int, int]:
    now_ts = time.time()
    active = 0
    revoked = 0
    for metadata in list(_share_tokens.values()):
        if not isinstance(metadata, dict):
            continue
        is_revoked = bool(metadata.get("revoked"))
        expires_at = float(metadata.get("expires_at") or 0.0)
        if is_revoked:
            revoked += 1
            continue
        if expires_at <= now_ts:
            continue
        active += 1
    return active, revoked


def _refresh_share_token_metrics() -> None:
    active, revoked = _share_token_counts()
    set_metric("share_tokens_active", float(active))
    set_metric("share_tokens_revoked", float(revoked))


def _request_identity(request: Request) -> str:
    forwarded_for = str(request.headers.get("x-forwarded-for") or "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return str(request.client.host)
    return "unknown"


async def _is_rate_limited(identity: str, now_ts: float) -> tuple[bool, int]:
    async with _rate_limit_lock:
        bucket = _rate_limit_buckets.get(identity)
        if bucket is None:
            _rate_limit_buckets[identity] = {
                "window_start": now_ts,
                "count": 1,
            }
            return False, 0

        window_start = float(bucket.get("window_start") or now_ts)
        elapsed = now_ts - window_start
        if elapsed >= RATE_LIMIT_WINDOW_SEC:
            bucket["window_start"] = now_ts
            bucket["count"] = 1
            return False, 0

        count = int(bucket.get("count") or 0)
        if count >= RATE_LIMIT_MAX_REQUESTS:
            retry_after = max(1, int(RATE_LIMIT_WINDOW_SEC - elapsed))
            return True, retry_after

        bucket["count"] = count + 1

        if len(_rate_limit_buckets) > 10000:
            stale_keys = [
                key
                for key, value in _rate_limit_buckets.items()
                if now_ts - float((value or {}).get("window_start") or now_ts) > (RATE_LIMIT_WINDOW_SEC * 2)
            ]
            for key in stale_keys[:3000]:
                _rate_limit_buckets.pop(key, None)

        return False, 0


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not RATE_LIMIT_ENABLED:
        return await call_next(request)

    path = request.url.path
    if request.method == "OPTIONS" or path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi.json"):
        return await call_next(request)

    identity = _request_identity(request)
    blocked, retry_after = await _is_rate_limited(identity, time.time())
    if blocked:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded",
                "retry_after_sec": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )

    return await call_next(request)


@app.on_event("startup")
async def startup_banner():
    global _session_cleanup_task
    if QA_MODE:
        logger.info("[SYSTEM] QA_MODE ENABLED — Deepgram bypass active")
    logger.info("[SYSTEM] CORS allow_origins=%s", _allowed_origins)
    logger.info(
        "[SYSTEM] rate_limit enabled=%s window_sec=%s max_requests=%s",
        RATE_LIMIT_ENABLED,
        RATE_LIMIT_WINDOW_SEC,
        RATE_LIMIT_MAX_REQUESTS,
    )

    async def _session_cleanup_loop():
        while True:
            await asyncio.sleep(SESSION_CLEANUP_INTERVAL_SEC)
            removed = session_registry.cleanup_inactive(SESSION_CLEANUP_TTL_SEC)
            if removed > 0:
                logger.info("[SYSTEM] cleaned inactive sessions=%s", removed)

    _session_cleanup_task = asyncio.create_task(_session_cleanup_loop())


@app.on_event("shutdown")
async def shutdown_handler():
    global _session_cleanup_task
    if _session_cleanup_task is not None:
        _session_cleanup_task.cancel()
        try:
            await _session_cleanup_task
        except asyncio.CancelledError:
            pass
        finally:
            _session_cleanup_task = None
    logger.info("[SYSTEM] shutdown complete")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "backend"}


@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request):
    user_id = await get_user_id_async(request)
    company_mode = get_company_mode(user_id)
    reply = await get_ai_reply(req.message, user_id=user_id, company_mode=company_mode)

    await save_message_async(user_id, "user", req.message)
    await save_message_async(user_id, "assistant", reply)

    return {"reply": reply}


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    user_id = await get_user_id_async(request)
    company_mode = get_company_mode(user_id)
    return StreamingResponse(stream_ai_reply(req.message, user_id=user_id, company_mode=company_mode), media_type="text/plain")


@app.get("/api/chat/history")
def chat_history(request: Request, limit: int = 50):
    user_id = get_user_id(request)
    capped = max(1, min(int(limit or 50), 200))
    return {"items": get_chat_history(user_id, limit=capped)}


@app.post("/api/reset")
def reset_chat():
    clear_memory()
    return {"status": "cleared"}


@app.post("/api/resume/upload")
async def upload_resume(request: Request, file: UploadFile = File(...)):
    user_id = await get_user_id_async(request)
    try:
        content = await file.read()
        text = parse_resume(file.filename, content)
        set_resume_text(user_id, text)
        return {"status": "resume_loaded", "chars": len(text)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {exc}")


@app.post("/api/job/set")
async def set_job_description_route(request: Request, description: str = Form(...)):
    user_id = await get_user_id_async(request)
    set_job_description(user_id, description)
    return {"status": "job_description_set"}


@app.get("/api/context/status")
def get_context_status(request: Request):
    user_id = get_user_id(request)
    return get_user_context_status(user_id)


@app.get("/api/context/snapshot")
def get_context_snapshot(request: Request):
    user_id = get_user_id(request)
    return get_user_snapshot(user_id)


@app.get("/api/context/company-mode")
def get_context_company_mode(request: Request):
    user_id = get_user_id(request)
    return {"company_mode": get_company_mode(user_id)}


@app.get("/api/context/company-modes")
def get_context_company_modes(request: Request):
    get_user_id(request)
    return {"items": list_company_modes()}


@app.post("/api/context/company-mode")
def set_context_company_mode(payload: dict, request: Request):
    user_id = get_user_id(request)
    mode = set_company_mode(user_id, str(payload.get("company_mode") or "general"))
    return {"company_mode": mode}


@app.get("/api/assist/intensity")
def get_assist_intensity_route(request: Request):
    user_id = get_user_id(request)
    return {"level": get_assist_intensity(user_id)}


@app.post("/api/assist/intensity")
def set_assist_intensity_route(payload: dict, request: Request):
    user_id = get_user_id(request)
    level = set_assist_intensity(user_id, payload.get("level") or 2)
    return {"level": level}


@app.post("/api/context/reset")
def reset_context_status(request: Request):
    user_id = get_user_id(request)
    reset_user_context(user_id)
    return {"status": "context_reset"}


@app.post("/api/dev/seed-session-analytics")
def dev_seed_session_analytics(payload: dict, request: Request):
    # Deterministic QA helper (dev-only): allows seeding analytics snapshots without relying on LLM variability.
    env = str(os.getenv("ENV", "")).lower()
    if env not in {"development", "dev"} and not bool(QA_MODE):
        raise HTTPException(status_code=404, detail="Not Found")

    if str(request.headers.get("X-E2E-Seed", "")).lower() != "true":
        raise HTTPException(status_code=403, detail="Forbidden")

    user_id = get_user_id(request)
    items = payload.get("items")
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items must be a list")

    seeded = 0
    now_ts = time.time()
    for item in items:
        if not isinstance(item, dict):
            continue
        session_id = str(item.get("session_id") or "").strip()
        if not session_id:
            continue

        enriched = dict(item)
        enriched["session_id"] = session_id
        enriched.setdefault("role", "behavioral")
        enriched.setdefault("generated_at", now_ts)
        enriched["user_id"] = user_id

        save_session_analytics(session_id=session_id, payload=enriched, user_id=user_id)
        seeded += 1

    return {"seeded": seeded}


@app.post("/api/interview/start")
def start_interview(payload: dict, request: Request):
    user_id = get_user_id(request)
    role = str(payload.get("role") or "behavioral")
    company_mode = get_company_mode(user_id)
    session_id, question = interview_engine.start(user_id, role, company_mode=company_mode)
    mark_interview_started(user_id=user_id, session_id=session_id, role=role, question=question)
    return {
        "session_id": session_id,
        "question": question,
    }


@app.post("/api/interview/answer")
def submit_interview_answer(payload: dict, request: Request):
    user_id = get_user_id(request)
    session_id = str(payload.get("session_id") or "")
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Invalid interview session")
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = interview_engine.submit_answer(payload["session_id"], payload["answer"])
    mark_interview_update(user_id=user_id, session_id=session_id, payload=result)

    if bool(result.get("done", False)):
        try:
            analytics_payload = build_session_analytics(
                session_id=session_id,
                role=str(session.get("role") or ""),
                questions=list(session.get("questions") or []),
                answers=list(session.get("answers") or []),
                evaluations=list(session.get("evaluations") or []),
                final_decision=str(result.get("decision") or ""),
                final_score=result.get("score"),
            )
            save_session_analytics(session_id=session_id, payload=analytics_payload, user_id=user_id)
            result["analytics_ready"] = True
        except Exception as exc:
            logger.warning("Failed to build session analytics for %s: %s", session_id, exc)
            result["analytics_ready"] = False

    return result


@app.get("/api/session/{session_id}/analytics")
def get_session_analytics_route(session_id: str, request: Request):
    user_id = get_user_id(request)
    payload = get_session_analytics(session_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Session analytics not found")

    owner = str(payload.get("user_id") or "")
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    all_user_sessions = list_user_session_analytics(user_id, limit=120)
    target_generated_at = _safe_float(payload.get("generated_at"), 0.0)
    scoped_rows = [row for row in all_user_sessions if _safe_float(row.get("generated_at"), 0.0) <= target_generated_at]
    offer_snapshot = compute_offer_probability(sessions=scoped_rows, company_mode=get_company_mode(user_id))

    payload_with_offer = dict(payload)
    payload_with_offer["offer_probability_snapshot"] = offer_snapshot
    return payload_with_offer


@app.get("/api/user/progress")
def get_user_progress_route(request: Request, limit: int = 40):
    user_id = get_user_id(request)
    sessions = list_user_session_analytics(user_id, limit=limit)

    points = []
    metric_usage: list[float] = []
    ownership: list[float] = []
    contradictions: list[float] = []
    drift: list[float] = []
    pressure: list[float] = []

    for row in sessions:
        summary = dict(row.get("summary") or {})
        score = _safe_float(summary.get("score"), 0.0)
        metric_value = _safe_float(summary.get("metric_usage_score"), 0.0)
        ownership_value = _safe_float(summary.get("ownership_clarity_score"), 0.0)
        contradiction_value = _safe_float(summary.get("contradictions_detected"), 0.0)
        drift_value = _safe_float(summary.get("drift_frequency"), 0.0)
        pressure_value = _safe_float(summary.get("assist_high_severity_spikes"), 0.0)

        metric_usage.append(metric_value)
        ownership.append(ownership_value)
        contradictions.append(contradiction_value)
        drift.append(drift_value)
        pressure.append(pressure_value)

        points.append({
            "session_id": str(row.get("session_id") or ""),
            "generated_at": _safe_float(row.get("generated_at"), 0.0),
            "score": score,
            "metric_usage_score": metric_value,
            "ownership_clarity_score": ownership_value,
            "contradictions_detected": contradiction_value,
            "drift_frequency": drift_value,
            "pressure_response_signal": max(0.0, round(100.0 - min(100.0, pressure_value * 18.0), 2)),
        })

    return {
        "points": points,
        "summary": {
            "total_sessions": len(points),
            "latest_score": points[-1]["score"] if points else 0.0,
            "score_direction": _trend_direction([_safe_float(item.get("score"), 0.0) for item in points]),
            "metric_usage_direction": _trend_direction(metric_usage),
            "ownership_direction": _trend_direction(ownership),
            "contradiction_direction": _trend_direction([-value for value in contradictions]),
            "drift_direction": _trend_direction([-value * 100.0 for value in drift]),
            "pressure_response_direction": _trend_direction([max(0.0, 100.0 - (value * 18.0)) for value in pressure]),
        },
    }


@app.get("/api/user/offer-probability", response_model=OfferProbabilityResponse)
def get_offer_probability_route(request: Request, limit: int = 40):
    user_id = get_user_id(request)
    sessions = list_user_session_analytics(user_id, limit=limit)
    company_mode = get_company_mode(user_id)
    result = compute_offer_probability(sessions=sessions, company_mode=company_mode)

    offer_probability = _safe_float(result.get("offer_probability"), 0.0)
    session_count = int(result.get("session_count") or 0)
    delta = _safe_float(result.get("delta_vs_last_session"), 0.0)
    velocity = _safe_float(result.get("improvement_velocity_pp_per_session"), 0.0)

    percentile, cohort_size = _estimate_beta_percentile(offer_probability)

    if offer_probability >= 75 and abs(velocity) <= 1.2:
        plateau_note = "Plateau at high performance is normal; gains now come from precision and executive presence."
    elif offer_probability < 45 and session_count <= 2:
        plateau_note = "Early baseline phase; large jumps usually appear after focused repetition across 3+ sessions."
    else:
        plateau_note = None

    result["beta_percentile"] = percentile
    result["beta_cohort_size"] = cohort_size if cohort_size > 0 else None
    result["baseline_range_hint"] = "Most early users start between 35% and 55%."
    result["target_ladder"] = [
        "60% = competitive",
        "70% = strong",
        "80%+ = standout",
    ]
    result["plateau_note"] = plateau_note
    result["how_it_works"] = "Offer Probability combines credibility, STAR structure, impact evidence, pressure stability, and risk consistency into a deterministic score."
    return result


@app.post("/api/user/offer-probability/feedback")
def submit_offer_probability_feedback_route(payload: dict, request: Request):
    user_id = get_user_id(request)
    session_id = str(payload.get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    felt_accuracy = bool(payload.get("felt_accuracy", False))
    label = str(payload.get("label") or ("accurate" if felt_accuracy else "inaccurate")).strip().lower()
    confidence_band = str(payload.get("confidence_band") or "").strip().lower()
    note = str(payload.get("note") or "").strip()[:500]

    saved = save_offer_probability_feedback(
        user_id=user_id,
        payload={
            "session_id": session_id,
            "offer_probability": max(0.0, min(100.0, _safe_float(payload.get("offer_probability"), 0.0))),
            "confidence_band": confidence_band,
            "felt_accuracy": felt_accuracy,
            "label": label,
            "note": note,
            "created_at": time.time(),
        },
    )

    return {
        "status": "logged",
        "session_id": session_id,
        "felt_accuracy": felt_accuracy,
        "created_at": _safe_float(saved.get("created_at"), 0.0),
    }


@app.get("/api/user/offer-probability/feedback-summary")
def get_offer_probability_feedback_summary_route(request: Request, limit: int = 200):
    user_id = get_user_id(request)
    return get_offer_probability_feedback_summary(user_id=user_id, limit=limit)


@app.get("/api/session/{session_id}/export")
def export_session_report(session_id: str, request: Request, format: str = "json"):
    user_id = get_user_id(request)
    payload = get_session_analytics(session_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Session analytics not found")

    owner = str(payload.get("user_id") or "")
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    all_user_sessions = list_user_session_analytics(user_id, limit=120)
    company_mode = get_company_mode(user_id)
    session_rows = [row for row in all_user_sessions if str(row.get("session_id") or "") == str(session_id)]
    if session_rows:
        target_generated_at = _safe_float(session_rows[0].get("generated_at"), 0.0)
    else:
        target_generated_at = _safe_float(payload.get("generated_at"), 0.0)
    scoped_rows = [row for row in all_user_sessions if _safe_float(row.get("generated_at"), 0.0) <= target_generated_at]
    offer_snapshot = compute_offer_probability(sessions=scoped_rows, company_mode=company_mode)

    normalized = str(format or "json").strip().lower()
    if normalized == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "session_id",
            "generated_at",
            "score",
            "decision",
            "metric_usage_score",
            "ownership_clarity_score",
            "tradeoff_depth_score",
            "contradictions_detected",
            "drift_frequency",
            "speaking_time_ratio",
            "offer_probability",
            "offer_delta_vs_last_session",
            "offer_confidence_band",
            "drivers_negative",
            "what_to_fix_next",
        ])
        summary = dict(payload.get("summary") or {})
        writer.writerow([
            str(payload.get("session_id") or session_id),
            _safe_float(payload.get("generated_at"), 0.0),
            _safe_float(summary.get("score"), 0.0),
            str(summary.get("decision") or ""),
            _safe_float(summary.get("metric_usage_score"), 0.0),
            _safe_float(summary.get("ownership_clarity_score"), 0.0),
            _safe_float(summary.get("tradeoff_depth_score"), 0.0),
            _safe_float(summary.get("contradictions_detected"), 0.0),
            _safe_float(summary.get("drift_frequency"), 0.0),
            _safe_float(summary.get("speaking_time_ratio"), 0.0),
            _safe_float(offer_snapshot.get("offer_probability"), 0.0),
            _safe_float(offer_snapshot.get("delta_vs_last_session"), 0.0),
            str(offer_snapshot.get("confidence_band") or ""),
            " | ".join(list(offer_snapshot.get("drivers_negative") or [])[:3]),
            " | ".join(list(offer_snapshot.get("what_to_fix_next") or [])[:2]),
        ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=session_{session_id}_report.csv",
            },
        )

    payload_with_offer = dict(payload)
    payload_with_offer["offer_probability_snapshot"] = offer_snapshot
    return payload_with_offer


@app.post("/api/session/{session_id}/share")
def create_share_link(session_id: str, request: Request):
    user_id = get_user_id(request)
    payload = get_session_analytics(session_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Session analytics not found")

    owner = str(payload.get("user_id") or "")
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    _prune_expired_share_tokens()

    token = secrets.token_urlsafe(24)
    now_ts = time.time()
    expires_at = now_ts + float(SHARE_TOKEN_TTL_SEC)
    _share_tokens[token] = {
        "session_id": session_id,
        "user_id": user_id,
        "created_at": now_ts,
        "expires_at": expires_at,
        "revoked": False,
    }
    _refresh_share_token_metrics()
    return {
        "share_token": token,
        "share_path": f"/interview/public/{session_id}?share={token}",
        "public_api_path": f"/api/public/session/{session_id}/snapshot?token={token}",
        "expires_at": expires_at,
        "ttl_sec": SHARE_TOKEN_TTL_SEC,
    }


@app.post("/api/share/{session_id}/revoke")
def revoke_share_links(session_id: str, request: Request, payload: dict | None = None):
    user_id = get_user_id(request)
    analytics_payload = get_session_analytics(session_id)
    if not analytics_payload:
        raise HTTPException(status_code=404, detail="Session analytics not found")

    owner = str(analytics_payload.get("user_id") or "")
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    token_filter = str((payload or {}).get("token") or "").strip()
    revoked_count = 0
    now_ts = time.time()

    for token, metadata in list(_share_tokens.items()):
        if not isinstance(metadata, dict):
            continue
        if str(metadata.get("session_id") or "") != str(session_id):
            continue
        if str(metadata.get("user_id") or "") != str(user_id):
            continue
        if token_filter and token != token_filter:
            continue
        if bool(metadata.get("revoked")):
            continue
        metadata["revoked"] = True
        metadata["revoked_at"] = now_ts
        revoked_count += 1

    _refresh_share_token_metrics()

    return {
        "session_id": str(session_id),
        "revoked_count": revoked_count,
        "token_filtered": bool(token_filter),
    }


@app.get("/api/public/session/{session_id}/snapshot")
def get_public_session_snapshot(session_id: str, token: str | None = None):
    provided_token = str(token or "").strip()
    if not provided_token:
        raise HTTPException(status_code=403, detail="Missing share token")

    _prune_expired_share_tokens()
    _refresh_share_token_metrics()

    token_info = _share_tokens.get(provided_token)
    if not token_info or str(token_info.get("session_id") or "") != str(session_id):
        raise HTTPException(status_code=403, detail="Invalid share token")
    if bool(token_info.get("revoked")):
        raise HTTPException(status_code=403, detail="Revoked share token")
    if float(token_info.get("expires_at") or 0.0) <= time.time():
        _share_tokens.pop(provided_token, None)
        raise HTTPException(status_code=403, detail="Expired share token")

    payload = get_session_analytics(session_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Session analytics not found")

    owner_user_id = str(payload.get("user_id") or "")
    all_user_sessions = list_user_session_analytics(owner_user_id, limit=120) if owner_user_id else []
    session_rows = [row for row in all_user_sessions if str(row.get("session_id") or "") == str(session_id)]
    if session_rows:
        target_generated_at = _safe_float(session_rows[0].get("generated_at"), 0.0)
    else:
        target_generated_at = _safe_float(payload.get("generated_at"), 0.0)
    scoped_rows = [row for row in all_user_sessions if _safe_float(row.get("generated_at"), 0.0) <= target_generated_at]
    company_mode = get_company_mode(owner_user_id) if owner_user_id else "general"
    offer_snapshot = compute_offer_probability(sessions=scoped_rows, company_mode=company_mode)

    summary = dict(payload.get("summary") or {})
    return {
        "session_id": str(payload.get("session_id") or session_id),
        "role": str(payload.get("role") or ""),
        "generated_at": _safe_float(payload.get("generated_at"), 0.0),
        "summary": {
            "decision": str(summary.get("decision") or ""),
            "score": _safe_float(summary.get("score"), 0.0),
            "risk_flags": list(summary.get("risk_flags") or []),
            "strengths": list(summary.get("strengths") or []),
            "integrity_score": max(0.0, round(100.0 - (_safe_float(summary.get("contradictions_detected"), 0.0) * 18.0), 2)),
            "risk_explanation": "Risk and integrity indicators are inferred from contradictions, drift, confidence volatility, and assist severity spikes.",
            "offer_probability": _safe_float(offer_snapshot.get("offer_probability"), 0.0),
            "offer_delta_vs_last_session": _safe_float(offer_snapshot.get("delta_vs_last_session"), 0.0),
            "offer_confidence_band": str(offer_snapshot.get("confidence_band") or "low"),
            "drivers_negative": list(offer_snapshot.get("drivers_negative") or []),
            "what_to_fix_next": list(offer_snapshot.get("what_to_fix_next") or []),
        },
    }


@app.get("/api/history/interviews")
def interview_history(request: Request, limit: int = 20):
    user_id = get_user_id(request)
    return {"items": get_interview_history(user_id, limit=limit)}


@app.get("/api/history/credibility")
def credibility_history(request: Request, limit: int = 30):
    user_id = get_user_id(request)
    return {"items": get_credibility_history(user_id, limit=limit)}


@app.get("/api/dashboard/overview")
def dashboard_overview(request: Request):
    user_id = get_user_id(request)
    return get_dashboard_overview(user_id)


@app.get("/api/system/metrics")
def system_metrics_route(request: Request):
    get_user_id(request)
    _prune_expired_share_tokens()
    _refresh_share_token_metrics()
    return get_metrics_snapshot(extra={
        "share_token_ttl_sec": SHARE_TOKEN_TTL_SEC,
    })


@app.get("/api/system/pid")
def system_pid_route(request: Request):
    # Auth-gated: used by QA/load harness to pull coarse host-level RSS/CPU for this backend process.
    get_user_id(request)
    return {
        "pid": os.getpid(),
        "python": sys.version.split(" ")[0],
        "platform": sys.platform,
    }


app.include_router(voice_ws_router)
app.include_router(credibility_router)
