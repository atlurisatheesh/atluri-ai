# backend/app/answer_engine/intent_detector.py

from enum import Enum
from typing import Dict

class QuestionIntent(str, Enum):
    BEHAVIORAL = "behavioral"
    SYSTEM_DESIGN = "system_design"
    CODING = "coding"
    HR = "hr"
    CLARIFICATION = "clarification"
    UNKNOWN = "unknown"


def detect_intent(question: str) -> Dict:
    q = question.lower()

    # Behavioral
    if any(k in q for k in [
        "tell me about a time",
        "describe a situation",
        "conflict",
        "challenge",
        "failure",
        "leadership"
    ]):
        return {
            "intent": QuestionIntent.BEHAVIORAL,
            "answer_style": "STAR"
        }

    # Coding
    if any(k in q for k in [
        "write a function",
        "algorithm",
        "time complexity",
        "optimize",
        "leetcode",
        "array",
        "string",
        "graph",
        "dp"
    ]):
        return {
            "intent": QuestionIntent.CODING,
            "answer_style": "step_by_step"
        }

    # System design
    if any(k in q for k in [
        "design",
        "architecture",
        "scale",
        "high availability",
        "distributed",
        "throughput"
    ]):
        return {
            "intent": QuestionIntent.SYSTEM_DESIGN,
            "answer_style": "structured"
        }

    # HR
    if any(k in q for k in [
        "why do you want",
        "strength",
        "weakness",
        "career goals"
    ]):
        return {
            "intent": QuestionIntent.HR,
            "answer_style": "concise"
        }

    return {
        "intent": QuestionIntent.UNKNOWN,
        "answer_style": "generic"
    }
