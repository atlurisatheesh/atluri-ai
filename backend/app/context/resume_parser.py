import json
import re

from app.ai_reasoning.llm import call_llm


class ResumeParser:
    async def parse(self, resume_text: str) -> dict:
        if not resume_text:
            return {}

        prompt = f"""
        Extract structured candidate profile from this resume.

        Return JSON with:
        - candidate_name
        - years_experience
        - primary_skills (list)
        - secondary_skills (list)
        - domains (list)
        - recent_roles (list)

        Resume:
        {resume_text}
        """

        raw = await call_llm(prompt)

        try:
            return json.loads(raw)
        except Exception:
            return {}

    def derive_skill_claims(self, resume_text: str, resume_profile: dict) -> dict:
        profile = dict(resume_profile or {})
        lower_resume = (resume_text or "").lower()

        primary = [s for s in profile.get("primary_skills", []) if isinstance(s, str) and s.strip()]
        secondary = [s for s in profile.get("secondary_skills", []) if isinstance(s, str) and s.strip()]
        recent_roles = [r for r in profile.get("recent_roles", []) if isinstance(r, str)]

        skill_claim_strength: dict[str, float] = {}
        leadership_claims: list[str] = []
        scale_indicators: list[str] = []

        years_mentions = [int(m.group(1)) for m in re.finditer(r"(\d+)\+?\s*(?:years|yrs)", lower_resume)]
        inferred_years = max(years_mentions) if years_mentions else int(profile.get("years_experience") or 0)

        for skill in primary:
            key = " ".join(skill.lower().split())
            base = 0.8
            if re.search(rf"\b(led|owned|architected|designed)\b[^.\n]*\b{re.escape(key)}\b", lower_resume):
                base += 0.1
            if re.search(rf"\b{re.escape(key)}\b[^.\n]*\b(critical|production|scale|million|clusters?)\b", lower_resume):
                base += 0.05
            skill_claim_strength[key] = round(min(1.0, base), 3)

        for skill in secondary:
            key = " ".join(skill.lower().split())
            base = 0.55
            if re.search(rf"\b{re.escape(key)}\b", lower_resume):
                base += 0.05
            skill_claim_strength[key] = round(min(1.0, max(skill_claim_strength.get(key, 0.0), base)), 3)

        leadership_keywords = ["lead", "managed", "mentored", "stakeholder", "owned"]
        for keyword in leadership_keywords:
            if re.search(rf"\b{keyword}\w*\b", lower_resume):
                leadership_claims.append(keyword)

        for match in re.finditer(r"(\d+\s*(?:m|million|k|thousand|clusters?|nodes?|services?))", lower_resume):
            scale_indicators.append(match.group(1))

        return {
            "skill_claim_strength": skill_claim_strength,
            "leadership_claims": sorted(set(leadership_claims)),
            "scale_indicators": sorted(set(scale_indicators)),
            "years_mentions": years_mentions,
            "inferred_years": inferred_years,
            "recent_roles": recent_roles,
        }
