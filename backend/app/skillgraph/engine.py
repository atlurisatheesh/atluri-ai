from __future__ import annotations

import re
from threading import Lock

from app.skillgraph.models import SkillNode, SkillTarget


def _normalize_skill_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, float(value)))


class SkillGraph:
    def __init__(self, skills: dict[str, SkillNode] | None = None):
        self.skills: dict[str, SkillNode] = skills or {}
        self._lock = Lock()

    @classmethod
    def from_contexts(
        cls,
        jd_context: dict,
        resume_profile: dict,
        jd_requirements: dict | None = None,
        resume_claims: dict | None = None,
    ) -> "SkillGraph":
        skills: dict[str, SkillNode] = {}

        must = [s for s in (jd_context or {}).get("must_have_skills", []) if isinstance(s, str) and s.strip()]
        nice = [s for s in (jd_context or {}).get("nice_to_have_skills", []) if isinstance(s, str) and s.strip()]
        primary = [s for s in (resume_profile or {}).get("primary_skills", []) if isinstance(s, str) and s.strip()]
        secondary = [s for s in (resume_profile or {}).get("secondary_skills", []) if isinstance(s, str) and s.strip()]

        requirement_weights = (jd_requirements or {}).get("required_skill_weights", {}) or {}
        requirement_depths = (jd_requirements or {}).get("required_skill_depth", {}) or {}
        claim_strength = (resume_claims or {}).get("skill_claim_strength", {}) or {}

        for idx, raw in enumerate(must):
            key = _normalize_skill_name(raw)
            if not key:
                continue
            skills[key] = SkillNode(
                name=raw.strip(),
                jd_required=True,
                jd_weight=float(requirement_weights.get(key, max(0.4, 1.0 - (idx * 0.12)))),
                jd_depth_expected=int(requirement_depths.get(key, cls._depth_from_seniority(jd_context))),
            )

        for idx, raw in enumerate(nice):
            key = _normalize_skill_name(raw)
            if not key:
                continue
            node = skills.get(key)
            if node is None:
                node = SkillNode(name=raw.strip())
                skills[key] = node
            node.jd_weight = max(node.jd_weight, float(requirement_weights.get(key, max(0.2, 0.45 - (idx * 0.06)))))
            node.jd_depth_expected = max(node.jd_depth_expected, int(requirement_depths.get(key, max(2, cls._depth_from_seniority(jd_context) - 1))))

        for raw in primary:
            key = _normalize_skill_name(raw)
            if not key:
                continue
            node = skills.get(key)
            if node is None:
                node = SkillNode(name=raw.strip())
                skills[key] = node
            node.resume_claimed = True
            node.resume_strength = max(node.resume_strength, float(claim_strength.get(key, 0.85)))

        for raw in secondary:
            key = _normalize_skill_name(raw)
            if not key:
                continue
            node = skills.get(key)
            if node is None:
                node = SkillNode(name=raw.strip())
                skills[key] = node
            node.resume_claimed = True
            node.resume_strength = max(node.resume_strength, float(claim_strength.get(key, 0.6)))

        return cls(skills=skills)

    @staticmethod
    def _depth_from_seniority(jd_context: dict) -> int:
        seniority = str((jd_context or {}).get("seniority_level") or "").lower()
        if "staff" in seniority or "principal" in seniority:
            return 5
        if "senior" in seniority or "lead" in seniority:
            return 4
        if "mid" in seniority:
            return 3
        if "junior" in seniority or "entry" in seniority:
            return 2
        return 3

    def _skill_present(self, answer_text: str, skill_name: str) -> bool:
        pattern = r"(?<!\\w)" + re.escape(skill_name.lower().strip()) + r"(?!\\w)"
        return re.search(pattern, (answer_text or "").lower()) is not None

    def _compute_coverage(self, node: SkillNode) -> float:
        if node.jd_required:
            return _clamp(node.evidence_count / 2.0)
        return _clamp(node.evidence_count / 3.0)

    def compute_credibility(self, skill_name: str) -> float:
        key = _normalize_skill_name(skill_name)
        node = self.skills.get(key)
        if node is None:
            return 0.0

        depth = _clamp(node.depth_score)
        conf = _clamp(node.avg_confidence)
        coverage = _clamp(node.coverage_score)

        if node.resume_claimed and node.jd_required:
            credibility = (0.55 * depth * conf) + (0.45 * coverage)
        elif node.jd_required and (not node.resume_claimed):
            credibility = (0.5 * coverage) + (0.35 * depth) + (0.15 * conf)
        elif node.resume_claimed and (not node.jd_required):
            credibility = depth
        else:
            credibility = (0.6 * depth) + (0.4 * conf)

        node.credibility_score = _clamp(credibility)
        return node.credibility_score

    def _risk_threshold(self, node: SkillNode) -> float:
        return _clamp(0.2 + (node.jd_depth_expected * 0.08))

    def detect_risks(self) -> dict[str, str]:
        risks: dict[str, str] = {}
        with self._lock:
            for key, node in self.skills.items():
                node.coverage_score = self._compute_coverage(node)
                credibility = self.compute_credibility(key)

                expected_depth_norm = _clamp(node.jd_depth_expected / 5.0)

                if node.jd_required and node.evidence_count == 0:
                    node.risk_flag = "GAP"
                elif node.resume_claimed and node.resume_strength >= 0.75 and node.evidence_count > 0 and node.depth_score < 0.35:
                    node.risk_flag = "OVERCLAIM"
                elif (
                    node.jd_required
                    and node.evidence_count > 0
                    and (
                        node.depth_score < max(0.3, expected_depth_norm * 0.7)
                        or (credibility < self._risk_threshold(node) and node.evidence_count < 2)
                    )
                ):
                    node.risk_flag = "SHALLOW"
                elif node.evidence_count > 0 and credibility >= (self._risk_threshold(node) * 0.9):
                    node.risk_flag = "STRONG"
                else:
                    node.risk_flag = "NONE"

                risks[key] = node.risk_flag

        return risks

    def update_evidence(self, skill_name: str, confidence: float, depth_signal: float, turn_index: int) -> None:
        key = _normalize_skill_name(skill_name)
        if not key:
            return

        with self._lock:
            node = self.skills.get(key)
            if node is None:
                node = SkillNode(name=skill_name)
                self.skills[key] = node

            node.evidence_count += 1
            count = node.evidence_count
            node.avg_confidence = _clamp(((node.avg_confidence * (count - 1)) + _clamp(confidence)) / count)
            node.depth_score = _clamp(((node.depth_score * (count - 1)) + _clamp(depth_signal)) / count)
            node.last_demonstrated_turn = int(turn_index or 0)
            node.coverage_score = self._compute_coverage(node)
            self.compute_credibility(key)

    def update_from_answer(self, answer_text: str, confidence: float, depth_signal: float, turn_index: int) -> list[str]:
        matched: list[str] = []
        with self._lock:
            keys = list(self.skills.keys())

        for key in keys:
            node = self.skills.get(key)
            if node and self._skill_present(answer_text, node.name):
                self.update_evidence(node.name, confidence=confidence, depth_signal=depth_signal, turn_index=turn_index)
                matched.append(node.name)

        self.detect_risks()
        return matched

    def rank_escalation_targets(self, limit: int = 3) -> list[SkillTarget]:
        self.detect_risks()

        risk_priority = {
            "OVERCLAIM": 4,
            "SHALLOW": 3,
            "GAP": 2,
            "NONE": 1,
            "STRONG": 0,
        }

        scored: list[SkillTarget] = []
        with self._lock:
            for node in self.skills.values():
                score = (
                    risk_priority.get(node.risk_flag, 0) * 100.0
                    + (node.jd_weight * 40.0)
                    + ((1.0 - node.credibility_score) * 30.0)
                    + (node.resume_strength * 10.0)
                    + (12.0 if node.last_demonstrated_turn > 0 else 0.0)
                )
                if node.risk_flag in {"GAP", "OVERCLAIM", "SHALLOW"}:
                    scored.append(SkillTarget(skill_name=node.name, risk_flag=node.risk_flag, priority_score=score))

        scored.sort(key=lambda item: item.priority_score, reverse=True)
        return scored[: max(1, limit)]

    def snapshot_metrics(self) -> dict:
        with self._lock:
            nodes = list(self.skills.values())

        if not nodes:
            return {
                "jd_coverage_pct": 0.0,
                "resume_credibility_pct": 0.0,
                "high_risk_skill_count": 0,
                "overclaim_index": 0.0,
                "blind_spot_index": 0.0,
                "top_risks": [],
            }

        required = [n for n in nodes if n.jd_required]
        claimed = [n for n in nodes if n.resume_claimed]

        required_covered = [n for n in required if n.evidence_count > 0]
        jd_coverage_pct = 0.0 if not required else round((len(required_covered) / len(required)) * 100.0, 2)

        claimed_cred = [n.credibility_score for n in claimed]
        resume_credibility_pct = 0.0 if not claimed_cred else round((sum(claimed_cred) / len(claimed_cred)) * 100.0, 2)

        high_risk = [n for n in nodes if n.risk_flag in {"GAP", "OVERCLAIM", "SHALLOW"}]
        overclaims = [n for n in nodes if n.risk_flag == "OVERCLAIM"]
        blind_spots = [n for n in required if n.evidence_count == 0]

        top_risks = [
            {
                "skill": t.skill_name,
                "risk_flag": t.risk_flag,
                "priority": round(t.priority_score, 3),
            }
            for t in self.rank_escalation_targets(limit=3)
        ]

        return {
            "jd_coverage_pct": jd_coverage_pct,
            "resume_credibility_pct": resume_credibility_pct,
            "high_risk_skill_count": len(high_risk),
            "overclaim_index": round((len(overclaims) / max(len(claimed), 1)) * 100.0, 2),
            "blind_spot_index": round((len(blind_spots) / max(len(required), 1)) * 100.0, 2),
            "top_risks": top_risks,
        }
