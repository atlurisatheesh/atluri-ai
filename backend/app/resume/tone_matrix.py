"""
ARIA Industry Tone Matrix — 12+ Industry-Specific Tone Profiles.

Expands the base 4-tone system (corporate, conversational, technical, narrative)
with industry-specific calibration for vocabulary, formality, and proof styles.
"""

import logging
from typing import Any

logger = logging.getLogger("aria.tone_matrix")


# ═══════════════════════════════════════════════════════════
# BASE TONES (existing 4)
# ═══════════════════════════════════════════════════════════

BASE_TONES = {
    "corporate": {
        "label": "Corporate",
        "formality": 0.85,
        "description": "Polished, professional, enterprise-ready",
    },
    "conversational": {
        "label": "Conversational",
        "formality": 0.55,
        "description": "Approachable, startup-friendly, human",
    },
    "technical": {
        "label": "Technical",
        "formality": 0.75,
        "description": "Precision-focused, spec-driven, engineering-native",
    },
    "narrative": {
        "label": "Narrative",
        "formality": 0.60,
        "description": "Story-led, persuasion-heavy, impact-driven",
    },
}


# ═══════════════════════════════════════════════════════════
# INDUSTRY TONE PROFILES (12+)
# ═══════════════════════════════════════════════════════════

INDUSTRY_PROFILES: dict[str, dict[str, Any]] = {
    "tech_saas": {
        "label": "Tech / SaaS",
        "base_tone": "technical",
        "formality": 0.65,
        "vocabulary": {
            "preferred": ["shipped", "scaled", "architected", "iterated", "deployed", "optimized", "owned", "built"],
            "avoid": ["facilitated", "assisted", "participated in", "was responsible for"],
        },
        "proof_style": "metrics_heavy",
        "proof_priorities": ["ARR/revenue impact", "user growth", "system scale (req/sec, uptime)", "engineering velocity"],
        "summary_tone": "Direct, metric-dense. Lead with scale and impact.",
        "bullet_prefix_style": "action_verb",
        "culture_keywords": ["move fast", "ownership", "impact over effort", "ship it"],
    },
    "finance_banking": {
        "label": "Finance & Banking",
        "base_tone": "corporate",
        "formality": 0.95,
        "vocabulary": {
            "preferred": ["managed", "oversaw", "directed", "administered", "executed", "mitigated", "structured"],
            "avoid": ["disrupted", "hacked", "moved fast", "iterated"],
        },
        "proof_style": "credential_heavy",
        "proof_priorities": ["portfolio size ($AUM)", "regulatory compliance", "risk reduction", "team size", "CFA/CPA/FRM credentials"],
        "summary_tone": "Authoritative, credentialed. Lead with title and portfolio scale.",
        "bullet_prefix_style": "formal_action",
        "culture_keywords": ["risk management", "regulatory compliance", "fiduciary", "institutional"],
    },
    "consulting": {
        "label": "Management Consulting",
        "base_tone": "corporate",
        "formality": 0.90,
        "vocabulary": {
            "preferred": ["advised", "structured", "synthesized", "drove", "delivered", "assessed", "recommended"],
            "avoid": ["coded", "built", "maintained", "supported"],
        },
        "proof_style": "outcome_heavy",
        "proof_priorities": ["client revenue impact", "engagement scope", "recommendations adopted", "C-suite presentations"],
        "summary_tone": "Problem-solver framing. Lead with client impact and decision influence.",
        "bullet_prefix_style": "client_impact",
        "culture_keywords": ["structured thinking", "client impact", "hypothesis-driven", "top-down"],
    },
    "healthcare": {
        "label": "Healthcare & Life Sciences",
        "base_tone": "corporate",
        "formality": 0.90,
        "vocabulary": {
            "preferred": ["administered", "assessed", "coordinated", "documented", "implemented protocols", "ensured compliance"],
            "avoid": ["disrupted", "hacked", "moved fast", "broke things"],
        },
        "proof_style": "compliance_outcome",
        "proof_priorities": ["patient outcomes", "compliance rates", "cost reduction", "clinical trial metrics", "certifications (RN, MD, PharmD)"],
        "summary_tone": "Patient-centered, credential-led. Compliance and outcomes first.",
        "bullet_prefix_style": "clinical_action",
        "culture_keywords": ["patient care", "evidence-based", "clinical excellence", "regulatory"],
    },
    "creative_agency": {
        "label": "Creative / Agency",
        "base_tone": "conversational",
        "formality": 0.45,
        "vocabulary": {
            "preferred": ["crafted", "designed", "concepted", "directed", "produced", "curated", "collaborated", "pitched"],
            "avoid": ["administered", "oversaw", "facilitated"],
        },
        "proof_style": "portfolio_driven",
        "proof_priorities": ["campaign reach/impressions", "award nominations", "client roster", "brand recognition", "viral metrics"],
        "summary_tone": "Creative, brand-voice native. Lead with notable work and recognition.",
        "bullet_prefix_style": "creative_verb",
        "culture_keywords": ["creative excellence", "brand storytelling", "integrated campaigns", "visual identity"],
    },
    "startup_earlystage": {
        "label": "Early-Stage Startup",
        "base_tone": "conversational",
        "formality": 0.40,
        "vocabulary": {
            "preferred": ["built from scratch", "wore multiple hats", "shipped", "pivoted", "owned end-to-end", "fundraised", "scaled from 0"],
            "avoid": ["managed large team", "oversaw department", "corporate strategy"],
        },
        "proof_style": "scrappiness_metrics",
        "proof_priorities": ["0-to-1 builds", "user growth curves", "fundraising involvement", "velocity (shipping speed)", "wearing multiple hats"],
        "summary_tone": "Builder mentality. Lead with what you created from nothing.",
        "bullet_prefix_style": "builder_verb",
        "culture_keywords": ["builder", "ownership", "scrappy", "first principles", "full-stack thinking"],
    },
    "government_public": {
        "label": "Government / Public Sector",
        "base_tone": "corporate",
        "formality": 0.95,
        "vocabulary": {
            "preferred": ["administered", "coordinated", "ensured compliance", "implemented policy", "managed programs", "conducted oversight"],
            "avoid": ["disrupted", "moved fast", "hustled", "hacked"],
        },
        "proof_style": "program_impact",
        "proof_priorities": ["program scale (beneficiaries)", "budget managed", "policy impact", "compliance rates", "security clearance"],
        "summary_tone": "Formal, program-scale focused. Lead with public impact and clearance level.",
        "bullet_prefix_style": "formal_action",
        "culture_keywords": ["public service", "mission-driven", "compliance", "inter-agency", "oversight"],
    },
    "education_academia": {
        "label": "Education & Academia",
        "base_tone": "narrative",
        "formality": 0.80,
        "vocabulary": {
            "preferred": ["published", "researched", "mentored", "developed curriculum", "presented", "peer-reviewed", "supervised"],
            "avoid": ["disrupted", "revenue", "market share"],
        },
        "proof_style": "publication_teaching",
        "proof_priorities": ["publications (h-index)", "grants awarded ($)", "student outcomes", "curriculum adoption", "conference presentations"],
        "summary_tone": "Research-first or teaching-first depending on role. Lead with publications or student impact.",
        "bullet_prefix_style": "academic_verb",
        "culture_keywords": ["intellectual rigor", "peer review", "research excellence", "pedagogy"],
    },
    "sales_marketing": {
        "label": "Sales & Marketing",
        "base_tone": "narrative",
        "formality": 0.60,
        "vocabulary": {
            "preferred": ["generated", "closed", "grew pipeline", "exceeded quota", "launched campaigns", "negotiated", "converted"],
            "avoid": ["facilitated", "assisted", "participated"],
        },
        "proof_style": "revenue_metrics",
        "proof_priorities": ["revenue generated", "quota attainment (%)", "pipeline created", "CAC/LTV ratios", "conversion rates", "deals closed"],
        "summary_tone": "Results-obsessed. Lead with your biggest revenue number.",
        "bullet_prefix_style": "revenue_verb",
        "culture_keywords": ["quota crusher", "pipeline generation", "revenue owner", "growth mindset"],
    },
    "legal": {
        "label": "Legal",
        "base_tone": "corporate",
        "formality": 0.95,
        "vocabulary": {
            "preferred": ["advised", "represented", "drafted", "negotiated", "litigated", "structured", "counseled", "reviewed"],
            "avoid": ["disrupted", "hacked", "moved fast", "shipped"],
        },
        "proof_style": "case_credential",
        "proof_priorities": ["deal value", "cases won/settled", "bar admissions", "notable clients (if permissible)", "practice area depth"],
        "summary_tone": "Credential-heavy, practice-area specific. Lead with bar admissions and deal scale.",
        "bullet_prefix_style": "legal_verb",
        "culture_keywords": ["legal excellence", "due diligence", "risk mitigation", "client counsel"],
    },
    "nonprofit": {
        "label": "Nonprofit / NGO",
        "base_tone": "narrative",
        "formality": 0.65,
        "vocabulary": {
            "preferred": ["mobilized", "advocated", "fundraised", "engaged communities", "expanded programs", "partnered", "stewarded"],
            "avoid": ["revenue generated", "market share", "competitive advantage"],
        },
        "proof_style": "mission_impact",
        "proof_priorities": ["funds raised", "beneficiaries served", "program expansion", "volunteer engagement", "grant awards"],
        "summary_tone": "Mission-passionate but metric-backed. Lead with community impact scale.",
        "bullet_prefix_style": "mission_verb",
        "culture_keywords": ["mission-driven", "community impact", "stakeholder engagement", "social change"],
    },
    "data_ai_ml": {
        "label": "Data / AI / ML",
        "base_tone": "technical",
        "formality": 0.70,
        "vocabulary": {
            "preferred": ["modeled", "fine-tuned", "deployed pipelines", "reduced latency", "improved accuracy", "trained", "optimized", "engineered features"],
            "avoid": ["facilitated", "assisted", "participated in"],
        },
        "proof_style": "metrics_accuracy",
        "proof_priorities": ["model accuracy improvements", "latency reduction", "data pipeline scale", "cost savings from ML", "papers published"],
        "summary_tone": "Precision-obsessed. Lead with model performance metrics and data scale.",
        "bullet_prefix_style": "technical_verb",
        "culture_keywords": ["data-driven", "model performance", "MLOps", "statistical rigor"],
    },
    "product_management": {
        "label": "Product Management",
        "base_tone": "conversational",
        "formality": 0.60,
        "vocabulary": {
            "preferred": ["shipped", "prioritized", "defined roadmap", "validated", "discovered", "user researched", "launched", "measured"],
            "avoid": ["coded", "implemented", "debugged"],
        },
        "proof_style": "user_business_metrics",
        "proof_priorities": ["revenue impact", "user adoption/retention", "NPS improvement", "features shipped", "cross-functional team size led"],
        "summary_tone": "Outcome-driven, customer-centric. Lead with product impact metrics.",
        "bullet_prefix_style": "product_verb",
        "culture_keywords": ["customer obsession", "data-informed", "cross-functional", "outcome over output"],
    },
}


def get_tone_profile(
    industry: str | None = None,
    base_tone: str = "corporate",
    company_culture: str = "",
) -> dict[str, Any]:
    """Get the optimal tone profile for a given industry and base tone."""
    # Try to match industry
    matched_industry = None
    if industry:
        industry_lower = industry.lower().replace(" ", "_").replace("/", "_")
        # Direct match
        if industry_lower in INDUSTRY_PROFILES:
            matched_industry = INDUSTRY_PROFILES[industry_lower]
        else:
            # Fuzzy match
            for key, profile in INDUSTRY_PROFILES.items():
                if any(part in industry_lower for part in key.split("_")):
                    matched_industry = profile
                    break

    if matched_industry:
        return {
            "industry": matched_industry["label"],
            "base_tone": matched_industry["base_tone"],
            "formality": matched_industry["formality"],
            "vocabulary": matched_industry["vocabulary"],
            "proof_style": matched_industry["proof_style"],
            "proof_priorities": matched_industry["proof_priorities"],
            "summary_tone": matched_industry["summary_tone"],
            "bullet_prefix_style": matched_industry["bullet_prefix_style"],
            "culture_keywords": matched_industry["culture_keywords"],
            "source": "industry_matched",
        }

    # Fallback to base tone
    base = BASE_TONES.get(base_tone, BASE_TONES["corporate"])
    return {
        "industry": "General",
        "base_tone": base_tone,
        "formality": base["formality"],
        "vocabulary": {"preferred": [], "avoid": []},
        "proof_style": "metrics_heavy",
        "proof_priorities": ["revenue impact", "efficiency gains", "scale metrics", "team size"],
        "summary_tone": base["description"],
        "bullet_prefix_style": "action_verb",
        "culture_keywords": [],
        "source": "base_tone_fallback",
    }


def get_all_industries() -> list[dict[str, str]]:
    """Return list of all available industry profiles."""
    return [
        {"key": key, "label": p["label"], "base_tone": p["base_tone"]}
        for key, p in INDUSTRY_PROFILES.items()
    ]
