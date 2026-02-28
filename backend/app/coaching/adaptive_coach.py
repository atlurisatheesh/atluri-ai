from dataclasses import dataclass
from typing import List


UNCERTAIN_PHRASES = ["i think", "maybe", "probably", "not sure"]

STAR_PATTERNS = {
    "situation": ["project", "previous role", "team", "context"],
    "task": ["responsible", "goal", "objective"],
    "action": ["implemented", "designed", "built", "optimized", "migrated"],
    "result": ["result", "improved", "reduced", "increased", "%"],
}


@dataclass
class CoachingInput:
    transcript: str
    confidence: float
    hesitation_count: int


class AdaptiveCoach:
    def _count_fillers(self, text: str) -> int:
        tokens = text.lower().split()
        count = 0

        for i, token in enumerate(tokens):
            if token == "you" and i + 1 < len(tokens) and tokens[i + 1] == "know":
                count += 1
                continue

            if token in {"um", "uh", "like", "basically", "actually"}:
                count += 1

        return count

    def _star_score(self, text: str) -> int:
        lower = text.lower()
        score = 0

        for _, patterns in STAR_PATTERNS.items():
            if any(pattern in lower for pattern in patterns):
                score += 1

        return score

    def analyze(self, payload: CoachingInput) -> List[str]:
        text = payload.transcript.strip()
        if not text:
            return []

        tips: List[str] = []
        word_count = len(text.split())
        filler_count = self._count_fillers(text)
        star_score = self._star_score(text)

        confidence = payload.confidence
        if confidence > 1:
            confidence = confidence / 100.0

        if word_count < 10:
            return ["Provide a more complete answer with specific technical details."]

        if payload.hesitation_count > 3 or filler_count >= 3:
            tips.append("Reduce pauses and filler words to sound more confident.")

        if word_count < 25:
            tips.append("Expand your answer with one concrete example and measurable impact.")

        if confidence < 0.6 or any(p in text.lower() for p in UNCERTAIN_PHRASES):
            tips.append("Use confident wording and avoid uncertainty phrases.")

        if star_score < 2:
            tips.append("Structure using STAR: Situation, Task, Action, Result.")

        if word_count > 110:
            tips.append("Keep it concise: lead with impact, then key technical details.")

        return tips[:3]
