import re


class AlignmentEngine:
    def _skill_present(self, answer_text: str, skill: str) -> bool:
        if not answer_text or not skill:
            return False

        lower_text = answer_text.lower()
        lower_skill = skill.lower().strip()
        if not lower_skill:
            return False

        pattern = r"(?<!\w)" + re.escape(lower_skill) + r"(?!\w)"
        return re.search(pattern, lower_text) is not None

    def compute_alignment(self, answer_text: str, jd_context: dict, resume_profile: dict = None) -> int:
        if not jd_context:
            return 0

        must_skills = jd_context.get("must_have_skills", [])
        nice_skills = jd_context.get("nice_to_have_skills", [])

        lower = (answer_text or "").lower()
        score = 0

        for skill in must_skills:
            if isinstance(skill, str) and self._skill_present(lower, skill):
                score += 10

        for skill in nice_skills:
            if isinstance(skill, str) and self._skill_present(lower, skill):
                score += 5

        if resume_profile:
            primary = resume_profile.get("primary_skills", []) or []
            secondary = resume_profile.get("secondary_skills", []) or []
            resume_skills = {
                s.lower() for s in primary + secondary if isinstance(s, str)
            }

            for skill in must_skills:
                if isinstance(skill, str):
                    skill_lower = skill.lower()
                    if skill_lower in resume_skills and self._skill_present(lower, skill):
                        score += 3

        return min(100, score)

    def get_resume_skills(self, resume_profile: dict) -> set[str]:
        if not resume_profile:
            return set()

        primary = resume_profile.get("primary_skills", []) or []
        secondary = resume_profile.get("secondary_skills", []) or []
        return {
            skill.strip().lower()
            for skill in primary + secondary
            if isinstance(skill, str) and skill.strip()
        }

    def get_missing_must_have_skills(self, answer_text: str, jd_context: dict, max_items: int = 3) -> list[str]:
        if not jd_context:
            return []

        must_skills = jd_context.get("must_have_skills", []) or []
        missing = []

        for skill in must_skills:
            if not isinstance(skill, str):
                continue
            if not self._skill_present(answer_text or "", skill):
                missing.append(skill)

        if max_items and max_items > 0:
            return missing[:max_items]
        return missing

    def prioritize_missing_skills(
        self,
        missing_skills: list[str],
        resume_profile: dict,
        max_items: int = 2,
    ) -> list[str]:
        if not missing_skills:
            return []

        resume_skills = self.get_resume_skills(resume_profile)
        resume_backed = [
            skill for skill in missing_skills
            if isinstance(skill, str) and skill.strip().lower() in resume_skills
        ]
        not_resume_backed = [
            skill for skill in missing_skills
            if isinstance(skill, str) and skill.strip().lower() not in resume_skills
        ]

        prioritized = resume_backed + not_resume_backed
        if max_items and max_items > 0:
            return prioritized[:max_items]
        return prioritized
