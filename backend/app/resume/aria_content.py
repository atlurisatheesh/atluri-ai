"""
ARIA Content Generation Engine.

Rules enforced:
  1. Iron Test — every sentence proves value, not describes responsibility
  2. C·A·M Bullet Architecture — Context + Action + Magnitude
  3. Metric Hierarchy — revenue > growth > scale > time > rank > scope
  4. Headline Intelligence — [Seniority] · [Domain] · [Proof]
  5. 4-Sentence Summary — who / problem / proof / value-for-THIS-role
  6. Language Immune System — 17 banned words auto-rejected
  7. Keyword Density Calibration — T1 3-5x, T2 1-2x
"""

import json
import logging
import os
from typing import Any

logger = logging.getLogger("aria.content")

BANNED_WORDS = {
    "passionate", "hardworking", "team player", "detail-oriented",
    "self-starter", "go-getter", "dynamic", "synergy", "leverage",
    "proactive", "results-driven", "innovative", "thought leader",
    "guru", "ninja", "rockstar", "driven",
}


async def _call_openai(system: str, user: str, temperature: float = 0.5) -> str:
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
        max_tokens=6000,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or "{}"


def _scan_banned_words(text: str) -> list[str]:
    """Return any banned buzzwords found in the text."""
    lower = text.lower()
    return [w for w in BANNED_WORDS if w in lower]


# ═══════════════════════════════════════════════════════════
# HEADLINE GENERATOR
# ═══════════════════════════════════════════════════════════
async def generate_headline(intake: dict) -> str:
    """Generate a powerful resume headline using ARIA rules."""
    system = """You are ARIA's Headline Generator.

Formula: [Seniority Signal] · [Domain Expertise] · [2-3 Proof Differentiators]

Rules:
- NEVER use: "seeking opportunities", "passionate", "results-driven"
- Include specific metrics or scale when available
- Max 2 lines, separated by ·

Return JSON: {"headline": "..."}"""

    cs = intake.get("candidate_signals", {})
    js = intake.get("job_signals", {})

    user_input = f"""Candidate:
- Peak moments: {json.dumps(cs.get('peak_moments', []))}
- Detected skills: {json.dumps(cs.get('detected_skills', [])[:10])}
- Roles: {json.dumps([r.get('title', '') + ' @ ' + r.get('company', '') for r in cs.get('detected_roles', [])[:3]])}
- Experience: {cs.get('experience_weight', 'unknown')}

Target role seniority: {js.get('seniority_fingerprint', 'unknown')}
Industry: {js.get('industry', 'unknown')}
Function: {js.get('role_function', 'unknown')}"""

    raw = await _call_openai(system, user_input)
    try:
        return json.loads(raw).get("headline", "")
    except json.JSONDecodeError:
        return ""


# ═══════════════════════════════════════════════════════════
# 4-SENTENCE SUMMARY BUILDER
# ═══════════════════════════════════════════════════════════
async def generate_summary(intake: dict, tone_mode: str = "corporate") -> str:
    """Generate the 4-Sentence Contract summary."""
    system = f"""You are ARIA's Summary Builder. Tone: {tone_mode}.

THE 4-SENTENCE CONTRACT:
Line 1: Who you are at maximum credibility (title + years + precise domain)
Line 2: The specific problem class you solve and your method
Line 3: Your single strongest quantified proof point
Line 4: The exact value you bring to THIS company and THIS role

Rules:
- NEVER use banned words: {', '.join(BANNED_WORDS)}
- Line 4 MUST reference the target company/role specifically
- If no JD provided, make Line 4 broadly applicable but never generic
- Maximum 4 sentences total. Tight, high-signal prose.

Return JSON: {{"summary": "the 4-sentence summary"}}"""

    cs = intake.get("candidate_signals", {})
    js = intake.get("job_signals", {})

    user_input = f"""Candidate signals:
{json.dumps(cs, indent=2, default=str)}

Job signals:
{json.dumps(js, indent=2, default=str)}

Target company: {intake.get('target_company', 'Not specified')}
Career situation: {intake.get('career_situation', 'standard')}"""

    raw = await _call_openai(system, user_input)
    try:
        return json.loads(raw).get("summary", "")
    except json.JSONDecodeError:
        return ""


# ═══════════════════════════════════════════════════════════
# C·A·M BULLET REWRITER
# ═══════════════════════════════════════════════════════════
async def rewrite_bullet_cam(bullet: str, context: dict | None = None) -> dict:
    """Rewrite a single bullet using C·A·M formula."""
    system = """You are ARIA's C·A·M Bullet Rewriter.

FORMULA: CONTEXT (where/what scale) + ACTION (what you specifically did) + MAGNITUDE (the delta)

Rules:
- NEVER write a bullet that only describes a duty without proving impact
- If no metric is available, ask for one in the 'metric_prompt' field
- Use power verbs: led, architected, drove, scaled, reduced, launched, etc.
- NEVER use: passionate, hardworking, team player, detail-oriented, synergy
- Keep to 1-2 lines maximum

METRIC HIERARCHY (use top available):
1. Revenue / cost ($, ARR, cost reduction)
2. Growth rates (%, YoY, QoQ)
3. Operational scale (users, req/sec, team size)
4. Time efficiency (hours saved, cycle reduction)
5. Rank or recognition (top X%, award)
6. Scope + stakes (if zero metrics: "across 14 markets")

Return JSON:
{
  "rewritten": "the CAM-formatted bullet",
  "context_component": "the C part",
  "action_component": "the A part",
  "magnitude_component": "the M part",
  "metric_prompt": "question to ask user if metric is missing, or null",
  "improvement_notes": "what was improved and why"
}"""

    ctx_str = ""
    if context:
        ctx_str = f"\nJob context: {json.dumps(context, default=str)}"

    raw = await _call_openai(system, f"Original bullet: \"{bullet}\"{ctx_str}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"rewritten": bullet, "metric_prompt": None, "improvement_notes": "Parse error"}


# ═══════════════════════════════════════════════════════════
# FULL RESUME GENERATION
# ═══════════════════════════════════════════════════════════
async def generate_full_resume(intake: dict, tone_mode: str = "corporate") -> dict[str, Any]:
    """Generate a complete resume from ARIA intake analysis."""
    system = f"""You are ARIA — the most sophisticated resume intelligence system. Tone: {tone_mode}.

Using the intake analysis provided, generate a COMPLETE, copy-paste-ready resume.

IRON TEST: Before finalizing every sentence, filter:
"Does this PROVE value with evidence, or merely DESCRIBE a responsibility?"
If it describes → rewrite. If it proves → keep.

BULLET ARCHITECTURE — C·A·M:
CONTEXT (where/what scale) + ACTION (what you did) + MAGNITUDE (the delta)

LANGUAGE IMMUNE SYSTEM — these words are auto-rejected:
{', '.join(BANNED_WORDS)}

KEYWORD DENSITY:
- Tier 1 keywords: appear 3-5x distributed across Summary, Experience, Skills
- Tier 2 keywords: appear 1-2x naturally — never stuffed

ATS COMPLIANCE:
- Section headers must be standard: Experience, Education, Skills, Summary, Certifications, Projects
- Dates: MMM YYYY – MMM YYYY format
- Acronyms: spell out on first use
- No tables or multi-column within a single section
- Contact info in main body, not header/footer

Return JSON:
{{
  "header": {{
    "name": "...",
    "headline": "...",
    "email": "...",
    "phone": "...",
    "linkedin": "...",
    "location": "...",
    "github": "..." or null,
    "portfolio": "..." or null
  }},
  "summary": "the 4-sentence summary",
  "experience": [
    {{
      "title": "...",
      "company": "...",
      "dates": "MMM YYYY – MMM YYYY",
      "location": "...",
      "bullets": ["C·A·M formatted bullets"]
    }}
  ],
  "skills": {{
    "technical": ["..."],
    "methodologies": ["..."],
    "tools": ["..."],
    "soft_skills": ["..."]
  }},
  "education": [
    {{
      "degree": "...",
      "school": "...",
      "year": "...",
      "honors": "..." or null
    }}
  ],
  "certifications": ["..."],
  "projects": [{{"name": "...", "description": "...", "tech": ["..."], "impact": "..."}}] or [],
  "personality_sections": {{}} or null,
  "keyword_placement": {{
    "tier1_locations": {{"keyword": ["section where placed"]}},
    "tier2_locations": {{"keyword": ["section where placed"]}}
  }}
}}"""

    user_input = f"""FULL ARIA INTAKE ANALYSIS:
{json.dumps(intake, indent=2, default=str)}

TONE MODE: {tone_mode}
FORMAT: {json.dumps(intake.get('format_intelligence', {}), indent=2)}
PERSONALITY: {json.dumps(intake.get('personality_layer', {}), indent=2)}"""

    raw = await _call_openai(system, user_input, temperature=0.5)
    try:
        resume = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Failed to parse generated resume JSON")
        return {"error": "Resume generation failed — JSON parse error"}

    # Post-processing: scan for banned words
    resume_str = json.dumps(resume)
    found_banned = _scan_banned_words(resume_str)
    if found_banned:
        resume["_warnings"] = {"banned_words_found": found_banned}
        logger.warning(f"Banned words slipped through: {found_banned}")

    return resume


# ═══════════════════════════════════════════════════════════
# PRECISION EDITS — Top 3 highest-ROI changes
# ═══════════════════════════════════════════════════════════
async def generate_precision_edits(intake: dict, generated_resume: dict) -> list[dict]:
    """Generate the 3 most impactful edits for this specific resume + job."""
    system = """You are ARIA's Precision Edit engine.

Identify the 3 changes with the HIGHEST ROI for this exact resume targeting this exact job.

NOT generic advice. Specific location + specific fix + expected impact.

Return JSON:
{
  "edits": [
    {
      "priority": 1,
      "section": "which section to edit",
      "current_text": "the exact current text to change",
      "suggested_text": "the improved version",
      "rationale": "why this change matters — be specific",
      "expected_impact": "what metric or outcome this improves"
    }
  ]
}"""

    user_input = f"""INTAKE:
{json.dumps(intake, indent=2, default=str)}

GENERATED RESUME:
{json.dumps(generated_resume, indent=2, default=str)}"""

    raw = await _call_openai(system, user_input)
    try:
        return json.loads(raw).get("edits", [])
    except json.JSONDecodeError:
        return []


# ═══════════════════════════════════════════════════════════
# KEYWORD MATCH MATRIX
# ═══════════════════════════════════════════════════════════
async def generate_keyword_matrix(intake: dict, generated_resume: dict) -> dict[str, Any]:
    """Generate keyword match table: JD keyword vs resume placement."""
    system = """You are ARIA's Keyword Match Analyzer.

Compare every Tier 1 and Tier 2 keyword from the JD against the generated resume.

Return JSON:
{
  "matrix": [
    {
      "keyword": "exact keyword",
      "tier": 1 or 2,
      "locations": ["Summary", "Experience bullet 2", "Skills"],
      "frequency": 3,
      "status": "matched" or "missing" or "weak"
    }
  ],
  "overall_match_pct": 0-100,
  "missing_critical": ["keywords that are Tier 1 but not in resume"],
  "suggestions": ["specific suggestions to improve match"]
}"""

    user_input = f"""JOB SIGNALS:
{json.dumps(intake.get('job_signals', {}), indent=2)}

GENERATED RESUME:
{json.dumps(generated_resume, indent=2, default=str)}"""

    raw = await _call_openai(system, user_input)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"matrix": [], "overall_match_pct": 0, "missing_critical": [], "suggestions": []}
