"""
Offer Negotiation Coach — Provides salary research, counter-offer scripts,
email templates, and "Am I being lowballed?" analysis.
"""

from __future__ import annotations
import os
import json
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


@dataclass
class SalaryBenchmark:
    role: str
    level: str
    location: str
    base_low: int
    base_median: int
    base_high: int
    total_comp_low: int
    total_comp_median: int
    total_comp_high: int
    source_note: str


@dataclass
class NegotiationScript:
    scenario: str  # initial_offer / counter / final
    script: str
    tone: str  # confident / collaborative / firm
    key_phrases: list[str]
    email_template: str


@dataclass
class LowballAnalysis:
    is_lowball: bool
    confidence: str  # high / medium / low
    gap_percentage: float
    market_position: str  # below_market / at_market / above_market
    recommendation: str
    talking_points: list[str]


@dataclass
class NegotiationPackage:
    benchmark: SalaryBenchmark
    scripts: list[NegotiationScript]
    lowball_analysis: LowballAnalysis | None
    negotiation_tips: list[str]
    counter_offer_range: dict


# ── Salary benchmark data (approximate US tech ranges, 2025-2026) ────

_SALARY_BENCHMARKS: dict[str, dict[str, dict]] = {
    "software_engineer": {
        "junior": {"base": (85000, 110000, 140000), "total": (90000, 125000, 170000)},
        "mid": {"base": (120000, 150000, 185000), "total": (140000, 180000, 230000)},
        "senior": {"base": (160000, 195000, 240000), "total": (200000, 270000, 370000)},
        "staff": {"base": (200000, 250000, 310000), "total": (280000, 380000, 520000)},
        "principal": {"base": (250000, 310000, 380000), "total": (380000, 520000, 700000)},
    },
    "product_manager": {
        "junior": {"base": (80000, 100000, 130000), "total": (85000, 115000, 155000)},
        "mid": {"base": (110000, 140000, 175000), "total": (130000, 170000, 220000)},
        "senior": {"base": (150000, 185000, 230000), "total": (190000, 260000, 350000)},
        "staff": {"base": (190000, 240000, 300000), "total": (270000, 370000, 500000)},
    },
    "data_scientist": {
        "junior": {"base": (80000, 105000, 135000), "total": (85000, 120000, 160000)},
        "mid": {"base": (115000, 145000, 180000), "total": (135000, 175000, 225000)},
        "senior": {"base": (155000, 190000, 235000), "total": (195000, 260000, 360000)},
        "staff": {"base": (195000, 245000, 305000), "total": (275000, 375000, 510000)},
    },
    "engineering_manager": {
        "mid": {"base": (150000, 185000, 230000), "total": (190000, 260000, 350000)},
        "senior": {"base": (190000, 240000, 300000), "total": (270000, 370000, 500000)},
        "director": {"base": (230000, 290000, 370000), "total": (350000, 480000, 650000)},
    },
    "designer": {
        "junior": {"base": (70000, 90000, 115000), "total": (75000, 100000, 130000)},
        "mid": {"base": (100000, 130000, 165000), "total": (115000, 155000, 200000)},
        "senior": {"base": (140000, 175000, 220000), "total": (170000, 230000, 310000)},
    },
    "default": {
        "junior": {"base": (70000, 90000, 120000), "total": (75000, 100000, 140000)},
        "mid": {"base": (100000, 135000, 170000), "total": (120000, 160000, 210000)},
        "senior": {"base": (145000, 180000, 225000), "total": (180000, 250000, 340000)},
        "staff": {"base": (190000, 240000, 300000), "total": (260000, 360000, 490000)},
    },
}


def _normalize_role(role: str) -> str:
    role_lower = role.lower()
    for key in _SALARY_BENCHMARKS:
        if key.replace("_", " ") in role_lower or key in role_lower:
            return key
    if any(w in role_lower for w in ["engineer", "developer", "sde", "swe"]):
        return "software_engineer"
    if any(w in role_lower for w in ["product", "pm"]):
        return "product_manager"
    if any(w in role_lower for w in ["data", "ml", "machine learning"]):
        return "data_scientist"
    if any(w in role_lower for w in ["manager", "lead"]):
        return "engineering_manager"
    if any(w in role_lower for w in ["design", "ux", "ui"]):
        return "designer"
    return "default"


def _normalize_level(level: str) -> str:
    level_lower = level.lower()
    for label in ["principal", "staff", "director", "senior", "mid", "junior"]:
        if label in level_lower:
            return label
    return "mid"


def get_salary_benchmark(role: str, level: str, location: str = "US") -> SalaryBenchmark:
    """Get salary benchmark data for a role/level/location."""
    norm_role = _normalize_role(role)
    norm_level = _normalize_level(level)

    role_data = _SALARY_BENCHMARKS.get(norm_role, _SALARY_BENCHMARKS["default"])
    level_data = role_data.get(norm_level, role_data.get("mid", role_data[list(role_data.keys())[0]]))

    base = level_data["base"]
    total = level_data["total"]

    # Location adjustment
    loc_multiplier = _LOCATION_MULTIPLIERS.get(location.lower(), 1.0)

    return SalaryBenchmark(
        role=role,
        level=level,
        location=location,
        base_low=int(base[0] * loc_multiplier),
        base_median=int(base[1] * loc_multiplier),
        base_high=int(base[2] * loc_multiplier),
        total_comp_low=int(total[0] * loc_multiplier),
        total_comp_median=int(total[1] * loc_multiplier),
        total_comp_high=int(total[2] * loc_multiplier),
        source_note="Approximate US tech market data (2025-2026). Verify with Levels.fyi, Glassdoor, and Blind.",
    )


_LOCATION_MULTIPLIERS = {
    "us": 1.0, "san francisco": 1.15, "sf": 1.15, "bay area": 1.15,
    "new york": 1.10, "nyc": 1.10, "seattle": 1.05,
    "austin": 0.92, "denver": 0.90, "chicago": 0.90,
    "remote": 0.95, "europe": 0.75, "uk": 0.80, "london": 0.85,
    "india": 0.30, "canada": 0.70, "toronto": 0.75,
    "germany": 0.70, "singapore": 0.80, "australia": 0.75,
}


def analyze_offer(
    offered_base: int,
    offered_total: int | None,
    role: str,
    level: str,
    location: str = "US",
) -> LowballAnalysis:
    """Analyze if an offer is a lowball."""
    benchmark = get_salary_benchmark(role, level, location)

    gap = ((benchmark.base_median - offered_base) / benchmark.base_median) * 100

    if offered_base < benchmark.base_low:
        position = "below_market"
        is_lowball = True
        confidence = "high"
    elif offered_base < benchmark.base_median * 0.92:
        position = "below_market"
        is_lowball = True
        confidence = "medium"
    elif offered_base <= benchmark.base_high:
        position = "at_market"
        is_lowball = False
        confidence = "high"
    else:
        position = "above_market"
        is_lowball = False
        confidence = "high"

    if is_lowball:
        recommendation = (
            f"The offer is {abs(gap):.0f}% below market median. "
            f"Counter with ${benchmark.base_median:,}–${benchmark.base_high:,} base, "
            f"supported by market data."
        )
    else:
        recommendation = (
            f"The offer is competitive (within {abs(gap):.0f}% of median). "
            f"You can still negotiate for equity, signing bonus, or benefits."
        )

    return LowballAnalysis(
        is_lowball=is_lowball,
        confidence=confidence,
        gap_percentage=round(gap, 1),
        market_position=position,
        recommendation=recommendation,
        talking_points=[
            f"Market median for {role} ({level}) in {location}: ${benchmark.base_median:,}",
            f"Top of market: ${benchmark.base_high:,} base, ${benchmark.total_comp_high:,} total",
            "Don't forget to negotiate equity vesting, signing bonus, and PTO separately",
            "Ask for the full comp breakdown: base + bonus + equity + benefits",
        ],
    )


def generate_counter_scripts(
    offered_base: int,
    target_base: int,
    role: str,
    company: str = "",
) -> list[NegotiationScript]:
    """Generate negotiation scripts for different scenarios."""
    return [
        NegotiationScript(
            scenario="initial_response",
            script=(
                f"Thank you for the offer — I'm excited about the opportunity at {company or 'your company'}. "
                f"I've done research on the market rate for {role} roles, and based on my experience and "
                f"the value I'll bring, I was targeting a base in the range of ${target_base:,}–"
                f"${int(target_base * 1.10):,}. Is there flexibility to close that gap?"
            ),
            tone="collaborative",
            key_phrases=[
                "I'm excited about the opportunity",
                "Based on my research and experience",
                "Is there flexibility",
            ],
            email_template=_counter_email(offered_base, target_base, role, company),
        ),
        NegotiationScript(
            scenario="if_they_push_back",
            script=(
                f"I understand budget constraints. Beyond base salary, could we explore "
                f"a signing bonus, additional RSUs, or an accelerated review cycle? "
                f"I'm confident I'll exceed expectations in the first 6 months, "
                f"and I'd love a structure that rewards that."
            ),
            tone="firm",
            key_phrases=[
                "Beyond base salary",
                "Signing bonus or additional RSUs",
                "Accelerated review cycle",
            ],
            email_template="",
        ),
        NegotiationScript(
            scenario="final_negotiation",
            script=(
                f"I have a competing offer at [higher number/stronger equity]. "
                f"I prefer {company or 'your company'} because of [specific reason]. "
                f"If you can match ${target_base:,} base, I'm ready to sign today."
            ),
            tone="confident",
            key_phrases=[
                "Competing offer",
                "I prefer your company because",
                "Ready to sign today",
            ],
            email_template="",
        ),
    ]


def _counter_email(offered: int, target: int, role: str, company: str) -> str:
    return f"""Subject: Re: {role} Offer Discussion

Hi [Recruiter Name],

Thank you again for the offer to join {company or 'the team'} as a {role}. I'm genuinely excited about the opportunity and the team's mission.

After reviewing the compensation package and researching market data for comparable {role} positions, I'd like to discuss the base salary component. Based on my experience and the impact I expect to deliver, I was hoping we could explore a base salary in the range of ${target:,}–${int(target * 1.08):,}.

I want to emphasize that compensation is just one factor — I'm deeply aligned with [specific company value or project], and I'm confident I'll make a strong impact from day one.

Would you be open to discussing this? I'm happy to jump on a call at your convenience.

Best regards,
[Your Name]"""


def build_negotiation_package(
    role: str,
    level: str,
    location: str = "US",
    offered_base: int | None = None,
    offered_total: int | None = None,
    company: str = "",
) -> NegotiationPackage:
    """Build a comprehensive negotiation package."""
    benchmark = get_salary_benchmark(role, level, location)

    lowball = None
    if offered_base:
        lowball = analyze_offer(offered_base, offered_total, role, level, location)

    target_base = offered_base or benchmark.base_median
    if offered_base and offered_base < benchmark.base_median:
        target_base = benchmark.base_median

    scripts = generate_counter_scripts(target_base, int(target_base * 1.05), role, company)

    tips = [
        "Never give a single number first — always provide a range",
        "In early rounds, deflect: 'I'm flexible — what's the budgeted range?'",
        "Negotiate TOTAL comp, not just base (equity, bonus, signing, PTO)",
        "Get the offer in writing before counter-offering",
        "Use competing offers as leverage, but don't bluff",
        "Research on Levels.fyi, Glassdoor, Blind, and Teamblind",
        "Negotiate benefits separately: remote work, PTO, learning budget",
        "Ask for an accelerated performance review (6 months instead of 12)",
    ]

    return NegotiationPackage(
        benchmark=benchmark,
        scripts=scripts,
        lowball_analysis=lowball,
        negotiation_tips=tips,
        counter_offer_range={
            "low": int(target_base * 0.98),
            "target": target_base,
            "high": int(target_base * 1.10),
            "stretch": int(target_base * 1.15),
        },
    )


def negotiation_to_dict(pkg: NegotiationPackage) -> dict:
    return {
        "benchmark": asdict(pkg.benchmark),
        "scripts": [asdict(s) for s in pkg.scripts],
        "lowball_analysis": asdict(pkg.lowball_analysis) if pkg.lowball_analysis else None,
        "negotiation_tips": pkg.negotiation_tips,
        "counter_offer_range": pkg.counter_offer_range,
    }
