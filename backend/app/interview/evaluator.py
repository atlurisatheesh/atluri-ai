# from app.router.fallback import route_request

# def evaluate_answer(question, answer):
#     prompt = f"""
# Evaluate this interview answer.

# Question:
# {question}

# Candidate Answer:
# {answer}

# Return JSON:
# {{
#  "score": 0-10,
#  "strengths": "...",
#  "weaknesses": "...",
#  "improvement": "..."
# }}
# """

#     messages = [{"role": "user", "content": prompt}]
#     return route_request("interview", messages)


from openai import OpenAI
from core.config import OPENAI_API_KEY
from app.scenarios import get_scenario_prompt, get_scenario_eval_criteria
import json
import re

client = OpenAI(api_key=OPENAI_API_KEY)


def _clamp_score(value, default=50):
    try:
        return max(0, min(100, int(value)))
    except Exception:
        return default


def _normalize_eval(data: dict, fallback_feedback: str = "") -> dict:
    return {
        "technical": _clamp_score(data.get("technical"), 50),
        "communication": _clamp_score(data.get("communication"), 50),
        "confidence": _clamp_score(data.get("confidence"), 50),
        "clarity": _clamp_score(data.get("clarity"), 50),
        "feedback": str(data.get("feedback") or fallback_feedback or "Evaluation generated."),
    }


def _extract_json_dict(text: str) -> dict | None:
    text = (text or "").strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if fenced:
        try:
            parsed = json.loads(fenced.group(1))
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            parsed = json.loads(text[start:end + 1])
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    return None


def evaluate_answer(question: str, answer: str, scenario: str | None = None) -> dict:

    scenario_prompt = get_scenario_prompt(scenario)
    scenario_criteria = get_scenario_eval_criteria(scenario)

    # Build evaluation dimensions from scenario criteria or use defaults
    if scenario_criteria:
        dimensions = {name: f"0-100 ({c['description']})" for name, c in scenario_criteria.items()}
        dim_json = json.dumps(dimensions, indent=2)
        eval_instruction = f"""Evaluate on these scenario-specific dimensions:
{dim_json}

Return JSON with each dimension as a key (0-100) plus a "feedback" string."""
    else:
        eval_instruction = """Give evaluation strictly in JSON:
{
  "technical": 0-100,
  "communication": 0-100,
  "confidence": 0-100,
  "clarity": 0-100,
  "feedback": "short feedback"
}"""

    prompt = f"""
You are a senior technical interviewer.
{scenario_prompt}

Question:
{question}

Candidate Answer:
{answer}

{eval_instruction}
"""

    res = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    parsed = _extract_json_dict(getattr(res, "output_text", ""))
    if isinstance(parsed, dict):
        return _normalize_eval(parsed)

    return _normalize_eval(
        {},
        "Could not parse structured model output, so a neutral fallback evaluation was used.",
    )
