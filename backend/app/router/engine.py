"""
Task classification + model selection for the non-live chat path.

Live interview answers route separately via LIVE_ANSWER_MODEL (see
openai_service.stream_answer_live). Here we keep a cheap/fast model for casual
chat and summaries, and spend on a stronger model for interview / coding /
reasoning turns where answer quality is what users feel.
"""
from core.config import STRONG_MODEL, FAST_MODEL

# ─── Task labels ────────────────────────────────────────────────────────
TASK_INTERVIEW = "interview"
TASK_CODING = "coding"
TASK_REASONING = "reasoning"
TASK_SUMMARY = "summary"
TASK_CHAT = "chat"

_INTERVIEW_KW = ("interview", "hr", "behavioral", "star", "tell me about", "evaluate", "feedback")
_CODING_KW = ("code", "coding", "algorithm", "leetcode", "terraform", "aws", "kubernetes", "sql", "system design")
_SUMMARY_KW = ("summarize", "summary", "shorten", "brief", "rewrite", "tldr")
_REASONING_KW = ("why", "how", "explain", "deep dive", "architecture", "design", "trade-off", "tradeoff")

# Tasks worth the stronger (more expensive) model.
_STRONG_TASKS = frozenset({TASK_INTERVIEW, TASK_CODING, TASK_REASONING})


def classify_task(text: str) -> str:
    """Classify user intent so we can pick the right model.

    Returns one of: interview | coding | summary | reasoning | chat.
    """
    t = (text or "").lower()
    if any(k in t for k in _INTERVIEW_KW):
        return TASK_INTERVIEW
    if any(k in t for k in _CODING_KW):
        return TASK_CODING
    if any(k in t for k in _SUMMARY_KW):
        return TASK_SUMMARY
    if any(k in t for k in _REASONING_KW):
        return TASK_REASONING
    return TASK_CHAT


def select_model(task: str) -> str:
    """Map a task label to an OpenAI model name."""
    return STRONG_MODEL if task in _STRONG_TASKS else FAST_MODEL
