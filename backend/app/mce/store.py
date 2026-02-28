from __future__ import annotations

from threading import Lock
import uuid

from app.mce.detector import ContradictionDetector
from app.mce.models import Claim, Contradiction


class MemoryStore:
    def __init__(self):
        self._lock = Lock()
        self.claims: list[Claim] = []
        self.indexed_by_subject: dict[str, list[Claim]] = {}
        self.contradictions: list[Contradiction] = []
        self.unresolved_assertion_ids: list[str] = []
        self._detector = ContradictionDetector()

    def add_claim(
        self,
        turn_index: int,
        category: str,
        subject: str,
        assertion: str,
        confidence: float,
        metadata: dict | None = None,
    ) -> Claim:
        claim = Claim(
            claim_id=str(uuid.uuid4()),
            turn_index=int(turn_index),
            category=str(category),
            subject=str(subject),
            assertion=str(assertion),
            confidence=float(confidence),
            metadata=dict(metadata or {}),
        )

        with self._lock:
            self.claims.append(claim)
            key = claim.subject.strip().lower()
            bucket = self.indexed_by_subject.setdefault(key, [])

            if bool(claim.metadata.get("unsupported_confident", False)):
                self.unresolved_assertion_ids.append(claim.claim_id)

            for earlier in bucket:
                contradiction = self._detector.detect(earlier, claim)
                if contradiction:
                    self.contradictions.append(contradiction)

            bucket.append(claim)

        return claim

    def find_related(self, subject: str) -> list[Claim]:
        key = str(subject or "").strip().lower()
        with self._lock:
            return list(self.indexed_by_subject.get(key, []))

    def mark_resolved(self, contradiction_idx: int) -> bool:
        with self._lock:
            if contradiction_idx < 0 or contradiction_idx >= len(self.contradictions):
                return False
            self.contradictions[contradiction_idx].resolved = True
            return True

    def unresolved_contradictions(self) -> list[Contradiction]:
        with self._lock:
            return [c for c in self.contradictions if not c.resolved]

    def unresolved_assertions(self) -> list[Claim]:
        with self._lock:
            ids = set(self.unresolved_assertion_ids)
            return [c for c in self.claims if c.claim_id in ids]

    def consistency_score(self) -> float:
        with self._lock:
            unresolved = [c for c in self.contradictions if not c.resolved]
            if not unresolved:
                return 1.0
            severity_sum = sum(float(c.severity) for c in unresolved)
            max_possible = float(max(len(self.claims), 1))
            return max(0.0, min(1.0, 1.0 - (severity_sum / max_possible)))

    def snapshot(self) -> dict:
        unresolved = self.unresolved_contradictions()
        unresolved_assertions = self.unresolved_assertions()
        return {
            "claim_count": len(self.claims),
            "contradiction_count": len(self.contradictions),
            "unresolved_contradictions": len(unresolved),
            "unresolved_assertion_count": len(unresolved_assertions),
            "consistency_score": round(self.consistency_score(), 4),
            "top_unresolved": [
                {
                    "subject": c.subject,
                    "severity": c.severity,
                    "earlier_claim": c.earlier_claim.assertion,
                    "conflicting_claim": c.conflicting_claim.assertion,
                    "detected_turn": c.detected_turn,
                }
                for c in sorted(unresolved, key=lambda x: x.severity, reverse=True)[:3]
            ],
            "top_unresolved_assertions": [
                {
                    "subject": c.subject,
                    "assertion": c.assertion,
                    "turn_index": c.turn_index,
                    "confidence": c.confidence,
                }
                for c in unresolved_assertions[:3]
            ],
        }
