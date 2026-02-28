from __future__ import annotations

import asyncio
import hashlib
import re
from dataclasses import replace

from app.realtime_assist.models import AssistConfig, AssistHint, AssistRule


class RollingTranscriptBuffer:
    def __init__(self, window_seconds: int = 20):
        self.entries: list[tuple[str, float]] = []
        self.window_seconds = int(window_seconds)

    def append(self, text: str, timestamp: float):
        clean = str(text or "").strip()
        if not clean:
            return
        self.entries.append((clean, float(timestamp)))
        self._trim(float(timestamp))

    def _token_overlap_ratio(self, left: str, right: str) -> float:
        left_tokens = set(re.findall(r"\b\w+\b", str(left or "").lower()))
        right_tokens = set(re.findall(r"\b\w+\b", str(right or "").lower()))
        if not left_tokens or not right_tokens:
            return 0.0
        common = len(left_tokens.intersection(right_tokens))
        denom = max(len(left_tokens.union(right_tokens)), 1)
        return float(common) / float(denom)

    def append_partial(self, text: str, timestamp: float) -> bool:
        clean = str(text or "").strip()
        if not clean:
            return False

        now = float(timestamp)
        if self.entries:
            last_text, last_ts = self.entries[-1]
            last_text = str(last_text or "")
            last_ts = float(last_ts)

            if clean == last_text:
                return False

            if (now - last_ts) <= 3.0:
                if clean.startswith(last_text) or last_text.startswith(clean):
                    self.entries[-1] = (clean, now)
                    self._trim(now)
                    return True

                if self._token_overlap_ratio(last_text, clean) >= 0.7:
                    self.entries[-1] = (clean, now)
                    self._trim(now)
                    return True

        self.entries.append((clean, now))
        self._trim(now)
        return True

    def _trim(self, now: float):
        self.entries = [
            (text, ts)
            for text, ts in self.entries
            if (now - float(ts)) <= float(self.window_seconds)
        ]

    def get_full_text(self) -> str:
        return " ".join(text for text, _ in self.entries).strip()


class CooldownManager:
    def __init__(self):
        self.last_fired: dict[str, float] = {}

    def can_fire(self, rule_id: str, now: float, cooldown: float) -> bool:
        last = float(self.last_fired.get(rule_id, 0.0) or 0.0)
        if (float(now) - last) >= float(cooldown):
            self.last_fired[rule_id] = float(now)
            return True
        return False


class AssistRuleEngine:
    def __init__(self, config: AssistConfig):
        self.config = config
        self.active_profile = str(config.profile or "behavioral").lower()
        self.rules_by_profile = self._build_rules(config)

    def activate_profile(self, profile: str):
        selected = str(profile or "behavioral").strip().lower()
        if selected in self.rules_by_profile:
            self.active_profile = selected
            return
        self.active_profile = "behavioral"

    def _build_rules(self, config: AssistConfig) -> dict[str, list[AssistRule]]:
        intensity = max(1, min(int(config.intensity_level or 2), 3))

        long_answer_threshold = 120 if intensity == 1 else 95 if intensity == 2 else 80
        missing_metrics_threshold = 52 if intensity == 1 else 44 if intensity == 2 else 36

        def missing_metrics_trigger(a: dict) -> bool:
            return int(a.get("token_count", 0) or 0) >= missing_metrics_threshold and not bool(a.get("has_number", False))

        def missing_ownership_trigger(a: dict) -> bool:
            return int(a.get("token_count", 0) or 0) >= 30 and float(a.get("ownership_score", 0.0) or 0.0) < 0.25

        def rambling_trigger(a: dict) -> bool:
            return int(a.get("token_count", 0) or 0) >= long_answer_threshold or float(a.get("sentence_length", 0.0) or 0.0) > 28.0

        def filler_trigger(a: dict) -> bool:
            return float(a.get("filler_density", 0.0) or 0.0) > 0.13

        def weak_structure_trigger(a: dict) -> bool:
            return int(a.get("token_count", 0) or 0) > 45 and int(a.get("structure_markers", 0) or 0) < 2

        def tradeoff_missing_trigger(a: dict) -> bool:
            return int(a.get("token_count", 0) or 0) > 40 and float(a.get("tradeoff_score", 0.0) or 0.0) < 0.2

        def contradiction_cue_trigger(a: dict) -> bool:
            return bool(a.get("contradiction_cue", False))

        common = [
            AssistRule(
                rule_id="missing_metrics",
                trigger_fn=missing_metrics_trigger,
                severity="medium",
                cooldown_sec=22.0,
                priority=2,
                title="Add metrics",
                message="Ground this answer with one measurable metric or concrete scale detail.",
            ),
            AssistRule(
                rule_id="missing_ownership",
                trigger_fn=missing_ownership_trigger,
                severity="medium",
                cooldown_sec=25.0,
                priority=3,
                title="Clarify ownership",
                message="State what you personally owned, decided, or delivered.",
            ),
            AssistRule(
                rule_id="rambling",
                trigger_fn=rambling_trigger,
                severity="high",
                cooldown_sec=30.0,
                priority=1,
                title="Wrap up",
                message="Answer is getting long; summarize your key decision and impact in one line.",
            ),
            AssistRule(
                rule_id="filler_density",
                trigger_fn=filler_trigger,
                severity="low",
                cooldown_sec=20.0,
                priority=5,
                title="Tighten phrasing",
                message="Reduce filler words and make the next sentence more direct.",
            ),
            AssistRule(
                rule_id="contradiction_cue",
                trigger_fn=contradiction_cue_trigger,
                severity="high",
                cooldown_sec=35.0,
                priority=0,
                title="Consistency check",
                message="Clarify this statement against your earlier explanation to avoid contradiction.",
            ),
        ]

        behavioral = common + [
            AssistRule(
                rule_id="weak_structure",
                trigger_fn=weak_structure_trigger,
                severity="medium",
                cooldown_sec=24.0,
                priority=4,
                title="Use structure",
                message="Use a concise structure: context, action, measurable result.",
            ),
        ]

        system_design = common + [
            AssistRule(
                rule_id="tradeoff_missing",
                trigger_fn=tradeoff_missing_trigger,
                severity="medium",
                cooldown_sec=24.0,
                priority=3,
                title="Add tradeoffs",
                message="State one tradeoff, why you chose it, and what risk you accepted.",
            ),
        ]

        leadership = common + [
            AssistRule(
                rule_id="leadership_ownership",
                trigger_fn=missing_ownership_trigger,
                severity="medium",
                cooldown_sec=20.0,
                priority=2,
                title="Show leadership",
                message="Name your decision authority, stakeholder alignment, and outcome ownership.",
            ),
        ]

        coding = common + [
            AssistRule(
                rule_id="coding_clarity",
                trigger_fn=weak_structure_trigger,
                severity="medium",
                cooldown_sec=20.0,
                priority=3,
                title="Explain approach",
                message="State algorithm choice, complexity target, and key edge case.",
            ),
        ]

        if bool(config.deterministic):
            deterministic_rules = {}
            for profile, rules in {
                "behavioral": behavioral,
                "system_design": system_design,
                "leadership": leadership,
                "coding": coding,
            }.items():
                deterministic_rules[profile] = [replace(rule, cooldown_sec=float(int(rule.cooldown_sec))) for rule in rules]
            return deterministic_rules

        return {
            "behavioral": behavioral,
            "system_design": system_design,
            "leadership": leadership,
            "coding": coding,
        }

    def evaluate(self, analysis: dict) -> AssistRule | None:
        rules = self.rules_by_profile.get(self.active_profile, self.rules_by_profile.get("behavioral", []))
        triggered = [rule for rule in rules if rule.trigger_fn(analysis)]
        if not triggered:
            return None
        return sorted(triggered, key=lambda rule: int(rule.priority))[0]


class RealtimeAssistEngine:
    def __init__(self, session_id: str, config: AssistConfig):
        self.session_id = str(session_id)
        self.config = config
        self.buffer = RollingTranscriptBuffer(window_seconds=int(config.window_seconds or 20))
        self.rule_engine = AssistRuleEngine(config)
        self.cooldown_tracker = CooldownManager()
        self.intensity = int(config.intensity_level or 2)
        self._lock = asyncio.Lock()
        self._last_partial_hash: str | None = None
        self._last_hint_ts: float = 0.0
        self._last_hint_rule_id: str | None = None
        self._min_hint_interval_sec: float = 1.8

    def activate_profile(self, profile: str):
        self.rule_engine.activate_profile(profile)

    def _detect_ownership(self, text: str) -> float:
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.0

        ownership_terms = {
            "i", "my", "mine", "led", "owned", "implemented", "designed", "built", "decided", "drove", "managed"
        }
        score = sum(1 for word in words if word in ownership_terms) / max(len(words), 1)
        return min(1.0, round(score * 6.0, 3))

    def _detect_tradeoff(self, text: str) -> float:
        lower = text.lower()
        terms = [
            "tradeoff",
            "trade-off",
            "instead",
            "because",
            "cost",
            "latency",
            "throughput",
            "reliability",
            "consistency",
        ]
        count = sum(1 for term in terms if term in lower)
        return min(1.0, round(count / 4.0, 3))

    def _detect_structure_markers(self, text: str) -> int:
        lower = text.lower()
        groups = [
            ["situation", "context", "problem"],
            ["action", "implemented", "designed", "built"],
            ["result", "impact", "reduced", "improved", "%"],
        ]
        return sum(1 for group in groups if any(token in lower for token in group))

    def _detect_fillers(self, text: str) -> float:
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.0
        fillers = {"um", "uh", "like", "basically", "actually", "literally", "you", "know"}
        filler_count = sum(1 for word in words if word in fillers)
        return round(filler_count / max(len(words), 1), 3)

    def _estimate_sentence_length(self, text: str) -> float:
        pieces = [piece.strip() for piece in re.split(r"[.!?]+", text) if piece.strip()]
        if not pieces:
            return 0.0
        lengths = [len(piece.split()) for piece in pieces]
        return round(sum(lengths) / max(len(lengths), 1), 2)

    def _detect_contradiction_cue(self, text: str) -> bool:
        lower = text.lower()
        cues = [
            "actually we didn't",
            "actually we did not",
            "i mean we didn't",
            "not really",
            "to be honest we didn't",
            "correction",
        ]
        return any(cue in lower for cue in cues)

    def _analyze(self) -> dict:
        text = self.buffer.get_full_text()
        return {
            "token_count": len(text.split()),
            "has_number": any(char.isdigit() for char in text),
            "ownership_score": self._detect_ownership(text),
            "tradeoff_score": self._detect_tradeoff(text),
            "structure_markers": self._detect_structure_markers(text),
            "filler_density": self._detect_fillers(text),
            "sentence_length": self._estimate_sentence_length(text),
            "contradiction_cue": self._detect_contradiction_cue(text),
        }

    async def on_partial_transcript(self, text: str, timestamp: float):
        clean = str(text or "").strip()
        if not clean:
            return None

        async with self._lock:
            now = float(timestamp)
            normalized = re.sub(r"\s+", " ", clean.lower()).strip()
            partial_hash = hashlib.sha1(normalized.encode("utf-8")).hexdigest()
            if partial_hash == self._last_partial_hash:
                return None

            self._last_partial_hash = partial_hash

            changed = self.buffer.append_partial(clean, now)
            if not changed:
                return None

            analysis = self._analyze()
            rule = self.rule_engine.evaluate(analysis)
            if rule is None:
                return None

            if not self.cooldown_tracker.can_fire(rule.rule_id, now, rule.cooldown_sec):
                return None

            if (
                self._last_hint_rule_id is not None
                and rule.rule_id != self._last_hint_rule_id
                and (now - self._last_hint_ts) < self._min_hint_interval_sec
            ):
                return None

            self._last_hint_ts = now
            self._last_hint_rule_id = rule.rule_id

            return AssistHint(
                rule_id=rule.rule_id,
                title=rule.title,
                message=rule.message,
                severity=rule.severity,
                priority=rule.priority,
                profile=self.rule_engine.active_profile,
                timestamp=now,
            )
