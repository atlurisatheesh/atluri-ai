"""
Pre-Interview Context Map Generator — Auto-generates a full intelligence briefing
before the interview starts, based on resume + JD + company research.
"""

from __future__ import annotations
import os
import json
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


@dataclass
class ContextMap:
    top_5_strengths: list[str]
    top_3_gaps: list[str]
    predicted_questions: list[str]  # 7 most probable
    star_stories: list[dict]       # 3 mapped to competencies
    value_proposition: str         # 1-sentence differentiator
    red_flags: list[str]           # Job gaps, short tenures, pivots
    company_talking_points: list[str]
    interview_strategy: str


_CONTEXT_MAP_PROMPT = """You are an elite interview strategist. Generate a pre-interview intelligence briefing.

CANDIDATE RESUME:
{resume}

JOB DESCRIPTION:
{job_description}

COMPANY: {company}
TARGET ROLE: {role}
INTERVIEW ROUND: {round}

Generate a comprehensive context map. Return EXACTLY this JSON (no markdown):
{{
  "top_5_strengths": [
    "Strength 1 most relevant to this JD",
    "Strength 2",
    "Strength 3",
    "Strength 4",
    "Strength 5"
  ],
  "top_3_gaps": [
    "Gap 1 the candidate should prepare to address",
    "Gap 2",
    "Gap 3"
  ],
  "predicted_questions": [
    "Most likely question 1",
    "Most likely question 2",
    "Most likely question 3",
    "Most likely question 4",
    "Most likely question 5",
    "Most likely question 6",
    "Most likely question 7"
  ],
  "star_stories": [
    {{"competency": "Leadership", "situation": "Brief S from resume", "result": "Quantified R"}},
    {{"competency": "Problem-Solving", "situation": "Brief S", "result": "Quantified R"}},
    {{"competency": "Collaboration", "situation": "Brief S", "result": "Quantified R"}}
  ],
  "value_proposition": "One sentence: why THIS candidate is uniquely qualified for THIS role",
  "red_flags": [
    "Potential concern 1 (e.g., 8-month tenure at Company X)",
    "Potential concern 2"
  ],
  "company_talking_points": [
    "Company fact/news to weave into answers naturally",
    "Product or mission point to reference",
    "Recent achievement or initiative to mention"
  ],
  "interview_strategy": "2-3 sentence overall strategy for this specific interview"
}}"""


async def generate_context_map(
    resume_text: str,
    job_description: str,
    company: str = "General",
    role: str = "Software Engineer",
    interview_round: str = "Technical",
    openai_client=None,
) -> ContextMap:
    """Generate a pre-interview context map from resume + JD."""
    if openai_client is None:
        try:
            import openai
            openai_client = openai.AsyncOpenAI()
        except Exception:
            return _empty_context_map()

    prompt = _CONTEXT_MAP_PROMPT.format(
        resume=resume_text[:3000],
        job_description=job_description[:2000],
        company=company,
        role=role,
        round=interview_round,
    )

    try:
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.5,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        return ContextMap(
            top_5_strengths=data.get("top_5_strengths", []),
            top_3_gaps=data.get("top_3_gaps", []),
            predicted_questions=data.get("predicted_questions", []),
            star_stories=data.get("star_stories", []),
            value_proposition=data.get("value_proposition", ""),
            red_flags=data.get("red_flags", []),
            company_talking_points=data.get("company_talking_points", []),
            interview_strategy=data.get("interview_strategy", ""),
        )
    except Exception as e:
        logger.error(f"Context map generation failed: {e}")
        return _empty_context_map()


def _empty_context_map() -> ContextMap:
    return ContextMap(
        top_5_strengths=["Review your resume and highlight top achievements"],
        top_3_gaps=["Review the JD for any missing skills"],
        predicted_questions=["Tell me about yourself", "Why this role?", "Your biggest challenge?"],
        star_stories=[],
        value_proposition="Focus on your unique combination of skills and experience.",
        red_flags=[],
        company_talking_points=["Research the company's recent news and products"],
        interview_strategy="Focus on connecting your experience to the role requirements.",
    )


def context_map_to_dict(cm: ContextMap) -> dict:
    return asdict(cm)
