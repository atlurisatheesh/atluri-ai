import re
import time
from typing import Any


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _extract_metric_density(text: str) -> float:
    content = str(text or "")
    tokens = max(1, len(content.split()))
    numeric_tokens = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", content))
    hits = numeric_tokens
    for keyword in ["latency", "throughput", "availability", "downtime", "cost", "reduced", "improved"]:
        if keyword in content.lower():
            hits += 1

    density = min(1.0, hits / max(3, tokens / 10))

    # Anti-gaming: excessive numeric spam or repeated extreme % claims tend to be fabricated.
    # Apply a small damping factor instead of a hard cutoff to preserve legitimate metric-heavy answers.
    numbers_per_10_words = numeric_tokens / max(1.0, tokens / 10.0)
    extreme_percent_hits = len(re.findall(r"\b(?:9[5-9]|100)%\b", content))
    if numbers_per_10_words >= 4.5:
        density *= 0.65
    elif numbers_per_10_words >= 3.5:
        density *= 0.8
    if extreme_percent_hits >= 2:
        density *= 0.85

    return min(1.0, max(0.0, density))


def _metric_inflation_flag(text: str) -> bool:
    content = str(text or "")
    tokens = max(1, len(content.split()))
    numeric_tokens = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", content))
    numbers_per_10_words = numeric_tokens / max(1.0, tokens / 10.0)
    extreme_percent_hits = len(re.findall(r"\b(?:9[5-9]|100)%\b", content))
    return numbers_per_10_words >= 4.5 or extreme_percent_hits >= 2


def _ownership_clarity(text: str) -> float:
    content = str(text or "").lower()
    score = 0.0
    for keyword in ["i led", "i owned", "i drove", "i designed", "i implemented", "my responsibility"]:
        if keyword in content:
            score += 0.18
    return min(1.0, score)


def _tradeoff_depth(text: str) -> float:
    content = str(text or "").lower()
    score = 0.0
    for keyword in ["trade-off", "tradeoff", "instead", "alternative", "because", "pros", "cons", "risk"]:
        if keyword in content:
            score += 0.14
    return min(1.0, score)


def _rambling_signal(text: str) -> bool:
    words = str(text or "").split()
    if len(words) > 140:
        return True
    lowered = str(text or "").lower()
    filler_hits = sum(lowered.count(token) for token in ["um", "uh", "like", "you know"])
    return filler_hits >= 4


def build_session_analytics(
    *,
    session_id: str,
    role: str,
    questions: list[str] | None,
    answers: list[str] | None,
    evaluations: list[dict] | None,
    final_decision: str | None,
    final_score: float | int | None,
    final_summary: dict | None = None,
    assist_events: list[dict] | None = None,
    speaking_time_ratio: float | None = None,
) -> dict:
    questions = list(questions or [])
    answers = list(answers or [])
    evaluations = list(evaluations or [])
    assist_events = list(assist_events or [])
    final_summary = dict(final_summary or {})

    technical_scores = [_safe_float(item.get("technical"), 50.0) for item in evaluations]
    communication_scores = [_safe_float(item.get("communication"), 50.0) for item in evaluations]
    confidence_scores = [_safe_float(item.get("confidence"), 50.0) for item in evaluations]
    clarity_scores = [_safe_float(item.get("clarity"), 50.0) for item in evaluations]

    metric_usage_score = round(_avg([_extract_metric_density(answer) for answer in answers]) * 100, 2)
    metric_inflation_flags = sum(1 for answer in answers if _metric_inflation_flag(answer))
    ownership_clarity_score = round(_avg([_ownership_clarity(answer) for answer in answers]) * 100, 2)
    tradeoff_depth_score = round(_avg([_tradeoff_depth(answer) for answer in answers]) * 100, 2)
    rambling_bursts = sum(1 for answer in answers if _rambling_signal(answer))

    confidence_drops = 0
    if confidence_scores:
        peak = confidence_scores[0]
        for score in confidence_scores[1:]:
            if score < peak - 12:
                confidence_drops += 1
            peak = max(peak, score)

    contradictions_detected = _safe_int(final_summary.get("mce_contradictions") or final_summary.get("contradictions") or 0, 0)
    drift_frequency = round(contradictions_detected / max(1, len(answers)), 3)

    risk_flags: list[str] = []
    if contradictions_detected > 0:
        risk_flags.append("Contradictions detected")
    if ownership_clarity_score < 45:
        risk_flags.append("Low ownership clarity")
    if tradeoff_depth_score < 45:
        risk_flags.append("Limited trade-off depth")
    if metric_usage_score < 40:
        risk_flags.append("Weak metric evidence")
    if metric_inflation_flags > 0:
        risk_flags.append("Potential metric inflation")
    if confidence_drops > 0:
        risk_flags.append("Confidence volatility")

    strengths: list[str] = []
    if _avg(technical_scores) >= 65:
        strengths.append("Technical depth")
    if _avg(communication_scores) >= 65:
        strengths.append("Communication clarity")
    if metric_usage_score >= 55:
        strengths.append("Metric-backed storytelling")
    if ownership_clarity_score >= 55:
        strengths.append("Strong ownership framing")
    if tradeoff_depth_score >= 55:
        strengths.append("Trade-off reasoning")

    assist_spikes = sum(1 for evt in assist_events if str(evt.get("severity") or "").lower() == "high")

    timeline = []
    for index, question in enumerate(questions):
        eval_item = evaluations[index] if index < len(evaluations) else {}
        answer = answers[index] if index < len(answers) else ""
        timeline.append(
            {
                "index": index + 1,
                "question": question,
                "confidence": _safe_float(eval_item.get("confidence"), 0.0),
                "clarity": _safe_float(eval_item.get("clarity"), 0.0),
                "communication": _safe_float(eval_item.get("communication"), 0.0),
                "technical": _safe_float(eval_item.get("technical"), 0.0),
                "metric_signal": round(_extract_metric_density(answer) * 100, 2),
                "rambling": _rambling_signal(answer),
            }
        )

    speaking_ratio = speaking_time_ratio
    if speaking_ratio is None:
        speaking_ratio = 0.5 if not answers else min(0.95, max(0.05, len(" ".join(answers)) / max(1, len(" ".join(answers + questions)))))

    return {
        "session_id": str(session_id),
        "role": str(role or ""),
        "generated_at": time.time(),
        "summary": {
            "decision": final_decision,
            "score": _safe_float(final_score, 0.0),
            "strengths": strengths,
            "risk_flags": risk_flags,
            "contradictions_detected": contradictions_detected,
            "metric_usage_score": metric_usage_score,
            "metric_inflation_flags": metric_inflation_flags,
            "ownership_clarity_score": ownership_clarity_score,
            "tradeoff_depth_score": tradeoff_depth_score,
            "drift_frequency": drift_frequency,
            "speaking_time_ratio": round(float(speaking_ratio), 3),
            "confidence_drop_moments": confidence_drops,
            "rambling_bursts": rambling_bursts,
            "assist_high_severity_spikes": assist_spikes,
        },
        "timeline": timeline,
    }
