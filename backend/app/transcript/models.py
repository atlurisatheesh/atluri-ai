from dataclasses import dataclass, field
from typing import Optional
import uuid


@dataclass
class TranscriptEvent:
    """
    Raw, immutable event created ONLY from FINAL STT results.
    This is the ground truth.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source: str = "unknown"  # deepgram | whisper
    speaker: str = "unknown"  # interviewer | candidate | unknown
    text: str = ""
    confidence: Optional[float] = None

    start_ts: float = 0.0
    end_ts: float = 0.0
    received_ts: float = 0.0


@dataclass
class TranscriptTurn:
    """
    Aggregated, human-level turn.
    What downstream AI consumes.
    """
    turn_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    speaker: str = "unknown"

    text: str = ""
    start_ts: float = 0.0
    end_ts: float = 0.0
    duration: float = 0.0

    hesitation_events: int = 0
    is_complete: bool = False
