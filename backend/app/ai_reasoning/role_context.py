class RoleContextBuilder:

    def from_ui_role(self, role_name: str):
        role_name = (role_name or "").lower()

        if "devops" in role_name:
            return {
                "focus": "infrastructure",
                "skill_keywords": ["aws", "kubernetes", "terraform", "docker", "ci/cd"],
                "weights": {
                    "clarity": 0.25,
                    "depth": 0.35,
                    "structure": 0.25,
                    "confidence": 0.15,
                },
            }

        if "backend" in role_name:
            return {
                "focus": "architecture",
                "skill_keywords": ["api", "database", "scaling", "microservice", "design"],
                "weights": {
                    "clarity": 0.30,
                    "depth": 0.30,
                    "structure": 0.30,
                    "confidence": 0.10,
                },
            }

        return {
            "focus": "general",
            "skill_keywords": [],
            "weights": {
                "clarity": 0.30,
                "depth": 0.30,
                "structure": 0.25,
                "confidence": 0.15,
            },
        }
