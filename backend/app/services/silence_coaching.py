"""
Silence Coaching Engine

Detects user silence during interview sessions and provides proactive coaching
prompts to help hesitant, nervous, or stuck candidates.

Trigger Levels:
    Level 1 (8s silence):  Gentle encouragement
    Level 2 (15s silence): Structured help offer
    Level 3 (25s silence): Direct framework suggestion with opening line

The real user test (Feb 28, 2026) showed Silent/Hesitant personas scored
25/100 because the system never prompted. This engine fixes that.
"""

import logging
import time
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger("silence_coach")


@dataclass
class SilenceCoachingPrompt:
    """A coaching prompt triggered by user silence."""
    level: int  # 1, 2, or 3
    message: str
    suggested_opener: str = ""
    framework_hint: str = ""
    seconds_silent: float = 0.0


# Coaching templates by question type
_BEHAVIORAL_OPENERS = [
    "In my experience at [company], I faced a similar situation...",
    "One example that comes to mind is when I...",
    "I'd approach this by sharing a specific experience where I...",
]

_TECHNICAL_OPENERS = [
    "The key considerations for this problem are...",
    "Let me break this down into the core components...",
    "I'd start by clarifying the constraints and then...",
]

_SYSTEM_DESIGN_OPENERS = [
    "I'd start with the high-level architecture and then drill down...",
    "Let me first clarify the functional requirements, then discuss the system...",
    "The main components I'd design for this are...",
]

_GENERAL_OPENERS = [
    "Based on my experience, I would say...",
    "That's a great question. Let me think about this systematically...",
    "I'd approach this from the perspective of...",
]


def _get_opener_for_type(question_type: str, index: int = 0) -> str:
    """Get a suggested opening line based on question type."""
    openers = {
        "behavioral": _BEHAVIORAL_OPENERS,
        "technical": _TECHNICAL_OPENERS,
        "system_design": _SYSTEM_DESIGN_OPENERS,
        "coding": _TECHNICAL_OPENERS,
    }
    pool = openers.get(question_type, _GENERAL_OPENERS)
    return pool[index % len(pool)]


def _get_framework_for_type(question_type: str) -> str:
    """Get a framework hint for the question type."""
    frameworks = {
        "behavioral": "Use the STAR framework: Situation → Task → Action → Result",
        "technical": "Structure: Definition → How it works → When to use → Trade-offs",
        "system_design": "Structure: Requirements → High-level design → Deep dive → Trade-offs",
        "coding": "Structure: Understand → Approach → Code → Test → Optimize",
        "hr": "Be authentic. Share your genuine motivation and values.",
    }
    return frameworks.get(question_type, "Take a moment to organize your thoughts, then start with your main point.")


class SilenceCoachingEngine:
    """Monitors silence duration and generates coaching prompts."""

    # Configurable thresholds (seconds)
    LEVEL_1_SEC = 8.0   # Gentle encouragement
    LEVEL_2_SEC = 15.0  # Help offer
    LEVEL_3_SEC = 25.0  # Direct suggestion

    def __init__(self):
        self._last_speech_ts: float = time.time()
        self._last_prompt_level: int = 0  # Prevents re-firing same level
        self._current_question: str = ""
        self._current_question_type: str = "general"
        self._prompt_count: int = 0
        self._max_prompts_per_question: int = 3

    def on_speech_activity(self) -> None:
        """Called when any speech is detected (partial or final transcript)."""
        self._last_speech_ts = time.time()
        self._last_prompt_level = 0  # Reset prompt level on speech

    def on_new_question(self, question_text: str, question_type: str = "general") -> None:
        """Called when a new question is detected."""
        self._current_question = question_text
        self._current_question_type = question_type
        self._last_speech_ts = time.time()
        self._last_prompt_level = 0
        self._prompt_count = 0

    def check_silence(self) -> Optional[SilenceCoachingPrompt]:
        """
        Check if user has been silent long enough to trigger a coaching prompt.
        Returns a SilenceCoachingPrompt if triggered, None otherwise.
        Call this in the silence_watcher loop (~every 0.5s).
        """
        if self._prompt_count >= self._max_prompts_per_question:
            return None

        now = time.time()
        silence_duration = now - self._last_speech_ts

        # Level 3: Direct suggestion with opener
        if silence_duration >= self.LEVEL_3_SEC and self._last_prompt_level < 3:
            self._last_prompt_level = 3
            self._prompt_count += 1
            opener = _get_opener_for_type(self._current_question_type, self._prompt_count)
            framework = _get_framework_for_type(self._current_question_type)
            return SilenceCoachingPrompt(
                level=3,
                message="Here's a suggested opening based on the question — feel free to adapt it to your experience.",
                suggested_opener=opener,
                framework_hint=framework,
                seconds_silent=silence_duration,
            )

        # Level 2: Structured help
        if silence_duration >= self.LEVEL_2_SEC and self._last_prompt_level < 2:
            self._last_prompt_level = 2
            self._prompt_count += 1
            framework = _get_framework_for_type(self._current_question_type)
            return SilenceCoachingPrompt(
                level=2,
                message="Would you like me to help structure your answer? Try starting with your main point, then add a specific example.",
                framework_hint=framework,
                seconds_silent=silence_duration,
            )

        # Level 1: Gentle encouragement
        if silence_duration >= self.LEVEL_1_SEC and self._last_prompt_level < 1:
            self._last_prompt_level = 1
            self._prompt_count += 1
            return SilenceCoachingPrompt(
                level=1,
                message="Take your time. When you're ready, start with the first thing that comes to mind.",
                seconds_silent=silence_duration,
            )

        return None
