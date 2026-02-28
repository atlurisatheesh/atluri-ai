import os
import asyncio
import logging
from openai import AsyncOpenAI
from core.config import OPENAI_API_KEY

logger = logging.getLogger("app.ai_reasoning.llm")

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def call_llm(prompt: str, timeout_sec: float = 12.0, retries: int = 2) -> str:
    """
    Sends prompt to LLM and returns raw text response.
    MUST return JSON string (caller parses).
    """
    if not str(prompt or "").strip():
        return "{}"

    last_error: Exception | None = None
    for attempt in range(max(1, retries + 1)):
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=os.getenv("AI_REASONING_MODEL", "gpt-4o-mini"),
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a strict JSON generator. Output JSON only."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.4,
                ),
                timeout=timeout_sec,
            )
            message = response.choices[0].message.content
            return str(message or "{}").strip() or "{}"
        except asyncio.TimeoutError as exc:
            last_error = exc
            logger.warning("call_llm timeout | attempt=%s", attempt + 1)
        except Exception as exc:
            last_error = exc
            logger.warning("call_llm failure | attempt=%s err=%s", attempt + 1, exc)

        if attempt < retries:
            await asyncio.sleep(0.35 * (attempt + 1))

    logger.warning("call_llm fallback activated | err=%s", last_error)
    return "{}"
