from dataclasses import dataclass
import re


@dataclass
class TrendAccumulator:
    window_size: int = 8
    ema_alpha: float = 0.4

    def update(self, values: list[float] | None, value: float) -> list[float]:
        history = list(values or [])
        history.append(float(value))
        if len(history) > self.window_size:
            history = history[-self.window_size:]
        return history

    def update_ema(self, prev_ema: float | None, value: float) -> float:
        if prev_ema is None:
            return float(value)
        alpha = max(0.3, min(0.5, self.ema_alpha))
        return (alpha * float(value)) + ((1.0 - alpha) * float(prev_ema))

    def improvement_pct(self, baseline_ema: float | None, current_ema: float) -> float:
        if baseline_ema is None or baseline_ema == 0:
            return 0.0
        return round(((current_ema - baseline_ema) / baseline_ema) * 100.0, 2)

    def decline_warning(self, values: list[float]) -> bool:
        if len(values) < 3:
            return False

        r0, r1, r2 = values[-3], values[-2], values[-1]
        consecutive_drop = r2 < r1 < r0
        if not consecutive_drop:
            return False

        drop_pct = ((r0 - r2) / max(abs(r0), 1.0)) * 100.0
        return drop_pct > 8.0


@dataclass
class ConfidenceDeltaTracker:
    def delta(self, values: list[float]) -> float:
        if len(values) < 2:
            return 0.0
        return round(values[-1] - values[-2], 3)


@dataclass
class SkillCoverageTracker:
    def _present(self, text: str, skill: str) -> bool:
        if not text or not skill:
            return False
        pattern = r"(?<!\w)" + re.escape(skill.lower().strip()) + r"(?!\w)"
        return re.search(pattern, text.lower()) is not None

    def coverage(
        self,
        jd_context: dict,
        current_answer: str,
        current_depth: float,
        prior_evidence: dict | None,
    ) -> tuple[float, list[str], list[str], dict]:
        if not jd_context:
            return 0.0, [], [], {}

        must = [s for s in (jd_context.get("must_have_skills", []) or []) if isinstance(s, str)]
        if not must:
            return 0.0, [], [], {}

        evidence = dict(prior_evidence or {})
        depth_weight = 1.0 if float(current_depth) >= 45 else 0.5

        for skill in must:
            if self._present(current_answer or "", skill):
                key = skill.strip().lower()
                evidence[key] = float(evidence.get(key, 0.0)) + depth_weight

        covered = [s for s in must if float(evidence.get(s.strip().lower(), 0.0)) >= 1.0]
        missing = [s for s in must if s not in covered]
        pct = round((len(covered) / len(must)) * 100.0, 2)
        return pct, covered, missing, evidence


@dataclass
class VolatilityIndex:
    def compute(self, values: list[float]) -> float:
        if len(values) < 2:
            return 0.0

        deltas = [abs(values[i] - values[i - 1]) for i in range(1, len(values))]
        return round(sum(deltas) / len(deltas), 2)

    def consistency_score(self, values: list[float]) -> float:
        if len(values) < 2:
            return 100.0

        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        sigma = variance ** 0.5
        sigma_max = 35.0
        normalized = min(sigma / sigma_max, 1.0)
        score = 100.0 * (1.0 - normalized)
        return round(score, 2)


@dataclass
class InterviewSummaryBuilder:
    def strongest_weakest(self, current_metrics: dict) -> tuple[str, str]:
        metric_map = {
            "clarity": float(current_metrics.get("clarity", 0.0)),
            "depth": float(current_metrics.get("depth", 0.0)),
            "structure": float(current_metrics.get("structure", 0.0)),
            "alignment": float(current_metrics.get("alignment", 0.0)),
            "confidence": float(current_metrics.get("confidence", 0.0)) * 100.0,
        }
        strongest = max(metric_map, key=metric_map.get)
        weakest = min(metric_map, key=metric_map.get)
        return strongest, weakest


class PerformanceAnalyticsEngine:
    def __init__(self):
        self.trend = TrendAccumulator()
        self.conf_delta = ConfidenceDeltaTracker()
        self.skill = SkillCoverageTracker()
        self.volatility = VolatilityIndex()
        self.summary = InterviewSummaryBuilder()

    def evaluate(
        self,
        state: dict | None,
        current_metrics: dict,
        jd_context: dict,
        current_answer: str,
    ) -> tuple[dict, dict]:
        analytics = dict(state or {})
        weighted_performance = (
            0.35 * float(current_metrics.get("overall", 0.0))
            + 0.20 * float(current_metrics.get("depth", 0.0))
            + 0.15 * float(current_metrics.get("structure", 0.0))
            + 0.10 * float(current_metrics.get("clarity", 0.0))
            + 0.10 * float(current_metrics.get("alignment", 0.0))
            + 0.10 * (float(current_metrics.get("confidence", 0.0)) * 100.0)
        )

        overall_hist = self.trend.update(analytics.get("overall_scores", []), float(current_metrics.get("overall", 0.0)))
        weighted_hist = self.trend.update(analytics.get("weighted_scores", []), weighted_performance)
        confidence_hist = self.trend.update(analytics.get("confidence_scores", []), float(current_metrics.get("confidence", 0.0)))
        clarity_hist = self.trend.update(analytics.get("clarity_scores", []), float(current_metrics.get("clarity", 0.0)))
        depth_hist = self.trend.update(analytics.get("depth_scores", []), float(current_metrics.get("depth", 0.0)))
        structure_hist = self.trend.update(analytics.get("structure_scores", []), float(current_metrics.get("structure", 0.0)))
        alignment_hist = self.trend.update(analytics.get("alignment_scores", []), float(current_metrics.get("alignment", 0.0)))

        current_ema = self.trend.update_ema(analytics.get("ema_score"), weighted_performance)
        baseline_ema = analytics.get("baseline_ema")
        if baseline_ema is None:
            baseline_ema = current_ema
        improvement = self.trend.improvement_pct(baseline_ema, current_ema)

        confidence_delta = self.conf_delta.delta(confidence_hist)
        volatility = self.volatility.compute(weighted_hist)
        consistency = self.volatility.consistency_score(weighted_hist)
        jd_coverage_pct, covered_skills, missing_skills, skill_evidence = self.skill.coverage(
            jd_context=jd_context,
            current_answer=current_answer,
            current_depth=float(current_metrics.get("depth", 0.0)),
            prior_evidence=analytics.get("skill_evidence", {}),
        )
        strongest, weakest = self.summary.strongest_weakest(current_metrics)
        decline_warning = self.trend.decline_warning(weighted_hist)

        updated_state = {
            "overall_scores": overall_hist,
            "weighted_scores": weighted_hist,
            "ema_score": current_ema,
            "baseline_ema": baseline_ema,
            "confidence_scores": confidence_hist,
            "clarity_scores": clarity_hist,
            "depth_scores": depth_hist,
            "structure_scores": structure_hist,
            "alignment_scores": alignment_hist,
            "skill_evidence": skill_evidence,
        }

        snapshot = {
            "improvement_pct": improvement,
            "decline_warning": decline_warning,
            "strongest_dimension": strongest,
            "weakest_dimension": weakest,
            "consistency_score": consistency,
            "volatility_index": volatility,
            "confidence_delta": confidence_delta,
            "jd_coverage_pct": jd_coverage_pct,
            "covered_skills": covered_skills,
            "missing_skills": missing_skills,
        }

        return updated_state, snapshot
