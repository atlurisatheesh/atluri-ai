"""
Follow-up Question Predictor — Predicts the 3 most likely follow-up questions
the interviewer will ask next, based on the current Q&A and interview context.
"""

from __future__ import annotations
import os
import json
import logging
from dataclasses import dataclass, asdict

from app.interview_intelligence.question_classifier import classify_question, QuestionType

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


@dataclass
class PredictedFollowUp:
    question: str
    likelihood: str  # high / medium / low
    answer_skeleton: str
    framework: str


@dataclass
class FollowUpPrediction:
    predictions: list[PredictedFollowUp]
    context_used: str


_PREDICTION_PROMPT = """You are an expert interview coach. Based on the interview context below, predict the 3 most likely follow-up questions the interviewer will ask NEXT.

CONTEXT:
- Role: {role}
- Company: {company}
- Current Question: {current_question}
- Candidate's Answer Summary: {answer_summary}
- Interview Round: {interview_round}
- Questions Asked So Far: {questions_so_far}

RULES:
- Predict questions that NATURALLY follow from the current answer
- Consider what an interviewer would probe deeper on
- Include one "curveball" that tests a gap in the answer
- For each prediction, provide a 1-2 sentence answer skeleton the candidate can use

Return EXACTLY this JSON (no markdown):
{{
  "predictions": [
    {{
      "question": "The predicted follow-up question",
      "likelihood": "high",
      "answer_skeleton": "Brief skeleton answer the candidate can use",
      "framework": "STAR"
    }},
    {{
      "question": "Second predicted question",
      "likelihood": "medium",
      "answer_skeleton": "Brief skeleton",
      "framework": "PREP"
    }},
    {{
      "question": "Third predicted question (curveball)",
      "likelihood": "low",
      "answer_skeleton": "Brief skeleton",
      "framework": "CAR"
    }}
  ]
}}"""


async def predict_followups(
    current_question: str,
    answer_summary: str,
    role: str = "Software Engineer",
    company: str = "General",
    interview_round: str = "Technical",
    questions_so_far: list[str] | None = None,
    openai_client=None,
) -> FollowUpPrediction:
    """
    Predict the next 3 most likely follow-up questions.
    Uses LLM for high-quality predictions with fallback to pattern-based.
    """
    if openai_client is None:
        try:
            import openai
            openai_client = openai.AsyncOpenAI()
        except Exception:
            return _pattern_based_fallback(current_question)

    q_list = ", ".join(questions_so_far[:5]) if questions_so_far else "None yet"

    prompt = _PREDICTION_PROMPT.format(
        role=role,
        company=company,
        current_question=current_question,
        answer_summary=answer_summary[:500],
        interview_round=interview_round,
        questions_so_far=q_list,
    )

    try:
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        predictions = []
        for p in data.get("predictions", [])[:3]:
            predictions.append(PredictedFollowUp(
                question=p.get("question", ""),
                likelihood=p.get("likelihood", "medium"),
                answer_skeleton=p.get("answer_skeleton", ""),
                framework=p.get("framework", "PREP"),
            ))

        return FollowUpPrediction(
            predictions=predictions,
            context_used=f"Q: {current_question[:80]}",
        )
    except Exception as e:
        logger.warning(f"Follow-up prediction LLM failed, using fallback: {e}")
        return _pattern_based_fallback(current_question)


def _pattern_based_fallback(question: str) -> FollowUpPrediction:
    """Pattern-based follow-up prediction when LLM is unavailable."""
    classification = classify_question(question)
    qt = classification.question_type

    fallback_map: dict[QuestionType, list[PredictedFollowUp]] = {
        QuestionType.BEHAVIORAL: [
            PredictedFollowUp("What was your specific role vs the team's contribution?", "high", "I was personally responsible for [X]. The team handled [Y] while I led [Z].", "STAR"),
            PredictedFollowUp("What would you do differently if you faced that situation again?", "medium", "Looking back, I would [specific change] because [reason].", "STAR-L"),
            PredictedFollowUp("Can you quantify the impact of that outcome?", "high", "The result was [X]% improvement in [metric], translating to [$Y] in [timeframe].", "CAR"),
        ],
        QuestionType.TECHNICAL: [
            PredictedFollowUp("What's the time and space complexity of your solution?", "high", "Time: O(n), Space: O(n) because [explanation].", "Think-Aloud"),
            PredictedFollowUp("How would you handle edge cases?", "high", "Key edge cases: empty input, single element, duplicates, overflow.", "Think-Aloud"),
            PredictedFollowUp("Can you optimize this further?", "medium", "We could improve by using [technique] to achieve O(log n).", "Think-Aloud"),
        ],
        QuestionType.SYSTEM_DESIGN: [
            PredictedFollowUp("How would this scale to 10x the current load?", "high", "I'd add [horizontal scaling, caching, CDN] at the [specific layer].", "Think-Aloud"),
            PredictedFollowUp("What are the trade-offs of your design?", "high", "The main trade-off is [consistency vs availability]. I chose [X] because [reason].", "MECE"),
            PredictedFollowUp("How would you handle a failure in [component]?", "medium", "I'd implement [circuit breaker, retry, fallback] with [monitoring].", "Think-Aloud"),
        ],
        QuestionType.MOTIVATION_FIT: [
            PredictedFollowUp("Why are you leaving your current role?", "high", "I'm seeking [growth area] that aligns with [this role's opportunity].", "Past-Present-Future"),
            PredictedFollowUp("Where do you see yourself in 5 years?", "medium", "I see myself [growing into X], contributing to [company goal].", "Why-How-What"),
            PredictedFollowUp("What's your management or leadership style?", "medium", "I lead through [empowerment/coaching], focusing on [outcomes/growth].", "PREP"),
        ],
    }

    default_fallback = [
        PredictedFollowUp("Can you elaborate on that with a specific example?", "high", "Yes — for instance, at [Company], I [specific action] that led to [result].", "STAR"),
        PredictedFollowUp("What metrics or data support that?", "medium", "The key metric was [X], which improved by [Y]% over [timeframe].", "CAR"),
        PredictedFollowUp("How does that experience relate to this role?", "medium", "This directly applies because [connection to JD requirement].", "PREP"),
    ]

    predictions = fallback_map.get(qt, default_fallback)
    return FollowUpPrediction(predictions=predictions, context_used="pattern-based fallback")


def predictions_to_dict(prediction: FollowUpPrediction) -> dict:
    return {
        "predictions": [asdict(p) for p in prediction.predictions],
        "context_used": prediction.context_used,
    }
