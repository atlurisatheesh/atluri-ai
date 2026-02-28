from typing import List, Optional
import uuid

from .models import InterviewTurnAnalysis
from . import rules


class InterviewState:
    """
    Holds evolving interview intelligence for ONE session.
    """

    def __init__(self):
        self.session_id: str = str(uuid.uuid4())

        self.interview_phase: str = rules.PHASE_TECHNICAL
        self.question_type: str = "unknown"

        self.turns: List[InterviewTurnAnalysis] = []

        self.candidate_confidence: float = 1.0
        self.interviewer_pressure: str = "low"
        self.last_question: Optional[str] = None
        self.turn_index: int = 0


    # -------------------------
    # CONFIDENCE
    # -------------------------

    def update_confidence(self, hesitation_events: int):
        penalty = min(
            hesitation_events / rules.MAX_HESITATIONS_PER_TURN,
            1.0
        )
        self.candidate_confidence = max(
            self.candidate_confidence - (penalty * 0.2),
            0.0
        )

    # -------------------------
    # PRESSURE (v1 heuristic)
    # -------------------------

    def update_pressure(self, speaker: str):
        if speaker == "interviewer":
            self.interviewer_pressure = "medium"
