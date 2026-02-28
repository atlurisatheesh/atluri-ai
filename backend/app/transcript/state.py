from typing import List, Optional
import time

from .models import TranscriptEvent, TranscriptTurn
from . import rules


class TranscriptState:
    """
    Holds all transcript-related state for ONE interview session.
    """

    # def __init__(self):
    #     # FINAL truth events
    #     self.events: List[TranscriptEvent] = []

    #     # Current turn being built
    #     self.current_turn: Optional[TranscriptTurn] = None

    #     # Partial (non-final) tracking
    #     self.partial_text: str = ""
    #     self.last_partial_ts: Optional[float] = None

    #     # Timing
    #     self.last_speech_ts: Optional[float] = None
    #     self.last_final_ts: Optional[float] = None

    #     # Hesitation tracking
    #     self.hesitation_events: int = 0

    
    def __init__(self):
        # FINAL truth events
        self.events: List[TranscriptEvent] = []

        # Current turn being built
        self.current_turn: Optional[TranscriptTurn] = None

        # 🔥 ADD THESE (ENGINE EXPECTS THEM)
        self.current_speaker: Optional[str] = None
        self.turn_id: int = 0
        self.last_update_ts: Optional[float] = None

        # Partial (non-final) tracking
        self.partial_text: str = ""
        self.last_partial_ts: Optional[float] = None

        # Timing
        self.last_speech_ts: Optional[float] = None
        self.last_final_ts: Optional[float] = None

        # Hesitation tracking
        self.hesitation_events: int = 0


    # -------------------------
    # PARTIAL HANDLING
    # -------------------------

    def register_partial(self, text: str, ts: float):
        """
        Update partial buffer.
        NEVER committed to truth.
        """
        if not self.partial_text:
            self.partial_text = text.strip()
        else:
            self.partial_text += " " + text.strip()

        self.last_partial_ts = ts
        self.last_speech_ts = ts

    # -------------------------
    # FINAL HANDLING
    # -------------------------

    def register_final_event(self, event: TranscriptEvent):
        """
        Commit final transcript to truth.
        """
        self.events.append(event)

        if self.current_turn is None:
            self.current_turn = TranscriptTurn(
                speaker=event.speaker,
                text=event.text,
                start_ts=event.start_ts,
                end_ts=event.end_ts,
            )
        else:
            # Same speaker → append
            self.current_turn.text += " " + event.text
            self.current_turn.end_ts = event.end_ts

        self.last_final_ts = event.end_ts
        self.last_speech_ts = event.end_ts

        # Reset partials
        # self.partial_text = ""
        # self.last_partial_ts = None

    # -------------------------
    # SILENCE / COMPLETION
    # -------------------------

    def update_silence(self, now_ts: float):
        """
        Called periodically (or on silence).
        Detect hesitation and completion.
        """
        if self.last_speech_ts is None:
            return

        silence = now_ts - self.last_speech_ts

        # Hesitation detection
        if (
            rules.HESITATION_MIN <= silence < rules.HESITATION_MAX
        ):
            self.hesitation_events += 1

        # Thought completion
        if (
            silence >= rules.THOUGHT_COMPLETE_MIN
            and self.current_turn
            and not self.current_turn.is_complete
        ):
            self.current_turn.is_complete = True
            self.current_turn.duration = (
                self.current_turn.end_ts - self.current_turn.start_ts
            )
            self.current_turn.hesitation_events = self.hesitation_events

    # -------------------------
    # TURN FINALIZATION
    # -------------------------

    def finalize_turn_if_complete(self) -> Optional[TranscriptTurn]:
        """
        If a turn is complete, return it and reset.
        """
        if self.current_turn and self.current_turn.is_complete:
            finished = self.current_turn
            self.current_turn = None
            self.hesitation_events = 0
            return finished
        return None
