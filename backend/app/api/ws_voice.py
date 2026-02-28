from fastapi import APIRouter, WebSocket
import asyncio
import time
import json
import logging
import uuid
import os
from collections import defaultdict

from app.services.deepgram_service import DeepgramService
from app.auth import resolve_user_id_from_token_async
from app.api.ws_voice_components import (
    CoachingEmitter,
    ConnectionLifecycleManager,
    RoomBroadcaster,
    TranscriptRouter,
    TurnDecisionPipeline,
)
from app.transcript.engine import TranscriptTruthEngine
from app.transcript.models import TranscriptTurn
from app.interview_state.engine import InterviewStateEngine
from app.ai_reasoning.engine import AIReasoningEngine
from app.ai_reasoning.role_context import RoleContextBuilder
from app.coaching.adaptive_coach import AdaptiveCoach, CoachingInput
from app.context.alignment_engine import AlignmentEngine
from app.context.jd_parser import JDParser
from app.context.resume_parser import ResumeParser
from app.session.room_event_bus import LocalRoomEventBus, RoomEventBus, build_room_event_bus
from app.session.engine import SessionEngine
from app.session.registry import session_registry
from app.session.room_state_store import LocalRoomStateStore, RoomStateStore, build_room_state_store
from app.session_controller import SessionController
from app.turn_lifecycle import TurnLifecycle, TurnState
from app.services.openai_service import get_ai_reply, stream_answer_live
from app.analytics.session_analytics_builder import build_session_analytics
from app.analytics.session_analytics_store import save_session_analytics
from app.system_metrics import (
    decrement_metric,
    increment_metric,
    observe_fanout_delay_ms,
    observe_latency_ms,
    observe_redis_publish_latency_ms,
    observe_stream_duration,
    record_ws_disconnect,
    set_metric,
)
from starlette.websockets import WebSocketState
from core.config import QA_MODE
from core.logger import log_event

logging.basicConfig(
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("ws_voice")

MAX_WS_TEXT_BYTES = max(1024, int(os.getenv("WS_MAX_TEXT_BYTES", "65536")))
WS_HEARTBEAT_INTERVAL_SEC = max(10.0, float(os.getenv("WS_HEARTBEAT_INTERVAL_SEC", "25")))
WS_HEARTBEAT_TIMEOUT_SEC = max(20.0, float(os.getenv("WS_HEARTBEAT_TIMEOUT_SEC", "120")))  # Increased to prevent timeout during heavy LLM processing
ALLOW_BROWSER_STT_FALLBACK = str(os.getenv("ALLOW_BROWSER_STT_FALLBACK", "false")).strip().lower() in {"1", "true", "yes", "on"}
AUTO_NEXT_QUESTION_ENABLED = str(os.getenv("WS_AUTO_NEXT_QUESTION", "false")).strip().lower() in {"1", "true", "yes", "on"}
MIN_FINAL_WORDS_FOR_SCORING = max(3, int(os.getenv("WS_MIN_FINAL_WORDS", "4")))
SILENCE_FINALIZE_SEC = max(1.0, float(os.getenv("WS_SILENCE_FINALIZE_SEC", "2.0")))
HARD_TIMEOUT_SEC = max(10.0, float(os.getenv("WS_TURN_HARD_TIMEOUT_SEC", "24.0")))
PARTIAL_FALLBACK_SEC = max(4.0, float(os.getenv("WS_PARTIAL_FALLBACK_SEC", "6.0")))
MIN_PARTIAL_WORDS_FOR_FALLBACK = max(6, int(os.getenv("WS_MIN_PARTIAL_WORDS", "8")))

router = APIRouter()
room_connections: dict[str, set[WebSocket]] = defaultdict(set)
websocket_send_locks: dict[WebSocket, asyncio.Lock] = {}
room_lock = asyncio.Lock()
INSTANCE_ID = str(os.getenv("INSTANCE_ID") or f"ws-{uuid.uuid4()}")
_room_event_listener_task: asyncio.Task | None = None
_room_event_listener_lock = asyncio.Lock()

try:
    room_state_store: RoomStateStore = build_room_state_store()
    logger.info("Room state store initialized: %s", room_state_store.__class__.__name__)
except Exception as room_store_exc:
    room_state_store = LocalRoomStateStore()
    logger.warning(
        "Room state store fallback to LocalRoomStateStore due to init error: %s",
        room_store_exc,
    )

try:
    room_event_bus: RoomEventBus = build_room_event_bus(INSTANCE_ID)
    logger.info("Room event bus initialized: %s", room_event_bus.__class__.__name__)
except Exception as room_event_exc:
    room_event_bus = LocalRoomEventBus()
    logger.warning(
        "Room event bus fallback to LocalRoomEventBus due to init error: %s",
        room_event_exc,
    )

EMOTIONAL_MIN_INTERVAL_SEC = max(1.0, float(os.getenv("EMOTIONAL_EVENT_MIN_INTERVAL_SEC", "6")))
EMOTIONAL_MAX_EVENTS_PER_QUESTION = max(1, int(os.getenv("EMOTIONAL_MAX_EVENTS_PER_QUESTION", "2")))


class WsDependencyProvider:
    def create_transcript_engine(self) -> TranscriptTruthEngine:
        return TranscriptTruthEngine()

    def create_interview_state_engine(self) -> InterviewStateEngine:
        return InterviewStateEngine()

    def create_session_engine(self) -> SessionEngine:
        return SessionEngine()

    def create_reasoning_engine(self, session_engine: SessionEngine, controller: SessionController) -> AIReasoningEngine:
        return AIReasoningEngine(session_engine=session_engine, session_controller=controller)

    def create_coach(self) -> AdaptiveCoach:
        return AdaptiveCoach()

    def create_alignment_engine(self) -> AlignmentEngine:
        return AlignmentEngine()

    def create_jd_parser(self) -> JDParser:
        return JDParser()

    def create_resume_parser(self) -> ResumeParser:
        return ResumeParser()

    def create_deepgram_service(self, language_mode: str = "multi") -> DeepgramService:
        return DeepgramService(language_mode=language_mode)


dependency_provider = WsDependencyProvider()


class EmotionalEventManager:
    def __init__(self, min_interval_sec: float, max_events_per_question: int):
        self.min_interval_sec = max(1.0, float(min_interval_sec))
        self.max_events_per_question = max(1, int(max_events_per_question))
        self.last_event_ts = 0.0
        self.current_question = ""
        self.current_question_events = 0

    def on_question(self, question_text: str) -> None:
        normalized = str(question_text or "").strip()
        if normalized != self.current_question:
            self.current_question = normalized
            self.current_question_events = 0

    def can_emit(
        self,
        *,
        question_text: str,
        is_streaming: bool,
        is_rejoin_sync: bool,
        is_finalizing: bool,
    ) -> bool:
        if is_streaming or is_rejoin_sync or is_finalizing:
            return False

        self.on_question(question_text)
        now_ts = time.time()
        if (now_ts - self.last_event_ts) < self.min_interval_sec:
            return False
        if self.current_question_events >= self.max_events_per_question:
            return False
        return True

    def mark_emitted(self, question_text: str) -> None:
        self.on_question(question_text)
        self.current_question_events += 1
        self.last_event_ts = time.time()


async def _register_room_connection(room_id: str, websocket: WebSocket, connection_id: str) -> None:
    if not room_id:
        return
    async with room_lock:
        room_connections[room_id].add(websocket)
        websocket_send_locks.setdefault(websocket, asyncio.Lock())
        set_metric("ws_rooms_active", float(len(room_connections)))
    try:
        await room_state_store.add_connection(room_id, connection_id)
    except Exception as exc:
        logger.warning("Room store add_connection failed | room_id=%s err=%s", room_id, exc)


async def _unregister_room_connection(room_id: str, websocket: WebSocket, connection_id: str) -> None:
    if not room_id:
        return
    async with room_lock:
        members = room_connections.get(room_id)
        if members:
            members.discard(websocket)
            if not members:
                room_connections.pop(room_id, None)
        websocket_send_locks.pop(websocket, None)
        set_metric("ws_rooms_active", float(len(room_connections)))
    try:
        await room_state_store.remove_connection(room_id, connection_id)
    except Exception as exc:
        logger.warning("Room store remove_connection failed | room_id=%s err=%s", room_id, exc)


async def _send_text_with_lock(websocket: WebSocket, encoded_payload: str) -> None:
    async with room_lock:
        send_lock = websocket_send_locks.get(websocket)
    if send_lock is None:
        return
    async with send_lock:
        await websocket.send_text(encoded_payload)


async def _broadcast_room_local(room_id: str, payload: dict, exclude: WebSocket | None = None) -> None:
    if not room_id:
        return

    async with room_lock:
        targets = list(room_connections.get(room_id, set()))

    for conn in targets:
        if exclude is not None and conn is exclude:
            continue
        if conn.client_state != WebSocketState.CONNECTED:
            continue
        try:
            await _send_text_with_lock(conn, json.dumps(payload))
        except Exception:
            continue


async def _room_event_handler(room_id: str, payload: dict, source_instance: str) -> None:
    if not room_id:
        return
    if str(source_instance or "") == INSTANCE_ID:
        return
    published_at = float(payload.pop("__bus_published_at", 0.0) or 0.0)
    if published_at > 0:
        observe_fanout_delay_ms((time.time() - published_at) * 1000.0)
    await _broadcast_room_local(room_id, payload, exclude=None)


async def _room_event_listener_loop() -> None:
    while True:
        try:
            await room_event_bus.listen(_room_event_handler)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Room event listener failed; retrying: %s", exc)
            await asyncio.sleep(1.5)


async def _ensure_room_event_listener() -> None:
    global _room_event_listener_task
    if isinstance(room_event_bus, LocalRoomEventBus):
        return
    async with _room_event_listener_lock:
        if _room_event_listener_task and not _room_event_listener_task.done():
            return
        _room_event_listener_task = asyncio.create_task(_room_event_listener_loop())


async def _broadcast_room(room_id: str, payload: dict, exclude: WebSocket | None = None) -> None:
    if not room_id:
        return
    await _broadcast_room_local(room_id, payload, exclude=exclude)
    if isinstance(room_event_bus, LocalRoomEventBus):
        return
    publish_started = time.perf_counter()
    try:
        await room_event_bus.publish(room_id, payload)
        observe_redis_publish_latency_ms((time.perf_counter() - publish_started) * 1000.0)
    except Exception as exc:
        logger.warning("Room event publish failed | room_id=%s err=%s", room_id, exc)


def _normalize_room_id(raw_room_id: str) -> str:
    value = str(raw_room_id or "").strip().lower()
    if not value:
        return ""
    try:
        parsed = uuid.UUID(value)
    except Exception:
        return ""
    if parsed.version != 4:
        return ""
    return str(parsed)


async def _update_room_state(room_id: str, updates: dict) -> None:
    if not room_id:
        return
    payload = {**dict(updates or {}), "updated_at": time.time()}
    try:
        await room_state_store.update_state(room_id, payload)
    except Exception as exc:
        logger.warning("Room store update_state failed | room_id=%s err=%s", room_id, exc)


async def _get_room_state(room_id: str) -> dict:
    if not room_id:
        return {}
    data = {}
    try:
        state = await room_state_store.get_state(room_id)
        data = {
            "active_question": state.active_question,
            "partial_answer": state.partial_answer,
            "is_streaming": state.is_streaming,
            "assist_intensity": state.assist_intensity,
            "updated_at": state.updated_at,
        }
    except Exception as exc:
        logger.warning("Room store get_state failed | room_id=%s err=%s", room_id, exc)
    return {
        "active_question": str(data.get("active_question") or ""),
        "partial_answer": str(data.get("partial_answer") or ""),
        "is_streaming": bool(data.get("is_streaming", False)),
        "assist_intensity": int(data.get("assist_intensity") or 2),
        "updated_at": float(data.get("updated_at") or 0.0),
    }


def _assist_profile_for_role(role: str) -> str:
    value = str(role or "").strip().lower()
    if value in {"behavioral", "hr", "manager"}:
        return "behavioral"
    if value in {"system_design", "architecture", "devops", "backend"}:
        return "system_design"
    if value in {"leadership", "staff", "principal"}:
        return "leadership"
    if value in {"coding", "dsa", "algorithm"}:
        return "coding"
    return "behavioral"


def _chunk_text(text: str, words_per_chunk: int = 18) -> list[str]:
    normalized = " ".join(str(text or "").split())
    if not normalized:
        return []
    words = normalized.split(" ")
    return [" ".join(words[i:i + words_per_chunk]) for i in range(0, len(words), words_per_chunk)]


def _extract_topic_from_question(question_text: str) -> str:
    text = str(question_text or "").strip().rstrip("?.!")
    if not text:
        return "this topic"

    lowered = text.lower().strip()
    prefixes = (
        "can you please explain about ",
        "can you explain about ",
        "can you please explain ",
        "can you explain ",
        "could you explain ",
        "please explain ",
        "explain ",
        "what is ",
        "what are ",
        "how does ",
        "how do ",
        "tell me about ",
    )

    topic = text
    for prefix in prefixes:
        if lowered.startswith(prefix):
            topic = text[len(prefix):].strip()
            break

    topic = topic.strip(" .,:;!?-")
    return topic or "this topic"


def _fallback_answer_suggestion(question_text: str) -> str:
    topic = _extract_topic_from_question(question_text)
    topic_lower = topic.lower()

    if "aws ecs" in topic_lower or "elastic container service" in topic_lower:
        return (
            "AWS ECS is AWS's managed container orchestration service for running Docker workloads without managing control-plane infrastructure.\n"
            "- I use ECS when the team wants fast deployment, IAM integration, CloudWatch logging, and predictable ops on AWS.\n"
            "- Typical setup: task definitions, ECS services behind an ALB, autoscaling on CPU/request count, and ECR for images.\n"
            "- Concrete impact example: moving a monolith API to ECS Fargate reduced deploy time from ~20 min to ~5 min and improved peak stability during 2x traffic events.\n"
            "- Trade-off: ECS is excellent for AWS-native simplicity; for multi-cloud portability or advanced Kubernetes ecosystem needs, EKS can be a better fit."
        )

    if "system design" in topic_lower:
        return (
            "I would answer this with a clear architecture, scaling path, and reliability plan.\n"
            "- Start with core components, request flow, and storage decisions.\n"
            "- Add scaling strategy (caching, async workers, partitioning) with concrete thresholds.\n"
            "- Include reliability targets (SLO, retries, circuit breakers, observability).\n"
            "- Trade-off: optimize first for correctness and operability, then for cost once traffic patterns are stable."
        )

    if "conflict" in topic_lower or "handled conflict" in topic_lower:
        return (
            "I handle conflict by aligning on goals, clarifying constraints, and driving to an evidence-based decision.\n"
            "- First, I listen to each perspective and restate the shared objective.\n"
            "- Then I compare options using impact, risk, and delivery timeline.\n"
            "- Example: two teams disagreed on release scope; we prioritized a phased rollout and reduced post-release defects by ~30%.\n"
            "- Trade-off: phased delivery may delay some features, but it lowers execution risk and improves team alignment."
        )

    if "java inheritance" in topic_lower or ("java" in topic_lower and "inheritance" in topic_lower):
        return (
            "Java inheritance lets a child class reuse and extend behavior from a parent class, which improves code reuse and design consistency.\n"
            "- In practice, I use inheritance when there is a clear 'is-a' relationship, like `SavingsAccount` extending `Account`.\n"
            "- Example: shared validation and logging in a base class reduced duplicate service code by ~25% in one backend module.\n"
            "- Key interview point: prefer composition when inheritance chains become deep or rigid.\n"
            "- Trade-off: inheritance speeds reuse, but overuse can increase coupling and make refactoring harder."
        )

    return (
        f"{topic} is an important concept, and I would answer it with a direct definition plus one concrete production example.\n"
        "- First, define it in plain language in one sentence.\n"
        "- Then explain where it is used in real systems and why it matters.\n"
        "- Add one measurable example (performance, reliability, cost, or developer productivity).\n"
        "- Close with a practical trade-off and when you would choose an alternative."
    )


def _looks_like_question(text: str) -> bool:
    normalized = str(text or "").strip().lower()
    if not normalized:
        return False
    if "?" in normalized:
        return True
    prompts = (
        "can you",
        "could you",
        "would you",
        "what is",
        "what are",
        "what does",
        "how do",
        "how does",
        "why",
        "when",
        "where",
        "explain",
        "tell me",
    )
    return normalized.startswith(prompts)


def _looks_like_interviewer_opening(text: str) -> bool:
    normalized = " ".join(str(text or "").strip().lower().split()).rstrip("?.!")
    if not normalized:
        return False
    openings = {
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
    }
    if normalized in openings:
        return True
    return any(normalized.startswith(prefix + " ") for prefix in ("hi", "hello", "hey"))


def _is_question_or_opening(text: str) -> bool:
    return _looks_like_question(text) or _looks_like_interviewer_opening(text)


def _is_waiting_question(text: str) -> bool:
    normalized = str(text or "").strip().lower()
    return "waiting for interviewer question" in normalized


def _is_generic_question(text: str) -> bool:
    normalized = str(text or "").strip().lower()
    if not normalized:
        return True
    if normalized in {
        "can you explain?",
        "can you please explain?",
        "can you explain about?",
        "can you please explain about?",
        "can you explain this?",
        "what is this?",
    }:
        return True
    return normalized.endswith(" about?") or normalized.endswith(" regarding?")


def _should_upgrade_question(current_question: str, next_question: str) -> bool:
    current_text = str(current_question or "").strip()
    next_text = str(next_question or "").strip()
    if not next_text:
        return False
    if not current_text:
        return True
    if _is_waiting_question(current_text):
        return True
    if current_text.lower() == next_text.lower():
        return False

    current_norm = current_text.lower().rstrip("?.! ")
    next_norm = next_text.lower().rstrip("?.! ")
    if _is_generic_question(current_text) and len(next_norm) > len(current_norm) + 4:
        return True
    if current_norm and next_norm.startswith(current_norm) and len(next_norm) > len(current_norm) + 4:
        return True
    return False


def _question_key(text: str) -> str:
    normalized = " ".join(str(text or "").strip().lower().split())
    return normalized.rstrip("?.!")


# ========== PHASE 2: QUESTION TRUNCATION PROTECTION ==========
def _is_incomplete_sentence(text: str) -> bool:
    """
    Detect if a sentence appears incomplete (cut off mid-thought).
    Returns True if the sentence looks truncated.
    """
    if not text:
        return True
    
    text = str(text).strip()
    words = text.split()
    word_count = len(words)
    
    # Too short to be a complete question
    if word_count < 4:
        return True
    
    # Ends with a complete punctuation mark? Probably complete.
    if text.endswith("?") or text.endswith(".") or text.endswith("!"):
        return False
    
    # Common incomplete patterns - ends with articles, prepositions, conjunctions
    incomplete_endings = [
        "the", "a", "an", "to", "of", "in", "on", "at", "by", "for", "with",
        "and", "or", "but", "if", "when", "where", "how", "what", "which",
        "is", "are", "was", "were", "be", "been", "being",
        "do", "does", "did", "have", "has", "had",
        "can", "could", "would", "should", "will", "shall", "may", "might",
        "between", "about", "into", "from", "your", "my", "their", "our"
    ]
    
    last_word = words[-1].lower().rstrip(",.;:")
    if last_word in incomplete_endings:
        return True
    
    # Patterns like "What is the" or "How do you" with nothing after
    incomplete_starts = [
        "what is the", "what are the", "how do you", "how does the",
        "can you tell me about", "explain the", "describe the",
        "what would you", "what is your", "tell me about the"
    ]
    text_lower = text.lower()
    for pattern in incomplete_starts:
        if text_lower.startswith(pattern) and word_count <= len(pattern.split()) + 2:
            return True
    
    return False


def _append_transcript_fragment(buffer: str, fragment: str) -> str:
    current = str(buffer or "").strip()
    next_text = " ".join(str(fragment or "").split()).strip()
    if not next_text:
        return current
    if not current:
        return next_text
    if current.endswith(next_text):
        return current
    if next_text.startswith(current):
        return next_text
    return f"{current} {next_text}".strip()


@router.websocket("/ws/voice")
async def voice_ws(websocket: WebSocket):
    # ================= LIFECYCLE OWNER =================
    controller = SessionController()
    stop_event = controller.stop_event
    session_id = str(uuid.uuid4())
    auth_header = str(websocket.headers.get("authorization") or "").strip()
    token_from_header = auth_header.replace("Bearer ", "", 1).strip() if auth_header.lower().startswith("bearer ") else ""
    token = (
        token_from_header
        or str(websocket.query_params.get("token") or "").strip()
        or str(websocket.query_params.get("access_token") or "").strip()
    )
    if not token:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    try:
        await resolve_user_id_from_token_async(token)
    except Exception:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    room_id_raw = str(websocket.query_params.get("room_id") or "").strip()
    stop_reason = "other"
    room_id = _normalize_room_id(room_id_raw)
    room_id_was_invalid = bool(room_id_raw and not room_id)
    if room_id_was_invalid:
        room_id = str(uuid.uuid4())
    participant = str(websocket.query_params.get("participant") or "candidate").strip().lower()
    if participant not in {"candidate", "interviewer"}:
        participant = "candidate"

    class _SessionStructuredLogger:
        def _emit(self, level: str, message: str, *args, **kwargs) -> None:
            payload = {
                "level": str(level or "info").lower(),
                "message_template": str(message or ""),
            }
            if args:
                payload["arg_count"] = len(args)
            if kwargs.get("exc_info"):
                payload["exc_info"] = True
            log_event("ws_voice", "ws_log", session_id, room_id=room_id, **payload)

        def info(self, message: str, *args, **kwargs) -> None:
            self._emit("info", message, *args, **kwargs)

        def warning(self, message: str, *args, **kwargs) -> None:
            self._emit("warning", message, *args, **kwargs)

        def exception(self, message: str, *args, **kwargs) -> None:
            self._emit("error", message, *args, exc_info=True, **kwargs)

    logger = _SessionStructuredLogger()

    await websocket.accept()
    logger.info("WebSocket connected")

    def _log_event(event: str, **fields):
        log_event("ws_voice", event, session_id, room_id=room_id, **fields)

    _log_event("authenticated", participant=participant)
    _log_event("connect", participant=participant)

    async def _safe_send(payload: dict):
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        try:
            encoded = json.dumps(payload)
        except Exception as exc:
            logger.warning("ws payload encode failed | session_id=%s err=%s", session_id, exc)
            return
        try:
            await _send_text_with_lock(websocket, encoded)
            _log_event(
                "message_sent",
                message_type=str((payload or {}).get("type") or "unknown"),
                bytes=len(encoded.encode("utf-8")),
            )
        except Exception as exc:
            logger.warning("ws send failed | session_id=%s err=%s", session_id, exc)

    lifecycle_manager = ConnectionLifecycleManager(
        register_fn=_register_room_connection,
        unregister_fn=_unregister_room_connection,
    )
    room_broadcaster = RoomBroadcaster(send_fn=_safe_send, broadcast_fn=_broadcast_room)

    await lifecycle_manager.register(room_id, websocket, session_id)
    await _ensure_room_event_listener()
    increment_metric("ws_connections_active", 1)

    # ================= STATE =================
    last_audio_ts = time.time()

    turn_closed = False
    waiting_for_next_turn = False
    last_final_ts = 0.0  # 🔥 tracks time of last FINAL transcript
    last_transcript_activity_ts = time.time()
    transcript_buffer = ""
    turn_start_ts = time.time()
    completed_turns = 0
    max_turns = 5
    final_summary_sent = False
    coaching_emitted_turn_ids = set()
    active_suggestion_task: asyncio.Task | None = None
    active_suggestion_question_key: str = ""  # Track what question is being answered
    emotional_event_index = 0
    is_finalizing_window = False
    last_candidate_question_key = ""
    last_candidate_question_ts = 0.0
    last_interviewer_question_key = ""
    last_interviewer_question_ts = 0.0
    last_pong_ts = time.time()
    # Track pending partial questions for silence-based finalization
    pending_partial_question = ""
    pending_partial_question_ts = 0.0
    emotional_manager = EmotionalEventManager(
        min_interval_sec=EMOTIONAL_MIN_INTERVAL_SEC,
        max_events_per_question=EMOTIONAL_MAX_EVENTS_PER_QUESTION,
    )
    browser_fallback_warning_sent = False
    hard_timeout_without_final_count = 0

    # ================= ENGINES =================
    tte = dependency_provider.create_transcript_engine()
    tte.state.final_ready = False
    tte.state.already_finalized = False

    ise = dependency_provider.create_interview_state_engine()
    se = dependency_provider.create_session_engine()
    session_registry.register(session_id=session_id, session_engine=se, session_controller=controller)
    role_builder = RoleContextBuilder()
    role = (websocket.query_params.get("role") or "general").strip().lower()
    se.role = role
    se.set_role_context(role_builder.from_ui_role(role))
    assist_intensity_raw = websocket.query_params.get("assist_intensity")
    try:
        assist_intensity = int(assist_intensity_raw) if assist_intensity_raw is not None else 2
    except Exception:
        assist_intensity = 2
    
    # Answer language preference: "english" (default) or "detected" (match detected language)
    answer_language = str(websocket.query_params.get("answer_language") or "english").strip().lower()
    if answer_language not in ("english", "detected"):
        answer_language = "english"
    
    se.initialize_realtime_assist(
        session_id=session_id,
        intensity_level=assist_intensity,
        deterministic=QA_MODE,
    )
    se.set_assist_profile(_assist_profile_for_role(role))

    jd_text = websocket.query_params.get("jd")
    resume_text = websocket.query_params.get("resume")
    jd_parser = dependency_provider.create_jd_parser()
    resume_parser = dependency_provider.create_resume_parser()
    jd_requirements = {}
    resume_claims = {}

    if jd_text:
        try:
            jd_context = await jd_parser.parse(jd_text)
            se.set_jd_context(jd_context)
            jd_requirements = jd_parser.derive_skill_requirements(jd_text, jd_context)
        except Exception as exc:
            logger.warning("JD parse failed; continuing without jd_context: %s", exc)

    if resume_text:
        try:
            resume_profile = await resume_parser.parse(resume_text)
            se.set_resume_profile(resume_profile)
            resume_claims = resume_parser.derive_skill_claims(resume_text, resume_profile)
        except Exception as exc:
            logger.warning("Resume parse failed; continuing without resume_profile: %s", exc)

    if not QA_MODE:
        try:
            se.initialize_skill_graph(
                jd_context=getattr(se, "jd_context", None) or {},
                resume_profile=getattr(se, "resume_profile", None) or {},
                jd_requirements=jd_requirements,
                resume_claims=resume_claims,
            )
        except Exception as exc:
            logger.warning("SkillGraph initialization failed; continuing without skill graph: %s", exc)

    logger.info("Session jd_context: %s", se.jd_context)
    logger.info("Session resume_profile: %s", se.resume_profile)

    are = dependency_provider.create_reasoning_engine(session_engine=se, controller=controller)
    coach = dependency_provider.create_coach()
    alignment_engine = dependency_provider.create_alignment_engine()
    controller.ai_engine = are

    # ================= DEEPGRAM =================
    dg = None
    if not QA_MODE:
        # Pass language mode for optimization: "english" uses "en" (faster), "detected" uses "multi"
        dg_language = "english" if answer_language == "english" else "multi"
        dg = dependency_provider.create_deepgram_service(language_mode=dg_language)
        await dg.connect()
        if not dg.is_active():
            logger.warning("Deepgram unavailable; continuing without live transcript ingest")
            dg = None
        if dg:
            logger.info("Deepgram connected with language=%s", dg_language)
            dg.send_audio(b"\x00" * 640)
        else:
            logger.info("Deepgram not connected")
            await _safe_send({
                "type": "stt_warning",
                "session_id": session_id,
                "code": "deepgram_unavailable",
                "message": "Deepgram streaming unavailable. Speech scoring is paused until reconnect.",
            })
    else:
        logger.info("[QA_MODE] Deepgram disabled")

    # ================= START INTERVIEW =================
    room_state_before_connect = await _get_room_state(room_id) if room_id else {}
    existing_room_question = str(room_state_before_connect.get("active_question") or "").strip()
    if room_id:
        first_question = existing_room_question or "Waiting for interviewer question."
    else:
        first_question = "Tell me about yourself."
    logger.info("Interview role context: %s", se.role)
    se.start_turn(first_question)
    current_turn = TurnLifecycle()
    turn_start_ts = time.time()
    if isinstance(se.current_turn, dict):
        se.current_turn["turn_id"] = current_turn.turn_id

    if websocket.client_state == WebSocketState.CONNECTED:
        try:
            if room_id_was_invalid:
                await _safe_send({
                    "type": "room_assigned",
                    "session_id": session_id,
                    "room_id": room_id,
                })
            await _safe_send({
                "type": "question",
                "session_id": session_id,
                "question": first_question,
            })
        except Exception:
            logger.warning("Initial question send failed; closing session early")
            try:
                if dg:
                    await dg.close()
            except Exception:
                pass
            session_registry.mark_inactive(session_id)
            return

    if room_id and not existing_room_question:
        await _update_room_state(
            room_id,
            {
                "active_question": first_question,
                "partial_answer": "",
                "is_streaming": False,
                "assist_intensity": assist_intensity,
            },
        )

    # ================= STOP REQUEST =================
    async def request_stop(reason: str):
        nonlocal stop_reason
        stop_reason = str(reason or "other")
        if not stop_event.is_set():
            logger.warning(f"STOP requested: {reason}")
            _log_event("stop_requested", reason=reason)
            session_registry.touch(session_id)
            stop_event.set()

    async def emit_answer_done(question_text: str, suggestion_text: str = "", reason: str = "completed"):
        done_payload = {
            "type": "answer_suggestion_done",
            "session_id": session_id,
            "question": question_text,
            "suggestion": suggestion_text,
            "reason": reason,
            "room_id": room_id,
        }
        if websocket.client_state == WebSocketState.CONNECTED:
            await room_broadcaster.emit_local(done_payload)
        await room_broadcaster.emit_room(room_id, done_payload, exclude=websocket)
        await _update_room_state(
            room_id,
            {
                "active_question": question_text,
                "partial_answer": suggestion_text,
                "is_streaming": False,
                "assist_intensity": assist_intensity,
            },
        )
        if reason == "cancelled":
            increment_metric("answer_streams_cancelled", 1)

    async def emit_emotional_event(
        event_type: str,
        payload: dict | None = None,
        *,
        question_text: str = "",
        is_rejoin_sync: bool = False,
    ):
        nonlocal emotional_event_index
        is_streaming = bool(active_suggestion_task and not active_suggestion_task.done())
        if not emotional_manager.can_emit(
            question_text=question_text,
            is_streaming=is_streaming,
            is_rejoin_sync=is_rejoin_sync,
            is_finalizing=is_finalizing_window,
        ):
            return

        emotional_event_index += 1
        emotional_manager.mark_emitted(question_text)
        increment_metric("emotional_events_emitted", 1)
        body = {
            "type": event_type,
            "session_id": session_id,
            "room_id": room_id,
            "event_index": emotional_event_index,
            "payload": dict(payload or {}),
            "ts": time.time(),
        }
        if websocket.client_state == WebSocketState.CONNECTED:
            await _safe_send(body)
        await _broadcast_room(room_id, body, exclude=websocket)

    async def cancel_active_suggestion(reason: str = "cancelled"):
        nonlocal active_suggestion_task, active_suggestion_question_key
        if active_suggestion_task and not active_suggestion_task.done():
            active_suggestion_task.cancel()
            try:
                await active_suggestion_task
            except asyncio.CancelledError:
                pass
            except Exception as exc:
                logger.warning("Suggestion task cancellation issue: %s", exc)
        active_suggestion_task = None
        active_suggestion_question_key = ""

    async def emit_answer_suggestion(question_text: str):
        nonlocal active_suggestion_task, active_suggestion_question_key
        if not question_text:
            return
        stream_started_at = time.time()
        increment_metric("answer_streams_started", 1)
        start_payload = {
            "type": "answer_suggestion_start",
            "session_id": session_id,
            "question": question_text,
            "room_id": room_id,
        }
        if websocket.client_state == WebSocketState.CONNECTED:
            await _safe_send(start_payload)
        await _broadcast_room(room_id, start_payload, exclude=websocket)
        await _update_room_state(
            room_id,
            {
                "active_question": question_text,
                "partial_answer": "",
                "is_streaming": True,
                "assist_intensity": assist_intensity,
            },
        )

        async def emit_suggestion_payload(suggestion_text: str, reason: str = "completed"):
            suggestion_payload = {
                "type": "answer_suggestion",
                "session_id": session_id,
                "question": question_text,
                "suggestion": suggestion_text,
                "reason": reason,
                "room_id": room_id,
            }
            if websocket.client_state == WebSocketState.CONNECTED:
                await _safe_send(suggestion_payload)
            await _broadcast_room(room_id, suggestion_payload, exclude=websocket)

        suggestion_started_at = time.perf_counter()
        _log_event(
            "llm_call_started",
            stage="answer_suggestion",
            start_ts=time.time(),
            model="gpt-4o-mini",
            retry_count=0,
        )
        try:
            resume_loaded = bool(getattr(se, "resume_profile", None))
            jd_loaded = bool(getattr(se, "jd_context", None))
            current_role = str(getattr(se, "role", role) or role or "general")
            
            # INSTANT FEEDBACK: Send thinking indicator immediately
            # This makes UI show activity while waiting for OpenAI (2-3s network latency)
            thinking_payload = {
                "type": "answer_suggestion_chunk",
                "session_id": session_id,
                "question": question_text,
                "chunk": "▸ ",  # Thinking indicator
                "index": 0,
                "room_id": room_id,
                "is_thinking": True,  # Frontend can optionally hide this
            }
            if websocket.client_state == WebSocketState.CONNECTED:
                await _safe_send(thinking_payload)
            await _broadcast_room(room_id, thinking_payload, exclude=websocket)
            
            # TRUE STREAMING: Send chunks as they arrive from OpenAI
            # This gives ~200-500ms time-to-first-word (like Locked In AI, Paraqeet)
            built_answer = ""
            chunk_index = 1  # Start at 1 since thinking indicator is 0
            first_chunk_at: float | None = None
            
            async for token in stream_answer_live(
                question=question_text,
                user_id=session_id,
                role=current_role,
                resume_loaded=resume_loaded,
                jd_loaded=jd_loaded,
                answer_language=answer_language,
            ):
                if first_chunk_at is None:
                    first_chunk_at = time.perf_counter()
                    logger.info("TRUE_STREAM first token in %.0fms", (first_chunk_at - suggestion_started_at) * 1000)
                
                built_answer += token
                chunk_payload = {
                    "type": "answer_suggestion_chunk",
                    "session_id": session_id,
                    "question": question_text,
                    "chunk": token,
                    "index": chunk_index,
                    "room_id": room_id,
                }
                chunk_index += 1
                
                if websocket.client_state == WebSocketState.CONNECTED:
                    await _safe_send(chunk_payload)
                await _broadcast_room(room_id, chunk_payload, exclude=websocket)
                
                # Update room state periodically (every 10 chunks to reduce overhead)
                if chunk_index % 10 == 0:
                    await _update_room_state(
                        room_id,
                        {
                            "active_question": question_text,
                            "partial_answer": built_answer,
                            "is_streaming": True,
                            "assist_intensity": assist_intensity,
                        },
                    )
            
            _log_event(
                "llm_call_completed",
                stage="answer_suggestion",
                duration_ms=round((time.perf_counter() - suggestion_started_at) * 1000.0, 2),
                model="gpt-4o-mini",
                first_token_ms=round((first_chunk_at - suggestion_started_at) * 1000.0, 2) if first_chunk_at else None,
                retry_count=0,
            )
            
            suggestion_text = built_answer.strip()
            if not suggestion_text:
                await emit_answer_done(question_text, "", "empty")
                return

            await emit_answer_done(question_text, suggestion_text, "completed")
            await emit_suggestion_payload(suggestion_text, "completed")
        except asyncio.TimeoutError:
            logger.warning("Answer suggestion generation timed out")
            _log_event(
                "llm_call_timeout",
                stage="answer_suggestion",
                duration_ms=round((time.perf_counter() - suggestion_started_at) * 1000.0, 2),
                model=os.getenv("OPENAI_MODEL", "router_selected"),
                retry_count=2,
            )
            fallback_text = _fallback_answer_suggestion(question_text)
            await emit_answer_done(question_text, fallback_text, "timeout_fallback")
            await emit_suggestion_payload(fallback_text, "timeout_fallback")
        except asyncio.CancelledError:
            await emit_answer_done(question_text, "", "cancelled")
            raise
        except Exception as suggestion_exc:
            logger.warning("Answer suggestion generation failed: %s", suggestion_exc)
            _log_event(
                "llm_call_failed",
                stage="answer_suggestion",
                duration_ms=round((time.perf_counter() - suggestion_started_at) * 1000.0, 2),
                model=os.getenv("OPENAI_MODEL", "router_selected"),
                retry_count=2,
                error=str(suggestion_exc),
            )
            fallback_text = _fallback_answer_suggestion(question_text)
            await emit_answer_done(question_text, fallback_text, "error_fallback")
            await emit_suggestion_payload(fallback_text, "error_fallback")
        finally:
            current_task = asyncio.current_task()
            if active_suggestion_task is current_task:
                active_suggestion_task = None
            observe_stream_duration(time.time() - stream_started_at)

    async def start_answer_suggestion(question_text: str):
        nonlocal active_suggestion_task, active_suggestion_question_key
        question_key = question_text.lower()[:50].strip()
        
        # CRITICAL: Only cancel if this is a DIFFERENT question
        # Same question from different sources (browser vs Deepgram) should NOT cancel
        if active_suggestion_task and not active_suggestion_task.done():
            if question_key == active_suggestion_question_key:
                logger.info("Skipping duplicate answer generation (same question already being processed) | key=%s", question_key[:30])
                return
            # Different question - cancel the old one
            await cancel_active_suggestion(reason="superseded")
        
        active_suggestion_question_key = question_key
        active_suggestion_task = asyncio.create_task(emit_answer_suggestion(question_text))

    # ================= AUDIO INGEST =================
    async def receive_audio():
        nonlocal last_audio_ts, last_transcript_activity_ts, transcript_buffer, last_final_ts, last_pong_ts, browser_fallback_warning_sent, last_candidate_question_key, last_candidate_question_ts, last_interviewer_question_key, last_interviewer_question_ts, pending_partial_question, pending_partial_question_ts
        try:
            while not stop_event.is_set():
                msg = await websocket.receive()
                last_pong_ts = time.time()

                _log_event(
                    "message_received",
                    message_type=str(msg.get("type") or "unknown"),
                    has_text=bool(msg.get("text")),
                    has_bytes=bool(msg.get("bytes")),
                )

                if msg["type"] == "websocket.disconnect":
                    _log_event("disconnect", reason="client_disconnect")
                    await request_stop("client disconnect")
                    break

                if msg.get("text"):
                    text_payload = str(msg.get("text") or "")
                    if len(text_payload.encode("utf-8")) > MAX_WS_TEXT_BYTES:
                        logger.warning("WS message too large | session_id=%s bytes=%s", session_id, len(text_payload.encode("utf-8")))
                        await request_stop("message_too_large")
                        break
                    try:
                        payload = json.loads(text_payload)

                        payload_type = str(payload.get("type") or "").strip().lower()
                        _log_event(
                            "message_received",
                            message_type=payload_type or "unknown",
                            text_bytes=len(text_payload.encode("utf-8")),
                        )
                        if payload_type in {"candidate_transcript", "qa_transcript"}:
                            await transcript_router.route(payload)
                        if payload_type == "ping":
                            await _safe_send({
                                "type": "pong",
                                "session_id": session_id,
                                "ts": time.time(),
                            })
                            continue
                        if payload_type == "pong":
                            last_pong_ts = time.time()
                            continue

                        selected_role = (payload.get("role") or "").strip().lower()
                        if selected_role:
                            se.role = selected_role
                            se.set_role_context(role_builder.from_ui_role(selected_role))
                            se.set_assist_profile(_assist_profile_for_role(selected_role))
                            logger.info("Updated role context from payload: %s", se.role)

                        if payload.get("type") == "stop":
                            await request_stop("stop command")
                            break

                        if payload.get("type") == "stop_answer_generation":
                            # Cancel the active answer generation task
                            await cancel_active_suggestion(reason="user_cancelled")
                            logger.info("User cancelled answer generation")
                            continue

                        if payload.get("type") == "interviewer_question":
                            question_text = str(payload.get("text") or "").strip()
                            # Allow both interviewer AND candidate to report detected questions
                            # In live voice mode, candidates hear questions and need answer suggestions
                            if question_text:
                                # Skip partial questions (less than 4 words)
                                word_count = len(question_text.split())
                                if word_count < 4:
                                    logger.info("Skipping partial question (only %d words) | text=%s", word_count, question_text[:40])
                                    continue
                                
                                # Deduplication: skip if same question received within 3 seconds
                                now = time.time()
                                question_key = question_text.lower()[:50]
                                if (
                                    question_key == last_interviewer_question_key
                                    and (now - last_interviewer_question_ts) < 3.0
                                ):
                                    logger.info("Skipping duplicate interviewer_question | key=%s", question_key[:30])
                                    continue
                                last_interviewer_question_key = question_key
                                last_interviewer_question_ts = now

                                try:
                                    se.start_turn(question_text)
                                    current_turn = TurnLifecycle()
                                    if isinstance(se.current_turn, dict):
                                        se.current_turn["turn_id"] = current_turn.turn_id
                                except Exception:
                                    pass

                                if websocket.client_state == WebSocketState.CONNECTED:
                                    await _safe_send({
                                        "type": "interviewer_question",
                                        "session_id": session_id,
                                        "question": question_text,
                                        "room_id": room_id,
                                    })

                                await _broadcast_room(
                                    room_id,
                                    {
                                        "type": "interviewer_question",
                                        "session_id": session_id,
                                        "question": question_text,
                                        "room_id": room_id,
                                    },
                                    exclude=websocket,
                                )

                                await _update_room_state(
                                    room_id,
                                    {
                                        "active_question": question_text,
                                        "partial_answer": "",
                                        "is_streaming": False,
                                        "assist_intensity": assist_intensity,
                                    },
                                )
                                emotional_manager.on_question(question_text)
                                if assist_intensity >= 2:
                                    await emit_emotional_event(
                                        "tone_shift_event",
                                        {
                                            "tone": "probing" if assist_intensity == 2 else "intense",
                                            "message": "Interviewer shifted tone to increase pressure and test clarity under stress.",
                                            "question": question_text,
                                        },
                                        question_text=question_text,
                                    )
                                if assist_intensity == 3:
                                    await emit_emotional_event(
                                        "interruption_simulation",
                                        {
                                            "message": "Interviewer interruption simulated: keep your answer concise and return to core point quickly.",
                                            "question": question_text,
                                        },
                                        question_text=question_text,
                                    )
                                await start_answer_suggestion(question_text)
                            continue

                        if payload.get("type") == "sync_state_request":
                            state_snapshot = await _get_room_state(room_id)
                            if websocket.client_state == WebSocketState.CONNECTED:
                                await _safe_send({
                                    "type": "sync_state",
                                    "session_id": session_id,
                                    "room_id": room_id,
                                    "active_question": state_snapshot.get("active_question") or "",
                                    "partial_answer": state_snapshot.get("partial_answer") or "",
                                    "is_streaming": bool(state_snapshot.get("is_streaming")),
                                    "assist_intensity": int(state_snapshot.get("assist_intensity") or assist_intensity),
                                    "updated_at": state_snapshot.get("updated_at") or time.time(),
                                })
                            continue

                        if payload.get("type") == "set_question":
                            question_text = str(payload.get("question") or "").strip()
                            if question_text:
                                # Deduplication: skip if same question was just processed via interviewer_question
                                now = time.time()
                                question_key = question_text.lower()[:50]
                                if (
                                    question_key == last_interviewer_question_key
                                    and (now - last_interviewer_question_ts) < 5.0
                                ):
                                    logger.info("Skipping duplicate set_question (already handled by interviewer_question) | key=%s", question_key[:30])
                                    continue
                                last_interviewer_question_key = question_key
                                last_interviewer_question_ts = now

                                try:
                                    se.start_turn(question_text)
                                    current_turn = TurnLifecycle()
                                    if isinstance(se.current_turn, dict):
                                        se.current_turn["turn_id"] = current_turn.turn_id
                                except Exception:
                                    pass
                                if participant == "candidate":
                                    await _update_room_state(
                                        room_id,
                                        {
                                            "active_question": question_text,
                                            "partial_answer": "",
                                            "is_streaming": False,
                                            "assist_intensity": assist_intensity,
                                        },
                                    )
                                    await start_answer_suggestion(question_text)
                            continue

                        if payload.get("type") == "candidate_transcript":
                            if not ALLOW_BROWSER_STT_FALLBACK:
                                if not browser_fallback_warning_sent:
                                    browser_fallback_warning_sent = True
                                    await _safe_send({
                                        "type": "stt_warning",
                                        "session_id": session_id,
                                        "code": "browser_fallback_disabled",
                                        "message": "Browser speech fallback disabled. Reconnect mic stream to continue.",
                                    })
                                    logger.warning("Browser STT fallback payload ignored (disabled)")
                                continue

                            text = str(payload.get("text") or "").strip()
                            if not text:
                                continue
                            is_final = bool(payload.get("is_final"))
                            now = time.time()

                            if not is_final:
                                tte.ingest_partial(
                                    text=text,
                                    speaker="candidate",
                                    source="browser_stt",
                                    ts=now,
                                )
                                last_transcript_activity_ts = now
                                if websocket.client_state == WebSocketState.CONNECTED:
                                    await _safe_send({
                                        "type": "partial_transcript",
                                        "session_id": session_id,
                                        "text": text,
                                    })
                                continue

                            if participant == "candidate" and _is_question_or_opening(text):
                                candidate_question_key = _question_key(text)
                                is_duplicate_candidate_question = (
                                    candidate_question_key
                                    and candidate_question_key == last_candidate_question_key
                                    and (now - last_candidate_question_ts) < 2.0
                                )
                                if is_duplicate_candidate_question:
                                    continue

                                room_snapshot = await _get_room_state(room_id)
                                active_question = str(room_snapshot.get("active_question") or "").strip().lower()
                                active_question_key = _question_key(active_question)
                                should_trigger_new_question = (
                                    _should_upgrade_question(active_question, text)
                                    or (candidate_question_key and candidate_question_key != active_question_key)
                                )
                                if should_trigger_new_question:
                                    question_payload = {
                                        "type": "interviewer_question",
                                        "session_id": session_id,
                                        "question": text,
                                        "room_id": room_id,
                                    }
                                    if websocket.client_state == WebSocketState.CONNECTED:
                                        await _safe_send(question_payload)
                                    await _broadcast_room(room_id, question_payload, exclude=websocket)
                                    await _update_room_state(
                                        room_id,
                                        {
                                            "active_question": text,
                                            "partial_answer": "",
                                            "is_streaming": False,
                                            "assist_intensity": assist_intensity,
                                        },
                                    )
                                    await start_answer_suggestion(text)
                                    transcript_buffer = ""
                                    last_transcript_activity_ts = now
                                    last_candidate_question_key = candidate_question_key
                                    last_candidate_question_ts = now
                                    continue

                            active_question_text = ""
                            try:
                                if isinstance(se.current_turn, dict):
                                    active_question_text = str(se.current_turn.get("question") or "")
                            except Exception:
                                active_question_text = ""
                            if participant == "candidate" and _is_waiting_question(active_question_text) and (not _is_question_or_opening(text)):
                                logger.info("Ignoring non-question transcript while waiting for interviewer question")
                                continue

                            tte.ingest_final(
                                text=text,
                                speaker="candidate",
                                source="browser_stt",
                            )
                            transcript_buffer = _append_transcript_fragment(transcript_buffer, text)
                            last_transcript_activity_ts = now
                            tte.state.last_final_text = transcript_buffer
                            tte.state.final_ready = True
                            current_turn.state = TurnState.SILENCE_PENDING
                            last_final_ts = now
                            continue

                        if QA_MODE and payload.get("type") == "qa_transcript":
                            text = str(payload.get("text") or "").strip()
                            if text:
                                transcript_buffer = _append_transcript_fragment(transcript_buffer, text)
                                last_transcript_activity_ts = time.time()
                                tte.ingest_final(
                                    text=text,
                                    speaker="candidate",
                                    source="qa_mode",
                                )
                                tte.state.last_final_text = transcript_buffer
                                tte.state.final_ready = True
                                current_turn.state = TurnState.SILENCE_PENDING
                                last_final_ts = time.time() - 2.1
                                logger.info("[QA_MODE] Transcript injected | text=%s", text)
                    except json.JSONDecodeError as exc:
                        logger.warning("Invalid WS JSON | session_id=%s err=%s", session_id, exc)
                        continue
                    except Exception as exc:
                        logger.warning("WS payload handling failed | session_id=%s err=%s", session_id, exc)
                        continue

                if msg.get("bytes"):
                    if QA_MODE:
                        continue
                    if len(msg["bytes"]) < 320:
                        continue

                    last_audio_ts = time.time()
                    if dg:
                        try:
                            dg.send_audio(msg["bytes"])
                        except Exception as dg_send_exc:
                            logger.warning("Deepgram send_audio failed | session_id=%s err=%s", session_id, dg_send_exc)

                await asyncio.sleep(0)
        except Exception:
            await request_stop("receive_audio error")

    # ================= TRANSCRIPT INGEST =================
    async def send_transcripts():
        nonlocal last_final_ts, last_transcript_activity_ts, transcript_buffer, last_candidate_question_key, last_candidate_question_ts, dg, pending_partial_question, pending_partial_question_ts, last_interviewer_question_key, last_interviewer_question_ts, last_transcript_was_final, last_transcript_confidence
        if QA_MODE or (not dg) or (not dg.is_active()):
            logger.info("send_transcripts disabled (qa_mode=%s deepgram_available=%s)", QA_MODE, bool(dg and dg.is_active()))
            return
        try:
            while not stop_event.is_set():
                try:
                    result = await asyncio.wait_for(
                        dg.get_transcript(),
                        timeout=5.0
                    )
                # except asyncio.TimeoutError:
                #     print("⚠️ Deepgram stalled — waiting")
                #     continue
                except asyncio.TimeoutError:
                    logger.warning("Deepgram stalled — waiting for next transcript")
                    continue

                if stop_event.is_set():
                    break


                text = result.get("text", "").strip()
                is_final = result.get("is_final", False)

                if not text:
                    continue

                logger.info(
                    "DG transcript | final=%s final_ready=%s already_finalized=%s text=%s",
                    is_final,
                    tte.state.final_ready,
                    tte.state.already_finalized,
                    text,
                )

                if not is_final:
                    now = time.time()
                    tte.ingest_partial(
                        text=text,
                        speaker="candidate",
                        source="deepgram",
                        ts=now,
                    )
                    last_transcript_activity_ts = now

                    # CRITICAL FIX: Do NOT immediately process partial transcripts as questions
                    # Only send as partial_transcript for UI display (no answer generation yet)
                    # This prevents cancellation cascade: "What is" → "What is AWS" → "What is AWS Lambda"
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await _safe_send({
                            "type": "partial_transcript",
                            "session_id": session_id,
                            "text": text,
                        })
                    
                    # Track partial if it looks like a question (4+ words, question pattern)
                    # This will be finalized by silence watcher if no new transcript arrives
                    if participant == "candidate" and _is_question_or_opening(text) and len(text.split()) >= 4:
                        pending_partial_question = text
                        pending_partial_question_ts = now
                        # Track that this was a partial (not final) for silence threshold calculation
                        last_transcript_was_final = False
                        last_transcript_confidence = 0.0

                    assist_engine = getattr(se, "realtime_assist", None)
                    if assist_engine is not None and websocket.client_state == WebSocketState.CONNECTED:
                        try:
                            hint = await assist_engine.on_partial_transcript(text=text, timestamp=now)
                            if hint is not None:
                                increment_metric("assist_hints_emitted", 1)
                                await _safe_send({
                                    "type": "assist_hint",
                                    "session_id": session_id,
                                    "payload": hint.to_dict(),
                                })
                        except Exception as assist_exc:
                            logger.warning("Realtime assist hint evaluation failed: %s", assist_exc)
                else:
                    if participant == "interviewer":
                        question_text = str(text or "").strip()
                        if not question_text:
                            continue
                        
                        # Unified deduplication across all interviewer_question sources
                        now = time.time()
                        question_key = _question_key(question_text)
                        is_duplicate = (
                            question_key
                            and question_key == last_interviewer_question_key
                            and (now - last_interviewer_question_ts) < 3.0
                        )
                        if is_duplicate:
                            logger.info("Skipping duplicate interviewer question (unified dedup) | key=%s", question_key[:30])
                            continue
                        
                        # Update tracker BEFORE sending
                        last_interviewer_question_key = question_key
                        last_interviewer_question_ts = now

                        question_payload = {
                            "type": "interviewer_question",
                            "session_id": session_id,
                            "question": question_text,
                            "room_id": room_id,
                        }

                        if websocket.client_state == WebSocketState.CONNECTED:
                            await _safe_send(question_payload)
                        await _broadcast_room(room_id, question_payload, exclude=websocket)

                        await _update_room_state(
                            room_id,
                            {
                                "active_question": question_text,
                                "partial_answer": "",
                                "is_streaming": False,
                                "assist_intensity": assist_intensity,
                            },
                        )
                        emotional_manager.on_question(question_text)
                        if assist_intensity >= 2:
                            await emit_emotional_event(
                                "tone_shift_event",
                                {
                                    "tone": "probing" if assist_intensity == 2 else "intense",
                                    "message": "Interviewer shifted tone to increase pressure and test clarity under stress.",
                                    "question": question_text,
                                },
                                question_text=question_text,
                            )
                        if assist_intensity == 3:
                            await emit_emotional_event(
                                "interruption_simulation",
                                {
                                    "message": "Interviewer interruption simulated: keep your answer concise and return to core point quickly.",
                                    "question": question_text,
                                },
                                question_text=question_text,
                            )
                        await start_answer_suggestion(question_text)

                        transcript_buffer = ""
                        last_transcript_activity_ts = time.time()
                        continue

                    active_question_text = ""
                    try:
                        if isinstance(se.current_turn, dict):
                            active_question_text = str(se.current_turn.get("question") or "")
                    except Exception:
                        active_question_text = ""

                    if participant == "candidate" and _is_waiting_question(active_question_text) and (not _is_question_or_opening(text)):
                        logger.info("Ignoring non-question Deepgram final while waiting for interviewer question")
                        continue

                    tte.ingest_final(
                        text=text,
                        speaker="candidate",
                        source="deepgram",
                    )
                    # Track that Deepgram marked this as final (used by silence watcher)
                    last_transcript_was_final = True
                    last_transcript_confidence = 0.9  # Deepgram final transcripts have high confidence
                    
                    if participant == "candidate" and _is_question_or_opening(text):
                        now = time.time()
                        candidate_question_key = _question_key(text)
                        
                        # Use UNIFIED deduplication across all interviewer_question sources
                        # This prevents duplicates from Deepgram sending multiple finals
                        is_duplicate_question = (
                            candidate_question_key
                            and candidate_question_key == last_interviewer_question_key
                            and (now - last_interviewer_question_ts) < 3.0
                        )
                        if is_duplicate_question:
                            logger.info("Skipping duplicate question (unified dedup) | key=%s", candidate_question_key[:30])
                            continue

                        room_snapshot = await _get_room_state(room_id)
                        active_question = str(room_snapshot.get("active_question") or "").strip().lower()
                        active_question_key = _question_key(active_question)
                        should_trigger_new_question = (
                            _should_upgrade_question(active_question, text)
                            or (candidate_question_key and candidate_question_key != active_question_key)
                        )
                        if should_trigger_new_question:
                            # Update unified tracker BEFORE sending to prevent race conditions
                            last_interviewer_question_key = candidate_question_key
                            last_interviewer_question_ts = now
                            
                            # Clear pending partial (FINAL transcript supersedes it)
                            pending_partial_question = ""
                            pending_partial_question_ts = 0.0
                            
                            question_payload = {
                                "type": "interviewer_question",
                                "session_id": session_id,
                                "question": text,
                                "room_id": room_id,
                            }
                            if websocket.client_state == WebSocketState.CONNECTED:
                                await _safe_send(question_payload)
                            await _broadcast_room(room_id, question_payload, exclude=websocket)
                            await _update_room_state(
                                room_id,
                                {
                                    "active_question": text,
                                    "partial_answer": "",
                                    "is_streaming": False,
                                    "assist_intensity": assist_intensity,
                                },
                            )
                            await start_answer_suggestion(text)
                            transcript_buffer = ""
                            last_transcript_activity_ts = now
                            last_candidate_question_key = candidate_question_key
                            last_candidate_question_ts = now
                            continue
                    transcript_buffer = _append_transcript_fragment(transcript_buffer, text)
                    last_transcript_activity_ts = time.time()
                    tte.state.last_final_text = transcript_buffer
                    tte.state.final_ready = True
                    current_turn.state = TurnState.SILENCE_PENDING
                    last_final_ts = time.time()

        except Exception as e:
            logger.exception("send_transcripts error: %s", e)
            try:
                await _safe_send({
                    "type": "stt_warning",
                    "session_id": session_id,
                    "code": "deepgram_stream_error",
                    "message": "Deepgram stream interrupted. Reconnecting may be required; session kept alive.",
                })
            except Exception:
                pass
            try:
                if dg:
                    await dg.close()
            except Exception:
                pass
            dg = None
            return

    async def _compute_decision(transcript_text: str):
        completed_turn = TranscriptTurn(
            turn_id=str(current_turn.turn_id),
            speaker="candidate",
            text=transcript_text,
            hesitation_events=tte.state.pause_count,
            is_complete=True,
        )

        snapshot = ise.ingest_turn(completed_turn)
        return await are.decide(snapshot)

    decision_pipeline = TurnDecisionPipeline(compute_fn=_compute_decision)
    coaching_emitter = CoachingEmitter(send_fn=_safe_send)

    async def _route_transcript_payload(_payload: dict) -> None:
        return

    transcript_router = TranscriptRouter(on_payload_fn=_route_transcript_payload)

    # ================= TURN COMPLETION =================
    async def handle_turn_completion(completed, reason: str = "unknown"):
        nonlocal last_audio_ts, turn_closed, waiting_for_next_turn, current_turn, completed_turns, final_summary_sent, coaching_emitted_turn_ids, transcript_buffer, last_transcript_activity_ts, turn_start_ts, last_final_ts, hard_timeout_without_final_count
        logger.info(
            "TURN completion entered | turn_id=%s reason=%s text=%s",
            completed.turn_id,
            reason,
            completed.text,
        )
        
        current_turn_id = current_turn.turn_id
        if isinstance(se.current_turn, dict):
            current_turn_id = se.current_turn.get("turn_id") or current_turn_id
        else:
            current_turn_id = getattr(se.current_turn, "turn_id", current_turn_id)

        completed.turn_id = current_turn_id or completed.turn_id

        async def _processor(transcript: str):
            return await decision_pipeline.run(transcript)

        try:
            decision_started_at = time.perf_counter()
            decision = await controller.process_turn(completed.text, str(completed.turn_id), processor=_processor)
            _log_event(
                "turn_decision_pipeline_timing",
                turn_id=str(completed.turn_id),
                reason=reason,
                duration_ms=round((time.perf_counter() - decision_started_at) * 1000.0, 2),
                model=os.getenv("AI_REASONING_MODEL", "gpt-4o-mini"),
                retry_count=2,
            )
        except Exception as exc:
            logger.exception("TURN decision processing failed | turn_id=%s reason=%s err=%s", completed.turn_id, reason, exc)
            raise

        if decision is None:
            logger.warning("No decision generated for turn_id=%s", completed.turn_id)
            raise RuntimeError("No decision generated")

        try:
            skillgraph_started_at = time.perf_counter()
            se.finalize_turn(completed.text, decision.__dict__)
            _log_event(
                "skillgraph_update_timing",
                turn_id=str(completed.turn_id),
                duration_ms=round((time.perf_counter() - skillgraph_started_at) * 1000.0, 2),
            )
        except Exception as exc:
            logger.exception("Session finalize failed | turn_id=%s err=%s", completed.turn_id, exc)
            raise

        if websocket.client_state != WebSocketState.CONNECTED:
            return

        logger.info("Sending transcript event | turn_id=%s", completed.turn_id)
        await _safe_send({
            "type": "transcript",
            "session_id": session_id,
            "text": completed.text,
        })

        logger.info("Sending ai_decision event | turn_id=%s", completed.turn_id)
        await _safe_send({
            "type": "ai_decision",
            "session_id": session_id,
            "decision": decision.__dict__,
        })

        try:
            decision_confidence = float(getattr(decision, "confidence", 0.0) or 0.0)
            hesitation_count = int(getattr(decision, "hesitation_count", 0) or 0)
            if decision_confidence < 0.56 or hesitation_count >= 3:
                await emit_emotional_event(
                    "pressure_spike_event",
                    {
                        "message": "Pressure spike injected: interviewer challenges precision and confidence.",
                        "confidence": round(decision_confidence, 3),
                        "hesitation_count": hesitation_count,
                    },
                    question_text=str(getattr(se, "current_turn", {}).get("question") or ""),
                )
        except Exception:
            pass

        coaching_started_at = time.perf_counter()
        coaching_tips = coach.analyze(
            CoachingInput(
                transcript=completed.text,
                confidence=float(getattr(decision, "confidence", 0.0) or 0.0),
                hesitation_count=int(getattr(decision, "hesitation_count", 0) or 0),
            )
        )
        _log_event(
            "coaching_analysis_timing",
            turn_id=str(completed.turn_id),
            duration_ms=round((time.perf_counter() - coaching_started_at) * 1000.0, 2),
        )

        missing_skills = alignment_engine.get_missing_must_have_skills(
            completed.text,
            getattr(se, "jd_context", None),
            max_items=3,
        )
        if missing_skills:
            prioritized_missing = alignment_engine.prioritize_missing_skills(
                missing_skills,
                getattr(se, "resume_profile", None),
                max_items=2,
            )
            resume_skills = alignment_engine.get_resume_skills(
                getattr(se, "resume_profile", None)
            )
            resume_backed = [
                skill for skill in prioritized_missing
                if isinstance(skill, str) and skill.lower() in resume_skills
            ]

            if len(prioritized_missing) == 1 and resume_backed:
                gap_tip = (
                    f"The JD requires {prioritized_missing[0]}, and your resume shows it - "
                    "mention that experience in this answer."
                )
            elif len(prioritized_missing) == 1:
                gap_tip = f"Mention your experience with {prioritized_missing[0]} to better align with this role."
            elif resume_backed:
                shown = " and ".join(prioritized_missing[:2])
                gap_tip = (
                    f"The JD requires {shown}; your resume indicates at least one of these - "
                    "bring it into your answer explicitly."
                )
            else:
                gap_tip = (
                    f"Mention your experience with {prioritized_missing[0]} and {prioritized_missing[1]} "
                    "to better align with this role."
                )

            coaching_tips = [gap_tip] + [tip for tip in coaching_tips if tip != gap_tip]
            coaching_tips = coaching_tips[:3]

        if (
            coaching_tips
            and websocket.client_state == WebSocketState.CONNECTED
            and str(completed.turn_id) not in coaching_emitted_turn_ids
        ):
            coaching_emit_started_at = time.perf_counter()
            await coaching_emitter.emit(session_id=session_id, tips=coaching_tips)
            _log_event(
                "coaching_emission_timing",
                turn_id=str(completed.turn_id),
                tip_count=len(coaching_tips),
                duration_ms=round((time.perf_counter() - coaching_emit_started_at) * 1000.0, 2),
            )
            coaching_emitted_turn_ids.add(str(completed.turn_id))

        completed_turns += 1
        session_registry.touch(session_id)
        logger.info("Turn completed count=%s/%s", completed_turns, max_turns)

        if completed_turns >= max_turns:
            final_payload = ise.final_summary_payload()
            final_summary_started_at = time.perf_counter()
            if websocket.client_state == WebSocketState.CONNECTED:
                await _safe_send({
                    "type": "summary_started",
                    "event": "summary_started",
                    "session_id": session_id,
                    "room_id": room_id,
                })
            _log_event("summary_started", stage="final_summary")
            _log_event(
                "llm_call_started",
                stage="final_summary",
                start_ts=time.time(),
                model=os.getenv("AI_REASONING_MODEL", "gpt-4o-mini"),
                retry_count=2,
            )
            final_summary = await are.generate_final_summary(final_payload)
            _log_event(
                "llm_call_completed",
                stage="final_summary",
                duration_ms=round((time.perf_counter() - final_summary_started_at) * 1000.0, 2),
                model=os.getenv("AI_REASONING_MODEL", "gpt-4o-mini"),
                retry_count=2,
            )
            try:
                analytics_payload = await asyncio.to_thread(
                    build_session_analytics,
                    session_id=session_id,
                    role=str(role or ""),
                    questions=[str(turn.get("question") or "") for turn in list(getattr(se, "turns", []) or [])],
                    answers=[str(turn.get("answer") or "") for turn in list(getattr(se, "turns", []) or [])],
                    evaluations=[dict(turn.get("ai_decision") or {}) for turn in list(getattr(se, "turns", []) or [])],
                    final_decision=str((final_summary or {}).get("verdict") or ""),
                    final_score=(final_summary or {}).get("final_score"),
                    final_summary=final_summary if isinstance(final_summary, dict) else {},
                )
                await asyncio.to_thread(save_session_analytics, session_id=session_id, payload=analytics_payload)
            except Exception as analytics_exc:
                logger.warning("Failed to build WS session analytics: %s", analytics_exc)

            if websocket.client_state == WebSocketState.CONNECTED:
                _log_event("summary_emit", stage="final_summary")
                await _safe_send({
                    "type": "final_summary",
                    "session_id": session_id,
                    "data": final_summary,
                })
                final_summary_sent = True

            await request_stop("max turns reached")
            return
        if room_id and participant == "interviewer":
            wait_payload = {
                "type": "waiting_for_interviewer",
                "session_id": session_id,
                "message": "Waiting for interviewer question",
                "room_id": room_id,
            }
            if websocket.client_state == WebSocketState.CONNECTED:
                await _safe_send(wait_payload)
            await _broadcast_room(room_id, wait_payload, exclude=websocket)
        elif AUTO_NEXT_QUESTION_ENABLED:
            next_question = decision.next_question or "Can you explain that in more detail?"
            logger.info("Sending next_question event | turn_id=%s", completed.turn_id)
            se.start_turn(next_question)
            current_turn = TurnLifecycle()
            if isinstance(se.current_turn, dict):
                se.current_turn["turn_id"] = current_turn.turn_id

            await _safe_send({
                "type": "next_question",
                "session_id": session_id,
                "question": next_question,
            })
        else:
            waiting_question = "Waiting for interviewer question."
            try:
                se.start_turn(waiting_question)
                current_turn = TurnLifecycle()
                if isinstance(se.current_turn, dict):
                    se.current_turn["turn_id"] = current_turn.turn_id
            except Exception:
                pass
            wait_payload = {
                "type": "waiting_for_interviewer",
                "session_id": session_id,
                "message": waiting_question,
                "room_id": room_id,
            }
            if websocket.client_state == WebSocketState.CONNECTED:
                await _safe_send(wait_payload)
            await _broadcast_room(room_id, wait_payload, exclude=websocket)

        # RESET
        tte.state.partial_text = ""
        tte.state.last_final_text = None
        tte.state.final_ready = False
        tte.state.already_finalized = False
        transcript_buffer = ""

        last_audio_ts = time.time()
        last_transcript_activity_ts = time.time()
        turn_start_ts = time.time()
        last_final_ts = 0.0
        hard_timeout_without_final_count = 0
        turn_closed = False
        waiting_for_next_turn = False

    async def finalize_turn(reason: str, final_text: str):
        nonlocal turn_closed, waiting_for_next_turn, is_finalizing_window
        finalize_started = time.monotonic()
        is_finalizing_window = True
        logger.info(
            "TURN_FINALIZE_START | turn_id=%s reason=%s",
            current_turn.turn_id,
            reason,
        )

        allowed = await current_turn.try_finalize(reason)
        if not allowed:
            return

        class _Completed:
            def __init__(self, turn_id, text):
                self.turn_id = turn_id
                self.text = text

        completed = _Completed(turn_id=current_turn.turn_id, text=final_text)
        try:
            await handle_turn_completion(completed, reason=reason)
        except Exception as exc:
            logger.exception(
                "TURN_FINALIZE_FAILED | turn_id=%s reason=%s err=%s",
                completed.turn_id,
                reason,
                exc,
            )
            async with current_turn.lock:
                current_turn.state = TurnState.ACTIVE
            turn_closed = False
            waiting_for_next_turn = False
            return
        finally:
            if current_turn.state == TurnState.FINALIZING:
                observe_latency_ms((time.monotonic() - finalize_started) * 1000.0)
                await current_turn.mark_finalized()
                logger.info(
                    "TURN_FINALIZE_DONE | turn_id=%s reason=%s finalize_latency_ms=%.2f",
                    completed.turn_id,
                    reason,
                    (time.monotonic() - finalize_started) * 1000.0,
                )
            is_finalizing_window = False

    # ================= SILENCE WATCHER =================
    
    # Track if last transcript was marked final by Deepgram
    last_transcript_was_final = False
    last_transcript_confidence = 0.0
    
    def compute_silence_threshold(transcript: str, was_final: bool = False, confidence: float = 0.0) -> float:
        """Dynamic silence threshold based on sentence completeness.
        
        Uses multiple signals:
        1. Terminal punctuation (.?!)
        2. Deepgram's is_final flag
        3. Word patterns suggesting complete thought
        4. Confidence level from STT
        
        Returns:
        - 0.5s for high-confidence complete sentences
        - 0.7s for likely complete (is_final + good length)
        - 1.0s for medium confidence
        - 1.3s for likely incomplete
        """
        text = transcript.strip()
        if not text:
            return 1.0  # Default for empty
        
        word_count = len(text.split())
        lower_text = text.lower()
        
        # ===== FAST TRIGGERS (0.5s) =====
        # Complete sentence with terminal punctuation - always fast
        if text.endswith((".", "?", "!", "。", "？", "！")):
            return 0.5
        
        # ===== MEDIUM-FAST TRIGGERS (0.7s) =====
        # Deepgram marked as final + sufficient length = likely complete
        if was_final and word_count >= 5:
            return 0.7
        
        # Question words at start + sufficient length (often no punctuation in speech)
        question_starters = ("what ", "how ", "why ", "when ", "where ", "who ", "which ", "can you", "could you", "tell me", "describe", "explain")
        if any(lower_text.startswith(q) for q in question_starters) and word_count >= 5:
            return 0.7
        
        # ===== SLOW TRIGGERS (1.3s) - Wait for more =====
        # Very short - likely incomplete
        if word_count < 4:
            return 1.3
        
        # Endings that suggest incomplete thought
        incomplete_endings = (
            " the", " a", " an", " to", " of", " for", " in", " on", " is", " are",
            " and", " but", " or", " with", " that", " which", " how", " what",
            " when", " where", " why", " between", " about", " from", " your"
        )
        if any(lower_text.endswith(ending) for ending in incomplete_endings):
            return 1.3
        
        # ===== DEFAULT (1.0s) =====
        # Medium-length without clear signal
        return 1.0
    
    async def silence_watcher():
        nonlocal last_audio_ts, turn_closed, waiting_for_next_turn, transcript_buffer, last_transcript_activity_ts, turn_start_ts, hard_timeout_without_final_count, pending_partial_question, pending_partial_question_ts, last_interviewer_question_key, last_interviewer_question_ts
        
        while not stop_event.is_set():
            await asyncio.sleep(0.1)  # Fast polling for instant response

            if websocket.client_state != WebSocketState.CONNECTED:
                await request_stop("socket closed")
                break

            now_ts = time.time()
            
            # ============ PARTIAL QUESTION FALLBACK WITH DYNAMIC SILENCE THRESHOLD ============
            # Use compute_silence_threshold for intelligent wait times
            if pending_partial_question and pending_partial_question_ts > 0:
                silence_since_partial = now_ts - pending_partial_question_ts
                transcript_silence = now_ts - last_transcript_activity_ts
                
                # Dynamic threshold using all available signals
                required_timeout = compute_silence_threshold(
                    pending_partial_question, 
                    was_final=last_transcript_was_final,
                    confidence=last_transcript_confidence
                )
                
                if silence_since_partial >= required_timeout and transcript_silence >= required_timeout:
                    question_text = pending_partial_question
                    question_key = _question_key(question_text)
                    
                    # Check deduplication (don't re-trigger if already processed)
                    is_duplicate = (
                        question_key
                        and question_key == last_interviewer_question_key
                        and (now_ts - last_interviewer_question_ts) < 5.0
                    )
                    
                    if not is_duplicate:
                        logger.info("Finalizing partial question after %.2fs silence (threshold=%.2f) | text=%s", 
                                   silence_since_partial, required_timeout, question_text[:50])
                        
                        # Update tracker
                        last_interviewer_question_key = question_key
                        last_interviewer_question_ts = now_ts
                        
                        # Send question to frontend
                        if websocket.client_state == WebSocketState.CONNECTED:
                            await _safe_send({
                                "type": "interviewer_question",
                                "session_id": session_id,
                                "question": question_text,
                                "room_id": room_id,
                            })
                        
                        # Trigger answer generation
                        await start_answer_suggestion(question_text)
                    
                    # Clear pending question (whether triggered or deduplicated)
                    pending_partial_question = ""
                    pending_partial_question_ts = 0.0
            
            # ============ EXISTING SILENCE WATCHER LOGIC ============
            if waiting_for_next_turn or turn_closed:
                continue

            silence_for = now_ts - last_transcript_activity_ts
            turn_elapsed = now_ts - turn_start_ts
            active_question_text = ""
            try:
                if isinstance(se.current_turn, dict):
                    active_question_text = str(se.current_turn.get("question") or "")
            except Exception:
                active_question_text = ""
            if _is_waiting_question(active_question_text):
                continue
            candidate_text = (
                (tte.state.last_final_text or "").strip()
                or (transcript_buffer or "").strip()
            )
            partial_candidate_text = str(tte.state.partial_text or "").strip()
            word_count = len(candidate_text.split())
            partial_word_count = len(partial_candidate_text.split())
            logger.info(
                "silence watcher | silence=%.2f turn_elapsed=%.2f final_ready=%s words=%s turn_closed=%s waiting=%s",
                silence_for,
                turn_elapsed,
                tte.state.final_ready,
                word_count,
                turn_closed,
                waiting_for_next_turn,
            )

            # PATH A — Deepgram final path
            if tte.state.final_ready and (now_ts - last_final_ts) >= SILENCE_FINALIZE_SEC:
                if word_count >= MIN_FINAL_WORDS_FOR_SCORING:
                    logger.info("finalize_triggered reason=deepgram_final | turn_id=%s", current_turn.turn_id)
                    turn_closed = True
                    waiting_for_next_turn = True
                    await finalize_turn("deepgram_final", candidate_text)
                    continue

            if (not tte.state.final_ready) and silence_for >= PARTIAL_FALLBACK_SEC:
                if partial_word_count >= MIN_PARTIAL_WORDS_FOR_FALLBACK:
                    logger.warning(
                        "finalize_triggered reason=partial_fallback | turn_id=%s words=%s",
                        current_turn.turn_id,
                        partial_word_count,
                    )
                    turn_closed = True
                    waiting_for_next_turn = True
                    await _safe_send({
                        "type": "stt_warning",
                        "session_id": session_id,
                        "code": "partial_fallback_used",
                        "message": "Final transcript delayed; using stable partial transcript for this turn.",
                    })
                    await finalize_turn("partial_fallback", partial_candidate_text)
                    continue

            # PATH C — Hard timeout safety
            if turn_elapsed >= HARD_TIMEOUT_SEC:
                if tte.state.final_ready and word_count >= MIN_FINAL_WORDS_FOR_SCORING:
                    logger.info("finalize_triggered reason=hard_timeout_final | turn_id=%s", current_turn.turn_id)
                    turn_closed = True
                    waiting_for_next_turn = True
                    await finalize_turn("hard_timeout_final", candidate_text)
                    continue
                if partial_word_count >= MIN_PARTIAL_WORDS_FOR_FALLBACK:
                    logger.warning(
                        "finalize_triggered reason=hard_timeout_partial_fallback | turn_id=%s words=%s",
                        current_turn.turn_id,
                        partial_word_count,
                    )
                    turn_closed = True
                    waiting_for_next_turn = True
                    await _safe_send({
                        "type": "stt_warning",
                        "session_id": session_id,
                        "code": "hard_timeout_partial_fallback",
                        "message": "Using stable partial transcript after turn timeout.",
                    })
                    await finalize_turn("hard_timeout_partial_fallback", partial_candidate_text)
                    continue
                hard_timeout_without_final_count += 1
                await _safe_send({
                    "type": "stt_warning",
                    "session_id": session_id,
                    "code": "final_transcript_missing",
                    "message": "Waiting for stable final transcript; scoring is paused.",
                })
                logger.warning(
                    "Hard timeout without final transcript | turn_id=%s attempts=%s",
                    current_turn.turn_id,
                    hard_timeout_without_final_count,
                )
                turn_start_ts = time.time()
                if hard_timeout_without_final_count >= 2:
                    await request_stop("stt_unstable_no_final")
                    return





    # ================= KEEPALIVE =================
    async def deepgram_keepalive():
        if QA_MODE:
            return
        while not stop_event.is_set():
            await asyncio.sleep(0.4)
            if time.time() - last_audio_ts > 0.6:
                if dg:
                    try:
                        dg.send_audio(b"\x00" * 640)
                    except Exception as dg_keepalive_exc:
                        logger.warning("Deepgram keepalive send failed | session_id=%s err=%s", session_id, dg_keepalive_exc)

    async def websocket_heartbeat():
        nonlocal last_pong_ts
        while not stop_event.is_set():
            await asyncio.sleep(WS_HEARTBEAT_INTERVAL_SEC)
            if websocket.client_state != WebSocketState.CONNECTED:
                await request_stop("socket closed")
                return

            if (time.time() - last_pong_ts) > WS_HEARTBEAT_TIMEOUT_SEC:
                _log_event("heartbeat_timeout", timeout_sec=WS_HEARTBEAT_TIMEOUT_SEC)
                await request_stop("heartbeat_timeout")
                return

            await _safe_send({
                "type": "ping",
                "session_id": session_id,
                "ts": time.time(),
            })

    # ================= RUN TASKS =================
    controller.create_task(receive_audio())
    controller.create_task(send_transcripts())
    if participant != "interviewer":
        controller.create_task(silence_watcher())
    controller.create_task(deepgram_keepalive())
    controller.create_task(websocket_heartbeat())

    try:
        _log_event("session_started", participant=participant)
        await stop_event.wait()
    finally:
        await cancel_active_suggestion(reason="session_stopped")
        await controller.stop()
        try:
            if dg:
                await dg.close()
        except Exception as e:
            logger.warning("Deepgram already closed: %s", e)
        await lifecycle_manager.unregister(room_id, websocket, session_id)
        session_registry.mark_inactive(session_id)
        decrement_metric("ws_connections_active", 1)
        record_ws_disconnect(stop_reason)
        _log_event("disconnect", reason=stop_reason)
        _log_event("session_stopped", reason=stop_reason)
