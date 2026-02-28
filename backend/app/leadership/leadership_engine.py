from dataclasses import dataclass

from app.leadership.rule_extractor import LeadershipRuleExtractor
from app.leadership.semantic_classifier import SemanticLeadershipClassifier


@dataclass
class LeadershipEngine:
    def __post_init__(self):
        self.rule_extractor = LeadershipRuleExtractor()
        self.semantic_classifier = SemanticLeadershipClassifier()

    async def evaluate(self, answer_text: str, seniority: str, difficulty_level: int | str) -> dict:
        signal_counts = self.rule_extractor.extract(answer_text)
        semantic = await self.semantic_classifier.classify(
            answer_text=answer_text,
            signal_counts=signal_counts,
            seniority=seniority,
            difficulty_level=difficulty_level,
        )

        return {
            "leadership_score": int(semantic.get("leadership_score", 0)),
            "leadership_strengths": list(semantic.get("leadership_strengths", [])),
            "leadership_gaps": list(semantic.get("leadership_gaps", [])),
            "leadership_signals": signal_counts,
            "signal_counts": signal_counts,
        }
