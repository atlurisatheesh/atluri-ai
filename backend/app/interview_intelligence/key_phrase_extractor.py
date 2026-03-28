"""
Key Phrase Extractor — Extracts the single opening sentence a candidate
should say IMMEDIATELY when glancing at the AI output.
"""

from __future__ import annotations
import os
import json
import logging

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

_EXTRACT_PROMPT = """You are a key phrase extractor for a real-time interview copilot.

Given the AI-generated answer below, extract ONE powerful opening sentence (max 20 words) that the candidate can say IMMEDIATELY to start their response while reading the rest.

RULES:
- The sentence must sound natural when spoken aloud
- It must be confident and direct (no "I think maybe")
- It must anchor the answer's main point
- It must not start with "Sure" or "Great question"
- For STAR questions: lead with the result/outcome
- For technical questions: lead with the approach name
- For motivation questions: lead with the connection to the company

ANSWER TO EXTRACT FROM:
{answer}

QUESTION TYPE: {question_type}
FRAMEWORK: {framework}

Return ONLY valid JSON (no markdown):
{{"key_phrase": "The single opening sentence to say immediately", "follow_with": "What to expand on after the key phrase"}}"""


async def extract_key_phrase(
    answer_text: str,
    question_type: str = "general",
    framework: str = "STAR",
    openai_client=None,
) -> dict:
    """
    Extract the single most important opening sentence from an AI answer.
    Returns dict with key_phrase and follow_with.
    """
    if openai_client is None:
        try:
            import openai
            openai_client = openai.AsyncOpenAI()
        except Exception:
            return _heuristic_extract(answer_text)

    prompt = _EXTRACT_PROMPT.format(
        answer=answer_text[:800],
        question_type=question_type,
        framework=framework,
    )

    try:
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.3,
            max_tokens=150,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.warning(f"Key phrase LLM extraction failed: {e}")
        return _heuristic_extract(answer_text)


def _heuristic_extract(answer_text: str) -> dict:
    """Fast heuristic: grab first meaningful sentence."""
    lines = [l.strip() for l in answer_text.split("\n") if l.strip()]

    # Skip headers/bullets, find first sentence-like line
    for line in lines:
        clean = line.lstrip("•-*#► ").strip()
        if len(clean) > 15 and not clean.startswith(("Structure", "Framework", "Approach", "Note:")):
            # Truncate to first sentence
            for sep in [". ", "! ", "? "]:
                if sep in clean:
                    clean = clean[:clean.index(sep) + 1]
                    break
            if len(clean) > 120:
                clean = clean[:117] + "..."
            return {
                "key_phrase": clean,
                "follow_with": "Expand with specific details and metrics."
            }

    return {
        "key_phrase": answer_text[:100].strip(),
        "follow_with": "Provide concrete examples."
    }


def inject_key_phrase_into_response(response: dict, key_phrase_data: dict) -> dict:
    """Inject key phrase into the response payload for the frontend."""
    response["key_phrase"] = key_phrase_data.get("key_phrase", "")
    response["follow_with"] = key_phrase_data.get("follow_with", "")
    return response
