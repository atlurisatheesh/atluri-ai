import json
import logging
from dataclasses import dataclass
from typing import Any, Dict

from app.ai_reasoning.llm import call_llm


logger = logging.getLogger(__name__)


@dataclass
class SemanticLeadershipClassifier:
    model: str = "gpt-4o-mini"

    def _normalize_difficulty(self, difficulty_level: int | str) -> str:
        text = str(difficulty_level or "").strip().upper()
        if text.startswith("L") and text[1:].isdigit():
            return text
        if text.isdigit():
            return f"L{text}"
        return "L2"

    def _build_prompt(
        self,
        answer_text: str,
        signal_counts: Dict[str, int],
        seniority: str,
        difficulty_level: int | str,
    ) -> str:
        level = self._normalize_difficulty(difficulty_level)
        return f"""
You are evaluating leadership strength in a {seniority} engineering interview.

Answer:
    \"\"\"{answer_text}\"\"\"

Extracted leadership signal counts:
Ownership: {signal_counts.get('ownership_count', 0)}
Decision: {signal_counts.get('decision_count', 0)}
Risk: {signal_counts.get('risk_count', 0)}
Stakeholder: {signal_counts.get('stakeholder_count', 0)}
Conflict: {signal_counts.get('conflict_count', 0)}

Current difficulty level: {level}

Evaluate leadership strength from 0–100.

Criteria:
- Ownership and accountability
- Decision-making clarity
- Risk anticipation
- Stakeholder awareness
- Influence and collaboration tone

Rules:
- Do NOT invent signals not present.
- Use extracted counts as grounding.
- Be strict for senior roles.

Return JSON ONLY:
{{
  "leadership_score": number,
  "leadership_strengths": [string],
  "leadership_gaps": [string]
}}
"""

    def _safe_parse(self, raw_response: str) -> Dict[str, Any]:
        try:
            data = json.loads(raw_response)

            score = int(data.get("leadership_score", 0))
            score = max(0, min(100, score))

            strengths = data.get("leadership_strengths", [])
            gaps = data.get("leadership_gaps", [])

            if not isinstance(strengths, list):
                strengths = []
            if not isinstance(gaps, list):
                gaps = []

            strengths = [str(x).strip() for x in strengths if str(x).strip()][:3]
            gaps = [str(x).strip() for x in gaps if str(x).strip()][:3]

            return {
                "leadership_score": score,
                "leadership_strengths": strengths,
                "leadership_gaps": gaps,
            }
        except Exception:
            logger.warning("Invalid JSON from leadership classifier")
            raise

    def _fallback(self, signal_counts: Dict[str, int]) -> Dict[str, Any]:
        base_score = (
            int(signal_counts.get("ownership_count", 0)) * 10
            + int(signal_counts.get("risk_count", 0)) * 8
            + int(signal_counts.get("stakeholder_count", 0)) * 8
            + int(signal_counts.get("decision_count", 0)) * 6
            + int(signal_counts.get("conflict_count", 0)) * 6
        )
        base_score = max(0, min(100, base_score))

        return {
            "leadership_score": base_score,
            "leadership_strengths": [],
            "leadership_gaps": [],
        }

    async def classify(
        self,
        answer_text: str,
        signal_counts: Dict[str, int],
        seniority: str,
        difficulty_level: int | str,
    ) -> Dict[str, Any]:
        if not answer_text.strip():
            return self._fallback(signal_counts)

        prompt = self._build_prompt(
            answer_text=answer_text,
            signal_counts=signal_counts,
            seniority=seniority,
            difficulty_level=difficulty_level,
        )

        try:
            raw = await call_llm(prompt)
            parsed = self._safe_parse(raw)
            return parsed
        except Exception as exc:
            logger.warning("Leadership classifier failed, using fallback: %s", exc)
            return self._fallback(signal_counts)


# Backward-compatible alias used by existing imports
LeadershipSemanticClassifier = SemanticLeadershipClassifier
