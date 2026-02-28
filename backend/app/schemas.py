from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    context: str | None = None

class ChatResponse(BaseModel):
    reply: str


class OfferProbabilityResponse(BaseModel):
    offer_probability: float
    confidence_band: str
    drivers_positive: list[str]
    drivers_negative: list[str]
    delta_vs_last_session: float
    what_to_fix_next: list[str]
    session_count: int
    latest_session_id: str | None = None
    improvement_velocity_pp_per_session: float | None = None
    beta_percentile: float | None = None
    beta_cohort_size: int | None = None
    baseline_range_hint: str | None = None
    target_ladder: list[str] | None = None
    plateau_note: str | None = None
    how_it_works: str | None = None
