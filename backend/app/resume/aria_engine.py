"""
ARIA — Advanced Resume Intelligence Architect: 5-Pass Analysis Engine.

Runs the silent intelligence pipeline:
  Pass 1 — Job Signal Decode
  Pass 2 — Candidate Signal Decode
  Pass 3 — Gap Intelligence
  Pass 4 — Format Intelligence
  Pass 5 — Personality Layer Decision
"""

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger("aria.engine")

# ── Banned buzzwords (Language Immune System) ─────────────
BANNED_WORDS = {
    "passionate", "hardworking", "team player", "detail-oriented",
    "self-starter", "go-getter", "dynamic", "synergy", "leverage",
    "proactive", "results-driven", "innovative", "thought leader",
    "guru", "ninja", "rockstar", "driven",
}

# ── Power verbs for ATS ──────────────────────────────────
POWER_VERBS = {
    "led", "managed", "developed", "designed", "implemented", "architected",
    "optimized", "reduced", "increased", "delivered", "launched", "built",
    "mentored", "scaled", "automated", "streamlined", "pioneered", "achieved",
    "spearheaded", "transformed", "orchestrated", "accelerated", "negotiated",
    "restructured", "established", "drove", "directed", "supervised",
}

# ── ATS standard section headers ─────────────────────────
STANDARD_HEADERS = {
    "experience", "work experience", "professional experience",
    "education", "skills", "summary", "professional summary",
    "certifications", "projects", "awards", "achievements",
    "publications", "volunteer",
}


async def _call_openai(system: str, user: str, temperature: float = 0.4) -> str:
    """Call OpenAI GPT-4o and return the text response."""
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


# ═══════════════════════════════════════════════════════════
# PASS 1 — JOB SIGNAL DECODE
# ═══════════════════════════════════════════════════════════
async def pass1_job_signal_decode(job_description: str) -> dict[str, Any]:
    """Extract structured intelligence from a job description."""
    if not job_description or not job_description.strip():
        return {
            "tier1_keywords": [], "tier2_keywords": [],
            "seniority_fingerprint": "unknown",
            "company_dna": "unknown", "culture_signals": [],
            "hidden_requirements": [],
        }

    system = """You are ARIA's Job Signal Decoder. Analyze the job description and extract:

Return JSON with exactly these keys:
{
  "tier1_keywords": ["list of must-have, explicitly stated keywords/skills — match exact strings"],
  "tier2_keywords": ["list of preferred/inferred keywords — rephrase but preserve meaning"],
  "seniority_fingerprint": "one of: IC | Senior | Staff | Lead | Manager | Director | VP | C-Suite",
  "company_dna": "one of: startup_velocity | scaleup_chaos | enterprise_rigidity | agency_pace | unknown",
  "culture_signals": ["extracted culture-indicating phrases from the JD"],
  "hidden_requirements": ["skills/abilities implied by the JD but not explicitly stated"],
  "required_years": "integer or null",
  "industry": "primary industry",
  "role_function": "primary function (engineering, product, design, data, marketing, sales, etc.)"
}

Be precise. tier1 = explicitly required skills. tier2 = nice-to-have or implied."""

    raw = await _call_openai(system, f"Job Description:\n\n{job_description}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Pass 1 JSON parse failed, returning defaults")
        return {"tier1_keywords": [], "tier2_keywords": [], "seniority_fingerprint": "unknown",
                "company_dna": "unknown", "culture_signals": [], "hidden_requirements": []}


# ═══════════════════════════════════════════════════════════
# PASS 2 — CANDIDATE SIGNAL DECODE
# ═══════════════════════════════════════════════════════════
async def pass2_candidate_signal_decode(
    resume_text: str, current_title: str = "", years_experience: int = 0,
    career_situation: str = "standard"
) -> dict[str, Any]:
    """Extract structured intelligence from candidate's raw input."""
    system = """You are ARIA's Candidate Signal Decoder. Analyze the candidate's resume/input.

Return JSON:
{
  "peak_moments": ["top 3 highest-impact career events with brief descriptions"],
  "trajectory_type": "one of: linear_ascent | lateral_explorer | pivoting | re_entering | overqualified",
  "proof_gaps": ["achievements mentioned without quantified data — flag each one"],
  "hidden_strengths": ["skills demonstrated through stories but not explicitly named"],
  "experience_weight": "one of: 0-3yr | 4-7yr | 8-14yr | 15yr+",
  "detected_skills": ["all technical and soft skills found"],
  "detected_roles": [{"title": "...", "company": "...", "dates": "...", "bullets": ["..."]}],
  "detected_education": [{"school": "...", "degree": "...", "year": "..."}],
  "detected_certs": ["..."],
  "contact_info": {"name": "...", "email": "...", "phone": "...", "linkedin": "...", "location": "..."},
  "career_gaps": ["any gaps > 6 months with date ranges"],
  "overall_impression": "one sentence summary of candidate strength"
}

Be thorough. Extract everything possible. Flag every bullet that lacks metrics."""

    user_input = f"""Resume/Raw Input:
{resume_text}

Additional context:
- Current title: {current_title or 'Not provided'}
- Years experience: {years_experience or 'Not provided'}
- Career situation: {career_situation}"""

    raw = await _call_openai(system, user_input)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Pass 2 JSON parse failed")
        return {"peak_moments": [], "trajectory_type": "unknown", "proof_gaps": [],
                "hidden_strengths": [], "experience_weight": "unknown",
                "detected_skills": [], "detected_roles": [], "detected_education": [],
                "detected_certs": [], "contact_info": {}, "career_gaps": [],
                "overall_impression": "Unable to analyze"}


# ═══════════════════════════════════════════════════════════
# PASS 3 — GAP INTELLIGENCE
# ═══════════════════════════════════════════════════════════
async def pass3_gap_intelligence(
    job_signals: dict, candidate_signals: dict
) -> dict[str, Any]:
    """Cross-reference JD requirements vs candidate profile."""
    system = """You are ARIA's Gap Intelligence engine. Compare the job requirements against the candidate profile.

Return JSON:
{
  "hard_gaps": [
    {"skill": "...", "jd_requirement": "why JD needs it", "severity": "critical|moderate|minor",
     "remediation": "one of: acquire | reframe | acknowledge | bridge",
     "bridge_suggestion": "specific suggestion to close this gap"}
  ],
  "soft_gaps": [
    {"area": "...", "issue": "tone/framing mismatch description",
     "fix": "specific reframing suggestion"}
  ],
  "bridge_opportunities": [
    {"candidate_skill": "...", "jd_requirement": "...", "connection": "how they bridge"}
  ],
  "match_percentage": 0-100,
  "fabrication_risks": ["anything that cannot be truthfully claimed — flag it"],
  "overall_assessment": "one paragraph honest assessment"
}

Be honest. Never comfort-pad. If gaps are real, name them directly."""

    user_input = f"""JOB SIGNALS:
{json.dumps(job_signals, indent=2)}

CANDIDATE SIGNALS:
{json.dumps(candidate_signals, indent=2)}"""

    raw = await _call_openai(system, user_input)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"hard_gaps": [], "soft_gaps": [], "bridge_opportunities": [],
                "match_percentage": 0, "fabrication_risks": [], "overall_assessment": "Analysis failed"}


# ═══════════════════════════════════════════════════════════
# PASS 4 — FORMAT INTELLIGENCE
# ═══════════════════════════════════════════════════════════
def pass4_format_intelligence(
    candidate_signals: dict, career_situation: str = "standard"
) -> dict[str, Any]:
    """Select optimal resume architecture — runs locally, no LLM needed."""
    exp_weight = candidate_signals.get("experience_weight", "4-7yr")
    trajectory = candidate_signals.get("trajectory_type", "linear_ascent")

    # Decision matrix
    if exp_weight == "0-3yr":
        fmt = "skills_first"
        pages = 1
        structure = "Skills-first · Projects-heavy · Concise"
    elif exp_weight in ("4-7yr", "8-14yr") and trajectory == "pivoting":
        fmt = "hybrid_functional"
        pages = 2
        structure = "Hybrid functional · Transferable skills surface"
    elif exp_weight in ("4-7yr", "8-14yr"):
        fmt = "reverse_chronological"
        pages = 2 if exp_weight == "8-14yr" else 1
        structure = "Reverse-chronological · Achievement-led"
    elif trajectory == "pivoting":
        fmt = "executive_bridge"
        pages = 2
        structure = "Board-level value prop + Skills bridge"
    else:
        fmt = "executive_narrative"
        pages = 2
        structure = "Executive narrative · Scope-led"

    if career_situation == "gap" or any(candidate_signals.get("career_gaps", [])):
        structure += " · Gap contextualized upfront"

    # Section order
    if fmt == "skills_first":
        sections = ["header", "summary", "skills", "projects", "experience", "education", "certifications"]
    elif fmt == "hybrid_functional":
        sections = ["header", "summary", "core_competencies", "selected_achievements", "experience", "education", "certifications"]
    elif fmt == "executive_narrative":
        sections = ["header", "executive_summary", "key_achievements", "experience", "board_affiliations", "education", "certifications"]
    else:
        sections = ["header", "summary", "experience", "skills", "education", "certifications"]

    return {
        "format": fmt,
        "pages": pages,
        "structure": structure,
        "sections": sections,
        "career_situation_note": career_situation,
    }


# ═══════════════════════════════════════════════════════════
# PASS 5 — PERSONALITY LAYER DECISION
# ═══════════════════════════════════════════════════════════
def pass5_personality_layer(company_dna: str, company_culture: str = "") -> dict[str, Any]:
    """Decide whether to activate Enhancv-style personality sections."""
    creative_cultures = {"startup", "scaleup", "creative", "agency", "startup_velocity", "scaleup_chaos", "agency_pace"}
    suppress_cultures = {"enterprise", "banking", "legal", "government", "clinical", "enterprise_rigidity"}

    culture = (company_culture or company_dna or "").lower().replace(" ", "_")

    if culture in creative_cultures or any(c in culture for c in ["startup", "creative", "agency", "tech"]):
        return {
            "personality_active": True,
            "available_sections": [
                "life_philosophy", "what_drives_me", "signature_achievement_story",
                "books_that_shaped_me", "side_projects",
            ],
            "tone": "conversational_professional",
            "note": "Personality sections survive ATS and create human differentiation.",
        }
    elif culture in suppress_cultures or any(c in culture for c in ["enterprise", "bank", "legal", "govern"]):
        return {
            "personality_active": False,
            "available_sections": [],
            "tone": "formal_authoritative",
            "note": "Formality, precision, credentialed authority only.",
        }
    else:
        return {
            "personality_active": True,
            "available_sections": ["what_drives_me", "signature_achievement_story"],
            "tone": "balanced_professional",
            "note": "Light personality — keep it professional but human.",
        }


# ═══════════════════════════════════════════════════════════
# FULL INTAKE — Orchestrates all 5 passes
# ═══════════════════════════════════════════════════════════
async def run_full_intake(
    resume_text: str,
    job_description: str = "",
    current_title: str = "",
    years_experience: int = 0,
    career_situation: str = "standard",
    company_culture: str = "",
    target_company: str = "",
) -> dict[str, Any]:
    """Run the complete ARIA 5-pass analysis pipeline."""
    import asyncio

    # Pass 1 & 2 can run in parallel
    p1_task = pass1_job_signal_decode(job_description)
    p2_task = pass2_candidate_signal_decode(resume_text, current_title, years_experience, career_situation)

    job_signals, candidate_signals = await asyncio.gather(p1_task, p2_task)

    # Pass 3 depends on 1 & 2
    gap_intel = await pass3_gap_intelligence(job_signals, candidate_signals)

    # Pass 4 & 5 are local (no LLM)
    format_intel = pass4_format_intelligence(candidate_signals, career_situation)
    personality = pass5_personality_layer(
        job_signals.get("company_dna", ""),
        company_culture
    )

    return {
        "job_signals": job_signals,
        "candidate_signals": candidate_signals,
        "gap_intelligence": gap_intel,
        "format_intelligence": format_intel,
        "personality_layer": personality,
        "target_company": target_company,
        "career_situation": career_situation,
    }
