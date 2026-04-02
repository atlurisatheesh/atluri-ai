"""
═══════════════════════════════════════════════════════════════════════
  Memory Auto-Capture Hooks

  Automatically captures interview events into the persistent memory
  system. Called from AI routes and session lifecycle endpoints.

  Usage:
    from app.services.memory_hooks import auto_capture_ai_response, auto_capture_session_end

    # After AI responds to a question
    await auto_capture_ai_response(db, user_id, session_id, question, answer, score)

    # When a session ends
    await auto_capture_session_end(db, user_id, session_id, title, duration, score)
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("memory_hooks")


async def auto_capture_ai_response(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    session_id: str | uuid.UUID | None,
    question: str,
    answer: str,
    *,
    score: float | None = None,
    model_used: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Capture an AI interview Q&A exchange as a memory observation."""
    try:
        from app.services.memory_service import capture_observation

        uid = uuid.UUID(str(user_id))
        sid = uuid.UUID(str(session_id)) if session_id else None

        # Build observation content
        parts = [f"Q: {question[:500]}"]
        if answer:
            parts.append(f"A: {answer[:500]}")
        if score is not None:
            parts.append(f"Score: {score}")
        content = "\n".join(parts)

        # Auto-tag based on content keywords
        tags = _auto_tag(question, answer)

        # Importance scales with score
        importance = 0.5
        if score is not None:
            if score >= 8.0:
                importance = 0.8  # great answers are worth remembering
            elif score <= 4.0:
                importance = 0.7  # weak answers are worth remembering for improvement

        extra = metadata or {}
        if model_used:
            extra["model"] = model_used

        await capture_observation(
            db,
            uid,
            content,
            session_id=sid,
            tags=tags,
            importance=importance,
            metadata=extra,
        )
    except Exception as exc:
        # Never let memory capture break the main flow
        logger.warning("auto_capture_ai_response failed: %s", exc)


async def auto_capture_session_end(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    session_id: str | uuid.UUID,
    *,
    session_title: str = "",
    duration_seconds: int | None = None,
    score: float | None = None,
) -> None:
    """Auto-generate session recap when an interview session ends."""
    try:
        from app.services.memory_service import (
            compress_observations,
            generate_session_recap,
        )

        uid = uuid.UUID(str(user_id))
        sid = uuid.UUID(str(session_id))

        # First, compress raw observations into a summary
        await compress_observations(db, uid, sid)

        # Then generate end-of-session recap
        await generate_session_recap(
            db, uid, sid,
            session_title=session_title,
            duration_seconds=duration_seconds,
            score=score,
        )
    except Exception as exc:
        logger.warning("auto_capture_session_end failed: %s", exc)


def _auto_tag(question: str, answer: str) -> list[str]:
    """Extract tags from Q&A content based on keyword matching."""
    text = f"{question} {answer}".lower()
    tags: list[str] = []

    tag_keywords = {
        "behavioral": ["tell me about", "describe a time", "give an example", "how did you handle",
                       "conflict", "challenge", "teamwork", "leadership"],
        "technical": ["algorithm", "data structure", "system design", "api", "database",
                      "architecture", "scalab", "performance", "coding"],
        "aws": ["aws", "lambda", "s3", "ec2", "dynamodb", "cloudfront"],
        "python": ["python", "django", "flask", "fastapi"],
        "react": ["react", "next.js", "nextjs", "component", "hook"],
        "sql": ["sql", "query", "database", "postgres", "mysql"],
        "leadership": ["lead", "manage", "team", "mentor", "delegate"],
        "communication": ["communicat", "present", "stakeholder", "explain"],
        "problem-solving": ["debug", "troubleshoot", "solve", "root cause", "investigate"],
        "system-design": ["system design", "microservice", "distributed", "scale", "load balanc"],
    }

    for tag, keywords in tag_keywords.items():
        if any(kw in text for kw in keywords):
            tags.append(tag)

    return tags[:5]  # cap at 5 tags
