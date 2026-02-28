def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _normalized_item_score(item: dict) -> float:
    direct_score = item.get("score")
    if direct_score is not None:
        score_value = _safe_float(direct_score, 0.0)
        return max(0.0, min(10.0, score_value))

    candidates = [
        _safe_float(item.get("technical"), -1.0),
        _safe_float(item.get("communication"), -1.0),
        _safe_float(item.get("confidence"), -1.0),
        _safe_float(item.get("clarity"), -1.0),
    ]
    present = [value for value in candidates if value >= 0.0]
    if not present:
        return 0.0

    avg_100_scale = sum(present) / len(present)
    return max(0.0, min(10.0, avg_100_scale / 10.0))


def calculate_final_score(results):
    normalized = [_normalized_item_score(item if isinstance(item, dict) else {}) for item in list(results or [])]
    if not normalized:
        return 0.0, "Reject"

    total = sum(normalized)
    max_score = len(normalized) * 10
    percent = round((total / max_score) * 100, 2)

    if percent >= 80:
        decision = "Strong Hire"
    elif percent >= 65:
        decision = "Hire"
    elif percent >= 50:
        decision = "Borderline"
    else:
        decision = "Reject"

    return percent, decision
