# import time
# from typing import Optional

# from .models import TranscriptEvent, TranscriptTurn
# from .state import TranscriptState


# class TranscriptTruthEngine:
#     """
#     Deterministic engine.
#     No AI.
#     No guesses.
#     """

    
#     def __init__(self):
#         # self._current_turn = None          # 🔥 REQUIRED
#         self._last_update_ts = None
#         # self._partial_text = ""
#         self.turns = []


#     # -------------------------
#     # INPUT API (FROM STT)
#     # -------------------------

#     def ingest_partial(
#         self,
#         text: str,
#         speaker: str = "unknown",
#         source: str = "unknown",
#         ts: Optional[float] = None,
#     ):
#         """
#         Handle streaming partials.
#         """
#         now = ts or time.time()
#         self.state.register_partial(text=text, ts=now)

#     def ingest_final(
#         self,
#         text: str,
#         speaker: str = "unknown",
#         source: str = "unknown",
#         start_ts: float = None,
#         end_ts: float = None,
#         confidence: Optional[float] = None,
#     ):
#         """
#         Handle FINAL transcripts ONLY.
#         """
#         now = time.time()

#         event = TranscriptEvent(
#             source=source,
#             speaker=speaker,
#             text=text.strip(),
#             confidence=confidence,
#             start_ts=start_ts or now,
#             end_ts=end_ts or now,
#             received_ts=now,
#         )

#         self.state.register_final_event(event)

#     # -------------------------
#     # TIME PROGRESSION
#     # -------------------------

#     def tick(self) -> Optional[TranscriptTurn]:
#         """
#         Advance time-based logic.
#         Call every ~500ms.
#         """
#         now = time.time()
#         self.state.update_silence(now)
#         return self.state.finalize_turn_if_complete()
    
#     def force_finalize(self):
#         """
#         Force-complete the current turn when silence is detected,
#         even if Deepgram never sent is_final=True.
#         """

#         # 🔴 IMPORTANT: use partial buffer, NOT _current_turn
#         if not getattr(self, "partial_text", None):
#             return None

#         text = self.partial_text.strip()
#         if not text:
#             return None

#         completed = TranscriptTurn(
#             turn_id=self.turn_id,
#             speaker=self.current_speaker,
#             text=text,
#             hesitation_events=self.hesitation_events,
#         )

#         # 🔥 RESET STATE
#         self.partial_text = ""
#         self.hesitation_events = 0
#         self.turn_id += 1

#         return completed

#     # -------------------------
#     # DEBUG / VISIBILITY
#     # -------------------------

#     def snapshot(self) -> dict:
#         """
#         Debug snapshot (safe for logs).
#         """
#         return {
#             "events_count": len(self.state.events),
#             "current_partial": self.state.partial_text,
#             "current_turn_text": (
#                 self.state.current_turn.text
#                 if self.state.current_turn
#                 else None
#             ),
#             "hesitations": self.state.hesitation_events,
#         }



import time
import logging
from typing import Optional

from .models import TranscriptEvent, TranscriptTurn
from .state import TranscriptState

logging.basicConfig(
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("transcript_engine")


class TranscriptTruthEngine:
    """
    Deterministic transcript engine.
    No AI.
    No guesses.
    Single source of truth = TranscriptState.
    """

    def __init__(self):
        # 🔥 ONE state only
        self.state = TranscriptState()

        # 🔒 DUPLICATE FINALIZATION GUARD
        self.state.last_final_text = None

        # =========================
        # 🔥 QUALITY METRICS (NEW)
        # =========================
        self.state.word_count = 0
        self.state.pause_count = 0
        self.state.total_silence = 0.0

    def ingest_partial(
        self,
        text: str,
        speaker: str = "candidate",
        source: str = "deepgram",
        ts: Optional[float] = None,
    ):
        now = ts or time.time()

        if not self.state.current_speaker:
            self.state.current_speaker = speaker

        self.state.partial_text = text.strip()
        self.state.last_update_ts = now
        logger.info("PARTIAL_BUFFER updated")

    def ingest_final(
        self,
        text: str,
        speaker: str = "candidate",
        source: str = "deepgram",
        start_ts: Optional[float] = None,
        end_ts: Optional[float] = None,
        confidence: Optional[float] = None,
    ):
        now = time.time()

        event = TranscriptEvent(
            source=source,
            speaker=speaker,
            text=text.strip(),
            confidence=confidence,
            start_ts=start_ts or now,
            end_ts=end_ts or now,
            received_ts=now,
        )

        self.state.register_final_event(event)

        # 🔥 METRICS
        self.state.word_count += len(text.split())

        logger.info("FINAL_EVENT ingested")

    def get_full_text(self) -> str:
        """
        Returns the last finalized transcript text.
        No finalize side effects here; ws_voice owns turn completion.
        """
        return (self.state.last_final_text or "").strip()

    def force_finalize(self, use_text: str | None = None):
        text = (use_text or self.state.partial_text or "").strip()

        if not text:
            return None

        if text == self.state.last_final_text:
            print("⚠️ Duplicate finalize ignored")
            return None

        self.state.last_final_text = text

        turn = TranscriptTurn(
            turn_id=self.state.turn_id,
            speaker=self.state.current_speaker,
            text=text,
            start_ts=self.state.turn_start_ts,
            end_ts=time.time(),
            duration=time.time() - self.state.turn_start_ts,
            hesitation_events=self.state.pause_count,
            is_complete=True,
        )

        # =========================
        # 🔄 RESET TURN STATE
        # =========================
        self.state.partial_text = ""
        self.state.current_speaker = None
        self.state.turn_id += 1

        # 🔥 RESET METRICS FOR NEXT TURN
        self.state.word_count = 0
        self.state.pause_count = 0
        self.state.total_silence = 0.0

        return turn

    def snapshot(self) -> dict:
        return {
            "partial_text": self.state.partial_text,
            "current_speaker": self.state.current_speaker,
            "turn_id": self.state.turn_id,
            "word_count": self.state.word_count,
            "pause_count": self.state.pause_count,
            "total_silence": round(self.state.total_silence, 2),
        }
