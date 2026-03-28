"""
ARIA ATS Platform Simulation Engine.

Simulates parsing behavior of 8 major ATS platforms:
  1. Workday       — Enterprise, strict parsing
  2. Greenhouse    — Modern, field-mapping
  3. Lever         — Startup-friendly, flexible
  4. Taleo         — Legacy Oracle, very strict
  5. iCIMS         — Mid-market, keyword heavy
  6. BambooHR      — SMB/mid-market, simple
  7. SmartRecruiters — AI-assisted, modern
  8. Jobvite       — Social-integrated, moderate

Each platform has unique parsing rules, failure modes, and scoring weights.
"""

import re
import json
import logging
from typing import Any

logger = logging.getLogger("aria.ats_platforms")


# ═══════════════════════════════════════════════════════════
# PLATFORM DEFINITIONS
# ═══════════════════════════════════════════════════════════

PLATFORMS: dict[str, dict[str, Any]] = {
    "workday": {
        "name": "Workday",
        "strictness": "very_high",
        "market": "Enterprise (Fortune 500)",
        "parsing_engine": "Proprietary OCR + NLP",
        "weights": {
            "contact_info": 12, "section_headers": 15, "date_format": 12,
            "no_tables": 10, "keyword_match": 18, "file_format": 8,
            "linear_structure": 10, "skills_section": 15,
        },
        "failure_modes": [
            "Rejects multi-column layouts entirely",
            "Strips all formatting from headers/footers",
            "Cannot parse text inside images or text boxes",
            "Date parsing fails without standard month abbreviations",
            "Custom section headers not recognized as parsable sections",
        ],
        "optimal_format": "Single-column, standard headers, .docx preferred",
    },
    "greenhouse": {
        "name": "Greenhouse",
        "strictness": "moderate",
        "market": "Tech/Startup (Series B+)",
        "parsing_engine": "Textkernel + custom NLP",
        "weights": {
            "contact_info": 10, "section_headers": 12, "date_format": 10,
            "no_tables": 8, "keyword_match": 20, "file_format": 10,
            "linear_structure": 12, "skills_section": 18,
        },
        "failure_modes": [
            "PDF with flattened text may lose structure",
            "Non-standard section names get miscategorized",
            "Skills parsed as freetext if not in dedicated section",
        ],
        "optimal_format": "Clean single-column, explicit skills section, .pdf or .docx",
    },
    "lever": {
        "name": "Lever",
        "strictness": "low",
        "market": "Tech Startups (Seed to Series C)",
        "parsing_engine": "Lever Nurture NLP",
        "weights": {
            "contact_info": 10, "section_headers": 10, "date_format": 8,
            "no_tables": 6, "keyword_match": 22, "file_format": 8,
            "linear_structure": 14, "skills_section": 22,
        },
        "failure_modes": [
            "Highly tolerant — most formats parse correctly",
            "May struggle with deeply nested bullet hierarchies",
            "Cloud-based: very large files (>5MB) may timeout",
        ],
        "optimal_format": "Any clean format, keyword-rich content preferred",
    },
    "taleo": {
        "name": "Taleo (Oracle)",
        "strictness": "very_high",
        "market": "Legacy Enterprise, Government",
        "parsing_engine": "Legacy Oracle parser",
        "weights": {
            "contact_info": 15, "section_headers": 18, "date_format": 15,
            "no_tables": 12, "keyword_match": 15, "file_format": 10,
            "linear_structure": 8, "skills_section": 7,
        },
        "failure_modes": [
            "EXTREMELY sensitive to formatting — any deviation fails",
            "Headers/footers completely stripped (contact info lost)",
            "Tables cause complete parsing failure",
            "Non-standard date formats rejected",
            "PDF often loses all structure — .doc/.docx required",
            'Special characters (—, •, ") may corrupt text',
        ],
        "optimal_format": "Single-column .docx, standard ASCII characters, no header/footer",
    },
    "icims": {
        "name": "iCIMS",
        "strictness": "high",
        "market": "Mid-Market to Enterprise",
        "parsing_engine": "iCIMS Talent Cloud NLP",
        "weights": {
            "contact_info": 10, "section_headers": 14, "date_format": 10,
            "no_tables": 10, "keyword_match": 22, "file_format": 8,
            "linear_structure": 10, "skills_section": 16,
        },
        "failure_modes": [
            "Keyword density heavily weighted — missing keywords = low rank",
            "Skills must be explicitly listed, not just mentioned in bullets",
            "Two-column layouts may merge columns incorrectly",
            "Non-standard section names lower parse confidence",
        ],
        "optimal_format": "Keyword-rich, explicit skills section, standard headers",
    },
    "bamboohr": {
        "name": "BambooHR",
        "strictness": "low",
        "market": "SMB/Mid-Market",
        "parsing_engine": "Basic text extraction",
        "weights": {
            "contact_info": 15, "section_headers": 10, "date_format": 8,
            "no_tables": 8, "keyword_match": 18, "file_format": 12,
            "linear_structure": 12, "skills_section": 17,
        },
        "failure_modes": [
            "Basic parser — relies more on manual review",
            "PDF text extraction may lose ordering",
            "Limited AI parsing — keywords must be explicit",
        ],
        "optimal_format": "Clean and simple, any standard format",
    },
    "smartrecruiters": {
        "name": "SmartRecruiters",
        "strictness": "moderate",
        "market": "Modern Enterprise",
        "parsing_engine": "SmartAssistant AI + Textkernel",
        "weights": {
            "contact_info": 10, "section_headers": 12, "date_format": 10,
            "no_tables": 8, "keyword_match": 20, "file_format": 8,
            "linear_structure": 14, "skills_section": 18,
        },
        "failure_modes": [
            "AI-assisted but still trips on creative layouts",
            "Skills scoring uses NLP inference — implicit mentions count partially",
            "Date gaps flagged automatically to recruiter",
        ],
        "optimal_format": "Modern single-column, rich keyword content, .pdf preferred",
    },
    "jobvite": {
        "name": "Jobvite",
        "strictness": "moderate",
        "market": "Mid-Market, Social-Integrated",
        "parsing_engine": "Jobvite NLP + social signals",
        "weights": {
            "contact_info": 12, "section_headers": 12, "date_format": 10,
            "no_tables": 8, "keyword_match": 18, "file_format": 8,
            "linear_structure": 14, "skills_section": 18,
        },
        "failure_modes": [
            "LinkedIn profile cross-referenced — inconsistencies flagged",
            "Social signals weighted in ranking",
            "Two-column layouts parsed but with reduced confidence",
        ],
        "optimal_format": "Standard format, ensure LinkedIn matches resume",
    },
}


# ═══════════════════════════════════════════════════════════
# PLATFORM-SPECIFIC SCORING
# ═══════════════════════════════════════════════════════════

def _check_contact(resume: dict) -> tuple[bool, str]:
    header = resume.get("header", {})
    has = sum(1 for k in ("name", "email", "phone", "linkedin") if header.get(k))
    return has >= 3, f"{has}/4 contact fields present"


def _check_section_headers(resume: dict) -> tuple[bool, str]:
    required = {"summary", "experience", "education", "skills"}
    found = set()
    for key in required:
        if resume.get(key):
            found.add(key)
    missing = required - found
    return len(missing) == 0, f"Found: {', '.join(sorted(found))}; Missing: {', '.join(sorted(missing)) or 'none'}"


def _check_dates(resume: dict) -> tuple[bool, str]:
    exps = resume.get("experience", [])
    if not exps:
        return False, "No experience entries"
    pattern = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}"
    good = sum(1 for e in exps if re.search(pattern, e.get("dates", ""), re.I))
    return good == len(exps), f"{good}/{len(exps)} dates properly formatted"


def _check_no_tables(resume: dict) -> tuple[bool, str]:
    return True, "Structured JSON — no tables detected"


def _check_keywords(resume: dict, job_signals: dict) -> tuple[float, str]:
    tier1 = job_signals.get("tier1_keywords", [])
    if not tier1:
        return 1.0, "No JD keywords to check"
    text = json.dumps(resume).lower()
    found = [kw for kw in tier1 if kw.lower() in text]
    pct = len(found) / len(tier1) if tier1 else 1.0
    return pct, f"{len(found)}/{len(tier1)} Tier 1 keywords matched ({pct*100:.0f}%)"


def _check_file_format() -> tuple[bool, str]:
    return True, "JSON/structured format — optimal for all platforms"


def _check_linear(resume: dict) -> tuple[bool, str]:
    sections = []
    for key in ("header", "summary", "experience", "skills", "education"):
        if resume.get(key):
            sections.append(key)
    return len(sections) >= 3, f"Sections: {' → '.join(sections)}"


def _check_skills(resume: dict) -> tuple[float, str]:
    skills = resume.get("skills", {})
    count = 0
    if isinstance(skills, dict):
        for v in skills.values():
            if isinstance(v, list):
                count += len(v)
    elif isinstance(skills, list):
        count = len(skills)
    pct = min(1.0, count / 10)
    return pct, f"{count} skills listed"


def score_for_platform(
    platform_key: str,
    resume: dict,
    job_signals: dict | None = None,
) -> dict[str, Any]:
    """Score a resume against a specific ATS platform's rules."""
    platform = PLATFORMS.get(platform_key)
    if not platform:
        return {"error": f"Unknown platform: {platform_key}"}

    job_signals = job_signals or {}
    weights = platform["weights"]
    max_score = sum(weights.values())

    checks = {}
    earned = 0.0

    # Contact info
    passed, detail = _check_contact(resume)
    score = weights["contact_info"] if passed else weights["contact_info"] * 0.3
    checks["contact_info"] = {"passed": passed, "detail": detail, "points": round(score, 1), "max": weights["contact_info"]}
    earned += score

    # Section headers
    passed, detail = _check_section_headers(resume)
    score = weights["section_headers"] if passed else weights["section_headers"] * 0.2
    checks["section_headers"] = {"passed": passed, "detail": detail, "points": round(score, 1), "max": weights["section_headers"]}
    earned += score

    # Date format
    passed, detail = _check_dates(resume)
    score = weights["date_format"] if passed else weights["date_format"] * 0.3
    checks["date_format"] = {"passed": passed, "detail": detail, "points": round(score, 1), "max": weights["date_format"]}
    earned += score

    # No tables
    passed, detail = _check_no_tables(resume)
    score = weights["no_tables"] if passed else 0
    checks["no_tables"] = {"passed": passed, "detail": detail, "points": round(score, 1), "max": weights["no_tables"]}
    earned += score

    # Keyword match (proportional)
    kw_pct, detail = _check_keywords(resume, job_signals)
    score = weights["keyword_match"] * kw_pct
    checks["keyword_match"] = {"passed": kw_pct >= 0.7, "detail": detail, "points": round(score, 1), "max": weights["keyword_match"]}
    earned += score

    # File format
    passed, detail = _check_file_format()
    score = weights["file_format"] if passed else 0
    checks["file_format"] = {"passed": passed, "detail": detail, "points": round(score, 1), "max": weights["file_format"]}
    earned += score

    # Linear structure
    passed, detail = _check_linear(resume)
    score = weights["linear_structure"] if passed else weights["linear_structure"] * 0.4
    checks["linear_structure"] = {"passed": passed, "detail": detail, "points": round(score, 1), "max": weights["linear_structure"]}
    earned += score

    # Skills section
    sk_pct, detail = _check_skills(resume)
    score = weights["skills_section"] * sk_pct
    checks["skills_section"] = {"passed": sk_pct >= 0.5, "detail": detail, "points": round(score, 1), "max": weights["skills_section"]}
    earned += score

    # Compute final score
    final_pct = round(earned / max_score * 100)

    # Platform-specific warnings
    warnings = []
    if platform_key == "taleo" and not checks["date_format"]["passed"]:
        warnings.append("CRITICAL: Taleo will reject non-standard date formats entirely")
    if platform_key == "workday" and not checks["section_headers"]["passed"]:
        warnings.append("CRITICAL: Workday cannot parse custom section headers")
    if platform_key == "icims" and not checks["keyword_match"]["passed"]:
        warnings.append("HIGH: iCIMS ranking is heavily keyword-driven — you'll rank low without matches")
    if platform_key == "jobvite":
        warnings.append("NOTE: Jobvite cross-references LinkedIn — ensure consistency")

    return {
        "platform": platform["name"],
        "platform_key": platform_key,
        "strictness": platform["strictness"],
        "market": platform["market"],
        "score": final_pct,
        "score_raw": round(earned, 1),
        "score_max": max_score,
        "grade": "A+" if final_pct >= 95 else "A" if final_pct >= 90 else "B+" if final_pct >= 85 else "B" if final_pct >= 80 else "C" if final_pct >= 70 else "D" if final_pct >= 60 else "F",
        "checks": checks,
        "warnings": warnings,
        "failure_modes": platform["failure_modes"],
        "optimal_format": platform["optimal_format"],
    }


# ═══════════════════════════════════════════════════════════
# FULL 8-PLATFORM SIMULATION
# ═══════════════════════════════════════════════════════════

def simulate_all_platforms(
    resume: dict,
    job_signals: dict | None = None,
) -> dict[str, Any]:
    """Run resume through all 8 ATS platforms and return comparative scores."""
    results = {}
    for key in PLATFORMS:
        results[key] = score_for_platform(key, resume, job_signals)

    # Summary stats
    scores = [r["score"] for r in results.values()]
    avg = round(sum(scores) / len(scores)) if scores else 0
    min_score = min(scores) if scores else 0
    max_score = max(scores) if scores else 0
    weakest = min(results.values(), key=lambda r: r["score"])
    strongest = max(results.values(), key=lambda r: r["score"])

    # Critical issues across all platforms
    critical_issues = []
    for r in results.values():
        for w in r.get("warnings", []):
            if w.startswith("CRITICAL"):
                critical_issues.append(f"{r['platform']}: {w}")

    return {
        "platforms": results,
        "summary": {
            "average_score": avg,
            "min_score": min_score,
            "max_score": max_score,
            "weakest_platform": weakest["platform"],
            "weakest_score": weakest["score"],
            "strongest_platform": strongest["platform"],
            "strongest_score": strongest["score"],
            "critical_issues": critical_issues,
            "all_passing": all(s >= 80 for s in scores),
            "platforms_passing": sum(1 for s in scores if s >= 80),
            "platforms_total": len(scores),
        },
        "recommendation": (
            "Your resume passes all 8 ATS platforms with 80%+. Ready to submit."
            if all(s >= 80 for s in scores)
            else f"Fix issues on {weakest['platform']} (score: {weakest['score']}%) before submitting to that platform type."
        ),
    }
