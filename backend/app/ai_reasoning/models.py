# from dataclasses import dataclass
# from typing import Optional, List

# @dataclass
# class ReasoningDecision:
#     action: str                    # hint | probe | stop | let_continue
#     confidence: float              # 0.0 → 1.0
#     message: Optional[str] = None  # what to show user
#     evidence: Optional[List[str]] = None



from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ReasoningDecision:
    # --- Core ---
    action: str

    # --- Interview intelligence ---
    intent: Optional[str] = None
    difficulty: Optional[str] = None

    # --- Scoring ---
    confidence: float = 0.0
    hesitation_count: int = 0
    clarity_score: int = 0
    depth_score: int = 0
    structure_score: int = 0
    alignment_score: int = 0
    seniority_adjustment: int = 0
    hesitation_penalty: int = 0
    improvement_pct: float = 0.0
    decline_warning: bool = False
    strongest_dimension: Optional[str] = None
    weakest_dimension: Optional[str] = None
    consistency_score: float = 0.0
    jd_coverage_pct: float = 0.0
    leadership_score: int = 0
    leadership_strengths: List[str] = field(default_factory=list)
    leadership_gaps: List[str] = field(default_factory=list)
    leadership_signals: dict = field(default_factory=dict)
    leadership_signal_counts: dict = field(default_factory=dict)
    escalation_mode: str = "NORMAL"
    verdict: str = "Average"
    explanation: Optional[str] = None
    persona_name: Optional[str] = None
    pressure_intensity: Optional[int] = None
    skill_target: Optional[str] = None
    skill_risk_flag: Optional[str] = None
    skill_jd_coverage_pct: float = 0.0
    resume_credibility_pct: float = 0.0
    high_risk_skill_count: int = 0
    overclaim_index: float = 0.0
    blind_spot_index: float = 0.0
    contradiction_count: int = 0
    unresolved_contradictions: int = 0
    unresolved_assertion_count: int = 0
    memory_consistency_score: float = 1.0
    memory_recall_context: Optional[str] = None
    memory_priority_subject: Optional[str] = None
    memory_priority_severity: float = 0.0

    # --- Messaging ---
    message: Optional[str] = None
    evidence: List[str] = field(default_factory=list)

    # --- Follow-up ---
    next_question: Optional[str] = None
    why: Optional[str] = None
