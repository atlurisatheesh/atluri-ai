"""
Unit tests for tiered model routing.

Guards the competitive-critical invariant: the live interview answer must NOT
fall back to a cheap "mini" model when the client doesn't pin one, and the
non-live chat path must spend the stronger model on interview/coding/reasoning
turns while keeping casual chat/summaries cheap.

These modules are pure-Python (no FastAPI / DB / network), so they run in
isolation without the full app stack.
"""
from core.config import LIVE_ANSWER_MODEL, STRONG_MODEL, FAST_MODEL
from app.router import engine
from app.router.model_router import resolve_model, DEFAULT_SPEC


# ─── classify_task ──────────────────────────────────────────────────────
def test_classify_interview():
    assert engine.classify_task("Tell me about a time you led a project") == engine.TASK_INTERVIEW


def test_classify_coding():
    assert engine.classify_task("Write code to reverse a linked list") == engine.TASK_CODING


def test_classify_summary():
    assert engine.classify_task("Summarize this paragraph for me") == engine.TASK_SUMMARY


def test_classify_reasoning():
    assert engine.classify_task("Why does this architecture scale?") == engine.TASK_REASONING


def test_classify_chat_default():
    assert engine.classify_task("hello there") == engine.TASK_CHAT


def test_classify_handles_empty():
    # Regression: the old duplicate classify_task definition shadowed the first.
    # Empty input must not raise and must fall through to chat.
    assert engine.classify_task("") == engine.TASK_CHAT
    assert engine.classify_task(None) == engine.TASK_CHAT


# ─── select_model ───────────────────────────────────────────────────────
def test_strong_tasks_use_strong_model():
    for task in (engine.TASK_INTERVIEW, engine.TASK_CODING, engine.TASK_REASONING):
        assert engine.select_model(task) == STRONG_MODEL


def test_cheap_tasks_use_fast_model():
    for task in (engine.TASK_SUMMARY, engine.TASK_CHAT):
        assert engine.select_model(task) == FAST_MODEL


def test_interview_does_not_use_mini():
    # The whole point: an interview turn should not be answered by a mini model.
    assert "mini" not in engine.select_model(engine.TASK_INTERVIEW)


# ─── live answer default (the competitive gap we closed) ────────────────
def _effective_live_model(model: str) -> str:
    """Mirror of the resolution in openai_service.stream_answer_live."""
    return (model or "").strip() or LIVE_ANSWER_MODEL


def test_live_answer_defaults_to_premium_not_mini():
    effective = _effective_live_model("")  # client pinned nothing
    spec = resolve_model(effective)
    assert effective == LIVE_ANSWER_MODEL
    assert "mini" not in spec.api_model, (
        f"Live answer fell back to a mini model ({spec.api_model}); "
        "this is the exact regression we are guarding against."
    )


def test_live_answer_respects_explicit_model():
    spec = resolve_model(_effective_live_model("claude-4.5-sonnet"))
    assert spec.provider == "anthropic"
    assert spec.api_model.startswith("claude")


def test_default_spec_is_still_mini_for_unknown_ids():
    # The global default stays cheap for genuinely unknown/unspecified router ids;
    # only the live path overrides it with LIVE_ANSWER_MODEL.
    assert resolve_model("totally-unknown-model").api_model == DEFAULT_SPEC.api_model
