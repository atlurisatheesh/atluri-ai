"""
JD Signal Decoder — Detects hidden cultural signals, red flags, and green flags
in job descriptions that candidates typically miss.
"""

from __future__ import annotations
import re
from dataclasses import dataclass
from enum import Enum


class SignalType(str, Enum):
    RED_FLAG = "red_flag"
    YELLOW_FLAG = "yellow_flag"
    GREEN_FLAG = "green_flag"
    CULTURE_SIGNAL = "culture_signal"
    HIDDEN_REQUIREMENT = "hidden_requirement"
    SALARY_SIGNAL = "salary_signal"


@dataclass
class JDSignal:
    phrase: str
    signal_type: SignalType
    decoded_meaning: str
    advice: str
    severity: int  # 1-5, 5 = most important


@dataclass
class JDAnalysis:
    signals: list[JDSignal]
    must_have_skills: list[str]
    nice_to_have_skills: list[str]
    estimated_seniority: str
    culture_profile: str
    interview_format_prediction: str
    salary_band_clues: str
    overall_red_flag_score: int  # 0-10, 10 = run away
    summary: str


# ── Signal Pattern Registry ──────────────────────────────────────────

_SIGNAL_PATTERNS: list[tuple[str, SignalType, str, str, int]] = [
    # RED FLAGS
    (r"fast[\s-]?paced environment", SignalType.RED_FLAG,
     "High-pressure culture. Expect long hours and constant context-switching.",
     "Ask about work-life balance and on-call expectations in interview.", 4),

    (r"wear many hats", SignalType.RED_FLAG,
     "Under-resourced team. You'll be doing multiple roles without extra compensation.",
     "Ask about team size and whether there are plans to hire more.", 4),

    (r"self[\s-]?starter", SignalType.RED_FLAG,
     "Minimal onboarding and mentorship. You'll be expected to figure things out alone.",
     "Ask about onboarding process and team documentation.", 3),

    (r"work hard[\s,]?\s*play hard", SignalType.RED_FLAG,
     "Long hours disguised as fun culture. Often means 60+ hour weeks.",
     "Ask about average weekly hours and weekend work expectations.", 5),

    (r"like a family|we.re.* family", SignalType.RED_FLAG,
     "Blurred professional boundaries. May expect personal sacrifice for the company.",
     "Ask about overtime pay, PTO usage rates, and turnover.", 4),

    (r"rockstar|ninja|guru|wizard|hacker", SignalType.YELLOW_FLAG,
     "Immature culture. May lack structure, process, or clear career paths.",
     "Ask about engineering levels, promotion criteria, and growth frameworks.", 3),

    (r"must be comfortable with ambiguity", SignalType.YELLOW_FLAG,
     "Undefined scope. Requirements change frequently. Could be exciting or chaotic.",
     "Ask for a concrete example of a recent ambiguous situation the team navigated.", 3),

    (r"up to \d+% travel", SignalType.YELLOW_FLAG,
     "Travel requirement often underestimated. '25% travel' can mean every week.",
     "Ask about typical travel month — how many days/nights away from home.", 3),

    (r"competitive salary", SignalType.SALARY_SIGNAL,
     "Salary not disclosed. May indicate below-market compensation.",
     "Research market rate on Levels.fyi/Glassdoor BEFORE discussing salary.", 3),

    (r"equity|stock options|rsu", SignalType.SALARY_SIGNAL,
     "Equity component in compensation. Could be significant or minimal.",
     "Ask about vesting schedule, strike price, and latest 409A valuation for startups.", 2),

    (r"unlimited (pto|vacation|time[\s-]off)", SignalType.RED_FLAG,
     "Often means no PTO tracking = social pressure to not take time off. Average usage is lower than fixed PTO.",
     "Ask: 'How many vacation days did the team average last year?'", 4),

    (r"(startup|early[\s-]?stage|series [a-c]|pre[\s-]?seed|seed)", SignalType.YELLOW_FLAG,
     "Early-stage company. Higher risk but higher potential upside. Job security is lower.",
     "Ask about runway (months of cash), revenue trajectory, and next funding round timeline.", 3),

    (r"immediate (start|hire|need|opening)", SignalType.YELLOW_FLAG,
     "Someone left abruptly or the team is severely understaffed.",
     "Ask why the role is open and what happened to the previous person.", 3),

    # GREEN FLAGS
    (r"professional development|learning budget|education (stipend|budget|allowance)", SignalType.GREEN_FLAG,
     "Invested in employee growth. Positive signal for long-term career development.",
     "Ask about the specific budget amount and what's covered.", 2),

    (r"work[\s-]?life balance|flexible (hours|schedule|work)", SignalType.GREEN_FLAG,
     "Values boundaries. Less likely to have a crunch culture.",
     "This is a positive signal — verify it matches Glassdoor reviews.", 2),

    (r"clear (career|growth) (path|ladder|progression)", SignalType.GREEN_FLAG,
     "Structured growth framework. You'll know how to advance.",
     "Ask to see the actual career ladder document.", 1),

    (r"(mentorship|coaching) (program|culture|opportunity)", SignalType.GREEN_FLAG,
     "Active investment in developing employees. Great for career growth.",
     "Ask who your mentor would be and how the program works.", 2),

    (r"(diverse|inclusive|dei|belonging)", SignalType.GREEN_FLAG,
     "Values diversity. Check if it's genuine or performative.",
     "Ask for specific DEI metrics or ERG (Employee Resource Group) examples.", 2),

    (r"remote[\s-]?first|fully remote", SignalType.GREEN_FLAG,
     "Designed around remote work, not just allowing it.",
     "Ask about async communication practices and timezone flexibility.", 2),

    # CULTURE SIGNALS
    (r"move fast|bias for action|ship quickly", SignalType.CULTURE_SIGNAL,
     "Speed over perfection culture. Less process, more execution.",
     "Gauge if there's tech debt tolerance or if shortcuts are expected.", 3),

    (r"data[\s-]?driven|metrics[\s-]?driven", SignalType.CULTURE_SIGNAL,
     "Decisions backed by data. Expect to justify everything with numbers.",
     "Prepare examples where you used data to drive decisions.", 2),

    (r"customer[\s-]?obsess", SignalType.CULTURE_SIGNAL,
     "Strong customer focus (Amazon-style). Everything ties back to the customer.",
     "Frame your answers around customer impact.", 2),

    (r"cross[\s-]?functional", SignalType.CULTURE_SIGNAL,
     "You'll work with multiple teams. Communication skills are critical.",
     "Prepare examples of cross-team collaboration and influencing without authority.", 2),

    # HIDDEN REQUIREMENTS
    (r"(\d+)\+?\s*years? (of )?(experience|exp)", SignalType.HIDDEN_REQUIREMENT,
     "Years of experience requirement. This is usually flexible ±2 years if you have strong skills.",
     "Don't self-select out. Apply if within 2 years of the requirement.", 3),

    (r"(bachelor|master|phd|degree) (required|preferred|in)", SignalType.HIDDEN_REQUIREMENT,
     "Education requirement. 'Preferred' means NOT required if you have equivalent experience.",
     "If you lack the degree, emphasize equivalent hands-on experience.", 2),

    (r"(clearance|security clearance|ts\/sci|public trust)", SignalType.HIDDEN_REQUIREMENT,
     "Government clearance needed. This is a hard requirement — not waivable.",
     "If you don't have clearance, check if the company will sponsor one.", 5),
]

# ── Seniority detection ──────────────────────────────────────────────

_SENIORITY_PATTERNS = [
    (r"(staff|principal|distinguished|fellow)\s+(engineer|developer|scientist)", "staff+"),
    (r"(senior|sr\.?)\s+(engineer|developer|manager|designer)", "senior"),
    (r"(lead|tech lead|engineering lead|team lead)", "lead"),
    (r"(mid[\s-]?level|mid[\s-]?senior|intermediate)", "mid"),
    (r"(junior|jr\.?|entry[\s-]?level|associate|graduate|intern)", "junior"),
    (r"(director|vp|vice president|head of|chief)", "executive"),
    (r"(manager|engineering manager|em\b)", "manager"),
]


def analyze_job_description(jd_text: str) -> JDAnalysis:
    """
    Deep-analyze a job description for hidden signals, red/green flags,
    cultural indicators, and seniority level.
    """
    signals: list[JDSignal] = []
    jd_lower = jd_text.lower()

    # Pattern matching for signals
    for pattern, signal_type, meaning, advice, severity in _SIGNAL_PATTERNS:
        match = re.search(pattern, jd_lower)
        if match:
            signals.append(JDSignal(
                phrase=match.group(0),
                signal_type=signal_type,
                decoded_meaning=meaning,
                advice=advice,
                severity=severity,
            ))

    # Extract must-have vs nice-to-have
    must_have, nice_to_have = _extract_skill_tiers(jd_text)

    # Detect seniority
    seniority = _detect_seniority(jd_lower)

    # Culture profile
    culture = _build_culture_profile(signals)

    # Interview format prediction
    interview_pred = _predict_interview_format(jd_lower, seniority)

    # Salary clues
    salary_clues = _extract_salary_clues(jd_lower)

    # Red flag score
    red_flags = [s for s in signals if s.signal_type == SignalType.RED_FLAG]
    red_score = min(len(red_flags) * 2, 10)

    return JDAnalysis(
        signals=signals,
        must_have_skills=must_have,
        nice_to_have_skills=nice_to_have,
        estimated_seniority=seniority,
        culture_profile=culture,
        interview_format_prediction=interview_pred,
        salary_band_clues=salary_clues,
        overall_red_flag_score=red_score,
        summary=_build_summary(signals, seniority, red_score),
    )


def _extract_skill_tiers(jd_text: str) -> tuple[list[str], list[str]]:
    """Separate must-have from nice-to-have skills."""
    must_have: list[str] = []
    nice_to_have: list[str] = []

    lines = jd_text.split("\n")
    is_nice_section = False
    is_must_section = False

    for line in lines:
        lower = line.lower().strip()

        if re.search(r"(required|must[\s-]?have|requirements|qualifications)\s*:?$", lower):
            is_must_section = True
            is_nice_section = False
            continue
        if re.search(r"(nice[\s-]?to[\s-]?have|preferred|bonus|plus)\s*:?$", lower):
            is_nice_section = True
            is_must_section = False
            continue

        clean = line.strip().lstrip("•-*▪ ").strip()
        if len(clean) > 5 and len(clean) < 200:
            if is_nice_section:
                nice_to_have.append(clean)
            elif is_must_section:
                must_have.append(clean)

    return must_have[:10], nice_to_have[:10]


def _detect_seniority(jd_lower: str) -> str:
    for pattern, level in _SENIORITY_PATTERNS:
        if re.search(pattern, jd_lower):
            return level
    return "mid"


def _build_culture_profile(signals: list[JDSignal]) -> str:
    culture_signals = [s for s in signals if s.signal_type == SignalType.CULTURE_SIGNAL]
    if not culture_signals:
        return "Standard corporate culture — prepare for structured interviews."
    traits = [s.decoded_meaning.split(".")[0] for s in culture_signals]
    return " | ".join(traits)


def _predict_interview_format(jd_lower: str, seniority: str) -> str:
    rounds = []
    if "coding" in jd_lower or "leetcode" in jd_lower or "algorithm" in jd_lower:
        rounds.append("Coding Round (DSA)")
    if "system design" in jd_lower or "architecture" in jd_lower:
        rounds.append("System Design")
    if "behavioral" in jd_lower or "leadership" in jd_lower:
        rounds.append("Behavioral")
    if "case" in jd_lower or "business" in jd_lower:
        rounds.append("Case Study")

    if not rounds:
        if seniority in ("senior", "lead", "staff+", "executive", "manager"):
            rounds = ["Behavioral", "System Design", "Technical Deep-Dive"]
        else:
            rounds = ["Phone Screen", "Coding Round", "Behavioral"]

    return f"Predicted format: {' → '.join(rounds)}"


def _extract_salary_clues(jd_lower: str) -> str:
    salary_match = re.search(r"\$[\d,]+\s*[-–]\s*\$[\d,]+", jd_lower)
    if salary_match:
        return f"Listed range: {salary_match.group(0)}"
    if "competitive" in jd_lower:
        return "No range disclosed — research market rate before discussing."
    return "No salary information found — use Levels.fyi for benchmarking."


def _build_summary(signals: list[JDSignal], seniority: str, red_score: int) -> str:
    greens = len([s for s in signals if s.signal_type == SignalType.GREEN_FLAG])
    reds = len([s for s in signals if s.signal_type == SignalType.RED_FLAG])

    if red_score >= 7:
        tone = "⚠️ Multiple red flags detected. Proceed with caution and ask tough questions."
    elif red_score >= 4:
        tone = "🟡 Some concerns detected. Worth investigating during the interview."
    elif greens >= 3:
        tone = "🟢 Strong positive signals. This looks like a healthy opportunity."
    else:
        tone = "Neutral profile. Standard opportunity — do your company research."

    return f"{tone} Seniority: {seniority}. Red flags: {reds}, Green flags: {greens}."


def jd_analysis_to_dict(analysis: JDAnalysis) -> dict:
    return {
        "signals": [
            {
                "phrase": s.phrase,
                "signal_type": s.signal_type.value,
                "decoded_meaning": s.decoded_meaning,
                "advice": s.advice,
                "severity": s.severity,
            }
            for s in analysis.signals
        ],
        "must_have_skills": analysis.must_have_skills,
        "nice_to_have_skills": analysis.nice_to_have_skills,
        "estimated_seniority": analysis.estimated_seniority,
        "culture_profile": analysis.culture_profile,
        "interview_format_prediction": analysis.interview_format_prediction,
        "salary_band_clues": analysis.salary_band_clues,
        "overall_red_flag_score": analysis.overall_red_flag_score,
        "summary": analysis.summary,
    }
