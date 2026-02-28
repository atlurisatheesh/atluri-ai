from typing import Optional

from app.transcript.models import TranscriptTurn
from .models import InterviewTurnAnalysis, InterviewStateSnapshot
from .state import InterviewState
from . import rules


class InterviewStateEngine:
    """
    Converts completed transcript turns into interview intelligence.
    Deterministic. Explainable.
    """

    def __init__(self):
        self.state = InterviewState()

    # -------------------------
    # INPUT (FROM TTE)
    # -------------------------

    def ingest_turn(self, turn: TranscriptTurn) -> InterviewStateSnapshot:
        """
        Consume a completed transcript turn and update state.
        """

        analysis = InterviewTurnAnalysis(
            turn_id=turn.turn_id,
            speaker=turn.speaker,
            text=turn.text,
            hesitation_level=min(turn.hesitation_events / 3.0, 1.0),
        )

        # Update confidence if candidate spoke
        if turn.speaker == "candidate":
            self.state.update_confidence(turn.hesitation_events)

        # Update interviewer pressure
        self.state.update_pressure(turn.speaker)

        self.state.turns.append(analysis)
        self.state.turn_index += 1


        return self._snapshot(last_turn=analysis)

    # -------------------------
    # DECISION LOGIC
    # -------------------------

    # def _snapshot(
    #     self,
    #     last_turn: InterviewTurnAnalysis,
    # ) -> InterviewStateSnapshot:

    #     # Conservative recommendation logic (v1)
    #     if last_turn.speaker == "candidate":
    #         if self.state.candidate_confidence < 0.4:
    #             action = rules.ACTION_RECOVERY
    #         elif last_turn.hesitation_level > 0.4:
    #             action = rules.ACTION_HINT
    #         else:
    #             action = rules.ACTION_NONE
    #     else:
    #         action = rules.ACTION_NONE

    #     return InterviewStateSnapshot(
    #         session_id=self.state.session_id,
    #         interview_phase=self.state.interview_phase,
    #         question_type=self.state.question_type,
    #         interviewer_pressure=self.state.interviewer_pressure,
    #         candidate_confidence=self.state.candidate_confidence,
    #         last_turn_summary=last_turn.text[:120],
    #         recommended_action=action,
    #     )

    def _snapshot(
        self,
        last_turn: InterviewTurnAnalysis,
    ) -> InterviewStateSnapshot:

        if last_turn.speaker == "candidate":
            if self.state.candidate_confidence < 0.4:
                action = rules.ACTION_RECOVERY
            elif last_turn.hesitation_level > 0.4:
                action = rules.ACTION_HINT
            else:
                action = rules.ACTION_NONE
        else:
            action = rules.ACTION_NONE

        return InterviewStateSnapshot(
            session_id=self.state.session_id,
            interview_phase=self.state.interview_phase,
            question_type=self.state.question_type,
            interviewer_pressure=self.state.interviewer_pressure,
            candidate_confidence=self.state.candidate_confidence,

            # 🔥 THESE FIX AIReasoningEngine
            last_question=self.state.last_question,
            last_answer=last_turn.text,
            turn_index=self.state.turn_index,

            last_turn_summary=last_turn.text[:120],
            recommended_action=action,
        )


    def final_summary_payload(self):
        """
        Compact, SAFE payload for final interview summary.
        Uses only existing InterviewState fields.
        """

        return {
            "total_turns": len(self.state.turns),
            "final_confidence": self.state.candidate_confidence,
            "interviewer_pressure": self.state.interviewer_pressure,
            "interview_phase": self.state.interview_phase,
            "recent_turn_summaries": [
                t.text[:120] for t in self.state.turns[-5:]
            ],
        }

