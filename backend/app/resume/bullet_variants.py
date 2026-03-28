"""
ARIA Multi-Framework Bullet Variant Engine.

Generates 5 variants of a single bullet using different frameworks:
  1. C·A·M  — Context + Action + Magnitude (existing ARIA default)
  2. XYZ    — Accomplished [X] as measured by [Y], by doing [Z] (Google formula)
  3. CAR    — Challenge + Action + Result (problem-solver framing)
  4. SAI    — Situation + Action + Impact (STAR variant, concise)
  5. STAR   — Situation + Task + Action + Result (full behavioral)

Plus: Front-Loading Protocol — ensure the metric/number appears in the first 5 words.
"""

import json
import logging
import os
from typing import Any

logger = logging.getLogger("aria.bullet_variants")


FRAMEWORK_PROMPTS = {
    "cam": {
        "name": "C·A·M (Context · Action · Magnitude)",
        "formula": "CONTEXT (where/what scale) + ACTION (what you specifically did) + MAGNITUDE (the delta/metric)",
        "example": "Across a 200-node production cluster, re-architected the deployment pipeline, reducing release cycles from 2 weeks to 4 hours (95% reduction)",
        "best_for": "Technical roles, engineering, operations",
    },
    "xyz": {
        "name": "XYZ (Google Formula)",
        "formula": "Accomplished [X] as measured by [Y], by doing [Z]",
        "example": "Accomplished 40% reduction in customer churn as measured by quarterly retention analytics, by redesigning the onboarding flow from 12 steps to 4",
        "best_for": "Google, FAANG, data-driven companies",
    },
    "car": {
        "name": "CAR (Challenge · Action · Result)",
        "formula": "CHALLENGE (the problem/obstacle) + ACTION (what you did to solve it) + RESULT (quantified outcome)",
        "example": "Faced with a 3-month backlog of 200+ support tickets, built an automated triage system using NLP classification that resolved 65% of tickets without human intervention, saving $180K/year",
        "best_for": "Problem-solving roles, consulting, project management",
    },
    "sai": {
        "name": "SAI (Situation · Action · Impact)",
        "formula": "SITUATION (brief context) + ACTION (what you did) + IMPACT (business outcome)",
        "example": "When user acquisition stalled at 10K MAU, launched a referral program with gamified incentives that grew the user base to 85K MAU within 6 months",
        "best_for": "Marketing, sales, growth, product roles",
    },
    "star_concise": {
        "name": "STAR-Concise",
        "formula": "SITUATION + TASK (what was needed) + ACTION (what you did) + RESULT (outcome) — compressed to 1-2 lines",
        "example": "Tasked with reducing AWS costs amid rapid scaling (100K→500K users), audited and right-sized 340 instances using predictive load modeling, cutting monthly spend by $42K (28%)",
        "best_for": "Behavioral interview-ready, traditional corporate, executive roles",
    },
}


async def _call_openai(system: str, user: str, temperature: float = 0.6) -> str:
    """Call OpenAI for bullet variant generation."""
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
        max_tokens=3000,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or "{}"


def _front_load_check(bullet: str) -> dict[str, Any]:
    """Check if a bullet is front-loaded with a metric in the first 5 words."""
    words = bullet.split()[:5]
    has_metric = any(any(c.isdigit() for c in w) for w in words)
    has_dollar = any("$" in w for w in words)
    has_percent = any("%" in w for w in words)

    return {
        "is_front_loaded": has_metric or has_dollar or has_percent,
        "first_5_words": " ".join(words),
        "has_metric": has_metric,
        "suggestion": None if (has_metric or has_dollar or has_percent) else "Move the number/metric to the beginning of the bullet",
    }


async def generate_variants(
    bullet: str,
    context: dict | None = None,
    frameworks: list[str] | None = None,
) -> dict[str, Any]:
    """Generate bullet variants across multiple frameworks."""
    if not frameworks:
        frameworks = list(FRAMEWORK_PROMPTS.keys())

    # Build framework descriptions
    framework_specs = []
    for fw in frameworks:
        if fw in FRAMEWORK_PROMPTS:
            f = FRAMEWORK_PROMPTS[fw]
            framework_specs.append(
                f"### {f['name']}\nFormula: {f['formula']}\nExample: {f['example']}\nBest for: {f['best_for']}"
            )

    system = f"""You are ARIA's Multi-Framework Bullet Engine.

Given an original bullet point, rewrite it in EACH of these frameworks:

{chr(10).join(framework_specs)}

RULES:
- Each variant MUST contain at least one quantified metric
- If the original has no metric, infer a realistic one and flag it as "inferred"
- Front-load the metric: put the number within the first 5 words when possible
- Maximum 2 lines per bullet
- NEVER use: passionate, hardworking, team player, detail-oriented, results-driven
- Use power verbs only: led, architected, drove, scaled, reduced, launched, etc.

Return JSON:
{{
  "original": "the original bullet",
  "variants": {{
    "cam": {{
      "text": "rewritten bullet",
      "components": {{"context": "...", "action": "...", "magnitude": "..."}},
      "metric_used": "the primary metric",
      "metric_inferred": true/false,
      "front_loaded": true/false
    }},
    "xyz": {{
      "text": "rewritten bullet",
      "components": {{"x_accomplished": "...", "y_measured_by": "...", "z_by_doing": "..."}},
      "metric_used": "...",
      "metric_inferred": true/false,
      "front_loaded": true/false
    }},
    "car": {{
      "text": "rewritten bullet",
      "components": {{"challenge": "...", "action": "...", "result": "..."}},
      "metric_used": "...",
      "metric_inferred": true/false,
      "front_loaded": true/false
    }},
    "sai": {{
      "text": "rewritten bullet",
      "components": {{"situation": "...", "action": "...", "impact": "..."}},
      "metric_used": "...",
      "metric_inferred": true/false,
      "front_loaded": true/false
    }},
    "star_concise": {{
      "text": "rewritten bullet",
      "components": {{"situation": "...", "task": "...", "action": "...", "result": "..."}},
      "metric_used": "...",
      "metric_inferred": true/false,
      "front_loaded": true/false
    }}
  }},
  "best_variant": "which framework produced the strongest version",
  "best_reason": "why this variant is strongest for this context"
}}"""

    ctx_str = ""
    if context:
        ctx_str = f"\n\nJob context: {json.dumps(context, default=str)}"

    raw = await _call_openai(system, f"Original bullet: \"{bullet}\"{ctx_str}")
    try:
        result = json.loads(raw)
        # Add front-loading analysis
        for fw_key, variant in result.get("variants", {}).items():
            if isinstance(variant, dict) and variant.get("text"):
                variant["front_load_check"] = _front_load_check(variant["text"])
        return result
    except json.JSONDecodeError:
        return {"original": bullet, "error": "Variant generation failed"}


def get_framework_info() -> dict[str, Any]:
    """Return all available framework descriptions."""
    return {
        key: {
            "name": f["name"],
            "formula": f["formula"],
            "example": f["example"],
            "best_for": f["best_for"],
        }
        for key, f in FRAMEWORK_PROMPTS.items()
    }
