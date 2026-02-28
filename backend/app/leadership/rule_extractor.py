import re
from dataclasses import dataclass


@dataclass
class LeadershipRuleExtractor:
    OWNERSHIP_TERMS = [
        "i led",
        "i owned",
        "i drove",
        "i managed",
        "i spearheaded",
        "took ownership",
        "owned end to end",
        "accountable",
        "ownership",
    ]

    DECISION_TERMS = [
        "i decided",
        "decision",
        "decided",
        "chose",
        "tradeoff",
        "tradeoffs",
        "trade off",
        "prioritized",
        "evaluated options",
    ]

    RISK_TERMS = [
        "risk",
        "mitigated",
        "mitigation",
        "fallback",
        "contingency",
        "failure mode",
        "blast radius",
        "rollback",
    ]

    STAKEHOLDER_TERMS = [
        "stakeholder",
        "product team",
        "cross functional",
        "partnered with",
        "coordinated with",
        "aligned with",
        "engineering manager",
        "security team",
        "leadership team",
        "customer",
    ]

    CONFLICT_TERMS = [
        "conflict",
        "disagreement",
        "pushback",
        "escalation",
        "resolved",
        "negotiated",
        "compromise",
        "alignment issue",
    ]

    def _normalize(self, text: str) -> tuple[str, list[str]]:
        normalized = (text or "").lower()
        normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        tokens = normalized.split()
        return normalized, tokens

    def _count_matches(self, normalized_text: str, phrases: list[str]) -> int:
        if not normalized_text or not phrases:
            return 0

        parts = []
        for phrase in phrases:
            escaped = re.escape(phrase.lower().strip()).replace(r"\ ", r"\s+")
            parts.append(escaped)

        pattern = r"\b(?:" + "|".join(parts) + r")\b"
        return len(re.findall(pattern, normalized_text))

    def extract(self, answer_text: str) -> dict:
        normalized_text, _tokens = self._normalize(answer_text)

        return {
            "ownership_count": self._count_matches(normalized_text, self.OWNERSHIP_TERMS),
            "decision_count": self._count_matches(normalized_text, self.DECISION_TERMS),
            "risk_count": self._count_matches(normalized_text, self.RISK_TERMS),
            "stakeholder_count": self._count_matches(normalized_text, self.STAKEHOLDER_TERMS),
            "conflict_count": self._count_matches(normalized_text, self.CONFLICT_TERMS),
        }
