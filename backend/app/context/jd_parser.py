import json
import re

from app.ai_reasoning.llm import call_llm


class JDParser:
    async def parse(self, jd_text: str) -> dict:
        if not jd_text:
            return {}

        prompt = f"""
        Extract structured hiring criteria from this job description.

        Return JSON with:
        - role_title
        - seniority_level
        - must_have_skills (list)
        - nice_to_have_skills (list)
        - primary_focus_area (e.g., backend, devops, data, frontend)
        - key_responsibilities (list)

        Job Description:
        {jd_text}
        """

        raw = await call_llm(prompt)

        try:
            return json.loads(raw)
        except Exception:
            return {}

    def derive_skill_requirements(self, jd_text: str, jd_context: dict) -> dict:
        context = dict(jd_context or {})
        must = [s for s in context.get("must_have_skills", []) if isinstance(s, str) and s.strip()]
        nice = [s for s in context.get("nice_to_have_skills", []) if isinstance(s, str) and s.strip()]

        lower_jd = (jd_text or "").lower()
        seniority = str(context.get("seniority_level") or "").lower()

        if "staff" in seniority or "principal" in seniority:
            base_depth = 5
        elif "senior" in seniority or "lead" in seniority:
            base_depth = 4
        elif "mid" in seniority:
            base_depth = 3
        elif "junior" in seniority:
            base_depth = 2
        else:
            base_depth = 3

        required_skill_weights: dict[str, float] = {}
        required_skill_depth: dict[str, int] = {}

        for idx, skill in enumerate(must):
            normalized = " ".join(skill.lower().split())
            emphasis = 0.0
            if re.search(rf"\b(strong|expert|advanced)\b[^.\n]*\b{re.escape(normalized)}\b", lower_jd):
                emphasis += 0.1
            if re.search(rf"\b{re.escape(normalized)}\b[^.\n]*\b(at\s+scale|distributed|architecture|design)\b", lower_jd):
                emphasis += 0.1

            required_skill_weights[normalized] = round(max(0.35, min(1.0, (1.0 - (idx * 0.1)) + emphasis)), 3)
            required_skill_depth[normalized] = max(1, min(5, base_depth + (1 if emphasis >= 0.1 else 0)))

        for idx, skill in enumerate(nice):
            normalized = " ".join(skill.lower().split())
            required_skill_weights.setdefault(normalized, round(max(0.15, 0.45 - (idx * 0.05)), 3))
            required_skill_depth.setdefault(normalized, max(1, base_depth - 1))

        return {
            "required_skill_weights": required_skill_weights,
            "required_skill_depth": required_skill_depth,
            "base_depth_expected": base_depth,
        }
