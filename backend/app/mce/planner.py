from __future__ import annotations


class RecallPlanner:
    def plan(self, unresolved_contradictions: list[dict], unresolved_assertions: list[dict] | None = None) -> dict:
        unresolved_assertions = list(unresolved_assertions or [])
        if not unresolved_contradictions:
            if unresolved_assertions:
                top_assertion = unresolved_assertions[0]
                return {
                    "inject_now": False,
                    "priority_subject": top_assertion.get("subject"),
                    "priority_severity": 0.45,
                    "recall_context": (
                        f"Earlier (Turn {top_assertion.get('turn_index')}) you made a high-confidence assertion "
                        f"about {top_assertion.get('subject')}: '{top_assertion.get('assertion')}'. "
                        "Request concrete evidence or metrics to validate it."
                    ),
                }
            return {
                "inject_now": False,
                "priority_subject": None,
                "priority_severity": 0.0,
                "recall_context": None,
            }

        sorted_items = sorted(
            unresolved_contradictions,
            key=lambda x: float(x.get("severity", 0.0)),
            reverse=True,
        )
        top = sorted_items[0]
        severity = float(top.get("severity", 0.0) or 0.0)

        recall_context = (
            f"Earlier contradiction detected on {top.get('subject')}: "
            f"'{top.get('earlier_claim')}' vs '{top.get('conflicting_claim')}'."
        )

        return {
            "inject_now": severity > 0.7,
            "priority_subject": top.get("subject"),
            "priority_severity": round(severity, 3),
            "recall_context": recall_context,
        }
