"""
Competency Scorer — Generates a multi-dimensional competency radar
from interview session data for post-session analytics.
"""

from __future__ import annotations
from dataclasses import dataclass, asdict


@dataclass
class CompetencyScore:
    dimension: str
    score: float  # 0-10
    evidence: str
    improvement_tip: str


@dataclass
class CompetencyRadar:
    communication: CompetencyScore
    technical_depth: CompetencyScore
    leadership: CompetencyScore
    problem_solving: CompetencyScore
    culture_fit: CompetencyScore
    strategic_thinking: CompetencyScore
    overall_score: float
    top_strength: str
    top_weakness: str


def build_competency_radar(
    session_scores: dict,
    question_types_answered: list[str],
    speech_stats: dict | None = None,
) -> CompetencyRadar:
    """
    Build a 6-dimension competency radar from session scoring data.

    session_scores: dict with keys like communication_score, technical_score, etc. (0-100 range)
    question_types_answered: list of question type strings
    speech_stats: optional speech metrics (wpm, fillers, etc.)
    """
    # Normalize 0-100 → 0-10
    def norm(key: str, default: float = 5.0) -> float:
        raw = session_scores.get(key, default * 10)
        return round(min(max(raw / 10.0, 0), 10), 1)

    # Communication: base score + speech quality bonus/penalty
    comm_base = norm("communication_score", 6.0)
    if speech_stats:
        filler_penalty = min(speech_stats.get("total_fillers", 0) * 0.2, 2.0)
        wpm = speech_stats.get("avg_wpm", 135)
        pace_penalty = 0.5 if wpm > 170 or wpm < 90 else 0
        comm_base = max(comm_base - filler_penalty - pace_penalty, 1.0)

    communication = CompetencyScore(
        dimension="Communication",
        score=round(comm_base, 1),
        evidence=_comm_evidence(comm_base, speech_stats),
        improvement_tip=_comm_tip(comm_base, speech_stats),
    )

    technical = CompetencyScore(
        dimension="Technical Depth",
        score=norm("technical_score", 5.5),
        evidence=_tech_evidence(norm("technical_score", 5.5), question_types_answered),
        improvement_tip="Practice explaining complex concepts simply. Use concrete examples with real numbers.",
    )

    leadership = CompetencyScore(
        dimension="Leadership",
        score=norm("confidence_score", 5.0),
        evidence="Based on confidence markers, ownership language, and influence examples in answers.",
        improvement_tip="Use 'I led/drove/owned' language. Quantify team size and impact.",
    )

    problem_solving = CompetencyScore(
        dimension="Problem Solving",
        score=norm("problem_solving_score", 5.5),
        evidence="Based on structured approach, framework usage, and logical reasoning in answers.",
        improvement_tip="Always state your approach BEFORE diving in. Use issue trees or step-by-step breakdowns.",
    )

    culture_fit = CompetencyScore(
        dimension="Culture Fit",
        score=_estimate_culture_fit(session_scores, question_types_answered),
        evidence="Based on values alignment, collaboration examples, and motivation signals.",
        improvement_tip="Research company values. Weave company-specific language into your answers.",
    )

    strategic = CompetencyScore(
        dimension="Strategic Thinking",
        score=_estimate_strategic(session_scores, question_types_answered),
        evidence="Based on long-term thinking, trade-off analysis, and business impact awareness.",
        improvement_tip="Connect every answer to business impact. Show '2nd order' thinking.",
    )

    all_scores = [
        communication.score, technical.score, leadership.score,
        problem_solving.score, culture_fit.score, strategic.score,
    ]
    overall = round(sum(all_scores) / len(all_scores), 1)

    dimensions = [communication, technical, leadership, problem_solving, culture_fit, strategic]
    top = max(dimensions, key=lambda d: d.score)
    bottom = min(dimensions, key=lambda d: d.score)

    return CompetencyRadar(
        communication=communication,
        technical_depth=technical,
        leadership=leadership,
        problem_solving=problem_solving,
        culture_fit=culture_fit,
        strategic_thinking=strategic,
        overall_score=overall,
        top_strength=top.dimension,
        top_weakness=bottom.dimension,
    )


def _comm_evidence(score: float, stats: dict | None) -> str:
    if not stats:
        return "Based on answer clarity and structure."
    wpm = stats.get("avg_wpm", 0)
    fillers = stats.get("total_fillers", 0)
    return f"Avg pace: {wpm:.0f} WPM | Total fillers: {fillers}. Goal: 120-150 WPM, <3 fillers/answer."


def _comm_tip(score: float, stats: dict | None) -> str:
    if not stats:
        return "Practice speaking at 120-150 WPM. Record yourself and count fillers."
    if stats.get("total_fillers", 0) > 10:
        return f"High filler count ({stats['total_fillers']}). Practice replacing 'um/uh' with brief pauses."
    if stats.get("avg_wpm", 135) > 170:
        return "You're speaking too fast. Pause between key points for emphasis."
    return "Good communication pace. Keep working on leading with impact statements."


def _tech_evidence(score: float, q_types: list[str]) -> str:
    tech_count = sum(1 for q in q_types if q in ("technical", "system_design", "coding", "online_assessment"))
    return f"Based on {tech_count} technical questions answered. Score reflects depth and accuracy."


def _estimate_culture_fit(scores: dict, q_types: list[str]) -> float:
    # Culture fit is hard to measure directly — estimate from behavioral + motivation answers
    base = scores.get("communication_score", 60) / 10.0
    behav_count = sum(1 for q in q_types if q in ("behavioral", "motivation_fit"))
    bonus = min(behav_count * 0.3, 1.5)
    return round(min(base + bonus, 10.0), 1)


def _estimate_strategic(scores: dict, q_types: list[str]) -> float:
    base = scores.get("problem_solving_score", 50) / 10.0
    design_count = sum(1 for q in q_types if q in ("system_design", "case_study", "product"))
    bonus = min(design_count * 0.4, 2.0)
    return round(min(base + bonus, 10.0), 1)


def radar_to_dict(radar: CompetencyRadar) -> dict:
    return {
        "dimensions": [
            asdict(radar.communication),
            asdict(radar.technical_depth),
            asdict(radar.leadership),
            asdict(radar.problem_solving),
            asdict(radar.culture_fit),
            asdict(radar.strategic_thinking),
        ],
        "overall_score": radar.overall_score,
        "top_strength": radar.top_strength,
        "top_weakness": radar.top_weakness,
    }
