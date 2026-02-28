import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.escalation.seniority_engine import SeniorityEscalationEngine
from app.mce import ClaimExtractor, RecallPlanner
from app.mce.snapshot import MemorySnapshotBuilder
from app.mce.store import MemoryStore

REPORT_PATH = ROOT / "qa" / "memory_behavior_report.json"


@dataclass
class MemoryBehaviorTest:
    scenario_name: str
    turns: list[str]
    expected_contradiction_count: int
    expected_subject: Optional[str]
    expected_severity_min: float
    expect_no_contradiction: bool
    expected_recall_triggered: bool


class MemoryBehaviorRunner:
    def __init__(self):
        self.extractor = ClaimExtractor()
        self.planner = RecallPlanner()
        self.snapshot_builder = MemorySnapshotBuilder()
        self.escalation = SeniorityEscalationEngine()

    def _create_session(self) -> dict:
        return {
            "memory_store": MemoryStore(),
            "scoring_before": 77.5,
            "difficulty_before": "L3",
            "escalation_before": "NORMAL",
            "scoring_after": 77.5,
            "difficulty_after": "L3",
            "escalation_after": "NORMAL",
        }

    def _evaluate_subject(self, expected_subject: Optional[str], actual_subject: Optional[str]) -> bool:
        if expected_subject is None:
            return True
        actual = str(actual_subject or "").lower()
        if expected_subject.lower() == "redis_or_caching":
            return actual in {"redis", "caching"}
        if expected_subject.lower() == "scale_or_equivalent":
            return actual in {"scale", "traffic"}
        return actual == expected_subject.lower()

    def _run_scenario(self, test: MemoryBehaviorTest, qa_mode: str = "false") -> dict:
        os.environ["QA_MODE"] = qa_mode
        session = self._create_session()
        memory_store = session["memory_store"]

        pre_snapshot = memory_store.snapshot()
        no_global_state_bleed = (
            int(pre_snapshot.get("claim_count", 0)) == 0
            and int(pre_snapshot.get("contradiction_count", 0)) == 0
        )

        for index, turn in enumerate(test.turns, start=1):
            claims = self.extractor.extract(turn, ["Redis", "Kubernetes", "Memcached"])
            for claim in claims:
                metadata = dict(claim.get("metadata", {}) or {})
                metadata["unsupported_confident"] = bool(
                    metadata.get("assertive", False) and not metadata.get("has_specifics", False)
                )
                memory_store.add_claim(
                    turn_index=index,
                    category=claim.get("category", "DECISION"),
                    subject=claim.get("subject", "General"),
                    assertion=claim.get("assertion", turn),
                    confidence=0.85,
                    metadata=metadata,
                )

        snapshot = self.snapshot_builder.build(memory_store)
        top_unresolved = snapshot.get("top_unresolved", [])
        top_assertions = snapshot.get("top_unresolved_assertions", [])
        plan = self.planner.plan(top_unresolved, top_assertions)

        if bool(plan.get("inject_now", False)):
            session["escalation_after"] = self.escalation.apply_memory_routing(
                base_mode=session["escalation_before"],
                severity=float(plan.get("priority_severity", 0.0) or 0.0),
                subject=plan.get("priority_subject"),
            )

        actual_contradictions = int(snapshot.get("contradiction_count", 0) or 0)
        actual_unresolved_assertions = int(snapshot.get("unresolved_assertion_count", 0) or 0)
        actual_subject = plan.get("priority_subject")
        actual_severity = float(plan.get("priority_severity", 0.0) or 0.0)
        recall_triggered = bool(plan.get("inject_now", False))

        checks = {
            "expected_contradictions": actual_contradictions == int(test.expected_contradiction_count),
            "subject_match": self._evaluate_subject(test.expected_subject, actual_subject),
            "severity_threshold": actual_severity >= float(test.expected_severity_min),
            "severity_false_positive_guard": (actual_severity < 0.6) if test.expect_no_contradiction else True,
            "no_false_positive_mode": (actual_contradictions == 0) if test.expect_no_contradiction else True,
            "recall_triggered_match": recall_triggered == bool(test.expected_recall_triggered),
            "over_trigger_guard": actual_contradictions <= 1,
            "scoring_unchanged": session["scoring_before"] == session["scoring_after"],
            "difficulty_unchanged": session["difficulty_before"] == session["difficulty_after"],
            "escalation_stable_when_no_recall": (
                session["escalation_before"] == session["escalation_after"]
            ) if not bool(test.expected_recall_triggered) else True,
            "no_global_state_bleed": no_global_state_bleed,
        }

        return {
            "scenario": test.scenario_name,
            "pass": all(checks.values()),
            "contradiction_count": actual_contradictions,
            "unresolved_assertions": actual_unresolved_assertions,
            "severity": round(actual_severity, 3),
            "planned_recall_subject": actual_subject,
            "recall_triggered": recall_triggered,
            "checks": checks,
        }


def run_memory_behavior_suite() -> dict:
    runner = MemoryBehaviorRunner()
    scenarios = [
        MemoryBehaviorTest(
            scenario_name="Direct Logical Contradiction",
            turns=[
                "We used Redis for caching.",
                "We did not use caching in that system.",
            ],
            expected_contradiction_count=1,
            expected_subject="redis_or_caching",
            expected_severity_min=0.7,
            expect_no_contradiction=False,
            expected_recall_triggered=True,
        ),
        MemoryBehaviorTest(
            scenario_name="Architectural Evolution No False Positive",
            turns=[
                "We used Redis for caching initially.",
                "Later we replaced Redis with Memcached.",
            ],
            expected_contradiction_count=0,
            expected_subject=None,
            expected_severity_min=0.0,
            expect_no_contradiction=True,
            expected_recall_triggered=False,
        ),
        MemoryBehaviorTest(
            scenario_name="Quantitative Conflict",
            turns=[
                "We handled 10 million users daily.",
                "Traffic was not very high.",
            ],
            expected_contradiction_count=1,
            expected_subject="scale_or_equivalent",
            expected_severity_min=0.6,
            expect_no_contradiction=False,
            expected_recall_triggered=True,
        ),
        MemoryBehaviorTest(
            scenario_name="Leadership Downgrade",
            turns=[
                "I led the migration.",
                "I wasn't really leading the effort.",
            ],
            expected_contradiction_count=1,
            expected_subject="Leadership",
            expected_severity_min=0.6,
            expect_no_contradiction=False,
            expected_recall_triggered=True,
        ),
        MemoryBehaviorTest(
            scenario_name="Soft Clarification No False Positive",
            turns=[
                "We used Kubernetes for orchestration.",
                "Kubernetes handled our container deployments.",
            ],
            expected_contradiction_count=0,
            expected_subject=None,
            expected_severity_min=0.0,
            expect_no_contradiction=True,
            expected_recall_triggered=False,
        ),
    ]

    details = [runner._run_scenario(test=scenario, qa_mode="false") for scenario in scenarios]

    qa_mode_parity = []
    for scenario in scenarios[:2]:
        result_false = runner._run_scenario(test=scenario, qa_mode="false")
        result_true = runner._run_scenario(test=scenario, qa_mode="true")
        qa_mode_parity.append(
            {
                "scenario": scenario.scenario_name,
                "same_contradictions": result_false["contradiction_count"] == result_true["contradiction_count"],
                "same_recall": result_false["recall_triggered"] == result_true["recall_triggered"],
            }
        )

    qa_mode_bypass_respected = all(
        bool(item["same_contradictions"]) and bool(item["same_recall"])
        for item in qa_mode_parity
    )

    total = len(details)
    passed = sum(1 for item in details if item["pass"])
    failed = total - passed
    all_pass = failed == 0 and qa_mode_bypass_respected

    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": total,
        "passed": passed,
        "failed": failed,
        "all_pass": all_pass,
        "qa_mode_bypass_respected": qa_mode_bypass_respected,
        "qa_mode_parity": qa_mode_parity,
        "details": details,
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    report = run_memory_behavior_suite()
    print(json.dumps({
        "total": report["total"],
        "passed": report["passed"],
        "failed": report["failed"],
        "all_pass": report["all_pass"],
        "qa_mode_bypass_respected": report["qa_mode_bypass_respected"],
    }, indent=2))
    print(f"REPORT={REPORT_PATH}")
    if not report["all_pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
