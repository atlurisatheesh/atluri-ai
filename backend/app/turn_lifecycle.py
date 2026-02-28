import asyncio
from enum import Enum
import time
import uuid
import logging

logging.basicConfig(
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("turn")


class TurnState(Enum):
    ACTIVE = "active"
    SILENCE_PENDING = "silence_pending"
    FINALIZING = "finalizing"
    FINALIZED = "finalized"


class TurnLifecycle:

    def __init__(self):
        self.turn_id = str(uuid.uuid4())
        self.state = TurnState.ACTIVE
        self.lock = asyncio.Lock()
        self.started_at = time.monotonic()
        self.finalized_at = None

    async def try_finalize(self, reason: str):
        async with self.lock:
            if self.state in [TurnState.FINALIZING, TurnState.FINALIZED]:
                logger.info(f"[TURN {self.turn_id}] Finalize skipped (already finalized) | reason={reason}")
                return False

            logger.info(f"[TURN {self.turn_id}] Transition ACTIVE → FINALIZING | reason={reason}")
            self.state = TurnState.FINALIZING
            return True

    async def mark_finalized(self):
        async with self.lock:
            self.state = TurnState.FINALIZED
            self.finalized_at = time.monotonic()
            logger.info(f"[TURN {self.turn_id}] FINALIZED | latency={self.finalized_at - self.started_at:.2f}s")
import asyncio
from enum import Enum
import time
import uuid
import logging

logger = logging.getLogger("turn")

class TurnState(Enum):
    ACTIVE = "active"
    SILENCE_PENDING = "silence_pending"
    FINALIZING = "finalizing"
    FINALIZED = "finalized"

class TurnLifecycle:

    def __init__(self):
        self.turn_id = str(uuid.uuid4())
        self.state = TurnState.ACTIVE
        self.lock = asyncio.Lock()
        self.started_at = time.monotonic()
        self.finalized_at = None

    async def try_finalize(self, reason: str):
        async with self.lock:
            if self.state in [TurnState.FINALIZING, TurnState.FINALIZED]:
                logger.info(f"[TURN {self.turn_id}] Finalize skipped (already finalized) | reason={reason}")
                return False

            logger.info(f"[TURN {self.turn_id}] Transition ACTIVE → FINALIZING | reason={reason}")
            self.state = TurnState.FINALIZING
            return True

    async def mark_finalized(self):
        async with self.lock:
            self.state = TurnState.FINALIZED
            self.finalized_at = time.monotonic()
            logger.info(f"[TURN {self.turn_id}] FINALIZED | latency={self.finalized_at - self.started_at:.2f}s")
