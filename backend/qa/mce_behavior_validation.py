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

REPORT_PATH = Path("qa/reports/mce_behavior_validation_report.json")


def _build_stack():
    se = SessionEngine()
    se.set_role_context({"weights": {"clarity": 0.3, "depth": 0.3, "structure": 0.25, "confidence": 0.15}})
    se.set_jd_context(
        {
            "role_title": "Senior Backend Engineer",
            "seniority_level": "Senior",
            "must_have_skills": ["Redis", "Caching", "Architecture"],
            "nice_to_have_skills": ["Leadership"],
        }
    )
    se.set_resume_profile(
        {
            "primary_skills": ["Redis", "Architecture"],
            "secondary_skills": ["Leadership"],
            "years_experience": "8",
        }
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


def scenario_1_direct_contradiction() -> dict:
    se, _controller, are, ise = _build_stack()

    _run_turn(se, are, ise, "What was your cache architecture?", "We used Redis for caching across our APIs.")
    _run_turn(se, are, ise, "What changed later?", "We shifted deployment strategy, mostly CI pipeline updates.")
    _run_turn(se, are, ise, "Any failures?", "Some node failovers happened but we recovered quickly.")
    decision = _run_turn(se, are, ise, "Clarify cache usage.", "We didn't use caching in that system.")

    snapshot = se.memory_store.snapshot()
    observed = {
        "contradiction_count": snapshot.get("contradiction_count", 0),
        "top_severity": (snapshot.get("top_unresolved") or [{}])[0].get("severity", 0.0) if snapshot.get("top_unresolved") else 0.0,
        "inject_context_present": bool(getattr(decision, "memory_recall_context", None)),
        "priority_subject": getattr(decision, "memory_priority_subject", None),
        "priority_severity": float(getattr(decision, "memory_priority_severity", 0.0) or 0.0),
    }

    checks = {
        "contradiction_detected": int(observed["contradiction_count"] or 0) >= 1,
        "severity_high": float(observed["top_severity"] or 0.0) > 0.7,
        "recall_context_generated": bool(observed["inject_context_present"]),
        "planner_priority_high": float(observed["priority_severity"] or 0.0) > 0.7,
    }

    return {
        "name": "scenario_1_direct_contradiction",
        "expected": {
            "contradiction": "detected",
            "severity": ">0.7",
            "recall": "clarification planned",
        },
        "observed": observed,
        "checks": checks,
        "pass": all(checks.values()),
    }


def scenario_2_soft_evolution() -> dict:
    se, _controller, are, ise = _build_stack()

    _run_turn(se, are, ise, "What did you use initially?", "We used Redis mainly for caching.")
    _run_turn(se, are, ise, "What happened over time?", "Later we replaced Redis with Memcached after benchmark testing.")
    decision = _run_turn(se, are, ise, "How did that impact operations?", "The migration improved tail latency and reduced failover complexity.")

    snapshot = se.memory_store.snapshot()
    observed = {
        "contradiction_count": snapshot.get("contradiction_count", 0),
        "unresolved_contradictions": snapshot.get("unresolved_contradictions", 0),
        "priority_severity": float(getattr(decision, "memory_priority_severity", 0.0) or 0.0),
        "recall_context": getattr(decision, "memory_recall_context", None),
    }

    checks = {
        "no_false_positive": int(observed["contradiction_count"] or 0) == 0,
        "no_unresolved_conflict": int(observed["unresolved_contradictions"] or 0) == 0,
        "no_harsh_recall": float(observed["priority_severity"] or 0.0) <= 0.7,
    }

    return {
        "name": "scenario_2_soft_evolution_no_false_positive",
        "expected": {
            "contradiction": "none",
            "severity": "low",
            "recall": "no harsh confrontation",
        },
        "observed": observed,
        "checks": checks,
        "pass": all(checks.values()),
    }


def scenario_3_quant_conflict() -> dict:
    se, _controller, are, ise = _build_stack()

    _run_turn(se, are, ise, "Describe system scale.", "We handled 10 million users with Redis-backed APIs at peak traffic.")
    _run_turn(se, are, ise, "Tell me about architecture.", "It was a distributed architecture with replication and failover.")
    decision = _run_turn(se, are, ise, "How intense was traffic?", "Traffic wasn't very high for that product.")

    snapshot = se.memory_store.snapshot()
    top = (snapshot.get("top_unresolved") or [{}])[0]
    observed = {
        "contradiction_count": snapshot.get("contradiction_count", 0),
        "top_severity": float(top.get("severity", 0.0) or 0.0),
        "subject": top.get("subject"),
        "recall_context_present": bool(getattr(decision, "memory_recall_context", None)),
        "priority_severity": float(getattr(decision, "memory_priority_severity", 0.0) or 0.0),
    }

    checks = {
        "quant_contradiction_detected": int(observed["contradiction_count"] or 0) >= 1,
        "moderate_high_severity": float(observed["top_severity"] or 0.0) >= 0.75,
        "clarification_planned": bool(observed["recall_context_present"]),
    }

    return {
        "name": "scenario_3_quantitative_conflict",
        "expected": {
            "contradiction": "detected",
            "severity": "moderate-high",
            "recall": "clarification follow-up",
        },
        "observed": observed,
        "checks": checks,
        "pass": all(checks.values()),
    }


def main() -> None:
    scenarios = [
        scenario_1_direct_contradiction(),
        scenario_2_soft_evolution(),
        scenario_3_quant_conflict(),
    ]
    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "passed": sum(1 for s in scenarios if s["pass"]),
        "total": len(scenarios),
        "all_pass": all(s["pass"] for s in scenarios),
    }

    report = {
        "objective": "Behavioral correctness validation for Memory + Contradiction Engine",
        "summary": summary,
        "scenarios": scenarios,
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"REPORT={REPORT_PATH.resolve()}")

    if not summary["all_pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
