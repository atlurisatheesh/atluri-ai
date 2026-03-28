"""
Voice Profiler — Main Orchestrator

Analyzes a user's past interview answers to build a "voice profile" — 
a compressed prompt addendum that makes LLM outputs sound like the user.

After 3+ sessions, generates a voice signature that gets injected into
every LLM call. Result: AI answers sound like the specific user, not GPT.

Usage:
    profiler = VoiceProfiler()
    profile = await profiler.build_profile(user_id, answers, questions)
    
    # Get the prompt injection string
    voice_prompt = profiler.get_voice_prompt(profile)
    # → "Match the candidate's natural speaking style: uses transitions
    #    like 'however' and 'moreover', prefers 15-word sentences, 
    #    opens with specific examples, avoids hedging..."
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from app.personalization.vocabulary_analyzer import (
    VocabularySignature,
    analyze_vocabulary,
)
from app.personalization.pattern_extractor import (
    SpeakingPatterns,
    extract_patterns,
)

logger = logging.getLogger("voice_profiler")


@dataclass
class VoiceProfile:
    """Complete voice profile for a user."""
    user_id: str
    vocabulary: VocabularySignature = field(default_factory=VocabularySignature)
    patterns: SpeakingPatterns = field(default_factory=SpeakingPatterns)
    sessions_analyzed: int = 0
    maturity: str = "immature"  # immature (<3 sessions), developing (3-7), mature (8+)
    voice_signature: str = ""  # The compressed prompt addendum
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "vocabulary": self.vocabulary.to_dict(),
            "patterns": self.patterns.to_dict(),
            "sessions_analyzed": self.sessions_analyzed,
            "maturity": self.maturity,
            "voice_signature": self.voice_signature,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "VoiceProfile":
        profile = cls(user_id=str(data.get("user_id", "")))
        profile.sessions_analyzed = int(data.get("sessions_analyzed", 0))
        profile.maturity = str(data.get("maturity", "immature"))
        profile.voice_signature = str(data.get("voice_signature", ""))
        profile.created_at = float(data.get("created_at", time.time()))
        profile.updated_at = float(data.get("updated_at", time.time()))
        return profile


class VoiceProfiler:
    """Orchestrates voice profile building and signature generation."""

    MIN_SESSIONS_FOR_PROFILE = 3
    MIN_ANSWERS_FOR_ANALYSIS = 5

    def build_profile(
        self,
        user_id: str,
        answers: list[str],
        questions: list[str] | None = None,
        sessions_count: int = 0,
    ) -> VoiceProfile:
        """
        Build a voice profile from a user's answer history.
        
        Args:
            user_id: User identifier
            answers: List of all user answers across sessions
            questions: Optional list of corresponding questions
            sessions_count: Number of sessions analyzed
            
        Returns:
            VoiceProfile with vocabulary, patterns, and voice signature
        """
        profile = VoiceProfile(user_id=user_id)
        profile.sessions_analyzed = sessions_count

        if len(answers) < self.MIN_ANSWERS_FOR_ANALYSIS:
            profile.maturity = "immature"
            return profile

        # Analyze vocabulary
        profile.vocabulary = analyze_vocabulary(answers)

        # Extract patterns
        profile.patterns = extract_patterns(answers, questions)

        # Determine maturity
        if sessions_count >= 8:
            profile.maturity = "mature"
        elif sessions_count >= 3:
            profile.maturity = "developing"
        else:
            profile.maturity = "immature"

        # Generate voice signature
        if profile.maturity != "immature":
            profile.voice_signature = self._generate_signature(profile)

        profile.updated_at = time.time()
        return profile

    def _generate_signature(self, profile: VoiceProfile) -> str:
        """
        Generate a compressed voice signature string for LLM prompt injection.
        This is what gets added to every LLM system prompt.
        """
        parts = []

        vocab = profile.vocabulary
        patterns = profile.patterns

        # Sentence length preference
        if vocab.avg_sentence_length > 0:
            if vocab.avg_sentence_length < 12:
                parts.append("uses short, direct sentences (avg ~{:.0f} words)".format(vocab.avg_sentence_length))
            elif vocab.avg_sentence_length > 20:
                parts.append("uses detailed, longer sentences (avg ~{:.0f} words)".format(vocab.avg_sentence_length))
            else:
                parts.append("uses medium-length sentences (avg ~{:.0f} words)".format(vocab.avg_sentence_length))

        # Transition word preferences
        if vocab.transition_preferences:
            top_transitions = [t[0] for t in vocab.transition_preferences[:3]]
            parts.append("prefers transitions like '{}'".format("', '".join(top_transitions)))

        # Opening patterns
        if patterns.opening_patterns:
            openers = patterns.opening_patterns[:2]
            parts.append("typically opens answers with patterns like: '{}'".format(openers[0][:50]))

        # Confidence level
        if patterns.confidence_markers and not patterns.hedging_markers:
            parts.append("speaks with high confidence and directness")
        elif patterns.hedging_markers and not patterns.confidence_markers:
            parts.append("tends to hedge — avoid adding more hedging, match but don't amplify")
        elif patterns.confidence_markers and patterns.hedging_markers:
            parts.append("balances confidence with thoughtfulness")

        # Filler awareness
        if vocab.filler_patterns:
            parts.append("tends to use fillers — generate clean text without fillers")

        # Unique vocabulary
        if vocab.unique_words:
            sample = vocab.unique_words[:5]
            parts.append("uses distinctive words like: {}".format(", ".join(sample)))

        # Story patterns
        if patterns.star_stories:
            strong_stories = [s for s in patterns.star_stories if s.strength_score >= 0.7]
            if strong_stories:
                parts.append("has {} strong STAR stories available".format(len(strong_stories)))

        # Overuse warnings
        if patterns.overused_stories:
            parts.append("tends to reuse certain stories — suggest variety")

        if not parts:
            return ""

        return "Match the candidate's natural speaking style: " + "; ".join(parts) + "."

    def get_voice_prompt(self, profile: VoiceProfile) -> str:
        """
        Get the voice signature prompt addendum for LLM injection.
        Returns empty string if profile is too immature.
        """
        if profile.maturity == "immature" or not profile.voice_signature:
            return ""
        return profile.voice_signature

    def get_story_context(self, profile: VoiceProfile, question_type: str = "") -> str:
        """
        Get relevant STAR story suggestions for the current question type.
        Returns a string to add to the LLM context.
        """
        if not profile.patterns.star_stories:
            return ""

        relevant = profile.patterns.star_stories
        if question_type:
            # Map question types to themes
            theme_map = {
                "behavioral": None,  # All themes relevant
                "leadership": "leadership",
                "conflict": "conflict",
                "failure": "failure",
                "teamwork": "teamwork",
            }
            target_theme = theme_map.get(question_type)
            if target_theme:
                themed = [s for s in relevant if s.theme == target_theme]
                if themed:
                    relevant = themed

        # Get top 2 strongest stories
        top_stories = sorted(relevant, key=lambda s: s.strength_score, reverse=True)[:2]

        if not top_stories:
            return ""

        context_parts = ["\n--- CANDIDATE'S STORY BANK (reference for authenticity) ---"]
        for story in top_stories:
            parts = []
            if story.situation:
                parts.append(f"Situation: {story.situation[:100]}")
            if story.action:
                parts.append(f"Action: {story.action[:100]}")
            if story.result:
                parts.append(f"Result: {story.result[:100]}")
            if parts:
                context_parts.append(f"[{story.theme}] " + " | ".join(parts))

        return "\n".join(context_parts)
