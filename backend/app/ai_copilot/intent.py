from enum import Enum

class Intent(str, Enum):
    BEHAVIORAL = "behavioral"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"
    HR = "hr"
    UNKNOWN = "unknown"


def detect_intent(question: str) -> Intent:
    q = question.lower()

    if any(k in q for k in ["tell me about a time", "challenge", "conflict"]):
        return Intent.BEHAVIORAL

    if any(k in q for k in ["write code", "algorithm", "time complexity"]):
        return Intent.CODING

    if any(k in q for k in ["design", "scale", "architecture"]):
        return Intent.SYSTEM_DESIGN

    if any(k in q for k in ["strength", "weakness", "why do you want"]):
        return Intent.HR

    return Intent.UNKNOWN
