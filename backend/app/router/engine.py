import re

def classify_task(user_message: str) -> str:
    """
    Classify user intent to choose best model.
    Returns: chat | reasoning | interview | summary
    """

    text = user_message.lower()

    interview_keywords = ["interview", "question", "answer", "evaluate", "feedback"]
    summary_keywords = ["summarize", "summary", "shorten", "brief"]
    reasoning_keywords = ["why", "how", "explain", "deep", "architecture", "design"]

    if any(k in text for k in interview_keywords):
        return "interview"
    if any(k in text for k in summary_keywords):
        return "summary"
    if any(k in text for k in reasoning_keywords):
        return "reasoning"

    return "chat"


def select_model(task: str) -> str:
    """
    Route to best model based on task
    """

    if task == "chat":
        return "gpt-4.1-mini"   # fast + cheap
    if task == "summary":
        return "gpt-4.1-mini"   # fast + cheap
    if task == "interview":
        return "gpt-4.1"        # best reasoning
    if task == "reasoning":
        return "gpt-4.1"        # deep thinking

    return "gpt-4.1-mini"


def classify_task(text: str) -> str:
    text = text.lower()

    if "interview" in text or "hr" in text:
        return "interview"

    if "code" in text or "terraform" in text or "aws" in text:
        return "coding"

    if "summarize" in text or "rewrite" in text:
        return "writing"

    return "general"
