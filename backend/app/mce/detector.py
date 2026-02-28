from __future__ import annotations

import re

from app.mce.models import Claim, Contradiction


class ContradictionDetector:
    NEGATION_PATTERNS = [
        r"\bnot\b",
        r"\bnever\b",
        r"\bno\b",
        r"\bdidn't\b",
        r"\bdidnt\b",
        r"\bwasn't\b",
        r"\bwasnt\b",
        r"\bwithout\b",
    ]
    SCALE_LOW = {
        "low",
        "small",
        "not large",
        "wasn't large",
        "wasnt large",
        "not high traffic",
        "not very high",
        "wasn't very high",
        "wasnt very high",
    }
    SCALE_HIGH = {"high", "large", "at scale", "10m", "million", "high traffic"}

    def _normalize(self, text: str) -> str:
        value = (text or "").lower().strip()
        value = re.sub(r"\s+", " ", value)
        return value

    def _has_negation(self, text: str) -> bool:
        normalized = self._normalize(text)
        return any(re.search(pattern, normalized) for pattern in self.NEGATION_PATTERNS)

    def _is_evolutionary_statement(self, earlier_claim: Claim, new_claim: Claim) -> bool:
        earlier_evolution = bool((earlier_claim.metadata or {}).get("evolution", False))
        new_evolution = bool((new_claim.metadata or {}).get("evolution", False))
        return earlier_evolution or new_evolution

    def _quant_conflict(self, earlier: str, later: str) -> bool:
        a = self._normalize(earlier)
        b = self._normalize(later)

        a_high = any(k in a for k in self.SCALE_HIGH)
        b_low = any(k in b for k in self.SCALE_LOW)
        b_high = any(k in b for k in self.SCALE_HIGH)
        a_low = any(k in a for k in self.SCALE_LOW)

        return (a_high and b_low) or (a_low and b_high)

    def _leadership_reversal(self, earlier: Claim, later: Claim) -> bool:
        if earlier.category != "LEADERSHIP" and later.category != "LEADERSHIP":
            return False

        lead_tokens = ["led", "owned", "managed", "drove", "mentored"]
        non_lead_tokens = ["not leading", "wasn't leading", "wasnt leading", "support role", "not owner"]

        e = self._normalize(earlier.assertion)
        l = self._normalize(later.assertion)

        e_lead = any(t in e for t in lead_tokens)
        l_non_lead = any(t in l for t in non_lead_tokens)
        l_lead = any(t in l for t in lead_tokens)
        e_non_lead = any(t in e for t in non_lead_tokens)
        return (e_lead and l_non_lead) or (e_non_lead and l_lead)

    def detect(self, earlier_claim: Claim, new_claim: Claim) -> Contradiction | None:
        if earlier_claim.subject.lower() != new_claim.subject.lower():
            return None

        if self._is_evolutionary_statement(earlier_claim, new_claim):
            return None

        e = self._normalize(earlier_claim.assertion)
        n = self._normalize(new_claim.assertion)

        severity = 0.0

        if self._has_negation(e) != self._has_negation(n):
            severity = max(severity, 0.75)

        if self._quant_conflict(e, n):
            severity = max(severity, 0.8)

        if self._leadership_reversal(earlier_claim, new_claim):
            severity = max(severity, 0.7)

        if severity <= 0.0:
            return None

        confidence_gap = abs(float(earlier_claim.confidence) - float(new_claim.confidence))
        severity = min(1.0, severity + (confidence_gap * 0.1))

        return Contradiction(
            subject=new_claim.subject,
            earlier_claim=earlier_claim,
            conflicting_claim=new_claim,
            severity=round(severity, 3),
            detected_turn=int(new_claim.turn_index),
            resolved=False,
        )
