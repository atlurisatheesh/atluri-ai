# app/session/engine.py

from app.skillgraph.engine import SkillGraph
from app.mce.store import MemoryStore
from app.realtime_assist import AssistConfig, RealtimeAssistEngine

class SessionEngine:
    def __init__(self):
        self.turns = []
        self.asked_questions = set()
        self.current_question = None
        self.current_turn = None
        self.active = True
        self.role = "general"
        self.job_description = None
        self.role_context = None
        self.jd_context = None
        self.resume_profile = None
        self.performance_history = []
        self.difficulty_level = "L2"
        self.difficulty_trend = "stable"
        self.analytics_state = {}
        self.analytics_snapshot = {}
        self.skill_graph = None
        self.skill_graph_metrics = {}
        self.memory_store = MemoryStore()
        self.realtime_assist = None

    def set_role_context(self, context: dict):
        self.role_context = context

    def set_jd_context(self, context: dict):
        self.jd_context = context

    def set_resume_profile(self, profile: dict):
        self.resume_profile = profile

    def set_difficulty_state(self, level: str, history: list[float], trend: str):
        self.difficulty_level = level
        self.performance_history = list(history or [])
        self.difficulty_trend = trend

    def set_analytics(self, state: dict, snapshot: dict):
        self.analytics_state = dict(state or {})
        self.analytics_snapshot = dict(snapshot or {})

    def initialize_skill_graph(
        self,
        jd_context: dict,
        resume_profile: dict,
        jd_requirements: dict | None = None,
        resume_claims: dict | None = None,
    ):
        self.skill_graph = SkillGraph.from_contexts(
            jd_context=jd_context or {},
            resume_profile=resume_profile or {},
            jd_requirements=jd_requirements or {},
            resume_claims=resume_claims or {},
        )
        self.skill_graph_metrics = self.skill_graph.snapshot_metrics()

    def set_skill_graph_metrics(self, metrics: dict):
        self.skill_graph_metrics = dict(metrics or {})

    def initialize_realtime_assist(self, session_id: str, intensity_level: int = 2, deterministic: bool = False):
        self.realtime_assist = RealtimeAssistEngine(
            session_id=session_id,
            config=AssistConfig(
                intensity_level=max(1, min(int(intensity_level or 2), 3)),
                deterministic=bool(deterministic),
            ),
        )

    def set_assist_profile(self, profile: str):
        if self.realtime_assist is None:
            return
        self.realtime_assist.activate_profile(profile)

    def start_turn(self, question: str):
        self.current_question = question
        self.asked_questions.add(question.lower())

        self.current_turn = {
            "question": question,
            "answer": None,
            "ai_decision": None
        }


    def finalize_turn(self, answer: str, ai_decision: dict):
        if not self.current_turn:
            return

        self.current_turn["answer"] = answer
        self.current_turn["ai_decision"] = ai_decision
        self.turns.append(self.current_turn)
        self.current_turn = None

    def snapshot(self):
        return {
            "turns": self.turns,
            "last_turn": self.turns[-1] if self.turns else None
        }
