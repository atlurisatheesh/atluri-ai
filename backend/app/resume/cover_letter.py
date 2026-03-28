"""
ARIA Cover Letter Engine — 3 Variant System.

Variant 1 — Traditional (formal, structured, corporate)
Variant 2 — Story-Led (narrative hook, human connection)
Variant 3 — Cold Email (ultra-concise, direct outreach)

Each variant follows the Anti-Fluff Protocol:
  - No "I am writing to express my interest"
  - No "I believe I would be a great fit"
  - Evidence > Adjectives
  - Specificity > Generality
"""

import json
import logging
import os
from typing import Any

logger = logging.getLogger("aria.cover_letter")

BANNED_OPENERS = [
    "I am writing to express my interest",
    "I am excited to apply",
    "I believe I would be a great fit",
    "I am confident that",
    "To whom it may concern",
    "Dear Hiring Manager",  # Only banned as lazy default — we replace with actual name
    "With great enthusiasm",
    "I was thrilled to see",
]

BANNED_CLOSERS = [
    "I look forward to hearing from you",
    "Please do not hesitate to contact me",
    "Thank you for your time and consideration",
    "I eagerly await",
]


async def _call_openai(system: str, user: str, temperature: float = 0.6) -> str:
    """Call OpenAI GPT-4o for cover letter generation."""
    import openai
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or len(api_key) < 10:
        raise RuntimeError("OPENAI_API_KEY not configured")
    client = openai.AsyncOpenAI(api_key=api_key)
    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or "{}"


def _build_context(intake: dict, resume: dict | None = None) -> str:
    """Build context string from ARIA intake + resume."""
    cs = intake.get("candidate_signals", {})
    js = intake.get("job_signals", {})
    gi = intake.get("gap_intelligence", {})

    parts = [
        f"CANDIDATE SIGNALS:\n{json.dumps(cs, indent=2, default=str)}",
        f"\nJOB SIGNALS:\n{json.dumps(js, indent=2, default=str)}",
        f"\nGAP INTELLIGENCE:\n{json.dumps(gi, indent=2, default=str)}",
        f"\nTarget Company: {intake.get('target_company', 'Not specified')}",
        f"Career Situation: {intake.get('career_situation', 'standard')}",
    ]

    if resume:
        header = resume.get("header", {})
        parts.append(f"\nResume Name: {header.get('name', '')}")
        parts.append(f"Resume Headline: {header.get('headline', '')}")
        summary = resume.get("summary", "")
        if summary:
            parts.append(f"Resume Summary: {summary}")
        # Top experience bullets
        exps = resume.get("experience", [])
        if exps:
            top_bullets = []
            for exp in exps[:2]:
                for b in exp.get("bullets", [])[:2]:
                    top_bullets.append(b)
            parts.append(f"Top Achievements: {json.dumps(top_bullets)}")

    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════
# VARIANT 1 — TRADITIONAL COVER LETTER
# ═══════════════════════════════════════════════════════════
async def generate_traditional(intake: dict, resume: dict | None = None, hiring_manager: str = "") -> dict[str, Any]:
    """Generate a formal, structured cover letter."""
    system = f"""You are ARIA's Traditional Cover Letter Generator.

STRUCTURE (4 paragraphs, ~300 words total):
  P1 — HOOK: Open with your single most impressive metric or achievement relevant to THIS role.
        NOT "I am writing to express my interest." Start with proof.
  P2 — BRIDGE: Connect 2-3 of your strongest achievements to the company's specific needs.
        Name the company. Reference their product/mission/challenge.
  P3 — VALUE PROP: Address the #1 gap or concern a hiring manager might have.
        Proactively bridge it. Show self-awareness.
  P4 — CLOSE: Specific, confident. Name what you'll bring in the first 90 days.
        NOT "I look forward to hearing from you."

ANTI-FLUFF PROTOCOL:
- Every sentence must contain evidence, a metric, or a specific detail
- Zero adjective-only claims ("I am hardworking" → instead: "I shipped 3 features ahead of deadline")
- Company name MUST appear at least twice
- If hiring manager name provided, use it; otherwise "Dear [Company] Hiring Team"

BANNED OPENERS: {json.dumps(BANNED_OPENERS)}
BANNED CLOSERS: {json.dumps(BANNED_CLOSERS)}

{"Hiring Manager: " + hiring_manager if hiring_manager else "No hiring manager name provided — use 'Dear [Company] Hiring Team'"}

Return JSON:
{{
  "variant": "traditional",
  "salutation": "Dear ...",
  "paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3", "paragraph 4"],
  "closing": "closing line",
  "signature_name": "candidate name",
  "word_count": number,
  "confidence_score": 0-100,
  "key_achievements_used": ["list of achievements referenced"],
  "company_mentions": number
}}"""

    context = _build_context(intake, resume)
    raw = await _call_openai(system, context)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"variant": "traditional", "error": "Generation failed"}


# ═══════════════════════════════════════════════════════════
# VARIANT 2 — STORY-LED COVER LETTER
# ═══════════════════════════════════════════════════════════
async def generate_story(intake: dict, resume: dict | None = None, hiring_manager: str = "") -> dict[str, Any]:
    """Generate a narrative-driven cover letter with a story hook."""
    system = f"""You are ARIA's Story-Led Cover Letter Generator.

STRUCTURE (narrative arc, ~350 words):
  HOOK — Open with a specific moment, challenge, or turning point from your career.
         Make the reader curious. Drop them into a scene.
  STAKES — What was at risk? Why did this matter?
  ACTION — What did you do? Be specific. Use metrics.
  RESULT — What was the outcome? Quantify it.
  BRIDGE — "This is exactly why [Company]'s mission resonates with me..."
  CLOSE — Forward-looking, what you'll bring, how you'll contribute.

TONE: Professional but human. Conversational but not casual.
      Think: best LinkedIn post you've ever read, but in letter form.

ANTI-FLUFF PROTOCOL:
- The story MUST be real (derived from their resume/achievements)
- NO fabricated scenarios
- The story must connect to the target role's needs
- Company name appears 2-3 times

{"Hiring Manager: " + hiring_manager if hiring_manager else "No hiring manager name provided — use 'Dear [Company] Team'"}
BANNED OPENERS: {json.dumps(BANNED_OPENERS)}

Return JSON:
{{
  "variant": "story",
  "salutation": "Dear ...",
  "story_hook": "the opening narrative (2-3 sentences)",
  "body": "the main body connecting story to role (2-3 paragraphs)",
  "bridge": "the connection to this specific company",
  "closing": "forward-looking close",
  "signature_name": "candidate name",
  "word_count": number,
  "story_source": "which achievement/moment the story is based on",
  "emotional_arc": "curiosity → stakes → resolution → aspiration",
  "confidence_score": 0-100
}}"""

    context = _build_context(intake, resume)
    raw = await _call_openai(system, context)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"variant": "story", "error": "Generation failed"}


# ═══════════════════════════════════════════════════════════
# VARIANT 3 — COLD EMAIL
# ═══════════════════════════════════════════════════════════
async def generate_cold_email(intake: dict, resume: dict | None = None, recipient_name: str = "") -> dict[str, Any]:
    """Generate an ultra-concise cold outreach email."""
    system = f"""You are ARIA's Cold Email Generator.

STRUCTURE (ultra-concise, 80-120 words MAX):
  SUBJECT LINE — Specific, intriguing, NOT "Application for [Role]"
                 Pattern: "[Metric] + [Relevance to Company]"
  LINE 1 — One sentence: what you noticed about the company (shows research)
  LINE 2 — One sentence: your single most relevant achievement with a metric
  LINE 3 — One sentence: the specific value you'd bring
  CTA — Clear, low-friction ask. NOT "Can we schedule a call?"
        Better: "Happy to share a 2-minute case study of how I [did X]."

RULES:
- Maximum 120 words in the email body
- Subject line under 8 words
- NO attachments mentioned
- NO "I am writing to..."
- Reads like a human wrote it, not a template
- Mobile-optimized: short paragraphs, no walls of text

{"Recipient: " + recipient_name if recipient_name else "No recipient name — use 'Hi [First Name]' as placeholder"}

Return JSON:
{{
  "variant": "cold_email",
  "subject_line": "...",
  "greeting": "Hi ...",
  "body": "the email body (80-120 words)",
  "cta": "the call-to-action line",
  "signature_name": "candidate name",
  "word_count": number,
  "key_metric_used": "the metric referenced",
  "company_research_point": "what company detail was referenced",
  "confidence_score": 0-100
}}"""

    context = _build_context(intake, resume)
    raw = await _call_openai(system, context)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"variant": "cold_email", "error": "Generation failed"}


# ═══════════════════════════════════════════════════════════
# GENERATE ALL 3 VARIANTS
# ═══════════════════════════════════════════════════════════
async def generate_all_variants(
    intake: dict,
    resume: dict | None = None,
    hiring_manager: str = "",
) -> dict[str, Any]:
    """Generate all 3 cover letter variants in parallel."""
    import asyncio

    traditional, story, cold = await asyncio.gather(
        generate_traditional(intake, resume, hiring_manager),
        generate_story(intake, resume, hiring_manager),
        generate_cold_email(intake, resume, hiring_manager),
    )

    return {
        "traditional": traditional,
        "story": story,
        "cold_email": cold,
        "variants_generated": 3,
    }
