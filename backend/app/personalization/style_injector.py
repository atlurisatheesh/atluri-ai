"""
Style Injector — Injects voice profile into LLM system prompts.

Takes a VoiceProfile and generates the exact prompt additions
that make LLM outputs sound like the specific user.

Usage:
    injector = StyleInjector()
    system_prompt = injector.inject(base_prompt, profile)
    # → base_prompt + voice signature + story context
"""

from app.personalization.voice_profiler import VoiceProfile, VoiceProfiler


_profiler = VoiceProfiler()


class StyleInjector:
    """Injects voice personalization into LLM prompts."""

    def inject(
        self,
        base_prompt: str,
        profile: VoiceProfile,
        question_type: str = "",
    ) -> str:
        """
        Inject voice personalization into a system prompt.
        
        Args:
            base_prompt: The original system prompt
            profile: User's voice profile
            question_type: Current question type for story selection
            
        Returns:
            Enhanced system prompt with voice personalization
        """
        if profile.maturity == "immature":
            return base_prompt

        additions = []

        # Voice signature (sentence length, transitions, style)
        voice_prompt = _profiler.get_voice_prompt(profile)
        if voice_prompt:
            additions.append(voice_prompt)

        # Story context for behavioral questions
        if question_type in ("behavioral", "leadership", "conflict", "failure", "teamwork", ""):
            story_ctx = _profiler.get_story_context(profile, question_type)
            if story_ctx:
                additions.append(story_ctx)

        if not additions:
            return base_prompt

        return base_prompt + "\n\n" + "\n".join(additions)

    def get_coaching_style_hint(self, profile: VoiceProfile) -> str:
        """
        Get a brief coaching hint about the user's style for coaching prompts.
        Used by silence coaching and other coaching systems.
        """
        if profile.maturity == "immature":
            return ""

        hints = []
        patterns = profile.patterns

        if patterns.hedging_markers:
            hints.append("This candidate tends to hedge — encourage directness.")
        
        if patterns.overused_stories:
            hints.append("They tend to reuse stories — suggest drawing from different experiences.")

        if patterns.star_stories:
            weak = [s for s in patterns.star_stories if s.strength_score < 0.5]
            if len(weak) > len(patterns.star_stories) // 2:
                hints.append("Their STAR stories are often incomplete — prompt for specific results and metrics.")

        return " ".join(hints)


def get_style_injector() -> StyleInjector:
    """Singleton factory."""
    if not hasattr(get_style_injector, "_instance"):
        get_style_injector._instance = StyleInjector()
    return get_style_injector._instance
