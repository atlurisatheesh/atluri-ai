from __future__ import annotations

from app.dashboard.models import CredibilityDashboard, SkillSummary
from app.mce import MemorySnapshotBuilder


class CredibilitySnapshotBuilder:
    def __init__(self):
        self.memory_snapshot_builder = MemorySnapshotBuilder()

    def explain_risk(self, skill_node) -> str:
        risk = str(getattr(skill_node, "risk_flag", "NONE") or "NONE").upper()
        skill = getattr(skill_node, "name", "Skill")

        if risk == "OVERCLAIM":
            return (
                f"You claimed strong experience in {skill}, but answers lacked scale metrics "
                "and failure recovery detail."
            )
        if risk == "GAP":
            return f"{skill} is required in the JD but was not demonstrated in the session."
        if risk == "SHALLOW":
            return (
                f"You mentioned {skill}, but response depth did not show architecture tradeoffs "
                "or scale reasoning."
            )
        if risk == "STRONG":
            return f"{skill} was demonstrated with credible depth and consistent evidence."
        return f"{skill} has limited evidence so far."

    def _leadership_credibility(self, latest_decision: dict, analytics_snapshot: dict) -> float:
        leadership = float((latest_decision or {}).get("leadership_score", 0) or 0)
        consistency = float((analytics_snapshot or {}).get("consistency_score", 0) or 0)
        confidence = float((latest_decision or {}).get("confidence", 0.0) or 0.0) * 100.0

        escalation_mode = str((latest_decision or {}).get("escalation_mode", "NORMAL") or "NORMAL")
        mode_boost = {
            "LEADERSHIP_PROBE": 5.0,
            "ARCHITECTURE": 3.0,
            "TRADEOFF": 2.0,
            "INCIDENT": 4.0,
            "NORMAL": 0.0,
        }.get(escalation_mode, 0.0)

        value = (0.55 * leadership) + (0.25 * consistency) + (0.20 * confidence) + mode_boost
        return round(max(0.0, min(100.0, value)), 2)

    def build(self, session_id: str, session_engine, session_controller) -> CredibilityDashboard:
        skill_graph = getattr(session_engine, "skill_graph", None)
        metrics = dict(getattr(session_engine, "skill_graph_metrics", {}) or {})
        analytics_snapshot = dict(getattr(session_engine, "analytics_snapshot", {}) or {})
        memory_store = getattr(session_engine, "memory_store", None)
        memory_snapshot = self.memory_snapshot_builder.build(memory_store)
        raw_decision = getattr(session_controller, "last_decision", {})
        if isinstance(raw_decision, dict):
            latest_decision = dict(raw_decision)
        elif raw_decision is None:
            latest_decision = {}
        else:
            latest_decision = dict(getattr(raw_decision, "__dict__", {}) or {})

        skill_nodes = list(getattr(skill_graph, "skills", {}).values()) if skill_graph is not None else []

        sorted_by_cred = sorted(skill_nodes, key=lambda n: float(getattr(n, "credibility_score", 0.0) or 0.0), reverse=True)
        strongest_skills = [getattr(n, "name", "") for n in sorted_by_cred[:3] if getattr(n, "name", "")]
        weakest_skills = [getattr(n, "name", "") for n in sorted(skill_nodes, key=lambda n: float(getattr(n, "credibility_score", 0.0) or 0.0))[:3] if getattr(n, "name", "")]

        high_risk_skills = [
            {
                "skill_name": getattr(node, "name", ""),
                "risk_flag": getattr(node, "risk_flag", "NONE"),
                "credibility_score": round(float(getattr(node, "credibility_score", 0.0) or 0.0), 3),
                "evidence_count": int(getattr(node, "evidence_count", 0) or 0),
                "explanation": self.explain_risk(node),
            }
            for node in skill_nodes
            if str(getattr(node, "risk_flag", "NONE")).upper() in {"GAP", "OVERCLAIM", "SHALLOW"}
        ]

        breakdown = [
            SkillSummary(
                skill_name=getattr(node, "name", ""),
                jd_required=bool(getattr(node, "jd_required", False)),
                resume_claimed=bool(getattr(node, "resume_claimed", False)),
                credibility_score=round(float(getattr(node, "credibility_score", 0.0) or 0.0), 3),
                risk_flag=str(getattr(node, "risk_flag", "NONE") or "NONE"),
                evidence_count=int(getattr(node, "evidence_count", 0) or 0),
                depth_score=round(float(getattr(node, "depth_score", 0.0) or 0.0), 3),
                explanation=self.explain_risk(node),
            )
            for node in sorted(skill_nodes, key=lambda n: (str(getattr(n, "risk_flag", "NONE")), -(float(getattr(n, "jd_weight", 0.0) or 0.0))))
        ]

        return CredibilityDashboard(
            session_id=session_id,
            jd_coverage_percent=float(metrics.get("jd_coverage_pct", 0.0) or 0.0),
            resume_credibility_percent=float(metrics.get("resume_credibility_pct", 0.0) or 0.0),
            overclaim_index=float(metrics.get("overclaim_index", 0.0) or 0.0),
            blind_spot_index=float(metrics.get("blind_spot_index", 0.0) or 0.0),
            contradiction_count=int(memory_snapshot.get("contradiction_count", 0) or 0),
            unresolved_contradictions=int(memory_snapshot.get("unresolved_contradictions", 0) or 0),
            consistency_score=float(memory_snapshot.get("consistency_score", analytics_snapshot.get("consistency_score", 1.0)) or 1.0),
            unresolved_assertion_count=int(memory_snapshot.get("unresolved_assertion_count", 0) or 0),
            leadership_credibility=self._leadership_credibility(latest_decision, analytics_snapshot),
            strongest_skills=strongest_skills,
            weakest_skills=weakest_skills,
            high_risk_skills=high_risk_skills,
            skill_breakdown=breakdown,
        )
