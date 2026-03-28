"""
Questions to Ask Interviewer — Auto-generates 5 intelligent, role-specific
closing questions based on role + company + interview context.
"""

from __future__ import annotations
import os
import json
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


@dataclass
class InterviewerQuestion:
    question: str
    category: str  # strategic / metrics / culture / challenges / research
    why_ask: str   # Why this question is powerful


_GENERATE_PROMPT = """You are an elite interview coach. Generate 5 powerful questions for the candidate to ASK the interviewer at the end of the interview.

CONTEXT:
- Role: {role}
- Company: {company}
- Interview Round: {round}
- Topics Covered: {topics_covered}
- Interviewer Name/Role (if known): {interviewer_info}

RULES — each question must fall into one of these categories:
1. STRATEGIC: About team/company direction, roadmap, priorities
2. METRICS: About success metrics, KPIs, how the role is evaluated
3. CULTURE: About team dynamics, collaboration style, work-life balance
4. CHALLENGES: About current problems the team is solving
5. RESEARCH: Shows you researched the company (reference a product, article, or initiative)

Return EXACTLY this JSON (no markdown):
{{
  "questions": [
    {{"question": "Strategic question text", "category": "strategic", "why_ask": "Why this is powerful"}},
    {{"question": "Metrics question text", "category": "metrics", "why_ask": "Why this is powerful"}},
    {{"question": "Culture question text", "category": "culture", "why_ask": "Why this is powerful"}},
    {{"question": "Challenges question text", "category": "challenges", "why_ask": "Why this is powerful"}},
    {{"question": "Research question text", "category": "research", "why_ask": "Why this is powerful"}}
  ]
}}"""


async def generate_interviewer_questions(
    role: str = "Software Engineer",
    company: str = "General",
    interview_round: str = "Technical",
    topics_covered: list[str] | None = None,
    interviewer_info: str = "Unknown",
    openai_client=None,
) -> list[InterviewerQuestion]:
    """Generate 5 smart questions to ask the interviewer."""
    topics_str = ", ".join(topics_covered[:5]) if topics_covered else "General interview topics"

    if openai_client is None:
        try:
            import openai
            openai_client = openai.AsyncOpenAI()
        except Exception:
            return _default_questions(role, company)

    prompt = _GENERATE_PROMPT.format(
        role=role,
        company=company,
        round=interview_round,
        topics_covered=topics_str,
        interviewer_info=interviewer_info,
    )

    try:
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        return [
            InterviewerQuestion(
                question=q["question"],
                category=q["category"],
                why_ask=q["why_ask"],
            )
            for q in data.get("questions", [])[:5]
        ]
    except Exception as e:
        logger.warning(f"Interviewer questions generation failed: {e}")
        return _default_questions(role, company)


def _default_questions(role: str, company: str) -> list[InterviewerQuestion]:
    """Fallback questions when LLM is unavailable."""
    return [
        InterviewerQuestion(
            question=f"What does the team's roadmap look like for the next 6-12 months?",
            category="strategic",
            why_ask="Shows long-term thinking and genuine interest in the team's direction.",
        ),
        InterviewerQuestion(
            question=f"How would you measure success for someone in this {role} role in the first 90 days?",
            category="metrics",
            why_ask="Shows you're outcome-oriented and want to deliver measurable value quickly.",
        ),
        InterviewerQuestion(
            question="How would you describe the team's collaboration style and how decisions get made?",
            category="culture",
            why_ask="Surface how the team actually works — hierarchical vs flat, consensus vs ownership.",
        ),
        InterviewerQuestion(
            question="What's the biggest technical or organizational challenge the team is tackling right now?",
            category="challenges",
            why_ask="Shows you're thinking about how you can add value immediately upon joining.",
        ),
        InterviewerQuestion(
            question=f"I noticed {company} recently [launched/announced/expanded X]. How does this role connect to that initiative?",
            category="research",
            why_ask="Demonstrates you researched the company beyond the JD. Fill in the bracket with real research.",
        ),
    ]


def questions_to_dict(questions: list[InterviewerQuestion]) -> list[dict]:
    return [asdict(q) for q in questions]
