from app.interview_state.snapshot import InterviewSnapshot
from app.ai_reasoning.llm import call_llm
import json


class InterviewStateBuilder:
    def __init__(self):
        self.turns = []

    def add_turn(self, speaker: str, text: str):
        self.turns.append({
            "speaker": speaker,
            "text": text
        })

    async def build_snapshot(self) -> InterviewSnapshot:
        """
        Summarize the LAST candidate answer only.
        """

        last_answer = next(
            (t["text"] for t in reversed(self.turns) if t["speaker"] == "candidate"),
            ""
        )

        if not last_answer:
            return InterviewSnapshot(last_turn_summary="")

        prompt = f"""
Summarize the following interview answer in 2–3 sentences.
Return JSON only.

Answer:
{last_answer}

JSON:
{{
  "summary": "..."
}}
"""

        raw = await call_llm(prompt)

        try:
            summary = json.loads(raw).get("summary", last_answer)
        except Exception:
            summary = last_answer

        return InterviewSnapshot(
            last_turn_summary=summary,
            recommended_action=None
        )
