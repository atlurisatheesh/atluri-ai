"""
Jarvis AI Assistant routes — /api/jarvis prefix.

Conversational personal AI with long-term memory injection.
The client manages session history (sent in each request).
The backend injects relevant long-term memories from the memory service.

Endpoints:
  POST   /api/jarvis/chat    — Send message to Jarvis, get a reply
  DELETE /api/jarvis/memory  — Clear all long-term memories for the user
  GET    /api/jarvis/memory  — Get memory stats
"""

import asyncio
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.auth import get_user_id

logger = logging.getLogger("app.api.jarvis")
router = APIRouter(prefix="/api/jarvis", tags=["Jarvis"])

JARVIS_SYSTEM_PROMPT = (
    "You are Jarvis — a highly intelligent personal AI assistant, a fusion of "
    "Iron Man's Jarvis, Siri, and Alexa but far more capable. "
    "You help with anything: questions, coding, writing, creative tasks, planning, "
    "research, analysis, and everyday assistance.\n\n"
    "You have long-term memory of past conversations and naturally weave in relevant "
    "context when it helps. Be warm, concise, and genuinely useful. "
    "Avoid unnecessary filler. When the user mentions something important about themselves "
    "(preferences, goals, facts), remember it matters."
)

MEMORY_CONTEXT_HEADER = (
    "The following is context remembered from previous conversations with this user:\n"
)


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=8_000)


class JarvisChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4_000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=40)


async def _get_memory_context(db: AsyncSession, user_id: str) -> str:
    """Pull prioritized long-term memories for context injection."""
    try:
        from app.services.memory_service import get_session_context
        ctx = await get_session_context(db, uuid.UUID(user_id), max_chars=1500)
        return ctx
    except Exception as exc:
        logger.debug("Memory context unavailable: %s", exc)
        return ""


async def _auto_save_memory(
    db: AsyncSession,
    user_id: str,
    user_msg: str,
    assistant_reply: str,
) -> None:
    """Async-fire: capture the turn as a low-importance observation."""
    try:
        from app.services.memory_service import capture_observation
        content = f"User: {user_msg[:500]}\nJarvis: {assistant_reply[:500]}"
        await capture_observation(
            db,
            uuid.UUID(user_id),
            content,
            tags=["jarvis", "conversation"],
            importance=0.4,
        )
    except Exception as exc:
        logger.debug("Memory auto-capture skipped: %s", exc)


async def _call_ai(messages: list[dict[str, Any]]) -> str:
    """Call the AI model and return Jarvis's reply."""
    try:
        import os
        from openai import AsyncOpenAI
        from core.config import OPENAI_API_KEY

        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        resp = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.75,
                max_tokens=1200,
            ),
            timeout=25.0,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("Jarvis AI call failed: %s", exc)
        return (
            "I'm having trouble reaching my AI core right now. "
            "Please try again in a moment."
        )


@router.post("/chat")
async def jarvis_chat(
    req: JarvisChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Send a message to Jarvis and receive a reply with memory context."""
    user_id = get_user_id(request)

    memory_ctx = await _get_memory_context(db, user_id)

    # Build messages for the AI
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": JARVIS_SYSTEM_PROMPT},
    ]

    if memory_ctx:
        messages.append({
            "role": "system",
            "content": f"{MEMORY_CONTEXT_HEADER}{memory_ctx}",
        })

    # Inject conversation history (last 20 turns max)
    for turn in req.history[-20:]:
        messages.append({"role": turn.role, "content": turn.content})

    messages.append({"role": "user", "content": req.message})

    reply = await _call_ai(messages)

    # Fire-and-forget: persist this turn to long-term memory
    asyncio.create_task(
        _auto_save_memory(db, user_id, req.message, reply)
    )

    return {
        "reply": reply,
        "memory_active": bool(memory_ctx),
    }


@router.get("/memory")
async def get_memory_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return memory usage statistics for this user."""
    user_id = get_user_id(request)
    try:
        from app.services.memory_service import get_memory_stats
        stats = await get_memory_stats(db, uuid.UUID(user_id))
        return stats
    except Exception as exc:
        logger.warning("Memory stats unavailable: %s", exc)
        return {"total": 0, "by_type": {}}


@router.delete("/memory")
async def clear_memory(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Delete all long-term memories for this user."""
    user_id = get_user_id(request)
    try:
        from sqlalchemy import delete
        from app.db.models import UserMemory
        result = await db.execute(
            delete(UserMemory).where(
                UserMemory.user_id == uuid.UUID(user_id),
                UserMemory.tags.op("@>")('["jarvis"]'),
            )
        )
        await db.commit()
        deleted = result.rowcount or 0
        return {"deleted": deleted}
    except Exception as exc:
        logger.warning("Memory clear failed: %s", exc)
        return {"deleted": 0}
