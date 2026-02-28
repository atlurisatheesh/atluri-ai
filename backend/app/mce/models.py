from dataclasses import dataclass, field


@dataclass
class Claim:
    claim_id: str
    turn_index: int
    category: str
    subject: str
    assertion: str
    confidence: float
    metadata: dict = field(default_factory=dict)


@dataclass
class Contradiction:
    subject: str
    earlier_claim: Claim
    conflicting_claim: Claim
    severity: float
    detected_turn: int
    resolved: bool = False
