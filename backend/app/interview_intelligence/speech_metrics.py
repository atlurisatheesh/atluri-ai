"""
Speech Metrics Engine — Real-time WPM calculation, pacing alerts,
answer length tracking, and filler word analytics.
"""

from __future__ import annotations
import re
import time
from dataclasses import dataclass, field, asdict
from enum import Enum


class PaceAlert(str, Enum):
    TOO_FAST = "too_fast"
    SLIGHTLY_FAST = "slightly_fast"
    OPTIMAL = "optimal"
    SLIGHTLY_SLOW = "slightly_slow"
    TOO_SLOW = "too_slow"


class AnswerLengthAlert(str, Enum):
    TOO_SHORT = "too_short"
    GOOD = "good"
    WRAPPING_UP = "wrapping_up"
    TOO_LONG = "too_long"
    OVER_TIME = "over_time"


# Common filler words/phrases
FILLER_PATTERNS = [
    r"\bum+\b",
    r"\buh+\b",
    r"\blike\b",
    r"\byou know\b",
    r"\bsort of\b",
    r"\bkind of\b",
    r"\bbasically\b",
    r"\bactually\b",
    r"\bhonestly\b",
    r"\bliterally\b",
    r"\bi mean\b",
    r"\bso yeah\b",
    r"\banyway(s)?\b",
    r"\bright\?\b",
]

# Passive/weak language markers
WEAK_LANGUAGE_PATTERNS = [
    r"\bi think maybe\b",
    r"\bi.m not sure but\b",
    r"\bperhaps\b",
    r"\bpossibly\b",
    r"\bsomewhat\b",
    r"\bi guess\b",
    r"\bi suppose\b",
    r"\bprobably\b",
]


@dataclass
class SpeechSnapshot:
    """Point-in-time speech metrics for a single answer."""
    wpm: float = 0.0
    total_words: int = 0
    elapsed_seconds: float = 0.0
    filler_count: int = 0
    filler_words: dict[str, int] = field(default_factory=dict)
    weak_language_count: int = 0
    pace_alert: PaceAlert = PaceAlert.OPTIMAL
    pace_message: str = ""
    length_alert: AnswerLengthAlert = AnswerLengthAlert.GOOD
    length_message: str = ""
    confidence_score: float = 1.0  # 0..1, penalized by fillers and weak language


@dataclass
class SessionSpeechStats:
    """Cumulative speech stats across the whole session."""
    total_answers: int = 0
    total_words: int = 0
    total_fillers: int = 0
    avg_wpm: float = 0.0
    avg_answer_seconds: float = 0.0
    filler_breakdown: dict[str, int] = field(default_factory=dict)
    worst_pace_alert: PaceAlert = PaceAlert.OPTIMAL
    answers_too_long: int = 0
    answers_too_short: int = 0


class SpeechMetricsEngine:
    """
    Tracks real-time speech metrics during an interview session.
    Call `start_answer()` when candidate begins speaking,
    `update_transcript()` with each transcript chunk,
    and `end_answer()` to finalize metrics.
    """

    # Ideal pacing range (words per minute)
    WPM_TOO_SLOW = 90
    WPM_SLOW = 110
    WPM_IDEAL_LOW = 120
    WPM_IDEAL_HIGH = 150
    WPM_FAST = 170
    WPM_TOO_FAST = 190

    # Filler alert threshold
    FILLER_ALERT_THRESHOLD = 3

    def __init__(self):
        self._answer_start: float | None = None
        self._current_text: str = ""
        self._max_answer_seconds: int = 120
        self._session_stats = SessionSpeechStats()
        self._compiled_fillers = [re.compile(p, re.IGNORECASE) for p in FILLER_PATTERNS]
        self._compiled_weak = [re.compile(p, re.IGNORECASE) for p in WEAK_LANGUAGE_PATTERNS]

    def start_answer(self, max_seconds: int = 120):
        """Call when the candidate starts speaking a new answer."""
        self._answer_start = time.time()
        self._current_text = ""
        self._max_answer_seconds = max_seconds

    def update_transcript(self, new_text: str) -> SpeechSnapshot:
        """
        Call with each new transcript segment. Returns current metrics.
        Designed to be called every 1-3 seconds with the latest text.
        """
        self._current_text = new_text
        return self._compute_snapshot()

    def end_answer(self) -> SpeechSnapshot:
        """Finalize the answer and update session stats."""
        snapshot = self._compute_snapshot()

        # Update session-level stats
        self._session_stats.total_answers += 1
        self._session_stats.total_words += snapshot.total_words
        self._session_stats.total_fillers += snapshot.filler_count

        # Running average WPM
        n = self._session_stats.total_answers
        self._session_stats.avg_wpm = (
            (self._session_stats.avg_wpm * (n - 1) + snapshot.wpm) / n
        )
        self._session_stats.avg_answer_seconds = (
            (self._session_stats.avg_answer_seconds * (n - 1) + snapshot.elapsed_seconds) / n
        )

        # Filler breakdown merge
        for word, count in snapshot.filler_words.items():
            self._session_stats.filler_breakdown[word] = (
                self._session_stats.filler_breakdown.get(word, 0) + count
            )

        if snapshot.length_alert == AnswerLengthAlert.TOO_LONG:
            self._session_stats.answers_too_long += 1
        elif snapshot.length_alert == AnswerLengthAlert.TOO_SHORT:
            self._session_stats.answers_too_short += 1

        self._answer_start = None
        return snapshot

    def get_session_stats(self) -> SessionSpeechStats:
        return self._session_stats

    def _compute_snapshot(self) -> SpeechSnapshot:
        if not self._answer_start:
            return SpeechSnapshot()

        elapsed = time.time() - self._answer_start
        words = self._current_text.split()
        word_count = len(words)

        # WPM calculation
        wpm = (word_count / max(elapsed, 0.1)) * 60.0

        # Filler word detection
        filler_counts: dict[str, int] = {}
        total_fillers = 0
        for pattern in self._compiled_fillers:
            matches = pattern.findall(self._current_text)
            if matches:
                key = matches[0].lower().strip()
                filler_counts[key] = filler_counts.get(key, 0) + len(matches)
                total_fillers += len(matches)

        # Weak language detection
        weak_count = sum(
            len(p.findall(self._current_text)) for p in self._compiled_weak
        )

        # Pace alert
        pace_alert, pace_msg = self._get_pace_alert(wpm)

        # Length alert
        length_alert, length_msg = self._get_length_alert(elapsed, self._max_answer_seconds)

        # Confidence score (penalized by fillers and weak language)
        confidence = 1.0
        if total_fillers > 0:
            confidence -= min(total_fillers * 0.05, 0.3)
        if weak_count > 0:
            confidence -= min(weak_count * 0.08, 0.3)
        confidence = max(confidence, 0.1)

        return SpeechSnapshot(
            wpm=round(wpm, 1),
            total_words=word_count,
            elapsed_seconds=round(elapsed, 1),
            filler_count=total_fillers,
            filler_words=filler_counts,
            weak_language_count=weak_count,
            pace_alert=pace_alert,
            pace_message=pace_msg,
            length_alert=length_alert,
            length_message=length_msg,
            confidence_score=round(confidence, 2),
        )

    def _get_pace_alert(self, wpm: float) -> tuple[PaceAlert, str]:
        if wpm < self.WPM_TOO_SLOW:
            return PaceAlert.TOO_SLOW, "🚨 Speaking too slowly — pick up the energy"
        if wpm < self.WPM_SLOW:
            return PaceAlert.SLIGHTLY_SLOW, "⬆️ Slightly slow — increase pace 10%"
        if wpm <= self.WPM_IDEAL_HIGH:
            return PaceAlert.OPTIMAL, "✅ Perfect pace"
        if wpm <= self.WPM_FAST:
            return PaceAlert.SLIGHTLY_FAST, "⬇️ Slightly fast — slow down 10%"
        return PaceAlert.TOO_FAST, "🚨 Speaking too fast — slow down and breathe"

    def _get_length_alert(self, elapsed: float, max_sec: int) -> tuple[AnswerLengthAlert, str]:
        if elapsed < 20:
            return AnswerLengthAlert.TOO_SHORT, "📏 Very short — add more detail"
        if elapsed < max_sec * 0.7:
            return AnswerLengthAlert.GOOD, f"✅ Good length ({int(elapsed)}s / {max_sec}s)"
        if elapsed < max_sec * 0.9:
            return AnswerLengthAlert.WRAPPING_UP, f"⏱ Start wrapping up — {int(max_sec - elapsed)}s remaining"
        if elapsed <= max_sec:
            return AnswerLengthAlert.TOO_LONG, f"⚠️ Wrap up NOW — {int(max_sec - elapsed)}s left"
        return AnswerLengthAlert.OVER_TIME, f"🚨 Over time by {int(elapsed - max_sec)}s — stop and conclude"


def snapshot_to_coaching_chips(snapshot: SpeechSnapshot) -> list[str]:
    """Convert a speech snapshot into small floating coaching chips for the UI."""
    chips: list[str] = []

    if snapshot.pace_alert != PaceAlert.OPTIMAL:
        chips.append(snapshot.pace_message)

    if snapshot.length_alert not in (AnswerLengthAlert.GOOD, AnswerLengthAlert.TOO_SHORT):
        chips.append(snapshot.length_message)

    if snapshot.filler_count >= 3:
        top_filler = max(snapshot.filler_words, key=snapshot.filler_words.get, default="um")
        chips.append(f"🗣 Reduce filler words — '{top_filler}' used {snapshot.filler_words.get(top_filler, 0)} times")

    if snapshot.weak_language_count > 0:
        chips.append("💪 Use stronger language — avoid 'I think maybe', 'probably'")

    if snapshot.wpm > 0 and snapshot.total_words > 10:
        chips.append(f"📊 {snapshot.wpm:.0f} WPM | {snapshot.total_words} words | {snapshot.elapsed_seconds:.0f}s")

    return chips[:4]  # Max 4 coaching chips at a time


def snapshot_to_dict(snapshot: SpeechSnapshot) -> dict:
    data = asdict(snapshot)
    data["pace_alert"] = snapshot.pace_alert.value
    data["length_alert"] = snapshot.length_alert.value
    return data
