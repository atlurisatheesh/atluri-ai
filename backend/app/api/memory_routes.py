"""
Memory API routes — /api/memory prefix.

Persistent memory system inspired by claude-mem.
Provides capture, search, retrieval, compression, and context injection endpoints.

Endpoints:
  POST   /api/memory/capture        — Capture a new observation
  POST   /api/memory/search         — Search memories (returns compact index)
  POST   /api/memory/get            — Fetch full details by IDs
  GET    /api/memory/context         — Get session context injection string
  GET    /api/memory/timeline        — Chronological context around a memory
  POST   /api/memory/compress        — Compress session observations into summary
  POST   /api/memory/recap           — Generate end-of-session recap
  POST   /api/memory/insight         — Store a pattern/insight
  GET    /api/memory/stats           — Memory usage statistics
  DELETE /api/memory/{memory_id}     — Delete a specific memory
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.auth import get_user_id
from app.services.memory_service import (
    capture_observation,
    search_memories,
    get_memories_by_ids,
    get_session_context,
    get_timeline,
    compress_observations,
    generate_session_recap,
    store_insight,
    get_memory_stats,
    delete_memory,
    cleanup_expired,
)

logger = logging.getLogger("app.api.memory")
router = APIRouter(prefix="/api/memory", tags=["Memory"])


# ─── Request / Response Models ───────────────────────────

class CaptureRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10_000)
    session_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    metadata: dict | None = None


class SearchRequest(BaseModel):
    query: str = ""
    memory_type: str | None = None  # observation, summary, insight, session_recap
    tags: list[str] | None = None
    limit: int = Field(default=20, ge=1, le=50)
    include_expired: bool = False


class GetByIdsRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1, max_length=50)


class CompressRequest(BaseModel):
    session_id: str


class RecapRequest(BaseModel):
    session_id: str
    session_title: str = ""
    duration_seconds: int | None = None
    score: float | None = None


class InsightRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5_000)
    tags: list[str] = Field(default_factory=list)
    importance: float = Field(default=0.8, ge=0.0, le=1.0)
    metadata: dict | None = None


# ─── Endpoints ───────────────────────────────────────────

@router.post("/capture")
async def api_capture(
    req: CaptureRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Capture a raw observation into the memory system."""
    user_id = get_user_id(request)
    session_uuid = uuid.UUID(req.session_id) if req.session_id else None

    mem = await capture_observation(
        db,
        uuid.UUID(user_id),
        req.content,
        session_id=session_uuid,
        tags=req.tags,
        importance=req.importance,
        metadata=req.metadata,
    )
    return {
        "id": str(mem.id),
        "type": mem.memory_type,
        "created_at": mem.created_at.isoformat(),
    }


@router.post("/search")
async def api_search(
    req: SearchRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Search memories — returns compact index entries.

    Use /api/memory/get with IDs to fetch full details (progressive disclosure).
    """
    user_id = get_user_id(request)
    results = await search_memories(
        db,
        uuid.UUID(user_id),
        query=req.query,
        memory_type=req.memory_type,
        tags_filter=req.tags,
        limit=req.limit,
        include_expired=req.include_expired,
    )
    return {"results": results, "count": len(results)}


@router.post("/get")
async def api_get_by_ids(
    req: GetByIdsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Fetch full memory details by IDs."""
    user_id = get_user_id(request)
    memory_ids = [uuid.UUID(mid) for mid in req.ids]
    results = await get_memories_by_ids(db, uuid.UUID(user_id), memory_ids)
    return {"results": results, "count": len(results)}


@router.get("/context")
async def api_get_context(
    request: Request,
    db: AsyncSession = Depends(get_db),
    max_chars: int = 2000,
):
    """Get context string for injection into a new session.

    Returns ranked memories as a single text block, prioritizing
    insights > recaps > summaries > observations.
    """
    user_id = get_user_id(request)
    context = await get_session_context(
        db,
        uuid.UUID(user_id),
        max_chars=min(max_chars, 5000),
    )
    return {"context": context, "chars": len(context)}


@router.get("/timeline")
async def api_timeline(
    request: Request,
    db: AsyncSession = Depends(get_db),
    around_id: str | None = None,
    window_minutes: int = 30,
    limit: int = 20,
):
    """Get chronological context around a specific memory or time."""
    user_id = get_user_id(request)
    around_uuid = uuid.UUID(around_id) if around_id else None
    results = await get_timeline(
        db,
        uuid.UUID(user_id),
        around_id=around_uuid,
        window_minutes=max(5, min(window_minutes, 120)),
        limit=min(limit, 50),
    )
    return {"results": results, "count": len(results)}


@router.post("/compress")
async def api_compress(
    req: CompressRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Compress raw observations for a session into a summary."""
    user_id = get_user_id(request)
    mem = await compress_observations(
        db,
        uuid.UUID(user_id),
        uuid.UUID(req.session_id),
    )
    if not mem:
        raise HTTPException(status_code=404, detail="No observations found for session")
    return {
        "id": str(mem.id),
        "type": mem.memory_type,
        "compressed": mem.compressed,
        "created_at": mem.created_at.isoformat(),
    }


@router.post("/recap")
async def api_recap(
    req: RecapRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Generate end-of-session recap from all session memories."""
    user_id = get_user_id(request)
    mem = await generate_session_recap(
        db,
        uuid.UUID(user_id),
        uuid.UUID(req.session_id),
        session_title=req.session_title,
        duration_seconds=req.duration_seconds,
        score=req.score,
    )
    if not mem:
        raise HTTPException(status_code=404, detail="No memories found for session")
    return {
        "id": str(mem.id),
        "type": mem.memory_type,
        "compressed": mem.compressed,
        "created_at": mem.created_at.isoformat(),
    }


@router.post("/insight")
async def api_store_insight(
    req: InsightRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Store a pattern or insight (never expires)."""
    user_id = get_user_id(request)
    mem = await store_insight(
        db,
        uuid.UUID(user_id),
        req.content,
        tags=req.tags,
        importance=req.importance,
        metadata=req.metadata,
    )
    return {
        "id": str(mem.id),
        "type": mem.memory_type,
        "created_at": mem.created_at.isoformat(),
    }


@router.get("/stats")
async def api_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get memory usage statistics."""
    user_id = get_user_id(request)
    stats = await get_memory_stats(db, uuid.UUID(user_id))
    return stats


@router.delete("/{memory_id}")
async def api_delete_memory(
    memory_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific memory."""
    user_id = get_user_id(request)
    deleted = await delete_memory(db, uuid.UUID(user_id), uuid.UUID(memory_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": True, "id": memory_id}
