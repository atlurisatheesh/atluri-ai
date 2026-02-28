import asyncio
import logging
from threading import Lock

from app.persona.engine import (
    FAANG_SKEPTICAL,
    PersonaPressureEngine,
    PersonaRuntimeState,
)

logging.basicConfig(
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("session_controller")

class SessionController:
    def __init__(self, ai_engine=None):
        self.stop_event = asyncio.Event()
        self.tasks: list[asyncio.Task] = []
        self.ai_engine = ai_engine
        self.last_processed_turn_id = None
        self.last_decision = None
        self._persona_lock = Lock()
        self._persona_engine = PersonaPressureEngine()
        self._persona_state = PersonaRuntimeState(profile=FAANG_SKEPTICAL)

    def update_persona_state(
        self,
        improvement_pct: float,
        confidence: float,
        difficulty_level: str,
        decline_warning: bool,
        verdict: str,
    ):
        with self._persona_lock:
            self._persona_state = self._persona_engine.update_state(
                state=self._persona_state,
                improvement_pct=improvement_pct,
                confidence=confidence,
                difficulty_level=difficulty_level,
                decline_warning=decline_warning,
                verdict=verdict,
            )
            return self._persona_engine.build_directive(self._persona_state)

    def get_persona_directive(self):
        with self._persona_lock:
            return self._persona_engine.build_directive(self._persona_state)

    def create_task(self, coro):
        task = asyncio.create_task(coro)
        self.tasks.append(task)
        return task

    async def process_turn(self, transcript: str, turn_id: str, processor=None):
        if self.last_processed_turn_id == turn_id:
            logger.info(f"Duplicate turn {turn_id} skipped")
            return self.last_decision

        if processor is not None:
            self.last_decision = await processor(transcript)
            self.last_processed_turn_id = turn_id
            return self.last_decision

        if self.ai_engine and hasattr(self.ai_engine, "run"):
            self.last_decision = await self.ai_engine.run(transcript)
            self.last_processed_turn_id = turn_id
            return self.last_decision

        self.last_decision = None
        return self.last_decision

    async def stop(self):
        if not self.stop_event.is_set():
            self.stop_event.set()

        for task in self.tasks:
            task.cancel()

        await asyncio.gather(*self.tasks, return_exceptions=True)
