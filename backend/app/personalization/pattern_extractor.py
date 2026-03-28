"""
Pattern Extractor — STAR Story Bank & Speaking Pattern Analysis

Extracts STAR (Situation-Task-Action-Result) stories from a user's past
answers, tags them by theme, and detects overuse patterns.

Also extracts:
- Confidence markers (words used when confident vs uncertain)
- Opening patterns (how the user typically starts answers)
- Closing patterns (how the user typically ends)
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger("pattern_extractor")


@dataclass
class STARStory:
    """An extracted STAR story from a user's answer."""
    situation: str = ""
    task: str = ""
    action: str = ""
    result: str = ""
    theme: str = ""  # leadership, conflict, failure, teamwork, etc.
    source_question: str = ""
    strength_score: float = 0.0  # 0.0-1.0 based on completeness
    use_count: int = 1

    def to_dict(self) -> dict:
        return {
            "situation": self.situation,
            "task": self.task,
            "action": self.action,
            "result": self.result,
            "theme": self.theme,
            "source_question": self.source_question,
            "strength_score": round(self.strength_score, 2),
            "use_count": self.use_count,
        }


@dataclass
class SpeakingPatterns:
    """Extracted speaking patterns from a user's answer history."""
    opening_patterns: list[str] = field(default_factory=list)
    closing_patterns: list[str] = field(default_factory=list)
    confidence_markers: list[str] = field(default_factory=list)
    hedging_markers: list[str] = field(default_factory=list)
    star_stories: list[STARStory] = field(default_factory=list)
    overused_stories: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "opening_patterns": self.opening_patterns[:5],
            "closing_patterns": self.closing_patterns[:5],
            "confidence_markers": self.confidence_markers[:10],
            "hedging_markers": self.hedging_markers[:10],
            "star_stories": [s.to_dict() for s in self.star_stories[:20]],
            "overused_stories": self.overused_stories[:5],
        }


# Theme keywords for story classification
_THEME_KEYWORDS = {
    "leadership": ["led", "managed", "directed", "organized", "delegated", "mentored", "coached"],
    "conflict": ["disagreement", "conflict", "tension", "challenged", "pushed back", "difficult"],
    "failure": ["failed", "mistake", "wrong", "setback", "learned", "pivoted"],
    "teamwork": ["collaborated", "team", "together", "cross-functional", "partnered"],
    "innovation": ["created", "built", "designed", "invented", "improved", "optimized"],
    "pressure": ["deadline", "urgent", "pressure", "critical", "emergency", "crunch"],
    "growth": ["learned", "grew", "developed", "improved", "advanced", "promoted"],
    "customer": ["customer", "client", "user", "stakeholder", "feedback"],
}

# Confidence vs hedging markers
_CONFIDENCE_MARKERS = [
    "definitely", "absolutely", "clearly", "specifically", "precisely",
    "directly", "exactly", "certainly", "strongly", "consistently",
]

_HEDGING_MARKERS = [
    "maybe", "perhaps", "possibly", "somewhat", "kind of", "sort of",
    "i think", "i guess", "i suppose", "i believe", "probably",
    "might", "could be", "not sure", "it depends",
]


def _classify_theme(text: str) -> str:
    """Classify the theme of a story based on keywords."""
    lower = text.lower()
    theme_scores = {}
    for theme, keywords in _THEME_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score > 0:
            theme_scores[theme] = score

    if not theme_scores:
        return "general"
    return max(theme_scores, key=theme_scores.get)


def _extract_star_components(text: str) -> tuple[str, str, str, str]:
    """
    Extract STAR components from an answer using pattern matching.
    This is a heuristic — not perfect, but catches common patterns.
    """
    sentences = re.split(r'[.!]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip().split()) >= 5]

    if len(sentences) < 2:
        return ("", "", "", "")

    situation = ""
    task = ""
    action = ""
    result = ""

    for sent in sentences:
        lower = sent.lower()
        # Result indicators (check first — usually at end)
        if any(w in lower for w in ["result", "outcome", "achieved", "improved", "reduced",
                                     "increased", "saved", "delivered", "launched", "%",
                                     "as a result", "this led to", "we ended up"]):
            result = sent
            continue
        # Action indicators
        if any(w in lower for w in ["i led", "i built", "i created", "i implemented",
                                     "i organized", "i decided", "i worked", "i developed",
                                     "my approach", "i took", "i proposed", "i solved"]):
            action = sent
            continue
        # Task indicators
        if any(w in lower for w in ["needed to", "had to", "goal was", "objective was",
                                     "challenge was", "responsibility was", "tasked with"]):
            task = sent
            continue
        # Situation (usually first)
        if not situation and any(w in lower for w in ["at my", "in my role", "when i was",
                                                       "during my", "at", "while working"]):
            situation = sent

    # Fallback: first sentence = situation, last = result
    if not situation and sentences:
        situation = sentences[0]
    if not result and len(sentences) >= 2:
        result = sentences[-1]

    return (situation, task, action, result)


def _score_star_completeness(situation: str, task: str, action: str, result: str) -> float:
    """Score how complete a STAR story is (0.0-1.0)."""
    score = 0.0
    if situation:
        score += 0.2
    if task:
        score += 0.2
    if action:
        score += 0.3  # Action is most important
    if result:
        score += 0.3  # Result is most important
        # Bonus for quantified results
        if re.search(r'\d+%|\$\d+|\d+x|\d+ (times|percent|people|users|team)', result):
            score = min(1.0, score + 0.1)
    return score


def extract_patterns(
    answers: list[str],
    questions: list[str] | None = None,
) -> SpeakingPatterns:
    """
    Analyze a collection of user answers to extract speaking patterns.
    
    Args:
        answers: List of user's answer texts.
        questions: Optional list of corresponding questions.
        
    Returns:
        SpeakingPatterns with STAR stories, confidence markers, etc.
    """
    if not answers:
        return SpeakingPatterns()

    opening_patterns = []
    closing_patterns = []
    confidence_found = []
    hedging_found = []
    stories = []

    for i, answer in enumerate(answers):
        if not answer or len(answer.strip()) < 20:
            continue

        sentences = re.split(r'[.!]+', answer)
        sentences = [s.strip() for s in sentences if s.strip()]

        # Extract opening pattern (first 10 words)
        if sentences:
            first_words = " ".join(sentences[0].split()[:10])
            opening_patterns.append(first_words)

        # Extract closing pattern (last 10 words)
        if len(sentences) >= 2:
            last_words = " ".join(sentences[-1].split()[-10:])
            closing_patterns.append(last_words)

        # Detect confidence and hedging markers
        lower = answer.lower()
        for marker in _CONFIDENCE_MARKERS:
            if marker in lower:
                confidence_found.append(marker)
        for marker in _HEDGING_MARKERS:
            if marker in lower:
                hedging_found.append(marker)

        # Extract STAR stories from behavioral answers
        situation, task, action, result = _extract_star_components(answer)
        completeness = _score_star_completeness(situation, task, action, result)
        if completeness >= 0.4:  # At least 2 clear STAR components
            theme = _classify_theme(answer)
            question_text = questions[i] if questions and i < len(questions) else ""
            stories.append(STARStory(
                situation=situation,
                task=task,
                action=action,
                result=result,
                theme=theme,
                source_question=question_text[:200],
                strength_score=completeness,
            ))

    # Detect overused stories (similar situations mentioned 3+ times)
    overused = []
    situation_texts = [s.situation.lower()[:50] for s in stories if s.situation]
    from collections import Counter
    for text, count in Counter(situation_texts).items():
        if count >= 3 and text:
            overused.append(f"Story about '{text[:40]}...' used {count} times — consider diversifying")

    return SpeakingPatterns(
        opening_patterns=list(set(opening_patterns))[:5],
        closing_patterns=list(set(closing_patterns))[:5],
        confidence_markers=list(set(confidence_found)),
        hedging_markers=list(set(hedging_found)),
        star_stories=stories,
        overused_stories=overused,
    )
