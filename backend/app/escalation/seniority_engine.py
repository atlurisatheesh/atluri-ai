from dataclasses import dataclass


@dataclass
class SeniorityEscalationEngine:
    MODES = {"NORMAL", "LEADERSHIP_PROBE", "ARCHITECTURE", "TRADEOFF", "INCIDENT"}

    MODE_GUIDANCE = {
        "NORMAL": "Use standard structured probing focused on clarity and depth.",
        "LEADERSHIP_PROBE": "Ask accountability-focused questions: ownership, decision authority, stakeholder handling, and conflict resolution.",
        "ARCHITECTURE": "Ask system-design questions: scale, reliability, failure domains, and architecture tradeoffs.",
        "TRADEOFF": "Use skeptical analytical probing: alternatives, cost impact, consistency choices, and worst-case outcomes.",
        "INCIDENT": "Use high-stakes incident simulation: first 10 minutes, triage order, communication, containment, and recovery.",
    }

    def _normalize_seniority(self, seniority: str) -> str:
        text = str(seniority or "").strip().lower()
        if "staff" in text:
            return "staff"
        if "principal" in text:
            return "staff"
        if "lead" in text:
            return "senior"
        if "senior" in text:
            return "senior"
        if "mid" in text:
            return "mid"
        if "junior" in text:
            return "junior"
        return "unknown"

    def _difficulty_to_int(self, difficulty_level) -> int:
        text = str(difficulty_level or "").strip().upper()
        if text.startswith("L") and text[1:].isdigit():
            return int(text[1:])
        if text.isdigit():
            return int(text)
        return 2

    def evaluate_mode(
        self,
        seniority,
        difficulty_level,
        leadership_score,
        consistency_score,
        jd_coverage_pct,
        depth_score,
        risk_count: int = 0,
    ) -> str:
        seniority_norm = self._normalize_seniority(str(seniority or ""))
        difficulty_int = self._difficulty_to_int(difficulty_level)
        leadership = float(leadership_score or 0)
        consistency = float(consistency_score or 0)
        coverage = float(jd_coverage_pct or 0)
        depth = float(depth_score or 0)
        risk = int(risk_count or 0)

        mode = "NORMAL"

        # Rule 1 — Leadership weakness
        if (
            seniority_norm in {"senior", "staff"}
            and leadership < 40
            and difficulty_int >= 3
        ):
            mode = "LEADERSHIP_PROBE"

        # Rule 2 — Architecture escalation
        if (
            seniority_norm in {"senior", "staff"}
            and difficulty_int >= 4
            and leadership >= 65
            and consistency >= 70
            and coverage >= 60
        ):
            mode = "ARCHITECTURE"

        # Rule 3 — Incident simulation
        if mode == "ARCHITECTURE" and risk >= 2 and leadership >= 70:
            mode = "INCIDENT"

        # Rule 4 — Tradeoff mode
        if (
            mode == "NORMAL"
            and difficulty_int >= 4
            and depth >= 70
            and 45 <= leadership < 70
        ):
            mode = "TRADEOFF"

        if mode not in self.MODES:
            return "NORMAL"
        return mode

    def get_mode_guidance(self, mode: str) -> str:
        return self.MODE_GUIDANCE.get(mode, self.MODE_GUIDANCE["NORMAL"])

    def apply_skill_routing(self, base_mode: str, target_skill: str | None, risk_flag: str | None) -> str:
        mode = base_mode if base_mode in self.MODES else "NORMAL"
        skill = str(target_skill or "").strip().lower()
        risk = str(risk_flag or "NONE").strip().upper()

        if not skill or risk not in {"GAP", "OVERCLAIM", "SHALLOW"}:
            return mode

        if any(k in skill for k in ["distributed", "system design", "architecture", "microservices"]):
            return "ARCHITECTURE"

        if any(k in skill for k in ["redis", "incident", "on-call", "recovery"]):
            return "INCIDENT"

        if any(k in skill for k in ["kubernetes", "terraform", "aws", "gcp", "azure", "sql", "database"]):
            return "TRADEOFF"

        if any(k in skill for k in ["lead", "stakeholder", "management", "ownership"]):
            return "LEADERSHIP_PROBE"

        if mode == "NORMAL":
            return "TRADEOFF"
        return mode

    def apply_memory_routing(self, base_mode: str, severity: float, subject: str | None) -> str:
        mode = base_mode if base_mode in self.MODES else "NORMAL"
        level = float(severity or 0.0)
        topic = str(subject or "").strip().lower()

        if level <= 0.7:
            return mode

        if any(k in topic for k in ["lead", "ownership", "stakeholder", "manager", "leadership"]):
            return "LEADERSHIP_PROBE"

        if any(k in topic for k in ["architecture", "distributed", "cache", "kafka", "redis", "system"]):
            return "ARCHITECTURE"

        if mode == "NORMAL":
            return "TRADEOFF"
        return mode
