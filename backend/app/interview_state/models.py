from dataclasses import dataclass, field
from typing import List, Optional
import uuid


@dataclass
class InterviewTurnAnalysis:
    """
    Analysis of ONE completed transcript turn.
    """
    turn_id: str
    speaker: str
    text: str

    confidence_score: float = 0.0
    hesitation_level: float = 0.0

    detected_topics: List[str] = field(default_factory=list)
    missing_topics: List[str] = field(default_factory=list)


from dataclasses import dataclass
from typing import Optional


@dataclass
class InterviewStateSnapshot:
    # ---------- REQUIRED (NO DEFAULTS) ----------
    session_id: str

    interview_phase: str
    question_type: str
    interviewer_pressure: str
    candidate_confidence: float

    last_question: Optional[str]
    last_answer: Optional[str]
    turn_index: int

    last_turn_summary: Optional[str]
    recommended_action: str

    # ---------- OPTIONAL / DEFAULTS ----------
    role: str = "software_engineer"




# @dataclass
# class InterviewStateSnapshot:
#     """
#     Snapshot of interview intelligence at a moment in time.
#     """
#     session_id: str

#     interview_phase: str
#     question_type: str

#     interviewer_pressure: str
#     candidate_confidence: float

#     last_turn_summary: Optional[str]
#     recommended_action: str
