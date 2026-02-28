from dataclasses import dataclass


@dataclass(frozen=True)
class PersonaProfile:
    name: str
    skepticism_level: float
    interruption_tendency: float
    patience_threshold: int
    encouragement_level: float
    silence_usage: float
    demands_metrics: bool
    demands_tradeoffs: bool
    pushes_depth: bool
    cuts_fluff: bool
    minimal_feedback: bool


@dataclass
class PersonaRuntimeState:
    profile: PersonaProfile
    pressure_intensity: int = 1
    consecutive_strong_answers: int = 0
    consecutive_weak_answers: int = 0


@dataclass(frozen=True)
class PersonaDirective:
    name: str
    pressure_intensity: int
    skepticism_level: float
    interruption_tendency: float
    patience_threshold: int
    encouragement_level: float
    silence_usage: float
    behavior_rules: list[str]


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _difficulty_to_int(level: str) -> int:
    text = str(level or "").strip().upper()
    if text.startswith("L") and text[1:].isdigit():
        return int(text[1:])
    if text.isdigit():
        return int(text)
    return 2


FAANG_SKEPTICAL = PersonaProfile(
    name="FAANG_SKEPTICAL",
    skepticism_level=0.9,
    interruption_tendency=0.8,
    patience_threshold=140,
    encouragement_level=0.1,
    silence_usage=0.2,
    demands_metrics=True,
    demands_tradeoffs=True,
    pushes_depth=True,
    cuts_fluff=True,
    minimal_feedback=False,
)

IMPATIENT_MANAGER = PersonaProfile(
    name="IMPATIENT_MANAGER",
    skepticism_level=0.6,
    interruption_tendency=0.6,
    patience_threshold=100,
    encouragement_level=0.2,
    silence_usage=0.1,
    demands_metrics=False,
    demands_tradeoffs=False,
    pushes_depth=False,
    cuts_fluff=True,
    minimal_feedback=False,
)

CALM_CTO = PersonaProfile(
    name="CALM_CTO",
    skepticism_level=0.7,
    interruption_tendency=0.2,
    patience_threshold=220,
    encouragement_level=0.3,
    silence_usage=0.3,
    demands_metrics=True,
    demands_tradeoffs=True,
    pushes_depth=True,
    cuts_fluff=False,
    minimal_feedback=False,
)

SILENT_EVALUATOR = PersonaProfile(
    name="SILENT_EVALUATOR",
    skepticism_level=0.5,
    interruption_tendency=0.0,
    patience_threshold=300,
    encouragement_level=0.0,
    silence_usage=0.9,
    demands_metrics=False,
    demands_tradeoffs=False,
    pushes_depth=True,
    cuts_fluff=False,
    minimal_feedback=True,
)


class PersonaPressureEngine:
    def update_state(
        self,
        state: PersonaRuntimeState,
        improvement_pct: float,
        confidence: float,
        difficulty_level: str,
        decline_warning: bool,
        verdict: str,
    ) -> PersonaRuntimeState:
        verdict_norm = str(verdict or "").strip().lower()
        strong_streak = state.consecutive_strong_answers
        weak_streak = state.consecutive_weak_answers

        if verdict_norm == "strong":
            strong_streak += 1
            weak_streak = 0
        elif verdict_norm == "needs improvement":
            weak_streak += 1
            strong_streak = 0
        else:
            strong_streak = 0
            weak_streak = 0

        difficulty_int = _difficulty_to_int(difficulty_level)

        decrease_intensity = (
            float(improvement_pct or 0.0) < -8.0
            or float(confidence or 0.0) < 0.5
            or weak_streak >= 2
            or bool(decline_warning)
        )

        increase_intensity = (
            float(improvement_pct or 0.0) > 5.0
            and float(confidence or 0.0) > 0.75
            and difficulty_int >= 3
            and (not bool(decline_warning))
            and strong_streak >= 2
        )

        intensity = int(state.pressure_intensity)
        if decrease_intensity:
            intensity = max(1, intensity - 1)
        elif increase_intensity:
            intensity = min(3, intensity + 1)

        return PersonaRuntimeState(
            profile=state.profile,
            pressure_intensity=intensity,
            consecutive_strong_answers=strong_streak,
            consecutive_weak_answers=weak_streak,
        )

    def build_directive(self, state: PersonaRuntimeState) -> PersonaDirective:
        intensity = int(state.pressure_intensity)
        profile = state.profile

        skepticism_multiplier = {1: 1.0, 2: 1.10, 3: 1.25}[intensity]
        interruption_multiplier = {1: 1.0, 2: 1.10, 3: 1.30}[intensity]
        encouragement_multiplier = {1: 1.0, 2: 0.80, 3: 0.50}[intensity]
        silence_multiplier = {1: 1.0, 2: 1.10, 3: 1.25}[intensity]

        skepticism_level = _clamp(profile.skepticism_level * skepticism_multiplier)
        interruption_tendency = _clamp(profile.interruption_tendency * interruption_multiplier)
        encouragement_level = _clamp(profile.encouragement_level * encouragement_multiplier)
        silence_usage = _clamp(profile.silence_usage * silence_multiplier)

        behavior_rules: list[str] = []
        if profile.pushes_depth:
            behavior_rules.append("Challenge vague statements")
        if profile.demands_metrics:
            behavior_rules.append("Demand concrete numbers when missing")
        if profile.demands_tradeoffs:
            behavior_rules.append("Force explicit tradeoff analysis")
        if profile.cuts_fluff:
            behavior_rules.append("Cut fluff and keep candidate concise")
        if profile.minimal_feedback:
            behavior_rules.append("Use minimal feedback language")
        if encouragement_level <= 0.15:
            behavior_rules.append("Avoid encouragement language")
        behavior_rules.append("If answer exceeds patience threshold, interrupt")

        return PersonaDirective(
            name=profile.name,
            pressure_intensity=intensity,
            skepticism_level=skepticism_level,
            interruption_tendency=interruption_tendency,
            patience_threshold=profile.patience_threshold,
            encouragement_level=encouragement_level,
            silence_usage=silence_usage,
            behavior_rules=behavior_rules,
        )
