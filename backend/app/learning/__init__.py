"""
Cross-Session Learning Engine

Tracks a user's performance across multiple sessions and provides:
1. Weakness detection — identifies recurring weak areas
2. Improvement tracking — measures progress over time
3. Targeted practice recommendations — suggests what to focus on
4. Adaptive difficulty — adjusts question difficulty based on mastery

Usage:
    from app.learning.cross_session import get_learning_engine
    
    engine = get_learning_engine()
    await engine.record_session(user_id, session_data)
    profile = await engine.get_learning_profile(user_id)
    recs = engine.get_recommendations(profile)
"""

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("learning.cross_session")


@dataclass
class SkillScore:
    """Tracks skill mastery over time."""
    skill: str
    scores: list[float] = field(default_factory=list)  # Score per session (0-100)
    timestamps: list[float] = field(default_factory=list)

    @property
    def current(self) -> float:
        if not self.scores:
            return 0.0
        # Weighted average: recent scores count more
        if len(self.scores) == 1:
            return self.scores[0]
        weights = [i + 1 for i in range(len(self.scores))]
        total_weight = sum(weights)
        return sum(s * w for s, w in zip(self.scores, weights)) / total_weight

    @property
    def trend(self) -> str:
        if len(self.scores) < 2:
            return "baseline"
        delta = self.scores[-1] - self.scores[-2]
        if delta > 5:
            return "improving"
        if delta < -5:
            return "declining"
        return "stable"

    @property
    def mastery(self) -> str:
        c = self.current
        if c >= 80:
            return "mastered"
        if c >= 60:
            return "proficient"
        if c >= 40:
            return "developing"
        return "needs_work"


@dataclass
class LearningProfile:
    """Complete cross-session learning profile for a user."""
    user_id: str
    sessions_completed: int = 0
    skills: dict[str, SkillScore] = field(default_factory=dict)
    weak_areas: list[str] = field(default_factory=list)
    strong_areas: list[str] = field(default_factory=list)
    improvement_rate: float = 0.0  # Average score improvement per session
    recommended_focus: list[str] = field(default_factory=list)
    difficulty_level: str = "medium"  # easy, medium, hard, expert
    last_updated: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "sessions_completed": self.sessions_completed,
            "skills": {
                k: {
                    "skill": v.skill,
                    "current_score": round(v.current, 1),
                    "trend": v.trend,
                    "mastery": v.mastery,
                    "history": v.scores[-10:],
                }
                for k, v in self.skills.items()
            },
            "weak_areas": self.weak_areas,
            "strong_areas": self.strong_areas,
            "improvement_rate": round(self.improvement_rate, 2),
            "recommended_focus": self.recommended_focus,
            "difficulty_level": self.difficulty_level,
            "last_updated": self.last_updated,
        }


# ── Core tracked skills ──
TRACKED_SKILLS = [
    "technical_depth",
    "communication_clarity",
    "behavioral_storytelling",
    "metric_usage",
    "ownership_framing",
    "tradeoff_reasoning",
    "confidence",
    "conciseness",
    "system_design",
    "coding_explanation",
]


class CrossSessionLearningEngine:
    """Tracks learning across sessions and generates recommendations."""

    def __init__(self):
        self._profiles: dict[str, LearningProfile] = {}

    async def record_session(
        self,
        user_id: str,
        session_analytics: dict,
    ) -> LearningProfile:
        """
        Record a completed session's analytics into the learning profile.
        
        Args:
            user_id: User identifier
            session_analytics: Output from build_session_analytics()
        """
        profile = self._profiles.get(user_id, LearningProfile(user_id=user_id))
        profile.sessions_completed += 1

        summary = session_analytics.get("summary", {})
        now = time.time()

        # Extract skill scores from session analytics
        skill_mapping = {
            "technical_depth": summary.get("score", 50),
            "communication_clarity": summary.get("score", 50),
            "metric_usage": summary.get("metric_usage_score", 50),
            "ownership_framing": summary.get("ownership_clarity_score", 50),
            "tradeoff_reasoning": summary.get("tradeoff_depth_score", 50),
            "confidence": 100 - min(100, summary.get("confidence_drop_moments", 0) * 20),
            "conciseness": 100 - min(100, summary.get("rambling_bursts", 0) * 25),
        }

        # Process timeline for behavioral/technical breakdown
        timeline = session_analytics.get("timeline", [])
        if timeline:
            avg_comm = sum(t.get("communication", 50) for t in timeline) / len(timeline)
            avg_tech = sum(t.get("technical", 50) for t in timeline) / len(timeline)
            skill_mapping["communication_clarity"] = avg_comm
            skill_mapping["technical_depth"] = avg_tech

        # Update skill scores
        for skill_name, score in skill_mapping.items():
            if skill_name not in profile.skills:
                profile.skills[skill_name] = SkillScore(skill=skill_name)
            profile.skills[skill_name].scores.append(float(score))
            profile.skills[skill_name].timestamps.append(now)
            # Keep last 20 sessions
            if len(profile.skills[skill_name].scores) > 20:
                profile.skills[skill_name].scores = profile.skills[skill_name].scores[-20:]
                profile.skills[skill_name].timestamps = profile.skills[skill_name].timestamps[-20:]

        # Analyze weak/strong areas
        profile.weak_areas = [
            s.skill for s in profile.skills.values()
            if s.mastery in ("needs_work", "developing")
        ]
        profile.strong_areas = [
            s.skill for s in profile.skills.values()
            if s.mastery in ("mastered", "proficient")
        ]

        # Calculate improvement rate
        if profile.sessions_completed >= 2:
            total_improvements = []
            for skill in profile.skills.values():
                if len(skill.scores) >= 2:
                    total_improvements.append(skill.scores[-1] - skill.scores[0])
            if total_improvements:
                profile.improvement_rate = sum(total_improvements) / len(total_improvements)

        # Generate recommendations
        profile.recommended_focus = self._generate_recommendations(profile)

        # Adjust difficulty
        profile.difficulty_level = self._calculate_difficulty(profile)

        profile.last_updated = now
        self._profiles[user_id] = profile

        logger.info(
            "LEARNING_RECORDED | user=%s sessions=%d weak=%s strong=%s difficulty=%s",
            user_id, profile.sessions_completed,
            profile.weak_areas[:3], profile.strong_areas[:3],
            profile.difficulty_level,
        )
        return profile

    def get_learning_profile(self, user_id: str) -> Optional[LearningProfile]:
        """Get a user's learning profile."""
        return self._profiles.get(user_id)

    def _generate_recommendations(self, profile: LearningProfile) -> list[str]:
        """Generate targeted practice recommendations."""
        recs = []

        # Weakest skill gets priority
        weakest = sorted(
            profile.skills.values(),
            key=lambda s: s.current
        )

        for skill in weakest[:3]:
            if skill.mastery == "needs_work":
                recs.append(self._skill_recommendation(skill.skill, "critical"))
            elif skill.mastery == "developing":
                recs.append(self._skill_recommendation(skill.skill, "improve"))

        # Declining skills get flagged
        for skill in profile.skills.values():
            if skill.trend == "declining" and skill.skill not in [r.split(":")[0] for r in recs]:
                recs.append(f"{skill.skill}: Declining trend — revisit fundamentals")

        return recs[:5]

    def _skill_recommendation(self, skill: str, urgency: str) -> str:
        """Generate a specific recommendation for a skill."""
        recommendations = {
            "technical_depth": {
                "critical": "Practice system design questions — focus on architecture trade-offs and scalability",
                "improve": "Add more technical specifics — mention tools, frameworks, and quantified results",
            },
            "communication_clarity": {
                "critical": "Structure answers with STAR framework — situation, task, action, result",
                "improve": "Tighten answers to 90-120 words — practice being concise",
            },
            "metric_usage": {
                "critical": "Always include 1-2 specific metrics (%, $, time saved) per answer",
                "improve": "Upgrade vague metrics to concrete ones — '50%' → '50% over 3 months'",
            },
            "ownership_framing": {
                "critical": "Replace 'we' with 'I' — show individual contribution clearly",
                "improve": "Lead with 'I decided' or 'I designed' — show decision ownership",
            },
            "tradeoff_reasoning": {
                "critical": "End answers with a trade-off: 'We chose X over Y because...'",
                "improve": "Add nuance — mention what you'd do differently in hindsight",
            },
            "confidence": {
                "critical": "Remove hedging words (maybe, sort of, I think) — state facts directly",
                "improve": "Practice strong openings — start with your conclusion, then support it",
            },
            "conciseness": {
                "critical": "Cut answers to under 2 minutes — practice timed responses",
                "improve": "Remove filler stories — keep only the most impactful evidence",
            },
        }
        skill_recs = recommendations.get(skill, {})
        return f"{skill}: {skill_recs.get(urgency, 'Practice this skill area')}"

    def _calculate_difficulty(self, profile: LearningProfile) -> str:
        """Calculate appropriate difficulty level based on mastery."""
        if profile.sessions_completed < 3:
            return "medium"

        avg_current = sum(
            s.current for s in profile.skills.values()
        ) / max(1, len(profile.skills))

        if avg_current >= 80:
            return "expert"
        if avg_current >= 65:
            return "hard"
        if avg_current >= 45:
            return "medium"
        return "easy"

    def get_coaching_context(self, user_id: str) -> str:
        """
        Get a brief coaching context string for LLM injection.
        Used by ws_voice to inform AI responses about user's learning journey.
        """
        profile = self._profiles.get(user_id)
        if not profile or profile.sessions_completed < 2:
            return ""

        parts = [f"Session #{profile.sessions_completed}"]

        if profile.weak_areas:
            parts.append(f"Focus areas: {', '.join(profile.weak_areas[:3])}")
        if profile.improvement_rate > 0:
            parts.append(f"Improving at +{profile.improvement_rate:.1f} per session")
        elif profile.improvement_rate < -2:
            parts.append("Performance declining — offer encouragement")

        parts.append(f"Difficulty: {profile.difficulty_level}")

        return " | ".join(parts)


def get_learning_engine() -> CrossSessionLearningEngine:
    """Singleton factory."""
    if not hasattr(get_learning_engine, "_instance"):
        get_learning_engine._instance = CrossSessionLearningEngine()
    return get_learning_engine._instance
