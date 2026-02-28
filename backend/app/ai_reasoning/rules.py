from app.ai_reasoning.models import ReasoningDecision


def apply_rules(signals):
    """
    Decide interviewer action based on extracted signals.
    This controls WHAT to do. LLM later controls HOW to phrase.
    """

    # 1️⃣ Hesitation → clarification / hint
    if signals.get("hesitation_count", 0) >= 3:
        return ReasoningDecision(
            action="clarification",
            intent="clarification",
            difficulty="easy",
            confidence=0.85,
            message="Candidate is hesitating frequently.",
            evidence=["multiple hesitations"]
        )

    # 2️⃣ Topic drift → refocus probe
    if signals.get("topic_drift", 0) > 0.7:
        return ReasoningDecision(
            action="probe",
            intent="clarification",
            difficulty="easy",
            confidence=0.8,
            message="Candidate is drifting off-topic.",
            evidence=["topic drift detected"]
        )

    # 3️⃣ Shallow but confident → trade-off probe
    # if signals.get("is_shallow") and signals.get("confidence", 0) > 0.6:
    #     return ReasoningDecision(
    #         action="probe",
    #         intent="tradeoff_probe",
    #         difficulty="medium",
    #         confidence=0.8,
    #         message="Answer is shallow but confident.",
    #         evidence=["missing trade-offs"]
    #     )

    # # 4️⃣ Strong answer → edge cases
    # if signals.get("is_strong"):
    #     return ReasoningDecision(
    #         action="probe",
    #         intent="edge_case_probe",
    #         difficulty="hard",
    #         confidence=0.9,
    #         message="Strong answer detected. Increasing difficulty.",
    #         evidence=["high-quality answer"]
    #     )

        # 3️⃣ Medium depth → reasoning probe
    if signals.get("depth_score", 0) < 0.4:
        return ReasoningDecision(
            action="probe",
            intent="reasoning_probe",
            difficulty="medium",
            confidence=0.75,
            message="Answer lacks sufficient depth.",
            evidence=["low depth score"]
        )

    # 4️⃣ High depth → edge case escalation
    if signals.get("depth_score", 0) >= 0.75:
        return ReasoningDecision(
            action="probe",
            intent="edge_case_probe",
            difficulty="hard",
            confidence=0.9,
            message="Strong, deep answer detected.",
            evidence=["high depth score"]
        )


    # # 5️⃣ Answered well → stop this turn
    # if signals.get("answered") and signals.get("confidence", 0) > 0.75:
    #     return ReasoningDecision(
    #         action="stop",
    #         confidence=0.9,
    #         message="Strong answer. Stop this turn.",
    #         evidence=["high confidence completion"]
    #     )

    # 5️⃣ Strong but confident → escalate slightly
    if signals.get("confidence", 0) > 0.75:
        return ReasoningDecision(
            action="probe",
            intent="depth_probe",
            difficulty="medium",
            confidence=0.85,
            message="Good answer. Probe deeper.",
            evidence=["high confidence"]
        )


    # 6️⃣ Default → continue interview
    return ReasoningDecision(
        action="probe",
        intent="progression",
        difficulty="medium",
        confidence=0.6,
        message="Continue interview naturally.",
        evidence=[]
    )
