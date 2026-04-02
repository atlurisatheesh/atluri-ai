"""
═══════════════════════════════════════════════════════════════════════
  Persistent Memory Service — inspired by claude-mem

  Captures interview observations, compresses them via LLM,
  and retrieves relevant context for future sessions.

  Architecture:
  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
  │  Capture     │──▶│  PostgreSQL   │──▶│  Retrieve/Search │
  │  (raw obs)   │   │  user_memories│   │  (ranked context)│
  └─────────────┘   └──────────────┘   └──────────────────┘
         │                                       │
         └──── Compress (LLM summary) ──────────┘

  Features:
  - Automatic observation capture from interview events
  - LLM-powered compression into semantic summaries
  - Keyword + recency + importance ranked retrieval
  - Session recap generation at session end
  - Progressive disclosure (index → detail)
  - Redis cache layer for hot memories
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select, func, delete, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserMemory, MemoryType

logger = logging.getLogger("memory_service")

# ─── Constants ───────────────────────────────────────────
MAX_CONTEXT_TOKENS_ESTIMATE = 2000   # rough char budget for context injection
MAX_MEMORIES_PER_QUERY = 20
SUMMARY_MAX_CHARS = 500
OBSERVATION_EXPIRY_DAYS = 90
SUMMARY_EXPIRY_DAYS = 365


# ─── Core CRUD ───────────────────────────────────────────

async def capture_observation(
    db: AsyncSession,
    user_id: uuid.UUID,
    content: str,
    *,
    session_id: uuid.UUID | None = None,
    tags: list[str] | None = None,
    importance: float = 0.5,
    metadata: dict[str, Any] | None = None,
) -> UserMemory:
    """Capture a raw observation from an interview or interaction."""
    mem = UserMemory(
        user_id=user_id,
        session_id=session_id,
        memory_type=MemoryType.observation.value,
        content=content[:10_000],  # cap raw content
        tags=tags or [],
        importance=max(0.0, min(1.0, importance)),
        metadata_json=metadata,
        expires_at=datetime.now(timezone.utc) + timedelta(days=OBSERVATION_EXPIRY_DAYS),
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    logger.debug("Captured observation %s for user %s", mem.id, user_id)
    return mem


async def store_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    content: str,
    compressed: str,
    *,
    session_id: uuid.UUID | None = None,
    tags: list[str] | None = None,
    importance: float = 0.7,
    metadata: dict[str, Any] | None = None,
) -> UserMemory:
    """Store an AI-compressed summary memory."""
    mem = UserMemory(
        user_id=user_id,
        session_id=session_id,
        memory_type=MemoryType.summary.value,
        content=content[:10_000],
        compressed=compressed[:SUMMARY_MAX_CHARS],
        tags=tags or [],
        importance=max(0.0, min(1.0, importance)),
        metadata_json=metadata,
        expires_at=datetime.now(timezone.utc) + timedelta(days=SUMMARY_EXPIRY_DAYS),
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    return mem


async def store_insight(
    db: AsyncSession,
    user_id: uuid.UUID,
    content: str,
    *,
    tags: list[str] | None = None,
    importance: float = 0.8,
    metadata: dict[str, Any] | None = None,
) -> UserMemory:
    """Store an extracted pattern/insight (high importance, no expiry)."""
    mem = UserMemory(
        user_id=user_id,
        memory_type=MemoryType.insight.value,
        content=content[:5_000],
        tags=tags or [],
        importance=max(0.0, min(1.0, importance)),
        metadata_json=metadata,
        expires_at=None,  # insights don't expire
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    return mem


async def store_session_recap(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    recap: str,
    compressed: str,
    *,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> UserMemory:
    """Store end-of-session digest."""
    mem = UserMemory(
        user_id=user_id,
        session_id=session_id,
        memory_type=MemoryType.session_recap.value,
        content=recap[:10_000],
        compressed=compressed[:SUMMARY_MAX_CHARS],
        tags=tags or [],
        importance=0.9,
        metadata_json=metadata,
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    return mem


# ─── Retrieval & Search ─────────────────────────────────

async def search_memories(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str = "",
    *,
    memory_type: str | None = None,
    tags_filter: list[str] | None = None,
    limit: int = MAX_MEMORIES_PER_QUERY,
    include_expired: bool = False,
) -> list[dict[str, Any]]:
    """Search user memories with keyword matching, ranked by importance + recency.

    Returns compact index entries (id, type, compressed/snippet, importance, created_at).
    Use get_memories_by_ids() to fetch full details — progressive disclosure pattern.
    """
    now = datetime.now(timezone.utc)
    stmt = select(UserMemory).where(UserMemory.user_id == user_id)

    if not include_expired:
        stmt = stmt.where(
            or_(UserMemory.expires_at.is_(None), UserMemory.expires_at > now)
        )

    if memory_type:
        stmt = stmt.where(UserMemory.memory_type == memory_type)

    # Keyword filter on content + compressed
    if query:
        like_pattern = f"%{query}%"
        stmt = stmt.where(
            or_(
                UserMemory.content.ilike(like_pattern),
                UserMemory.compressed.ilike(like_pattern),
            )
        )

    # Order by importance * recency_decay
    stmt = stmt.order_by(
        UserMemory.importance.desc(),
        UserMemory.created_at.desc(),
    ).limit(min(limit, MAX_MEMORIES_PER_QUERY))

    result = await db.execute(stmt)
    memories = result.scalars().all()

    # Tag filtering in Python (JSON column)
    if tags_filter:
        tag_set = set(t.lower() for t in tags_filter)
        memories = [
            m for m in memories
            if m.tags and tag_set.intersection(t.lower() for t in m.tags)
        ]

    return [_to_index_entry(m) for m in memories]


async def get_memories_by_ids(
    db: AsyncSession,
    user_id: uuid.UUID,
    memory_ids: list[uuid.UUID],
) -> list[dict[str, Any]]:
    """Fetch full memory details by IDs. Updates access_count."""
    if not memory_ids:
        return []

    now = datetime.now(timezone.utc)
    stmt = select(UserMemory).where(
        and_(
            UserMemory.user_id == user_id,
            UserMemory.id.in_(memory_ids),
        )
    )
    result = await db.execute(stmt)
    memories = result.scalars().all()

    # Bump access counters
    for m in memories:
        m.access_count += 1
        m.last_accessed = now
    await db.commit()

    return [_to_full_entry(m) for m in memories]


async def get_session_context(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    max_chars: int = MAX_CONTEXT_TOKENS_ESTIMATE,
) -> str:
    """Build a context string to inject into a new session.

    Prioritizes: insights > session_recaps > summaries > observations.
    Stops when char budget is exhausted.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        select(UserMemory)
        .where(
            UserMemory.user_id == user_id,
            or_(UserMemory.expires_at.is_(None), UserMemory.expires_at > now),
        )
        .order_by(
            # Custom priority: insight=4, session_recap=3, summary=2, observation=1
            func.case(
                (UserMemory.memory_type == MemoryType.insight.value, 4),
                (UserMemory.memory_type == MemoryType.session_recap.value, 3),
                (UserMemory.memory_type == MemoryType.summary.value, 2),
                else_=1,
            ).desc(),
            UserMemory.importance.desc(),
            UserMemory.created_at.desc(),
        )
        .limit(50)
    )
    result = await db.execute(stmt)
    memories = result.scalars().all()

    parts: list[str] = []
    budget = max_chars
    for m in memories:
        text = m.compressed or m.content[:200]
        entry = f"[{m.memory_type}] {text}"
        if len(entry) > budget:
            break
        parts.append(entry)
        budget -= len(entry)

    return "\n".join(parts) if parts else ""


async def get_timeline(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    around_id: uuid.UUID | None = None,
    around_time: datetime | None = None,
    window_minutes: int = 30,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Get chronological context around a specific memory or time."""
    stmt = select(UserMemory).where(UserMemory.user_id == user_id)

    if around_id:
        # Fetch the anchor memory first
        anchor_result = await db.execute(
            select(UserMemory).where(
                UserMemory.id == around_id, UserMemory.user_id == user_id
            )
        )
        anchor = anchor_result.scalar_one_or_none()
        if anchor:
            around_time = anchor.created_at

    if around_time:
        window = timedelta(minutes=window_minutes)
        stmt = stmt.where(
            UserMemory.created_at.between(around_time - window, around_time + window)
        )

    stmt = stmt.order_by(UserMemory.created_at.asc()).limit(limit)
    result = await db.execute(stmt)
    return [_to_index_entry(m) for m in result.scalars().all()]


# ─── Compression ─────────────────────────────────────────

async def compress_observations(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> UserMemory | None:
    """Compress raw observations for a session into a summary.

    Uses the LLM to generate a semantic summary of all observations
    from a given session, then stores it as a summary memory.
    """
    stmt = (
        select(UserMemory)
        .where(
            UserMemory.user_id == user_id,
            UserMemory.session_id == session_id,
            UserMemory.memory_type == MemoryType.observation.value,
        )
        .order_by(UserMemory.created_at.asc())
    )
    result = await db.execute(stmt)
    observations = result.scalars().all()

    if not observations:
        return None

    # Build text block for LLM compression
    raw_text = "\n---\n".join(o.content for o in observations)

    # Collect all tags
    all_tags: set[str] = set()
    for o in observations:
        if o.tags:
            all_tags.update(o.tags)

    compressed = await _llm_compress(raw_text)
    if not compressed:
        # Fallback: take first 500 chars of concatenated observations
        compressed = raw_text[:SUMMARY_MAX_CHARS]

    return await store_summary(
        db,
        user_id,
        content=raw_text[:10_000],
        compressed=compressed,
        session_id=session_id,
        tags=sorted(all_tags),
        metadata={"observation_count": len(observations)},
    )


async def generate_session_recap(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    *,
    session_title: str = "",
    duration_seconds: int | None = None,
    score: float | None = None,
) -> UserMemory | None:
    """Generate end-of-session recap from all session memories."""
    stmt = (
        select(UserMemory)
        .where(
            UserMemory.user_id == user_id,
            UserMemory.session_id == session_id,
        )
        .order_by(UserMemory.created_at.asc())
    )
    result = await db.execute(stmt)
    memories = result.scalars().all()

    if not memories:
        return None

    raw_text = "\n---\n".join(
        f"[{m.memory_type}] {m.compressed or m.content[:300]}" for m in memories
    )

    recap_prompt = (
        f"Session: {session_title or 'Interview'}\n"
        f"Duration: {duration_seconds or 'unknown'}s | Score: {score or 'N/A'}\n\n"
        f"{raw_text}"
    )

    compressed = await _llm_compress(recap_prompt, style="recap")

    all_tags: set[str] = set()
    for m in memories:
        if m.tags:
            all_tags.update(m.tags)

    return await store_session_recap(
        db,
        user_id,
        session_id,
        recap=recap_prompt[:10_000],
        compressed=compressed or recap_prompt[:SUMMARY_MAX_CHARS],
        tags=sorted(all_tags),
        metadata={
            "memory_count": len(memories),
            "session_title": session_title,
            "score": score,
        },
    )


# ─── Cleanup ─────────────────────────────────────────────

async def cleanup_expired(db: AsyncSession) -> int:
    """Remove expired memories. Returns count deleted."""
    now = datetime.now(timezone.utc)
    stmt = delete(UserMemory).where(
        UserMemory.expires_at.isnot(None),
        UserMemory.expires_at < now,
    )
    result = await db.execute(stmt)
    await db.commit()
    count = result.rowcount or 0
    if count:
        logger.info("Cleaned up %d expired memories", count)
    return count


async def get_memory_stats(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> dict[str, Any]:
    """Return memory usage stats for a user."""
    stmt = (
        select(
            UserMemory.memory_type,
            func.count(UserMemory.id).label("count"),
        )
        .where(UserMemory.user_id == user_id)
        .group_by(UserMemory.memory_type)
    )
    result = await db.execute(stmt)
    rows = result.all()

    total_stmt = select(func.count(UserMemory.id)).where(UserMemory.user_id == user_id)
    total = (await db.execute(total_stmt)).scalar() or 0

    by_type = {row.memory_type: row.count for row in rows}
    return {
        "total": total,
        "by_type": by_type,
        "observations": by_type.get("observation", 0),
        "summaries": by_type.get("summary", 0),
        "insights": by_type.get("insight", 0),
        "session_recaps": by_type.get("session_recap", 0),
    }


async def delete_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    memory_id: uuid.UUID,
) -> bool:
    """Delete a specific memory. Returns True if deleted."""
    stmt = delete(UserMemory).where(
        UserMemory.id == memory_id,
        UserMemory.user_id == user_id,
    )
    result = await db.execute(stmt)
    await db.commit()
    return (result.rowcount or 0) > 0


# ─── Private helpers ─────────────────────────────────────

def _to_index_entry(m: UserMemory) -> dict[str, Any]:
    """Compact index entry for progressive disclosure."""
    return {
        "id": str(m.id),
        "type": m.memory_type,
        "snippet": (m.compressed or m.content[:150]),
        "tags": m.tags or [],
        "importance": m.importance,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _to_full_entry(m: UserMemory) -> dict[str, Any]:
    """Full memory entry with all fields."""
    return {
        "id": str(m.id),
        "type": m.memory_type,
        "content": m.content,
        "compressed": m.compressed,
        "tags": m.tags or [],
        "importance": m.importance,
        "metadata": m.metadata_json,
        "access_count": m.access_count,
        "session_id": str(m.session_id) if m.session_id else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        "expires_at": m.expires_at.isoformat() if m.expires_at else None,
    }


async def _llm_compress(text: str, style: str = "summary") -> str | None:
    """Use the project's AI service to compress text.

    Falls back to truncation if LLM is unavailable.
    """
    try:
        from app.services.openai_service import get_ai_reply

        if style == "recap":
            system_prompt = (
                "You are a session memory compressor. Summarize the following interview "
                "session data into a concise recap (max 400 chars). Focus on: key questions asked, "
                "strengths shown, areas to improve, and notable moments. Be specific and actionable."
            )
        else:
            system_prompt = (
                "You are a memory compressor. Summarize the following observations into "
                "a concise semantic summary (max 400 chars). Preserve key facts, patterns, "
                "and actionable insights. Drop filler and redundancy."
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text[:8_000]},
        ]

        reply = await get_ai_reply(messages, user_id="system_memory_compress")
        if isinstance(reply, dict):
            return (reply.get("content") or reply.get("text") or "")[:SUMMARY_MAX_CHARS]
        return str(reply)[:SUMMARY_MAX_CHARS] if reply else None
    except Exception as exc:
        logger.warning("LLM compression failed, using truncation fallback: %s", exc)
        return text[:SUMMARY_MAX_CHARS]
