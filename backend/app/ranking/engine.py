def rank_candidates(interviews):
    ranked = sorted(interviews, key=lambda x: x["final_score"], reverse=True)
    return ranked
