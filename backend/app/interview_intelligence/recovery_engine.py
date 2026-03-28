"""
Content Recovery Engine — Detects when a candidate goes blank or struggles,
and provides bridge phrases, pivot strategies, and buy-time techniques.
"""

from __future__ import annotations
import time
from dataclasses import dataclass, asdict
from enum import Enum


class RecoveryTrigger(str, Enum):
    SILENCE = "silence"                 # No speech for 5+ seconds
    FILLER_STORM = "filler_storm"       # 5+ fillers in 15 seconds
    REPETITION = "repetition"           # Repeating same phrase
    PANIC_MARKERS = "panic_markers"     # "I don't know", "I'm not sure"
    DRIFT = "drift"                     # Straying far from the question
    SHORT_CIRCUIT = "short_circuit"     # Abruptly ending after <15 seconds


@dataclass
class RecoveryPacket:
    trigger: RecoveryTrigger
    severity: str  # low / medium / high
    bridge_phrase: str
    redirect_suggestion: str
    buy_time_phrase: str
    recovery_strategy: str


# ── Bridge phrases (natural, conversational) ─────────────────────────

_BRIDGE_PHRASES = {
    RecoveryTrigger.SILENCE: [
        "That's a great question — let me think through this systematically.",
        "I want to make sure I give you a thorough answer. Let me organize my thoughts.",
        "There are several angles to consider here. Let me walk through the most relevant one.",
    ],
    RecoveryTrigger.FILLER_STORM: [
        "Let me take a step back and structure this more clearly.",
        "To put it more precisely...",
        "The key point I want to make is...",
    ],
    RecoveryTrigger.REPETITION: [
        "Let me approach this from a different angle.",
        "To build on that point with a specific example...",
        "Another way to frame this is...",
    ],
    RecoveryTrigger.PANIC_MARKERS: [
        "While I haven't encountered that exact scenario, here's a closely related experience...",
        "That's not my direct area of expertise, but here's how I'd approach it methodically...",
        "I'd want to learn more about your specific context, but my instinct based on similar work would be...",
    ],
    RecoveryTrigger.DRIFT: [
        "Coming back to the core of your question...",
        "To directly answer what you're asking...",
        "The most relevant point here is...",
    ],
    RecoveryTrigger.SHORT_CIRCUIT: [
        "Let me expand on that with a concrete example.",
        "And to add more context to that answer...",
        "I should also mention that...",
    ],
}

_BUY_TIME_PHRASES = [
    "Before I answer, could I clarify — are you asking about X or Y?",
    "That's a nuanced question. Could you tell me more about the specific context?",
    "I want to give you the most relevant answer — is this for [technical/strategic] context?",
]

_REDIRECT_STRATEGIES = {
    RecoveryTrigger.SILENCE: "Pivot to a related strength from your resume that connects to this topic.",
    RecoveryTrigger.FILLER_STORM: "Pause briefly, take a breath, then restart the sentence cleanly.",
    RecoveryTrigger.REPETITION: "Introduce a NEW data point: a metric, a team member, a tool you used.",
    RecoveryTrigger.PANIC_MARKERS: "Bridge to a transferable skill: 'While I haven't done X, I have done Y which is analogous because...'",
    RecoveryTrigger.DRIFT: "Name the question back: 'You asked about X, and the key insight is...'",
    RecoveryTrigger.SHORT_CIRCUIT: "Add the 'so what': explain the IMPACT and LEARNING from your brief answer.",
}


class RecoveryEngine:
    """
    Monitors speech signals and triggers recovery assistance when
    the candidate appears to be struggling.
    """

    SILENCE_THRESHOLD_SEC = 5.0
    FILLER_STORM_COUNT = 5
    FILLER_STORM_WINDOW_SEC = 15.0
    SHORT_CIRCUIT_SEC = 15.0

    def __init__(self):
        self._last_speech_time: float = time.time()
        self._filler_timestamps: list[float] = []
        self._phrase_counter: int = 0
        self._recovery_active = False

    def on_speech_detected(self):
        """Call whenever new speech is detected."""
        self._last_speech_time = time.time()

    def on_filler_detected(self):
        """Call whenever a filler word is detected."""
        now = time.time()
        self._filler_timestamps.append(now)
        # Trim old entries
        self._filler_timestamps = [
            t for t in self._filler_timestamps
            if now - t < self.FILLER_STORM_WINDOW_SEC
        ]

    def check_silence(self) -> RecoveryPacket | None:
        """Check if candidate has been silent too long."""
        elapsed = time.time() - self._last_speech_time
        if elapsed >= self.SILENCE_THRESHOLD_SEC:
            return self._build_recovery(RecoveryTrigger.SILENCE, "high" if elapsed > 10 else "medium")
        return None

    def check_filler_storm(self) -> RecoveryPacket | None:
        """Check if candidate is using too many fillers."""
        if len(self._filler_timestamps) >= self.FILLER_STORM_COUNT:
            return self._build_recovery(RecoveryTrigger.FILLER_STORM, "medium")
        return None

    def check_panic_markers(self, text: str) -> RecoveryPacket | None:
        """Check for panic language in recent speech."""
        panic_phrases = [
            "i don't know", "i'm not sure", "i have no idea",
            "i can't think of", "i'm blanking", "nothing comes to mind",
            "i'm drawing a blank", "i've never",
        ]
        text_lower = text.lower()
        for phrase in panic_phrases:
            if phrase in text_lower:
                return self._build_recovery(RecoveryTrigger.PANIC_MARKERS, "high")
        return None

    def check_drift(self, question_text: str, answer_text: str) -> RecoveryPacket | None:
        """Basic drift detection — checks if key question words appear in answer."""
        if len(answer_text.split()) < 30:
            return None  # Too early to tell

        q_words = set(question_text.lower().split()) - _STOP_WORDS
        a_words = set(answer_text.lower().split())
        overlap = len(q_words & a_words) / max(len(q_words), 1)
        if overlap < 0.15:
            return self._build_recovery(RecoveryTrigger.DRIFT, "medium")
        return None

    def check_short_circuit(self, answer_duration: float, answer_text: str) -> RecoveryPacket | None:
        """Detect if candidate ended answer too abruptly."""
        word_count = len(answer_text.split())
        if answer_duration < self.SHORT_CIRCUIT_SEC and word_count < 25:
            return self._build_recovery(RecoveryTrigger.SHORT_CIRCUIT, "low")
        return None

    def check_all(self, question_text: str = "", answer_text: str = "", answer_duration: float = 0) -> RecoveryPacket | None:
        """Run all recovery checks. Returns the highest-priority trigger or None."""
        checks = [
            self.check_panic_markers(answer_text),
            self.check_silence(),
            self.check_filler_storm(),
            self.check_drift(question_text, answer_text),
            self.check_short_circuit(answer_duration, answer_text),
        ]
        # Return first non-None (ordered by severity)
        for result in checks:
            if result is not None:
                self._recovery_active = True
                return result
        self._recovery_active = False
        return None

    @property
    def is_recovery_active(self) -> bool:
        return self._recovery_active

    def _build_recovery(self, trigger: RecoveryTrigger, severity: str) -> RecoveryPacket:
        import random
        phrases = _BRIDGE_PHRASES.get(trigger, _BRIDGE_PHRASES[RecoveryTrigger.SILENCE])
        return RecoveryPacket(
            trigger=trigger,
            severity=severity,
            bridge_phrase=random.choice(phrases),
            redirect_suggestion=_REDIRECT_STRATEGIES.get(trigger, "Pivot to a related strength."),
            buy_time_phrase=random.choice(_BUY_TIME_PHRASES),
            recovery_strategy=f"Recovery for {trigger.value}: {_REDIRECT_STRATEGIES.get(trigger, '')}",
        )


def recovery_to_dict(packet: RecoveryPacket | None) -> dict | None:
    if packet is None:
        return None
    data = asdict(packet)
    data["trigger"] = packet.trigger.value
    return data


_STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "between",
    "through", "after", "before", "above", "below", "and", "but", "or",
    "not", "no", "if", "then", "than", "too", "very", "just", "that",
    "this", "these", "those", "it", "its", "my", "your", "his", "her",
    "our", "their", "what", "which", "who", "whom", "when", "where",
    "how", "why", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "only", "own", "same", "so", "up", "out",
    "me", "you", "he", "she", "we", "they", "i", "tell",
}
