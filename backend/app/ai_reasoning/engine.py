
import json
import re
from types import SimpleNamespace

from app.ai_reasoning.signals import extract_signals
from app.ai_reasoning.rules import apply_rules
from app.ai_reasoning.role_context import RoleContextBuilder
from app.ai_reasoning.prompts.followup_prompt import build_followup_prompt
from app.ai_reasoning.prompts.final_summary_prompt import build_final_summary_prompt
from app.ai_reasoning.llm import call_llm
from app.context.alignment_engine import AlignmentEngine
from app.difficulty.controller import DifficultyController
from app.analytics.performance_engine import PerformanceAnalyticsEngine
from app.leadership.leadership_engine import LeadershipEngine
from app.escalation.seniority_engine import SeniorityEscalationEngine
from app.mce import ClaimExtractor, RecallPlanner
from core.config import QA_MODE


class AIReasoningEngine:
    def __init__(self, session_engine=None, session_controller=None):
        self.session_engine = session_engine
        self.session_controller = session_controller
        self.role_context_builder = RoleContextBuilder()
        self.difficulty_controller = DifficultyController()
        self.performance_analytics = PerformanceAnalyticsEngine()
        self.leadership_engine = LeadershipEngine()
        self.seniority_escalation_engine = SeniorityEscalationEngine()
        self.claim_extractor = ClaimExtractor()
        self.recall_planner = RecallPlanner()

    def _skillgraph_guidance(self, target_skill: str | None, risk_flag: str | None) -> str:
        skill = str(target_skill or "").strip()
        risk = str(risk_flag or "NONE").strip().upper()
        if not skill or risk == "NONE":
            return "Use standard probing with available evidence."
        if risk == "GAP":
            return f"Probe {skill} for missing concrete evidence, implementation details, and production usage context."
        if risk == "OVERCLAIM":
            return f"Challenge {skill} claim with scale, tradeoff, and failure-mode specifics to validate credibility."
        if risk == "SHALLOW":
            return f"Push deeper on {skill}: architecture choices, alternatives, and measurable outcomes."
        if risk == "STRONG":
            return f"Escalate {skill} to advanced tradeoffs and incident-level edge cases."
        return "Use standard probing with available evidence."

    def get_role_weights(self, role: str):
        clarity_w = 0.30
        depth_w = 0.30
        structure_w = 0.25
        confidence_w = 0.15

        if role == "devops":
            clarity_w = 0.25
            depth_w = 0.35
            structure_w = 0.25
            confidence_w = 0.15
        elif role == "backend":
            clarity_w = 0.25
            depth_w = 0.30
            structure_w = 0.30
            confidence_w = 0.15
        elif role == "behavioral":
            clarity_w = 0.30
            depth_w = 0.20
            structure_w = 0.35
            confidence_w = 0.15

        return clarity_w, depth_w, structure_w, confidence_w

    def apply_role_depth_boost(self, role: str, text: str, depth_score: int) -> int:
        tech_keywords = ["aws", "docker", "kubernetes", "terraform", "sql", "api", "jenkins", "ci/cd"]

        if role in ["devops", "backend"] and any(keyword in text.lower() for keyword in tech_keywords):
            return min(100, depth_score + 10)

        return depth_score

    def compute_clarity(self, text: str, hesitation_count: int) -> int:
        words = text.split()
        word_count = len(words)
        if word_count == 0:
            return 0

        base = 45
        if 18 <= word_count <= 90:
            base += 20
        elif word_count < 12:
            base -= 15

        unique_ratio = len(set(w.lower() for w in words)) / max(word_count, 1)
        if unique_ratio > 0.75:
            base += 10

        base -= min(hesitation_count * 4, 20)
        return max(0, min(100, int(base)))

    def compute_depth(self, signals: dict, text: str) -> int:
        lower = text.lower()
        base = int((signals.get("depth_score", 0.0) or 0.0) * 100)
        if "example" in lower or "for instance" in lower:
            base += 10
        if len(text.split()) > 40:
            base += 8

        architecture_terms = [
            "designed", "architected", "multi-region", "distributed",
            "scaled", "pipeline", "ci/cd", "terraform", "kubernetes",
        ]
        measurable_terms = [
            "%", "reduced", "improved", "latency", "throughput", "availability",
            "downtime", "cost", "time",
        ]

        has_architecture = any(term in lower for term in architecture_terms)
        has_measurable = any(term in lower for term in measurable_terms)

        if has_architecture:
            base += 15
        if has_measurable:
            base += 15
        if has_architecture and has_measurable:
            base += 10

        return max(0, min(100, base))

    def compute_structure(self, text: str) -> int:
        lower = text.lower()
        score = 0

        # ===== STAR KEYWORDS =====
        if any(k in lower for k in ["situation", "context", "problem"]):
            score += 20

        if any(k in lower for k in ["task", "goal", "objective"]):
            score += 20

        if any(k in lower for k in ["action", "implemented", "built", "designed"]):
            score += 25

        if any(k in lower for k in ["result", "impact", "%", "reduced", "improved"]):
            score += 15

        # ===== TECHNICAL ACTION VERBS =====
        technical_actions = [
            "migrated", "deployed", "optimized",
            "automated", "refactored", "scaled",
            "integrated", "configured"
        ]

        if any(v in lower for v in technical_actions):
            score += 20

        # ===== MEASURABLE IMPACT SIGNALS =====
        measurable_terms = [
            "%", "latency", "performance",
            "cost", "time", "throughput",
            "errors", "availability",
            "downtime"
        ]

        if any(m in lower for m in measurable_terms):
            score += 15

        # ===== CAUSAL FLOW DETECTION =====
        if "because" in lower or "so that" in lower:
            score += 10

        return max(0, min(100, score))

    def _normalize_seniority_level(self, value) -> int | None:
        if not value:
            return None

        text = str(value).strip().lower()
        if not text:
            return None

        mapping = {
            "intern": 1,
            "junior": 1,
            "entry": 1,
            "associate": 2,
            "mid": 2,
            "mid-level": 2,
            "intermediate": 2,
            "senior": 3,
            "lead": 3,
            "principal": 4,
            "staff": 4,
            "architect": 4,
        }

        for key, level in mapping.items():
            if key in text:
                return level

        return None

    def _parse_years_experience(self, value) -> int | None:
        if value is None:
            return None

        if isinstance(value, (int, float)):
            years = int(value)
            return years if years >= 0 else None

        text = str(value).strip().lower()
        if not text:
            return None

        match = re.search(r"(\d+)", text)
        if not match:
            return None

        years = int(match.group(1))
        return years if years >= 0 else None

    def _is_senior_expectation(self, jd_context: dict, resume_profile: dict) -> bool:
        seniority_text = str((jd_context or {}).get("seniority_level") or "").strip().lower()
        jd_level = self._normalize_seniority_level(seniority_text)

        jd_years = self._parse_years_experience(seniority_text)
        resume_years = self._parse_years_experience((resume_profile or {}).get("years_experience"))

        if jd_level is not None and jd_level >= 3:
            return True
        if jd_years is not None and jd_years >= 7:
            return True
        if resume_years is not None and resume_years >= 7:
            return True
        return False

    def apply_seniority_calibration(self, decision, jd_context: dict, resume_profile: dict):
        if not jd_context:
            return decision

        if not self._is_senior_expectation(jd_context, resume_profile):
            return decision

        if decision.depth_score < 60:
            decision.verdict = "Needs Improvement"
            note = "Senior-level role expects deeper architectural reasoning."
            if note not in (decision.explanation or ""):
                decision.explanation = f"{(decision.explanation or '').strip()} {note}".strip()

        if decision.structure_score < 55:
            note = "Use clearer problem -> action -> impact framing expected at senior level."
            if note not in (decision.explanation or ""):
                decision.explanation = f"{(decision.explanation or '').strip()} {note}".strip()

        if decision.clarity_score < 55:
            note = "Senior-level responses should communicate tradeoffs and ownership more clearly."
            if note not in (decision.explanation or ""):
                decision.explanation = f"{(decision.explanation or '').strip()} {note}".strip()

        return decision

    def compose_explanation(self, clarity: int, depth: int, structure: int, confidence: float) -> str:
        weak_parts = []
        if clarity < 55:
            weak_parts.append("clarity")
        if depth < 55:
            weak_parts.append("depth")
        if structure < 55:
            weak_parts.append("structure")
        if confidence < 0.55:
            weak_parts.append("confidence")

        if not weak_parts:
            return "Strong answer quality with clear communication and relevant depth."

        if len(weak_parts) == 1:
            return f"Good baseline answer; improve {weak_parts[0]} for stronger impact."

        return f"Good baseline answer; improve {', '.join(weak_parts[:-1])} and {weak_parts[-1]} for stronger impact."

    # =========================
    # 🔥 CONFIDENCE METRIC
    # =========================
    def compute_confidence(self, transcript_state):
        if transcript_state.word_count == 0:
            return 0.0

        hesitation_penalty = min(transcript_state.pause_count * 0.1, 0.5)
        brevity_penalty = 0.3 if transcript_state.word_count < 20 else 0.0

        confidence = 1.0 - hesitation_penalty - brevity_penalty
        return round(max(confidence, 0.0), 2)

    # =========================
    # 🔥 ANSWER QUALITY
    # =========================
    def grade_answer(self, text: str):
        wc = len(text.split())

        if wc < 10:
            return "too_short"
        if wc > 120:
            return "rambling"
        if "example" in text.lower() or "for instance" in text.lower():
            return "strong"
        return "average"

    # =========================
    # LIVE TURN DECISION
    # =========================
    async def decide(self, interview_snapshot):
        last_text = (getattr(interview_snapshot, "last_turn_summary", "") or "").strip()
        signals = extract_signals(interview_snapshot)
        decision = apply_rules(signals)
        role = (getattr(self.session_engine, "role", "general") or "general").lower()
        role_ctx = getattr(self.session_engine, "role_context", None)
        if not role_ctx:
            role_ctx = self.role_context_builder.from_ui_role(role)

        transcript_state = getattr(interview_snapshot, "transcript_state", None)
        if transcript_state is None:
            transcript_state = SimpleNamespace(
                word_count=len(last_text.split()),
                pause_count=signals.get("hesitation_count", 0),
            )

        # 🔥 METRICS
        decision.confidence = self.compute_confidence(transcript_state)
        decision.hesitation_count = transcript_state.pause_count
        decision.answer_quality = self.grade_answer(
            interview_snapshot.last_turn_summary or ""
        )

        decision.clarity_score = self.compute_clarity(last_text, decision.hesitation_count)
        decision.depth_score = self.compute_depth(signals, last_text)

        if role_ctx:
            keywords = role_ctx.get("skill_keywords", [])
            boost = 0
            for skill in keywords:
                if skill in last_text.lower():
                    boost += 5

            decision.depth_score = min(100, decision.depth_score + min(boost, 10))

        decision.structure_score = self.compute_structure(last_text)
        alignment_engine = AlignmentEngine()
        decision.alignment_score = alignment_engine.compute_alignment(
            last_text,
            getattr(self.session_engine, "jd_context", None),
            getattr(self.session_engine, "resume_profile", None),
        )
        decision.seniority_adjustment = 0
        decision.hesitation_penalty = min(decision.hesitation_count * 8, 30)

        # Default weights
        clarity_w = 0.30
        depth_w = 0.30
        structure_w = 0.25
        confidence_w = 0.15

        if role_ctx and "weights" in role_ctx:
            clarity_w = role_ctx["weights"].get("clarity", clarity_w)
            depth_w = role_ctx["weights"].get("depth", depth_w)
            structure_w = role_ctx["weights"].get("structure", structure_w)
            confidence_w = role_ctx["weights"].get("confidence", confidence_w)

        total_w = clarity_w + depth_w + structure_w + confidence_w
        if total_w > 0 and abs(total_w - 1.0) > 1e-9:
            clarity_w /= total_w
            depth_w /= total_w
            structure_w /= total_w
            confidence_w /= total_w

        overall = (
            clarity_w * decision.clarity_score
            + depth_w * decision.depth_score
            + structure_w * decision.structure_score
            + confidence_w * (decision.confidence * 100)
            + 0.20 * decision.alignment_score
        )
        overall = max(0, min(100, overall))

        analytics_state, analytics_snapshot = self.performance_analytics.evaluate(
            state=getattr(self.session_engine, "analytics_state", {}),
            current_metrics={
                "overall": overall,
                "confidence": decision.confidence,
                "clarity": decision.clarity_score,
                "depth": decision.depth_score,
                "structure": decision.structure_score,
                "alignment": decision.alignment_score,
            },
            jd_context=getattr(self.session_engine, "jd_context", None) or {},
            current_answer=last_text,
        )
        if self.session_engine:
            self.session_engine.set_analytics(analytics_state, analytics_snapshot)

        decision.improvement_pct = analytics_snapshot.get("improvement_pct", 0.0)
        decision.decline_warning = analytics_snapshot.get("decline_warning", False)
        decision.strongest_dimension = analytics_snapshot.get("strongest_dimension")
        decision.weakest_dimension = analytics_snapshot.get("weakest_dimension")
        decision.consistency_score = analytics_snapshot.get("consistency_score", 0.0)
        decision.jd_coverage_pct = analytics_snapshot.get("jd_coverage_pct", 0.0)

        difficulty_result = self.difficulty_controller.evaluate(
            turn_score=overall,
            current_level=getattr(self.session_engine, "difficulty_level", "L2"),
            history=getattr(self.session_engine, "performance_history", []),
        )
        decision.difficulty = difficulty_result["difficulty_bucket"]
        if self.session_engine:
            self.session_engine.set_difficulty_state(
                level=difficulty_result["next_level"],
                history=difficulty_result["history"],
                trend=difficulty_result["trend"]["trend"],
            )

        jd_context = getattr(self.session_engine, "jd_context", None) or {}
        seniority = str(jd_context.get("seniority_level") or "unknown")
        leadership = await self.leadership_engine.evaluate(
            answer_text=last_text,
            seniority=seniority,
            difficulty_level=difficulty_result["next_level"],
        )
        decision.leadership_score = int(leadership.get("leadership_score", 0))
        decision.leadership_strengths = list(leadership.get("leadership_strengths", []))
        decision.leadership_gaps = list(leadership.get("leadership_gaps", []))
        decision.leadership_signals = dict(leadership.get("leadership_signals", {}))
        decision.leadership_signal_counts = dict(
            leadership.get("leadership_signals", leadership.get("signal_counts", {}))
        )

        decision.escalation_mode = self.seniority_escalation_engine.evaluate_mode(
            seniority=seniority,
            difficulty_level=difficulty_result["next_level"],
            leadership_score=decision.leadership_score,
            consistency_score=decision.consistency_score,
            jd_coverage_pct=decision.jd_coverage_pct,
            depth_score=decision.depth_score,
            risk_count=int(decision.leadership_signals.get("risk_count", 0)),
        )

        skillgraph_guidance = "Use standard probing with available evidence."
        skill_graph = getattr(self.session_engine, "skill_graph", None) if self.session_engine else None
        if (not QA_MODE) and skill_graph is not None:
            turn_index = len(getattr(self.session_engine, "turns", []) or []) + 1
            skill_graph.update_from_answer(
                answer_text=last_text,
                confidence=float(decision.confidence or 0.0),
                depth_signal=float(decision.depth_score or 0.0) / 100.0,
                turn_index=turn_index,
            )
            sg_metrics = skill_graph.snapshot_metrics()
            if self.session_engine and hasattr(self.session_engine, "set_skill_graph_metrics"):
                self.session_engine.set_skill_graph_metrics(sg_metrics)

            decision.skill_jd_coverage_pct = float(sg_metrics.get("jd_coverage_pct", 0.0) or 0.0)
            decision.resume_credibility_pct = float(sg_metrics.get("resume_credibility_pct", 0.0) or 0.0)
            decision.high_risk_skill_count = int(sg_metrics.get("high_risk_skill_count", 0) or 0)
            decision.overclaim_index = float(sg_metrics.get("overclaim_index", 0.0) or 0.0)
            decision.blind_spot_index = float(sg_metrics.get("blind_spot_index", 0.0) or 0.0)

            top_risks = sg_metrics.get("top_risks", []) or []
            if top_risks:
                top = top_risks[0] if isinstance(top_risks[0], dict) else {}
                decision.skill_target = str(top.get("skill") or "") or None
                decision.skill_risk_flag = str(top.get("risk_flag") or "NONE")

                decision.escalation_mode = self.seniority_escalation_engine.apply_skill_routing(
                    base_mode=decision.escalation_mode,
                    target_skill=decision.skill_target,
                    risk_flag=decision.skill_risk_flag,
                )
                skillgraph_guidance = self._skillgraph_guidance(decision.skill_target, decision.skill_risk_flag)
            else:
                decision.skill_target = None
                decision.skill_risk_flag = "NONE"
        else:
            decision.skill_target = None
            decision.skill_risk_flag = "NONE"
            decision.skill_jd_coverage_pct = 0.0
            decision.resume_credibility_pct = 0.0
            decision.high_risk_skill_count = 0
            decision.overclaim_index = 0.0
            decision.blind_spot_index = 0.0

        decision.contradiction_count = 0
        decision.unresolved_contradictions = 0
        decision.unresolved_assertion_count = 0
        decision.memory_consistency_score = 1.0
        decision.memory_recall_context = None
        decision.memory_priority_subject = None
        decision.memory_priority_severity = 0.0

        memory_store = getattr(self.session_engine, "memory_store", None) if self.session_engine else None
        if memory_store is not None:
            turn_index = len(getattr(self.session_engine, "turns", []) or []) + 1
            skill_names = []
            if skill_graph is not None:
                skill_names = [str(name) for name in list(getattr(skill_graph, "skills", {}).keys())]
            elif role_ctx:
                skill_names = [str(name) for name in role_ctx.get("skill_keywords", [])]

            extracted_claims = self.claim_extractor.extract(last_text, skill_names)
            for claim in extracted_claims:
                metadata = dict(claim.get("metadata", {}) or {})
                unsupported_confident = (
                    float(decision.confidence or 0.0) >= 0.75
                    and bool(metadata.get("assertive", False))
                    and not bool(metadata.get("has_specifics", False))
                )
                metadata["unsupported_confident"] = unsupported_confident

                memory_store.add_claim(
                    turn_index=turn_index,
                    category=claim.get("category", "DECISION"),
                    subject=claim.get("subject", "General"),
                    assertion=claim.get("assertion", last_text),
                    confidence=float(decision.confidence or 0.0),
                    metadata=metadata,
                )

            memory_snapshot = memory_store.snapshot()
            decision.contradiction_count = int(memory_snapshot.get("contradiction_count", 0) or 0)
            decision.unresolved_contradictions = int(memory_snapshot.get("unresolved_contradictions", 0) or 0)
            decision.unresolved_assertion_count = int(memory_snapshot.get("unresolved_assertion_count", 0) or 0)
            decision.memory_consistency_score = float(memory_snapshot.get("consistency_score", 1.0) or 1.0)

            memory_plan = self.recall_planner.plan(
                memory_snapshot.get("top_unresolved", []),
                memory_snapshot.get("top_unresolved_assertions", []),
            )
            decision.memory_recall_context = memory_plan.get("recall_context")
            decision.memory_priority_subject = memory_plan.get("priority_subject")
            decision.memory_priority_severity = float(memory_plan.get("priority_severity", 0.0) or 0.0)

            if memory_plan.get("inject_now", False):
                decision.escalation_mode = self.seniority_escalation_engine.apply_memory_routing(
                    base_mode=decision.escalation_mode,
                    severity=decision.memory_priority_severity,
                    subject=decision.memory_priority_subject,
                )
            if decision.memory_recall_context:
                prefix = "Clarify contradiction before advancing depth" if memory_plan.get("inject_now", False) else "Queue a concise clarification soon"
                skillgraph_guidance = (
                    f"{skillgraph_guidance} {prefix}: {decision.memory_recall_context}"
                )

        if overall >= 75:
            decision.verdict = "Strong"
        elif overall >= 50:
            decision.verdict = "Average"
        else:
            decision.verdict = "Needs Improvement"

        decision.explanation = self.compose_explanation(
            decision.clarity_score,
            decision.depth_score,
            decision.structure_score,
            decision.confidence,
        )

        weakest = min(
            decision.clarity_score,
            decision.depth_score,
            decision.structure_score,
        )
        if weakest < 40:
            decision.explanation += " Focus especially on strengthening your weakest scoring area."

        decision = self.apply_seniority_calibration(
            decision,
            getattr(self.session_engine, "jd_context", None) or {},
            getattr(self.session_engine, "resume_profile", None) or {},
        )

        persona_directive = None
        if (not QA_MODE) and self.session_controller and hasattr(self.session_controller, "update_persona_state"):
            persona_directive = self.session_controller.update_persona_state(
                improvement_pct=decision.improvement_pct,
                confidence=decision.confidence,
                difficulty_level=difficulty_result["next_level"],
                decline_warning=decision.decline_warning,
                verdict=decision.verdict,
            )
            decision.persona_name = persona_directive.name
            decision.pressure_intensity = persona_directive.pressure_intensity

        # 🚨 Skip LLM for very short answers
        if decision.answer_quality == "too_short" and decision.structure_score < 40:
            decision.message = "Short answer detected. Adding a guided follow-up."
            decision.intent = "depth_probe"
            decision.difficulty = "easy"
            decision.why = "Need more detail to evaluate impact and technical depth."
            decision.hint = "Use 3 parts: context, action you took, and measurable result."
            decision.next_question = (
                "Please give one specific example: what was the problem, what exactly did you do, "
                "and what measurable result did you achieve?"
            )
            decision.verdict = "Needs Improvement"
            decision.explanation = (
                f"Answer length is limited ({len(last_text.split())} words). "
                "Provide context, concrete actions, and measurable impact."
            )
            decision = self.apply_seniority_calibration(
                decision,
                getattr(self.session_engine, "jd_context", None) or {},
                getattr(self.session_engine, "resume_profile", None) or {},
            )
            return decision

        # =========================
        # FOLLOW-UP GENERATION
        # =========================
        if decision.action in ["probe", "clarification"]:
            prompt = build_followup_prompt({
                "role": role,
                "turn_index": len(getattr(self.session_engine, "turns", []) or []) + 1,
                "target_difficulty_level": difficulty_result["next_level"],
                "target_difficulty_bucket": difficulty_result["difficulty_bucket"],
                "difficulty_trend": difficulty_result["trend"]["trend"],
                "difficulty_guidance": difficulty_result["prompt_hint"],
                "escalation_mode": decision.escalation_mode,
                "escalation_guidance": self.seniority_escalation_engine.get_mode_guidance(
                    decision.escalation_mode
                ),
                "last_answer": interview_snapshot.last_turn_summary,
                "signals": signals,
                "recommended_action": interview_snapshot.recommended_action,
                "asked_questions": (
                    list(self.session_engine.asked_questions)
                    if self.session_engine
                    else []
                ),
                "persona_name": getattr(persona_directive, "name", None),
                "pressure_intensity": getattr(persona_directive, "pressure_intensity", None),
                "persona_behavior_rules": getattr(persona_directive, "behavior_rules", None),
                "persona_controls": {
                    "skepticism_level": getattr(persona_directive, "skepticism_level", None),
                    "interruption_tendency": getattr(persona_directive, "interruption_tendency", None),
                    "patience_threshold": getattr(persona_directive, "patience_threshold", None),
                    "encouragement_level": getattr(persona_directive, "encouragement_level", None),
                    "silence_usage": getattr(persona_directive, "silence_usage", None),
                },
                "skill_target": getattr(decision, "skill_target", None),
                "skill_risk_flag": getattr(decision, "skill_risk_flag", None),
                "skillgraph_guidance": skillgraph_guidance,
                "memory_recall_context": getattr(decision, "memory_recall_context", None),
                "memory_priority_subject": getattr(decision, "memory_priority_subject", None),
                "memory_priority_severity": getattr(decision, "memory_priority_severity", 0.0),
            })

            raw = await call_llm(prompt)
            try:
                followup = json.loads(raw)
            except Exception:
                followup = {}

            decision.next_question = followup.get(
                "question",
                "Can you explain this with a concrete example?"
            )
            decision.intent = followup.get("intent", "depth_probe")
            decision.difficulty = difficulty_result["difficulty_bucket"]
            decision.why = followup.get(
                "why",
                "Answer needs more depth"
            )

        # =========================
        # 🔥 HINT GENERATION
        # =========================
        if decision.confidence < 0.4:
            decision.hint = "Try structuring your answer using a clear example."
        elif decision.answer_quality == "rambling":
            decision.hint = "Try summarizing your key point more concisely."
        else:
            decision.hint = None

        # =========================
        # GUARANTEE STABLE SCHEMA
        # =========================
        for field in [
            "intent",
            "difficulty",
            "next_question",
            "why",
            "message",
            "clarity_score",
            "depth_score",
            "structure_score",
            "alignment_score",
            "seniority_adjustment",
            "improvement_pct",
            "decline_warning",
            "strongest_dimension",
            "weakest_dimension",
            "consistency_score",
            "jd_coverage_pct",
            "leadership_score",
            "leadership_strengths",
            "leadership_gaps",
            "leadership_signals",
            "leadership_signal_counts",
            "escalation_mode",
            "hesitation_penalty",
            "verdict",
            "explanation",
            "persona_name",
            "pressure_intensity",
            "skill_target",
            "skill_risk_flag",
            "skill_jd_coverage_pct",
            "resume_credibility_pct",
            "high_risk_skill_count",
            "overclaim_index",
            "blind_spot_index",
            "contradiction_count",
            "unresolved_contradictions",
            "unresolved_assertion_count",
            "memory_consistency_score",
            "memory_recall_context",
            "memory_priority_subject",
            "memory_priority_severity",
        ]:
            if not hasattr(decision, field):
                setattr(decision, field, None)

        return decision

    # =========================
    # FINAL INTERVIEW SUMMARY
    # =========================
    async def generate_final_summary(self, interview_state_payload):
        prompt = build_final_summary_prompt(interview_state_payload)
        raw = await call_llm(prompt)

        try:
            return json.loads(raw)
        except Exception:
            return {
                "verdict": "Average",
                "strengths": ["Completed the interview"],
                "improvements": ["Provide more structured answers"],
                "summary": "The interview showed reasonable understanding with room for improvement.",
            }
