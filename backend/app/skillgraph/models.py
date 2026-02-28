from dataclasses import dataclass


@dataclass
class SkillNode:
    name: str
    jd_required: bool = False
    jd_weight: float = 0.0
    jd_depth_expected: int = 1
    resume_claimed: bool = False
    resume_strength: float = 0.0
    evidence_count: int = 0
    avg_confidence: float = 0.0
    depth_score: float = 0.0
    last_demonstrated_turn: int = 0
    coverage_score: float = 0.0
    credibility_score: float = 0.0
    risk_flag: str = "NONE"


@dataclass
class SkillTarget:
    skill_name: str
    risk_flag: str
    priority_score: float
