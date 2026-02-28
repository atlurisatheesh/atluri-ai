class InterviewSnapshot:
    def __init__(
        self,
        last_turn_summary: str,
        recommended_action: str = None,
        metadata: dict | None = None
    ):
        self.last_turn_summary = last_turn_summary
        self.recommended_action = recommended_action
        self.metadata = metadata or {}
