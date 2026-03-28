"""
LinkedIn Profile Optimizer — Optimizes LinkedIn headline, about section,
experience bullets, and skills using the ARIA intelligence engine.
"""

from __future__ import annotations
import os
import json
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


@dataclass
class LinkedInOptimization:
    headline: str
    headline_alternatives: list[str]
    about_section: str
    experience_bullets: list[dict]  # [{role, company, bullets: [str]}]
    skills_priority: list[str]     # ordered by importance for target role
    keyword_density: dict          # {keyword: count}
    recruiter_search_terms: list[str]
    profile_score: int             # 0-100
    improvement_items: list[str]


_OPTIMIZE_PROMPT = """You are a LinkedIn optimization expert who helps candidates get found by recruiters.

CANDIDATE RESUME:
{resume}

TARGET ROLE: {target_role}
TARGET INDUSTRY: {industry}
CAREER LEVEL: {level}

Generate an optimized LinkedIn profile. Return EXACTLY this JSON (no markdown):
{{
  "headline": "Optimized headline (max 220 chars, keyword-rich, not just job title)",
  "headline_alternatives": [
    "Alternative headline 1",
    "Alternative headline 2"
  ],
  "about_section": "Optimized About section (300-500 words, first-person, story-driven, keyword-rich, ends with call-to-action)",
  "experience_bullets": [
    {{
      "role": "Job Title",
      "company": "Company Name",
      "bullets": [
        "Achievement-oriented bullet with metrics (XYZ format)",
        "Second bullet emphasizing impact"
      ]
    }}
  ],
  "skills_priority": [
    "Skill 1 (most important for target role)",
    "Skill 2",
    "Skill 3",
    "Skill 4",
    "Skill 5"
  ],
  "recruiter_search_terms": [
    "Term recruiters search for 1",
    "Term 2",
    "Term 3",
    "Term 4",
    "Term 5"
  ],
  "profile_score": 75,
  "improvement_items": [
    "Specific improvement 1",
    "Specific improvement 2",
    "Specific improvement 3"
  ]
}}

RULES FOR OPTIMIZATION:
- Headline: Include target role keywords + value proposition + measurable result
- About: Start with a hook, tell career story, include keywords naturally, end with "Let's connect"
- Bullets: Use XYZ format ("Accomplished [X] measured by [Y] by doing [Z]")
- Skills: Prioritize by recruiter search volume for this role
- Include industry-specific buzzwords that recruiters actually search for"""


async def optimize_linkedin_profile(
    resume_text: str,
    target_role: str = "Software Engineer",
    industry: str = "Technology",
    level: str = "Senior",
    openai_client=None,
) -> LinkedInOptimization:
    """Generate optimized LinkedIn profile content from resume."""
    if openai_client is None:
        try:
            import openai
            openai_client = openai.AsyncOpenAI()
        except Exception:
            return _default_optimization(target_role)

    prompt = _OPTIMIZE_PROMPT.format(
        resume=resume_text[:4000],
        target_role=target_role,
        industry=industry,
        level=level,
    )

    try:
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.6,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)

        return LinkedInOptimization(
            headline=data.get("headline", ""),
            headline_alternatives=data.get("headline_alternatives", []),
            about_section=data.get("about_section", ""),
            experience_bullets=data.get("experience_bullets", []),
            skills_priority=data.get("skills_priority", []),
            keyword_density=_compute_keyword_density(
                data.get("about_section", ""),
                data.get("recruiter_search_terms", []),
            ),
            recruiter_search_terms=data.get("recruiter_search_terms", []),
            profile_score=data.get("profile_score", 50),
            improvement_items=data.get("improvement_items", []),
        )
    except Exception as e:
        logger.error(f"LinkedIn optimization failed: {e}")
        return _default_optimization(target_role)


def _compute_keyword_density(text: str, keywords: list[str]) -> dict:
    """Count keyword occurrences in the optimized content."""
    text_lower = text.lower()
    return {kw: text_lower.count(kw.lower()) for kw in keywords if kw}


def _default_optimization(target_role: str) -> LinkedInOptimization:
    return LinkedInOptimization(
        headline=f"{target_role} | Building scalable solutions that drive business impact",
        headline_alternatives=[
            f"Experienced {target_role} | [X] years delivering results",
            f"{target_role} | Passionate about [domain] | Open to opportunities",
        ],
        about_section=(
            f"Upload your resume to get a personalized, AI-optimized About section "
            f"tailored for {target_role} roles."
        ),
        experience_bullets=[],
        skills_priority=["Upload resume for personalized skills priority"],
        keyword_density={},
        recruiter_search_terms=[target_role.lower()],
        profile_score=30,
        improvement_items=[
            "Upload your resume to generate optimized content",
            "Add a professional headshot (profiles with photos get 14x more views)",
            "Complete all profile sections for maximum visibility",
        ],
    )


def linkedin_to_dict(opt: LinkedInOptimization) -> dict:
    return asdict(opt)
