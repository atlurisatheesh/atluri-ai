# def extract_signals(interview_snapshot):
#     return {
#         "hesitation_count": interview_snapshot.hesitation_count,
#         "turn_duration": interview_snapshot.last_turn_duration,
#         "topic_drift": interview_snapshot.topic_drift_score,
#         "answered": interview_snapshot.answered_question,
#         "confidence": interview_snapshot.confidence_estimate,
#     }


def extract_signals(interview_snapshot):
    """
    Analyze the last answer and session context.
    Return lightweight, deterministic signals.
    """

    # last_answer = interview_snapshot.last_answer or ""
    last_answer = interview_snapshot.last_turn_summary or ""
    text = last_answer.lower()
    words = last_answer.split()
    word_count = len(words)

    # ---- Hesitation detection ----
    hesitation_tokens = ["uh", "um", "maybe", "i think", "not sure"]
    hesitation_count = sum(text.count(t) for t in hesitation_tokens)

    # ---- Confidence score (0.0 – 1.0) ----
    confidence = 0.5  # base

    if word_count > 40:
        confidence += 0.2
    if "because" in text:
        confidence += 0.15
    if hesitation_count > 0:
        confidence -= 0.15

    confidence = max(0.0, min(confidence, 1.0))

    # ---- Quality flags ----
    is_vague = word_count < 15
    is_shallow = word_count < 25
    has_tradeoffs = "trade" in text or "pros and cons" in text
    is_strong = word_count > 50 and has_tradeoffs and hesitation_count == 0

    
        # ---- Depth score (0.0 – 1.0) ----
    depth_score = 0.0

    if word_count > 25:
        depth_score += 0.25
    if has_tradeoffs:
        depth_score += 0.25
    if "example" in text or "for instance" in text:
        depth_score += 0.25
    if hesitation_count == 0:
        depth_score += 0.25

    depth_score = min(depth_score, 1.0)

    return {
        "word_count": word_count,
        "hesitation_count": hesitation_count,
        "confidence": confidence,
        "answered": word_count > 10,
        "is_vague": is_vague,
        "is_shallow": is_shallow,
        "is_strong": is_strong,
        "has_tradeoffs": has_tradeoffs,
        "topic_drift": getattr(interview_snapshot, "topic_drift", 0.0),
        "depth_score": depth_score,

    }
