from dataclasses import dataclass


LEVELS = ["L1", "L2", "L3", "L4", "L5"]


@dataclass
class RollingPerformanceTracker:
    window_size: int = 4

    def update(self, history: list[float] | None, score: float) -> list[float]:
        values = list(history or [])
        values.append(float(score))
        if len(values) > self.window_size:
            values = values[-self.window_size:]
        return values


@dataclass
class TrendAnalyzer:
    def analyze(self, history: list[float]) -> dict:
        if not history:
            return {
                "trend": "stable",
                "delta": 0.0,
                "recent_avg": 0.0,
                "prev_avg": 0.0,
            }

        if len(history) == 1:
            value = float(history[0])
            return {
                "trend": "stable",
                "delta": 0.0,
                "recent_avg": value,
                "prev_avg": value,
            }

        split = max(1, len(history) // 2)
        prev = history[:-split] or history
        recent = history[-split:]

        prev_avg = sum(prev) / len(prev)
        recent_avg = sum(recent) / len(recent)
        delta = recent_avg - prev_avg

        if delta >= 5:
            trend = "improving"
        elif delta <= -5:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "trend": trend,
            "delta": round(delta, 2),
            "recent_avg": round(recent_avg, 2),
            "prev_avg": round(prev_avg, 2),
        }


@dataclass
class DifficultyPolicy:
    def _idx(self, level: str) -> int:
        if level not in LEVELS:
            return 1
        return LEVELS.index(level)

    def choose_next(self, current_level: str, score: float, trend: str) -> str:
        idx = self._idx(current_level)

        if score >= 62 and trend == "improving":
            idx += 1
        elif score >= 80:
            idx += 1
        elif score <= 45 and trend == "declining":
            idx -= 1
        elif score <= 35:
            idx -= 1

        idx = max(0, min(len(LEVELS) - 1, idx))
        return LEVELS[idx]


@dataclass
class QuestionSelector:
    def to_bucket(self, level: str) -> str:
        mapping = {
            "L1": "easy",
            "L2": "easy",
            "L3": "medium",
            "L4": "hard",
            "L5": "hard",
        }
        return mapping.get(level, "medium")

    def prompt_hint(self, level: str, trend: str) -> str:
        if level == "L1":
            return "Ask a foundational, concrete question with straightforward scope."
        if level == "L2":
            return "Ask a practical implementation question with one clear tradeoff."
        if level == "L3":
            return "Ask a moderately challenging question requiring depth and rationale."
        if level == "L4":
            return "Ask an advanced system-level question with tradeoffs and constraints."
        if trend == "improving":
            return "Escalate to expert-level architecture and failure-mode reasoning."
        return "Ask an expert-level question focused on scale, reliability, and tradeoffs."


class DifficultyController:
    def __init__(self):
        self.tracker = RollingPerformanceTracker()
        self.trend_analyzer = TrendAnalyzer()
        self.policy = DifficultyPolicy()
        self.selector = QuestionSelector()

    def evaluate(
        self,
        turn_score: float,
        current_level: str = "L2",
        history: list[float] | None = None,
    ) -> dict:
        updated_history = self.tracker.update(history, turn_score)
        trend = self.trend_analyzer.analyze(updated_history)
        next_level = self.policy.choose_next(
            current_level=current_level,
            score=turn_score,
            trend=trend["trend"],
        )

        return {
            "current_level": current_level,
            "next_level": next_level,
            "history": updated_history,
            "trend": trend,
            "difficulty_bucket": self.selector.to_bucket(next_level),
            "prompt_hint": self.selector.prompt_hint(next_level, trend["trend"]),
        }
