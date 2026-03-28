"""
ARIA Page Anatomy & Attention Zones Engine.

Implements the F-Pattern / Z-Pattern eye-tracking model for resume layout.

5 Attention Zones:
  Zone 1 — Header Bar (Top 15%) — First scan, highest attention
  Zone 2 — Left Rail (Left 30%) — F-pattern eye anchor
  Zone 3 — Body Core (Middle 40%) — Primary content area
  Zone 4 — Right Margin (Right 30%) — Secondary info area
  Zone 5 — Footer Zone (Bottom 15%) — Lowest attention, often skipped

Content placement is optimized based on impact score × zone weight.
"""

import logging
from typing import Any

logger = logging.getLogger("aria.page_anatomy")


# ═══════════════════════════════════════════════════════════
# ZONE DEFINITIONS
# ═══════════════════════════════════════════════════════════

ZONES = {
    "header_bar": {
        "name": "Header Bar",
        "zone_id": 1,
        "position": "Top 15%",
        "attention_weight": 1.0,  # Highest attention
        "scan_order": 1,
        "eye_pattern": "F-pattern primary horizontal scan",
        "optimal_content": ["name", "headline", "contact_info"],
        "max_items": 6,
        "notes": "First thing a recruiter sees — 6-second test happens here",
    },
    "left_rail": {
        "name": "Left Rail",
        "zone_id": 2,
        "position": "Left 30%",
        "attention_weight": 0.85,
        "scan_order": 2,
        "eye_pattern": "F-pattern vertical anchor — eyes return here after each horizontal scan",
        "optimal_content": ["section_headers", "job_titles", "company_names", "dates"],
        "max_items": 20,
        "notes": "Section headers and role titles MUST be left-aligned for F-pattern",
    },
    "body_core": {
        "name": "Body Core",
        "zone_id": 3,
        "position": "Middle 40%",
        "attention_weight": 0.70,
        "scan_order": 3,
        "eye_pattern": "Horizontal scan triggered by left-rail anchor",
        "optimal_content": ["achievement_bullets", "summary_text", "skill_descriptions"],
        "max_items": 30,
        "notes": "C·A·M bullets live here — front-load metrics to the left side of each bullet",
    },
    "right_margin": {
        "name": "Right Margin",
        "zone_id": 4,
        "position": "Right 30%",
        "attention_weight": 0.45,
        "scan_order": 4,
        "eye_pattern": "Occasional horizontal scan — decreasing attention",
        "optimal_content": ["skills_tags", "certifications", "languages", "tools"],
        "max_items": 15,
        "notes": "Good for scannable tags/pills — NOT for critical content",
    },
    "footer_zone": {
        "name": "Footer Zone",
        "zone_id": 5,
        "position": "Bottom 15%",
        "attention_weight": 0.25,
        "scan_order": 5,
        "eye_pattern": "Often skipped entirely on first pass",
        "optimal_content": ["education", "certifications", "volunteer", "references_note"],
        "max_items": 8,
        "notes": "Only place low-priority content here — recruiters spend <2 seconds on this zone",
    },
}


# ═══════════════════════════════════════════════════════════
# CONTENT IMPACT SCORING
# ═══════════════════════════════════════════════════════════

CONTENT_IMPACT: dict[str, float] = {
    # Highest impact — must be in Zone 1/2
    "name": 1.0,
    "headline": 0.95,
    "contact_info": 0.90,
    "summary": 0.88,
    # High impact — Zone 2/3
    "current_role_title": 0.85,
    "current_company": 0.82,
    "top_achievement_bullet": 0.80,
    "years_experience_signal": 0.78,
    # Medium impact — Zone 3
    "experience_bullets": 0.65,
    "skills_section": 0.60,
    "projects": 0.55,
    # Lower impact — Zone 4/5
    "education": 0.40,
    "certifications": 0.38,
    "languages": 0.30,
    "volunteer": 0.25,
    "awards": 0.35,
    "publications": 0.28,
    "hobbies": 0.10,
    "references": 0.05,
}


def compute_placement_score(content_type: str, zone_key: str) -> float:
    """Compute how well a content type fits in a given zone."""
    impact = CONTENT_IMPACT.get(content_type, 0.5)
    zone = ZONES.get(zone_key)
    if not zone:
        return 0.0

    # Best placement: high-impact content in high-attention zones
    attention = zone["attention_weight"]

    # Penalty for misplacement
    if impact >= 0.8 and attention < 0.5:
        # High-impact content in low-attention zone = bad
        return impact * attention * 0.5  # Penalized
    elif impact < 0.3 and attention >= 0.8:
        # Low-impact content hogging high-attention zone = wasteful
        return impact * attention * 0.6  # Penalized

    return impact * attention


# ═══════════════════════════════════════════════════════════
# SECTION PLACEMENT OPTIMIZER
# ═══════════════════════════════════════════════════════════

# Optimal zone assignment per section type (page format dependent)
PLACEMENT_RULES: dict[str, dict[str, Any]] = {
    "header": {
        "optimal_zone": "header_bar",
        "contents": ["name", "headline", "contact_info"],
        "rule": "Always Zone 1. Name must be largest text on page.",
        "front_load": True,
    },
    "summary": {
        "optimal_zone": "body_core",
        "contents": ["summary"],
        "rule": "Immediately below header. 4-sentence max. First sentence = strongest proof.",
        "front_load": True,
    },
    "experience": {
        "optimal_zone": "body_core",
        "contents": ["current_role_title", "current_company", "experience_bullets"],
        "rule": "Titles in left rail, bullets in body core. Front-load metrics.",
        "front_load": True,
    },
    "skills": {
        "optimal_zone": "right_margin",
        "alt_zone": "body_core",
        "contents": ["skills_section"],
        "rule": "Sidebar-ready. If single-column, place after experience.",
        "front_load": False,
    },
    "education": {
        "optimal_zone": "footer_zone",
        "contents": ["education"],
        "rule": "Bottom zone unless entry-level (then promote to Zone 3).",
        "front_load": False,
    },
    "certifications": {
        "optimal_zone": "footer_zone",
        "alt_zone": "right_margin",
        "contents": ["certifications"],
        "rule": "Bottom zone or sidebar. Move up if cert is a hard requirement.",
        "front_load": False,
    },
    "projects": {
        "optimal_zone": "body_core",
        "contents": ["projects"],
        "rule": "Zone 3. Promote higher if entry-level or career-pivot.",
        "front_load": False,
    },
    "awards": {
        "optimal_zone": "right_margin",
        "alt_zone": "footer_zone",
        "contents": ["awards"],
        "rule": "Sidebar or bottom. Promote if award directly relevant to role.",
        "front_load": False,
    },
    "volunteer": {
        "optimal_zone": "footer_zone",
        "contents": ["volunteer"],
        "rule": "Always bottom zone unless mission-driven company.",
        "front_load": False,
    },
    "publications": {
        "optimal_zone": "footer_zone",
        "contents": ["publications"],
        "rule": "Bottom zone. Promote only for academic/research roles.",
        "front_load": False,
    },
    "languages": {
        "optimal_zone": "right_margin",
        "contents": ["languages"],
        "rule": "Sidebar if multilingual. Omit if only native language.",
        "front_load": False,
    },
}


def analyze_page_anatomy(
    resume: dict,
    career_situation: str = "standard",
    seniority: str = "mid",
) -> dict[str, Any]:
    """Analyze a resume's content placement against optimal attention zone rules."""
    analysis = {
        "zones": {},
        "placement_issues": [],
        "optimization_suggestions": [],
        "attention_score": 0,
    }

    # Map resume sections to zones
    zone_assignments: dict[str, list[str]] = {k: [] for k in ZONES}

    # Header
    if resume.get("header"):
        zone_assignments["header_bar"].append("header")
    else:
        analysis["placement_issues"].append({
            "severity": "critical",
            "issue": "No header/contact section detected",
            "fix": "Add name, headline, email, phone, LinkedIn to the top",
        })

    # Summary
    if resume.get("summary"):
        zone_assignments["body_core"].append("summary")
        # Check if summary is front-loaded
        summary = resume["summary"]
        if summary and not any(c.isdigit() for c in summary[:50]):
            analysis["optimization_suggestions"].append({
                "section": "summary",
                "current_zone": "body_core",
                "suggestion": "Front-load your summary: put a metric or number in the first sentence",
                "impact": "high",
            })

    # Experience
    if resume.get("experience"):
        zone_assignments["body_core"].append("experience")
        exps = resume["experience"]
        if exps and len(exps) > 0:
            first_bullets = exps[0].get("bullets", [])
            if first_bullets:
                first_bullet = first_bullets[0]
                # Check front-loading: first 5 words should contain a metric or action verb
                words = first_bullet.split()[:5]
                has_metric = any(any(c.isdigit() for c in w) for w in words)
                if not has_metric:
                    analysis["optimization_suggestions"].append({
                        "section": "experience",
                        "current_zone": "body_core",
                        "suggestion": "Front-load bullets: lead with the metric/number, not the action verb",
                        "impact": "medium",
                    })

    # Skills
    if resume.get("skills"):
        zone_assignments["right_margin"].append("skills")

    # Education — promote for entry-level
    if resume.get("education"):
        if career_situation == "entry" or seniority in ("entry", "junior"):
            zone_assignments["body_core"].append("education")
            analysis["optimization_suggestions"].append({
                "section": "education",
                "current_zone": "body_core",
                "suggestion": "Education promoted to Zone 3 (body core) for entry-level candidates",
                "impact": "high",
            })
        else:
            zone_assignments["footer_zone"].append("education")

    # Certifications
    if resume.get("certifications"):
        zone_assignments["footer_zone"].append("certifications")

    # Projects
    if resume.get("projects"):
        if career_situation in ("entry", "pivot"):
            zone_assignments["body_core"].append("projects")
        else:
            zone_assignments["body_core"].append("projects")

    # Awards
    if resume.get("awards"):
        zone_assignments["right_margin"].append("awards")

    # Volunteer
    if resume.get("volunteer"):
        zone_assignments["footer_zone"].append("volunteer")

    # Publications
    if resume.get("publications"):
        zone_assignments["footer_zone"].append("publications")

    # Languages
    if resume.get("languages"):
        zone_assignments["right_margin"].append("languages")

    # Build zone details
    total_attention = 0.0
    for zone_key, zone_info in ZONES.items():
        assigned = zone_assignments.get(zone_key, [])
        zone_score = zone_info["attention_weight"] * (len(assigned) / max(zone_info["max_items"], 1))
        total_attention += zone_score

        analysis["zones"][zone_key] = {
            "name": zone_info["name"],
            "zone_id": zone_info["zone_id"],
            "attention_weight": zone_info["attention_weight"],
            "assigned_sections": assigned,
            "section_count": len(assigned),
            "utilization": round(len(assigned) / zone_info["max_items"] * 100, 1),
            "status": "optimal" if assigned else "empty",
        }

    # Check for common misplacements
    if not zone_assignments["header_bar"]:
        analysis["placement_issues"].append({
            "severity": "critical",
            "issue": "Header Bar (Zone 1) is empty — no name/contact in the highest attention zone",
            "fix": "Ensure header with name, headline, and contact info is at the top",
        })

    if not zone_assignments["body_core"]:
        analysis["placement_issues"].append({
            "severity": "critical",
            "issue": "Body Core (Zone 3) is empty — no experience/summary in the primary content zone",
            "fix": "Add experience section with achievement bullets to the main body",
        })

    # Compute overall attention score
    max_attention = sum(z["attention_weight"] for z in ZONES.values())
    analysis["attention_score"] = round(total_attention / max_attention * 100)

    # Section order recommendation
    if career_situation == "entry":
        analysis["recommended_order"] = [
            "header", "summary", "education", "skills", "projects", "experience",
            "certifications", "volunteer", "awards",
        ]
    elif career_situation == "pivot":
        analysis["recommended_order"] = [
            "header", "summary", "skills", "projects", "experience", "education",
            "certifications", "awards",
        ]
    elif career_situation == "executive":
        analysis["recommended_order"] = [
            "header", "executive_summary", "key_achievements", "experience",
            "board_affiliations", "education", "certifications", "publications",
        ]
    else:
        analysis["recommended_order"] = [
            "header", "summary", "experience", "skills", "education",
            "certifications", "projects", "awards",
        ]

    return analysis
