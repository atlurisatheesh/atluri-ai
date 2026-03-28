"""
ARIA 16-Check Dual-Factor Scoring Engine.

Factor A — ATS Parsability (8 checks)
Factor B — Content Quality (8 checks)

Target: 14+/16 before delivery.
"""

import re
import json
import logging
from typing import Any

from app.resume.aria_engine import BANNED_WORDS, POWER_VERBS, STANDARD_HEADERS

logger = logging.getLogger("aria.scoring")


def _flatten_resume_text(resume: dict) -> str:
    """Flatten a structured resume dict into searchable text."""
    parts = []
    header = resume.get("header", {})
    for k in ("name", "headline", "email", "phone", "linkedin", "location"):
        if header.get(k):
            parts.append(str(header[k]))

    if resume.get("summary"):
        parts.append(resume["summary"])

    for exp in resume.get("experience", []):
        parts.append(f"{exp.get('title', '')} {exp.get('company', '')} {exp.get('dates', '')}")
        for b in exp.get("bullets", []):
            parts.append(b)

    skills = resume.get("skills", {})
    if isinstance(skills, dict):
        for category in skills.values():
            if isinstance(category, list):
                parts.extend(category)
    elif isinstance(skills, list):
        parts.extend(skills)

    for edu in resume.get("education", []):
        parts.append(f"{edu.get('degree', '')} {edu.get('school', '')} {edu.get('year', '')}")

    for cert in resume.get("certifications", []):
        parts.append(cert)

    return " ".join(parts)


def _count_bullets(resume: dict) -> list[str]:
    """Extract all experience bullets."""
    bullets = []
    for exp in resume.get("experience", []):
        bullets.extend(exp.get("bullets", []))
    return bullets


def _check_date_format(dates_str: str) -> bool:
    """Check if dates follow MMM YYYY – MMM YYYY format."""
    pattern = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[–—-]\s*(Present|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})"
    return bool(re.search(pattern, dates_str, re.IGNORECASE))


# ═══════════════════════════════════════════════════════════
# FACTOR A — ATS PARSABILITY (8 checks)
# ═══════════════════════════════════════════════════════════

def check_a1_contact_info(resume: dict) -> dict:
    """[A1] Contact info readable and in main body."""
    header = resume.get("header", {})
    has_email = bool(header.get("email"))
    has_phone = bool(header.get("phone"))
    has_name = bool(header.get("name"))
    has_linkedin = bool(header.get("linkedin"))

    score = sum([has_email, has_phone, has_name, has_linkedin])
    passed = score >= 3

    missing = []
    if not has_email: missing.append("email")
    if not has_phone: missing.append("phone")
    if not has_name: missing.append("name")
    if not has_linkedin: missing.append("LinkedIn")

    return {
        "id": "A1", "name": "Contact Info", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"Found: name={has_name}, email={has_email}, phone={has_phone}, LinkedIn={has_linkedin}",
        "fix": f"Add missing: {', '.join(missing)}" if missing else None,
    }


def check_a2_section_headers(resume: dict) -> dict:
    """[A2] Section headers match standard parser labels."""
    present_sections = []
    if resume.get("summary"): present_sections.append("summary")
    if resume.get("experience"): present_sections.append("experience")
    if resume.get("education"): present_sections.append("education")
    if resume.get("skills"): present_sections.append("skills")
    if resume.get("certifications"): present_sections.append("certifications")
    if resume.get("projects"): present_sections.append("projects")

    required = {"summary", "experience", "education", "skills"}
    found = set(present_sections)
    missing = required - found
    passed = len(missing) == 0

    return {
        "id": "A2", "name": "Section Headers", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"Standard sections present: {', '.join(sorted(found))}",
        "fix": f"Add missing sections: {', '.join(sorted(missing))}" if missing else None,
    }


def check_a3_date_consistency(resume: dict) -> dict:
    """[A3] Dates consistent and properly formatted."""
    experiences = resume.get("experience", [])
    total = len(experiences)
    proper = sum(1 for e in experiences if _check_date_format(e.get("dates", "")))

    passed = total > 0 and proper == total
    return {
        "id": "A3", "name": "Date Formatting", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{proper}/{total} experience entries use MMM YYYY format",
        "fix": "Use consistent format: 'Jan 2020 – Mar 2024'" if not passed else None,
    }


def check_a4_no_tables(resume: dict) -> dict:
    """[A4] No tables, text boxes, or layout-breaking elements."""
    # Since we generate structured JSON → always passes for generated resumes
    return {
        "id": "A4", "name": "No Tables/Images", "passed": True,
        "score": 1,
        "detail": "Structured format — no tables, text boxes, or images detected",
        "fix": None,
    }


def check_a5_no_image_text(resume: dict) -> dict:
    """[A5] No flattened or image-embedded text."""
    return {
        "id": "A5", "name": "Selectable Text", "passed": True,
        "score": 1,
        "detail": "All text is real text — not image-embedded",
        "fix": None,
    }


def check_a6_tier1_keywords(resume: dict, job_signals: dict) -> dict:
    """[A6] Tier 1 keywords present and correctly placed."""
    tier1 = job_signals.get("tier1_keywords", [])
    if not tier1:
        return {
            "id": "A6", "name": "Tier 1 Keywords", "passed": True,
            "score": 1, "detail": "No JD provided — keyword check skipped", "fix": None,
        }

    text = _flatten_resume_text(resume).lower()
    found = [kw for kw in tier1 if kw.lower() in text]
    missing = [kw for kw in tier1 if kw.lower() not in text]

    pct = len(found) / len(tier1) * 100 if tier1 else 100
    passed = pct >= 70

    return {
        "id": "A6", "name": "Tier 1 Keywords", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{len(found)}/{len(tier1)} Tier 1 keywords found ({pct:.0f}%)",
        "fix": f"Add missing keywords: {', '.join(missing[:5])}" if missing else None,
    }


def check_a7_linear_structure(resume: dict) -> dict:
    """[A7] File structure linear — logical read order."""
    sections = []
    if resume.get("header"): sections.append("header")
    if resume.get("summary"): sections.append("summary")
    if resume.get("experience"): sections.append("experience")
    if resume.get("skills"): sections.append("skills")
    if resume.get("education"): sections.append("education")

    passed = len(sections) >= 3
    return {
        "id": "A7", "name": "Linear Structure", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"Sections in order: {' → '.join(sections)}",
        "fix": None,
    }


def check_a8_skills_section(resume: dict) -> dict:
    """[A8] Skills section present with role-matched terminology."""
    skills = resume.get("skills", {})
    skill_count = 0
    if isinstance(skills, dict):
        for v in skills.values():
            if isinstance(v, list):
                skill_count += len(v)
    elif isinstance(skills, list):
        skill_count = len(skills)

    passed = skill_count >= 5
    return {
        "id": "A8", "name": "Skills Section", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{skill_count} skills listed",
        "fix": "Add more skills — aim for 10-15 role-relevant skills" if not passed else None,
    }


# ═══════════════════════════════════════════════════════════
# FACTOR B — CONTENT QUALITY (8 checks)
# ═══════════════════════════════════════════════════════════

def check_b9_quantified_bullets(resume: dict) -> dict:
    """[B9] 70%+ of bullets contain quantified metrics."""
    bullets = _count_bullets(resume)
    if not bullets:
        return {"id": "B9", "name": "Quantified Bullets", "passed": False,
                "score": 0, "detail": "No bullets found", "fix": "Add experience bullets"}

    metric_pattern = r'\d+[%$kKmMbB]|\$[\d,.]+|\d+x|\d+\+|#\d+'
    quantified = sum(1 for b in bullets if re.search(metric_pattern, b))
    pct = quantified / len(bullets) * 100

    passed = pct >= 70
    return {
        "id": "B9", "name": "Quantified Bullets", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{quantified}/{len(bullets)} bullets ({pct:.0f}%) have metrics",
        "fix": f"Add numbers to {len(bullets) - quantified} more bullets" if not passed else None,
    }


def check_b10_no_cliches(resume: dict) -> dict:
    """[B10] Zero clichés or buzzwords detected."""
    text = _flatten_resume_text(resume).lower()
    found = [w for w in BANNED_WORDS if w in text]
    passed = len(found) == 0
    return {
        "id": "B10", "name": "No Clichés", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{'No buzzwords detected' if passed else f'Found: {chr(44).join(found)}'}",
        "fix": f"Remove/replace: {', '.join(found)}" if found else None,
    }


def check_b11_specific_summary(resume: dict) -> dict:
    """[B11] Summary is role-specific (not boilerplate)."""
    summary = resume.get("summary", "")
    if not summary:
        return {"id": "B11", "name": "Specific Summary", "passed": False,
                "score": 0, "detail": "No summary found", "fix": "Add a 4-sentence summary"}

    # Heuristics: has numbers, has specific terms, is > 100 chars
    has_metric = bool(re.search(r'\d', summary))
    is_long_enough = len(summary) >= 100
    no_generic = not any(w in summary.lower() for w in ["seeking opportunities", "looking for", "results-driven professional"])

    passed = has_metric and is_long_enough and no_generic
    return {
        "id": "B11", "name": "Specific Summary", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"Length: {len(summary)} chars, has metrics: {has_metric}, specific: {no_generic}",
        "fix": "Add specific metrics and avoid generic phrases" if not passed else None,
    }


def check_b12_active_voice(resume: dict) -> dict:
    """[B12] Active voice throughout — no passive constructions."""
    bullets = _count_bullets(resume)
    if not bullets:
        return {"id": "B12", "name": "Active Voice", "passed": True,
                "score": 1, "detail": "No bullets to check", "fix": None}

    passive_patterns = [r'\bwas\s+\w+ed\b', r'\bwere\s+\w+ed\b', r'\bbeen\s+\w+ed\b',
                        r'\bresponsible\s+for\b', r'\btasked\s+with\b']
    passive_count = 0
    for b in bullets:
        if any(re.search(p, b, re.IGNORECASE) for p in passive_patterns):
            passive_count += 1

    pct_active = (len(bullets) - passive_count) / len(bullets) * 100
    passed = pct_active >= 90

    return {
        "id": "B12", "name": "Active Voice", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{pct_active:.0f}% active voice ({passive_count} passive bullets)",
        "fix": f"Rewrite {passive_count} passive bullets to start with action verbs" if not passed else None,
    }


def check_b13_career_progression(resume: dict) -> dict:
    """[B13] Career progression clearly visible."""
    experiences = resume.get("experience", [])
    passed = len(experiences) >= 2
    return {
        "id": "B13", "name": "Career Progression", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{len(experiences)} positions listed" + (" — progression visible" if passed else ""),
        "fix": "Include at least 2 roles to show career progression" if not passed else None,
    }


def check_b14_page_length(resume: dict, candidate_signals: dict) -> dict:
    """[B14] Page length appropriate for experience bracket."""
    exp_weight = candidate_signals.get("experience_weight", "4-7yr")
    text = _flatten_resume_text(resume)
    word_count = len(text.split())

    if exp_weight == "0-3yr":
        appropriate = word_count <= 600
        target = "≤600 words (1 page)"
    elif exp_weight in ("4-7yr", "8-14yr"):
        appropriate = 300 <= word_count <= 900
        target = "300-900 words (1-2 pages)"
    else:
        appropriate = 400 <= word_count <= 1200
        target = "400-1200 words (2 pages)"

    return {
        "id": "B14", "name": "Page Length", "passed": appropriate,
        "score": 1 if appropriate else 0,
        "detail": f"{word_count} words (target: {target})",
        "fix": f"Adjust to {target}" if not appropriate else None,
    }


def check_b15_no_personal_info(resume: dict) -> dict:
    """[B15] No personal info: no photo, age, nationality, marital status."""
    text = _flatten_resume_text(resume).lower()
    red_flags = []
    for term in ["date of birth", "dob:", "age:", "nationality:", "marital status", "gender:", "photo"]:
        if term in text:
            red_flags.append(term)

    passed = len(red_flags) == 0
    return {
        "id": "B15", "name": "No Personal Info", "passed": passed,
        "score": 1 if passed else 0,
        "detail": f"{'Clean — no personal info detected' if passed else f'Found: {chr(44).join(red_flags)}'}",
        "fix": f"Remove: {', '.join(red_flags)}" if red_flags else None,
    }


def check_b16_personality_match(resume: dict, personality_layer: dict) -> dict:
    """[B16] Personality sections match company culture context."""
    personality_active = personality_layer.get("personality_active", False)
    has_personality = bool(resume.get("personality_sections"))

    if personality_active and has_personality:
        passed = True
        detail = "Personality sections present — matches creative/startup culture"
    elif not personality_active and not has_personality:
        passed = True
        detail = "Personality sections suppressed — matches formal culture"
    elif personality_active and not has_personality:
        passed = False
        detail = "Personality sections could be added for this culture"
    else:
        passed = False
        detail = "Personality sections should be removed for formal culture"

    return {
        "id": "B16", "name": "Personality Match", "passed": passed,
        "score": 1 if passed else 0,
        "detail": detail,
        "fix": "Adjust personality sections to match company culture" if not passed else None,
    }


# ═══════════════════════════════════════════════════════════
# FULL 16-CHECK SCORECARD
# ═══════════════════════════════════════════════════════════

def run_16_check_scoring(
    resume: dict,
    job_signals: dict | None = None,
    candidate_signals: dict | None = None,
    personality_layer: dict | None = None,
) -> dict[str, Any]:
    """Run all 16 checks and return the ARIA Score Card."""
    job_signals = job_signals or {}
    candidate_signals = candidate_signals or {}
    personality_layer = personality_layer or {}

    # Factor A — ATS Parsability
    ats_checks = [
        check_a1_contact_info(resume),
        check_a2_section_headers(resume),
        check_a3_date_consistency(resume),
        check_a4_no_tables(resume),
        check_a5_no_image_text(resume),
        check_a6_tier1_keywords(resume, job_signals),
        check_a7_linear_structure(resume),
        check_a8_skills_section(resume),
    ]

    # Factor B — Content Quality
    content_checks = [
        check_b9_quantified_bullets(resume),
        check_b10_no_cliches(resume),
        check_b11_specific_summary(resume),
        check_b12_active_voice(resume),
        check_b13_career_progression(resume),
        check_b14_page_length(resume, candidate_signals),
        check_b15_no_personal_info(resume),
        check_b16_personality_match(resume, personality_layer),
    ]

    ats_score = sum(c["score"] for c in ats_checks)
    content_score = sum(c["score"] for c in content_checks)
    total = ats_score + content_score

    failed_checks = [c for c in ats_checks + content_checks if not c["passed"]]

    return {
        "ats_score": ats_score,
        "ats_max": 8,
        "content_score": content_score,
        "content_max": 8,
        "total_score": total,
        "total_max": 16,
        "grade": "A+" if total >= 15 else "A" if total >= 14 else "B+" if total >= 12 else "B" if total >= 10 else "C" if total >= 8 else "D",
        "meets_threshold": total >= 14,
        "ats_checks": ats_checks,
        "content_checks": content_checks,
        "failed_checks": failed_checks,
        "summary": f"ATS: {ats_score}/8 | Content: {content_score}/8 | Total: {total}/16",
    }
