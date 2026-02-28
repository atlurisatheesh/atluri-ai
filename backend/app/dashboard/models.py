from dataclasses import dataclass, asdict
from typing import List, Dict


@dataclass
class SkillSummary:
    skill_name: str
    jd_required: bool
    resume_claimed: bool
    credibility_score: float
    risk_flag: str
    evidence_count: int
    depth_score: float
    explanation: str


@dataclass
class CredibilityDashboard:
    session_id: str
    jd_coverage_percent: float
    resume_credibility_percent: float
    overclaim_index: float
    blind_spot_index: float
    contradiction_count: int
    unresolved_contradictions: int
    unresolved_assertion_count: int
    consistency_score: float
    leadership_credibility: float
    strongest_skills: List[str]
    weakest_skills: List[str]
    high_risk_skills: List[Dict]
    skill_breakdown: List[SkillSummary]

    def to_dict(self) -> dict:
        payload = asdict(self)
        payload["skill_breakdown"] = [asdict(item) for item in self.skill_breakdown]
        return payload
