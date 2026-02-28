import json
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("QA_MODE", "false")

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.ai_reasoning.engine import AIReasoningEngine
from app.interview_state.engine import InterviewStateEngine
from app.session.engine import SessionEngine
from app.session_controller import SessionController
from app.transcript.models import TranscriptTurn

REPORT_PATH = Path("qa/reports/skillgraph_behavior_validation_report.json")


def _build_stack(jd_context: dict, resume_profile: dict, jd_requirements: dict, resume_claims: dict):
    se = SessionEngine()
    se.set_role_context({"weights": {"clarity": 0.3, "depth": 0.3, "structure": 0.25, "confidence": 0.15}})
    se.set_jd_context(jd_context)
    se.set_resume_profile(resume_profile)
    se.initialize_skill_graph(
        jd_context=jd_context,
        resume_profile=resume_profile,
        jd_requirements=jd_requirements,
        resume_claims=resume_claims,
    )

    controller = SessionController()
    are = AIReasoningEngine(session_engine=se, session_controller=controller)
    ise = InterviewStateEngine()
    return se, controller, are, ise


def _run_turn(se: SessionEngine, are: AIReasoningEngine, ise: InterviewStateEngine, question: str, answer: str):
    se.start_turn(question)
    turn = TranscriptTurn(
        speaker="candidate",
        text=answer,
        hesitation_events=0,
        is_complete=True,
    )
    snapshot = ise.ingest_turn(turn)
    decision = are.decide(snapshot)
    se.finalize_turn(answer, decision.__dict__)
    return decision


def scenario_1() -> dict:
    se, _controller, are, ise = _build_stack(
        jd_context={
            "role_title": "Senior Backend Engineer",
            "seniority_level": "Senior",
            "must_have_skills": ["Distributed Systems", "Kubernetes"],
            "nice_to_have_skills": [],
        },
        resume_profile={
            "primary_skills": ["Kubernetes", "Distributed Systems"],
            "secondary_skills": [],
        },
        jd_requirements={
            "required_skill_weights": {
                "distributed systems": 0.95,
                "kubernetes": 0.6,
            },
            "required_skill_depth": {
                "distributed systems": 5,
                "kubernetes": 4,
            },
        },
        resume_claims={
            "skill_claim_strength": {
                "distributed systems": 0.9,
                "kubernetes": 0.8,
            }
        },
    )

    decision = _run_turn(
        se,
        are,
        ise,
        question="Tell me about distributed systems at scale.",
        answer="I worked on distributed systems.",
    )

    node = se.skill_graph.skills.get("distributed systems")
    observed = {
        "risk_flag": getattr(node, "risk_flag", None),
        "escalation_mode": getattr(decision, "escalation_mode", None),
        "skill_target": getattr(decision, "skill_target", None),
        "pressure_intensity": getattr(decision, "pressure_intensity", None),
    }

    checks = {
        "risk_shallow_or_overclaim": observed["risk_flag"] in {"SHALLOW", "OVERCLAIM"},
        "routes_to_distributed_probe": ("distributed" in str(observed["skill_target"] or "").lower()) and observed["escalation_mode"] == "ARCHITECTURE",
        "persona_intensity_not_escalated": (observed["pressure_intensity"] in {None, 1}),
    }

    return {
        "name": "scenario_1_distributed_shallow",
        "expected": {
            "risk_flag": "SHALLOW or OVERCLAIM",
            "escalation_mode": "ARCHITECTURE via distributed systems target",
            "pressure_intensity": "unchanged unless performance dictates",
        },
        "observed": observed,
        "checks": checks,
        "pass": all(checks.values()),
    }


def scenario_2() -> dict:
    se, _controller, are, ise = _build_stack(
        jd_context={
            "role_title": "Platform Engineer",
            "seniority_level": "Senior",
            "must_have_skills": ["Redis"],
            "nice_to_have_skills": ["Kubernetes"],
        },
        resume_profile={
            "primary_skills": ["Kubernetes"],
            "secondary_skills": ["Python"],
        },
        jd_requirements={
            "required_skill_weights": {"redis": 0.9},
            "required_skill_depth": {"redis": 4},
        },
        resume_claims={"skill_claim_strength": {"kubernetes": 0.85, "python": 0.6}},
    )

    _run_turn(
        se,
        are,
        ise,
        question="How do you handle cache consistency?",
        answer="I usually optimize deployment flow.",
    )
    before_metrics = se.skill_graph.snapshot_metrics()
    before_redis = se.skill_graph.skills.get("redis")
    before_risk = getattr(before_redis, "risk_flag", "NONE")

    decision = _run_turn(
        se,
        are,
        ise,
        question="Explain your Redis design at scale.",
        answer="I designed Redis caching for high-traffic APIs, used replication and TTL strategy, and defined failure recovery with fallback reads to keep latency stable during node failures.",
    )

    after_metrics = se.skill_graph.snapshot_metrics()
    after_redis = se.skill_graph.skills.get("redis")
    after_risk = getattr(after_redis, "risk_flag", "NONE")

    observed = {
        "coverage_before": before_metrics.get("jd_coverage_pct"),
        "coverage_after": after_metrics.get("jd_coverage_pct"),
        "redis_risk_before": before_risk,
        "redis_risk_after": after_risk,
        "escalation_mode": getattr(decision, "escalation_mode", None),
    }

    risk_order = {
        "OVERCLAIM": 4,
        "GAP": 3,
        "SHALLOW": 2,
        "NONE": 1,
        "STRONG": 0,
    }

    checks = {
        "coverage_improves": float(observed["coverage_after"] or 0.0) > float(observed["coverage_before"] or 0.0),
        "risk_decreases": risk_order.get(observed["redis_risk_after"], 99) < risk_order.get(observed["redis_risk_before"], 99),
        "no_overclaim": observed["redis_risk_after"] != "OVERCLAIM",
    }

    return {
        "name": "scenario_2_redis_unclaimed_but_strong",
        "expected": {
            "coverage": "improves",
            "risk": "decreases",
            "overclaim": "absent",
        },
        "observed": observed,
        "checks": checks,
        "pass": all(checks.values()),
    }


def scenario_3() -> dict:
    se, _controller, are, ise = _build_stack(
        jd_context={
            "role_title": "Engineering Lead",
            "seniority_level": "Senior",
            "must_have_skills": ["Leadership"],
            "nice_to_have_skills": [],
        },
        resume_profile={
            "primary_skills": ["Leadership"],
            "secondary_skills": ["Architecture"],
        },
        jd_requirements={
            "required_skill_weights": {"leadership": 0.95},
            "required_skill_depth": {"leadership": 4},
        },
        resume_claims={
            "skill_claim_strength": {"leadership": 0.95, "architecture": 0.7},
        },
    )

    decision = _run_turn(
        se,
        are,
        ise,
        question="Tell me about leading teams through incidents.",
        answer="I improved query performance and reduced latency by tuning indexes.",
    )

    leadership_node = se.skill_graph.skills.get("leadership")
    observed = {
        "leadership_risk_flag": getattr(leadership_node, "risk_flag", None),
        "skill_target": getattr(decision, "skill_target", None),
        "escalation_mode": getattr(decision, "escalation_mode", None),
        "leadership_score": getattr(decision, "leadership_score", None),
    }

    checks = {
        "leadership_risk_detected": observed["leadership_risk_flag"] in {"GAP", "SHALLOW", "OVERCLAIM"},
        "leadership_probe_routed": observed["escalation_mode"] == "LEADERSHIP_PROBE",
    }

    return {
        "name": "scenario_3_leadership_claim_no_signals",
        "expected": {
            "leadership_risk": "detected",
            "escalation_mode": "LEADERSHIP_PROBE",
        },
        "observed": observed,
        "checks": checks,
        "pass": all(checks.values()),
    }


def main() -> None:
    scenarios = [scenario_1(), scenario_2(), scenario_3()]
    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "passed": sum(1 for s in scenarios if s["pass"]),
        "total": len(scenarios),
        "all_pass": all(s["pass"] for s in scenarios),
    }

    report = {
        "objective": "Behavioral correctness validation for SkillGraph intelligence",
        "summary": summary,
        "scenarios": scenarios,
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"REPORT={REPORT_PATH.resolve()}")


if __name__ == "__main__":
    main()
