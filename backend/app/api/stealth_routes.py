"""
Stealth Telemetry API — v2.0
Tracks stealth health, threat detection, and platform compatibility
for the PhantomVeil overlay engine.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_user_id
from app.db.database import get_db
from app.plan_gates import require_feature

logger = logging.getLogger("app.api.stealth")
router = APIRouter(prefix="/api/stealth", tags=["Stealth Telemetry"])


# ─── Pydantic Models ──────────────────────────────────────────

class ThreatDetection(BaseModel):
    process_name: str
    category: str  # "proctoring" | "recording" | "remote_access" | "screen_capture"
    severity: str  # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    detected_at: str | None = None


class StealthHealthReport(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    threat_level: str  # "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    active_threats: list[ThreatDetection] = []
    layers_active: dict[str, bool] = {}
    uptime_seconds: float = 0
    platform: str = "unknown"


class StealthEventRequest(BaseModel):
    event_type: str  # "threat_detected" | "threat_cleared" | "evasion_triggered" | "health_check"
    threat_level: str | None = None
    details: dict[str, Any] = {}


class PlatformCompatibility(BaseModel):
    platform: str
    status: str  # "verified" | "untested" | "partial"
    stealth_features: list[str] = []
    notes: str = ""


# ─── Platform Compatibility Registry ──────────────────────────

PLATFORM_COMPATIBILITY: list[dict[str, Any]] = [
    {
        "platform": "Zoom",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "click_through", "ghost_typing"],
        "notes": "Full stealth verified on Zoom 6.x+",
    },
    {
        "platform": "Google Meet",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "click_through", "ghost_typing"],
        "notes": "Browser-based — anti-detection countermeasures active",
    },
    {
        "platform": "Microsoft Teams",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "click_through", "ghost_typing"],
        "notes": "Desktop + web versions supported",
    },
    {
        "platform": "HireVue",
        "status": "verified",
        "stealth_features": ["display_affinity", "anti_blur_detection", "visibility_block", "screen_enum_block"],
        "notes": "Proctoring detection + evasion active",
    },
    {
        "platform": "HackerRank",
        "status": "verified",
        "stealth_features": ["display_affinity", "anti_tab_switch", "clipboard_protection", "devtools_bypass"],
        "notes": "CodePair proctoring countermeasures enabled",
    },
    {
        "platform": "CoderPad",
        "status": "verified",
        "stealth_features": ["display_affinity", "click_through", "ghost_typing"],
        "notes": "No active proctoring — standard stealth sufficient",
    },
    {
        "platform": "Codility",
        "status": "verified",
        "stealth_features": ["display_affinity", "anti_tab_switch", "clipboard_protection"],
        "notes": "Tab-switch detection countermeasure active",
    },
    {
        "platform": "CodeSignal",
        "status": "verified",
        "stealth_features": ["display_affinity", "anti_tab_switch", "screen_enum_block"],
        "notes": "Proctoring mode countermeasures active",
    },
    {
        "platform": "ProctorU",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "proctoring_detection", "auto_evasion"],
        "notes": "Live proctor evasion — auto threat response enabled",
    },
    {
        "platform": "Respondus LockDown",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "proctoring_detection"],
        "notes": "Window-level cloaking bypasses LockDown browser checks",
    },
    {
        "platform": "Amazon Chime",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "click_through"],
        "notes": "Standard stealth sufficient",
    },
    {
        "platform": "Webex",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "click_through"],
        "notes": "Standard stealth sufficient",
    },
    {
        "platform": "Lark",
        "status": "untested",
        "stealth_features": ["display_affinity", "click_through"],
        "notes": "Expected compatible — architecture matches Zoom/Teams pattern",
    },
    {
        "platform": "Examity",
        "status": "verified",
        "stealth_features": ["display_affinity", "process_masking", "proctoring_detection", "auto_evasion"],
        "notes": "Live proctor + AI proctoring evasion",
    },
]


# ─── Endpoints ─────────────────────────────────────────────────

@router.post("/health")
async def report_stealth_health(
    report: StealthHealthReport,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _plan: dict = Depends(require_feature("stealth_mode")),
) -> dict[str, Any]:
    """Receive and store a stealth health report from the desktop client."""
    user_id = get_user_id(request)
    logger.info(
        "stealth_health user=%s score=%d threat=%s threats=%d",
        user_id,
        report.overall_score,
        report.threat_level,
        len(report.active_threats),
    )
    return {
        "status": "received",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "score": report.overall_score,
        "threat_level": report.threat_level,
    }


@router.post("/event")
async def log_stealth_event(
    event: StealthEventRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _plan: dict = Depends(require_feature("stealth_mode")),
) -> dict[str, Any]:
    """Log a stealth event (threat detection, evasion trigger, etc.)."""
    user_id = get_user_id(request)
    logger.info(
        "stealth_event user=%s type=%s level=%s",
        user_id,
        event.event_type,
        event.threat_level,
    )
    return {
        "status": "logged",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event.event_type,
    }


@router.get("/platforms")
async def get_platform_compatibility(request: Request) -> dict[str, Any]:
    """Return the full platform compatibility registry."""
    _ = get_user_id(request)
    return {
        "platforms": PLATFORM_COMPATIBILITY,
        "total": len(PLATFORM_COMPATIBILITY),
        "verified_count": sum(1 for p in PLATFORM_COMPATIBILITY if p["status"] == "verified"),
    }


@router.get("/platforms/{platform_name}")
async def get_platform_info(platform_name: str, request: Request) -> dict[str, Any]:
    """Return compatibility info for a specific platform."""
    _ = get_user_id(request)
    normalized = platform_name.lower().replace(" ", "").replace("-", "")
    for p in PLATFORM_COMPATIBILITY:
        if p["platform"].lower().replace(" ", "").replace("-", "") == normalized:
            return p
    raise HTTPException(status_code=404, detail=f"Platform '{platform_name}' not found")
