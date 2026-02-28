def plan_answer(intent, seniority="mid"):
    if intent == "behavioral":
        return {
            "style": "STAR",
            "length": "medium",
            "include_metrics": True
        }

    if intent == "coding":
        return {
            "style": "step_by_step",
            "include_complexity": True,
            "include_edge_cases": True
        }

    if intent == "system_design":
        return {
            "style": "layered",
            "depth": "high",
            "include_tradeoffs": True
        }

    return {
        "style": "concise"
    }
