def score_confidence(confidence, fillers, silence):
    score = confidence * 10

    score -= fillers * 0.5
    score -= max(0, silence - 1) * 0.7

    return max(0, min(10, round(score, 2)))
