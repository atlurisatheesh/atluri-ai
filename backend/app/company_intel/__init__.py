"""
Deep Company Intelligence Pack Engine

Generates comprehensive company research packs for interview prep.
Uses OpenAI to create structured company intelligence from a company name,
covering culture, interview patterns, recent news, and tailored talking points.

Usage:
    from app.company_intel.pack_engine import get_pack_engine
    
    engine = get_pack_engine()
    pack = await engine.generate_pack("Google", role="Senior SWE", jd_text="...")
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from openai import AsyncOpenAI
from core.config import OPENAI_API_KEY

logger = logging.getLogger("company_intel.pack_engine")

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


@dataclass
class CompanyPack:
    """Structured company intelligence pack."""
    company: str
    generated_at: float = field(default_factory=time.time)

    # Company overview
    mission: str = ""
    culture_values: list[str] = field(default_factory=list)
    tech_stack: list[str] = field(default_factory=list)
    recent_news: list[str] = field(default_factory=list)

    # Interview intelligence
    interview_style: str = ""  # e.g. "behavioral-heavy", "system-design-focused"
    common_questions: list[str] = field(default_factory=list)
    bar_raiser_tips: list[str] = field(default_factory=list)
    red_flags_to_avoid: list[str] = field(default_factory=list)

    # Tailored talking points
    talking_points: list[str] = field(default_factory=list)
    values_alignment: list[str] = field(default_factory=list)

    # Compensation context
    comp_range: str = ""
    negotiation_tips: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "company": self.company,
            "generated_at": self.generated_at,
            "mission": self.mission,
            "culture_values": self.culture_values,
            "tech_stack": self.tech_stack,
            "recent_news": self.recent_news,
            "interview_style": self.interview_style,
            "common_questions": self.common_questions,
            "bar_raiser_tips": self.bar_raiser_tips,
            "red_flags_to_avoid": self.red_flags_to_avoid,
            "talking_points": self.talking_points,
            "values_alignment": self.values_alignment,
            "comp_range": self.comp_range,
            "negotiation_tips": self.negotiation_tips,
        }

    def to_research_prompt(self) -> str:
        """Convert pack into a prompt addendum for ws_voice/openai_service."""
        parts = []
        if self.mission:
            parts.append(f"Company Mission: {self.mission}")
        if self.culture_values:
            parts.append(f"Core Values: {', '.join(self.culture_values[:5])}")
        if self.interview_style:
            parts.append(f"Interview Style: {self.interview_style}")
        if self.talking_points:
            parts.append("Talking Points: " + "; ".join(self.talking_points[:4]))
        if self.red_flags_to_avoid:
            parts.append("Avoid: " + "; ".join(self.red_flags_to_avoid[:3]))
        if self.tech_stack:
            parts.append(f"Tech Stack: {', '.join(self.tech_stack[:6])}")
        return "\n".join(parts)


PACK_SYSTEM_PROMPT = """You are an expert interview coach with deep knowledge of tech company cultures, 
interview processes, and hiring patterns. Generate a structured company intelligence pack.

Return ONLY valid JSON with this exact structure:
{
  "mission": "one-line company mission",
  "culture_values": ["value1", "value2", "value3"],
  "tech_stack": ["tech1", "tech2"],
  "recent_news": ["news1", "news2"],
  "interview_style": "description of interview style",
  "common_questions": ["q1", "q2", "q3", "q4", "q5"],
  "bar_raiser_tips": ["tip1", "tip2", "tip3"],
  "red_flags_to_avoid": ["flag1", "flag2", "flag3"],
  "talking_points": ["point1", "point2", "point3"],
  "values_alignment": ["alignment1", "alignment2"],
  "comp_range": "estimated range for this role",
  "negotiation_tips": ["tip1", "tip2"]
}

Be specific and actionable. No generic advice."""


class CompanyPackEngine:
    """Generates and caches deep company intelligence packs."""

    def __init__(self):
        self._cache: dict[str, CompanyPack] = {}
        self._cache_ttl = 60 * 60 * 24 * 7  # 7 days

    def _cache_key(self, company: str, role: str = "") -> str:
        raw = f"{company.lower().strip()}:{role.lower().strip()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    async def generate_pack(
        self,
        company: str,
        role: str = "",
        jd_text: str = "",
    ) -> CompanyPack:
        """Generate a deep company intelligence pack."""
        key = self._cache_key(company, role)

        # Check cache
        cached = self._cache.get(key)
        if cached and (time.time() - cached.generated_at) < self._cache_ttl:
            return cached

        user_prompt = f"Company: {company}\n"
        if role:
            user_prompt += f"Target Role: {role}\n"
        if jd_text:
            user_prompt += f"Job Description:\n{jd_text[:1500]}\n"
        user_prompt += "\nGenerate the company intelligence pack."

        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": PACK_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.4,
                    max_tokens=1200,
                    response_format={"type": "json_object"},
                ),
                timeout=15.0,
            )

            raw = response.choices[0].message.content or "{}"
            data = json.loads(raw)

            pack = CompanyPack(company=company)
            pack.mission = str(data.get("mission", ""))
            pack.culture_values = list(data.get("culture_values", []))[:6]
            pack.tech_stack = list(data.get("tech_stack", []))[:8]
            pack.recent_news = list(data.get("recent_news", []))[:5]
            pack.interview_style = str(data.get("interview_style", ""))
            pack.common_questions = list(data.get("common_questions", []))[:8]
            pack.bar_raiser_tips = list(data.get("bar_raiser_tips", []))[:5]
            pack.red_flags_to_avoid = list(data.get("red_flags_to_avoid", []))[:5]
            pack.talking_points = list(data.get("talking_points", []))[:5]
            pack.values_alignment = list(data.get("values_alignment", []))[:4]
            pack.comp_range = str(data.get("comp_range", ""))
            pack.negotiation_tips = list(data.get("negotiation_tips", []))[:4]

            # Cache it
            self._cache[key] = pack
            if len(self._cache) > 200:
                oldest = min(self._cache, key=lambda k: self._cache[k].generated_at)
                del self._cache[oldest]

            logger.info("COMPANY_PACK_GENERATED | company=%s role=%s", company, role)
            return pack

        except Exception as e:
            logger.warning("Company pack generation failed: %s", e)
            return CompanyPack(company=company)

    def get_cached(self, company: str, role: str = "") -> Optional[CompanyPack]:
        """Get a cached pack without generating."""
        key = self._cache_key(company, role)
        cached = self._cache.get(key)
        if cached and (time.time() - cached.generated_at) < self._cache_ttl:
            return cached
        return None


def get_pack_engine() -> CompanyPackEngine:
    """Singleton factory."""
    if not hasattr(get_pack_engine, "_instance"):
        get_pack_engine._instance = CompanyPackEngine()
    return get_pack_engine._instance
