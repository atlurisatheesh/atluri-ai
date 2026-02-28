from __future__ import annotations

import re


class ClaimExtractor:
    CATEGORY_PATTERNS = {
        "LEADERSHIP": [r"\b(led|leading|managed|mentored|owned|coordinated|stakeholders?)\b"],
        "SCALE": [
            r"\b(\d+\s*(m|million|k|thousand|nodes?|clusters?|users?))\b",
            r"\b(at\s+scale|high\s+traffic|large\s+scale)\b",
            r"\btraffic\b",
        ],
        "DECISION": [r"\b(decided|chose|trade-?off|because|therefore|instead)\b"],
        "ARCHITECTURE": [r"\b(architecture|distributed|microservice|monolith|replication|failover|caching)\b"],
    }

    SUBJECT_KEYWORDS = {
        "Redis": ["redis"],
        "Kafka": ["kafka", "messaging", "queue", "event bus"],
        "Kubernetes": ["kubernetes", "k8s"],
        "Caching": ["cache", "caching"],
        "Leadership": ["led", "leading", "owned", "managed", "stakeholder", "mentored"],
        "Scale": ["scale", "scaled", "million", "traffic", "throughput"],
        "Architecture": ["architecture", "distributed", "microservice", "monolith"],
    }

    ASSERTIVE_PATTERNS = [
        r"\b(always|definitely|absolutely|clearly|guaranteed|never failed)\b",
    ]

    MAX_CLAIMS_PER_TURN = 5

    def _dedupe(self, values: list[dict]) -> list[dict]:
        seen = set()
        out = []
        for item in values:
            key = (item.get("category"), item.get("subject", "").lower(), item.get("assertion", "").lower())
            if key in seen:
                continue
            seen.add(key)
            out.append(item)
        return out

    def _extract_skill_claims(self, answer_text: str, skill_names: list[str]) -> list[dict]:
        lower = (answer_text or "").lower()
        claims: list[dict] = []

        for skill in skill_names:
            s = (skill or "").strip()
            if not s:
                continue
            pattern = r"(?<!\w)" + re.escape(s.lower()) + r"(?!\w)"
            if re.search(pattern, lower):
                claims.append(
                    {
                        "category": "TOOL",
                        "subject": s,
                        "assertion": f"Used or discussed {s}",
                        "metadata": {
                            "source": "skill_match",
                            "has_specifics": True,
                            "evolution": False,
                        },
                    }
                )
        return claims

    def _detect_subjects(self, text: str) -> list[str]:
        lower = (text or "").lower()
        subjects = []
        for subject, keys in self.SUBJECT_KEYWORDS.items():
            if any(k in lower for k in keys):
                subjects.append(subject)
        return subjects

    def _negation(self, text: str) -> bool:
        lower = (text or "").lower()
        return any(t in lower for t in [" not ", " never ", "didn't", "didnt", "without ", " no "])

    def _has_specifics(self, text: str) -> bool:
        lower = (text or "").lower()
        has_number = bool(re.search(r"\b\d+(\.\d+)?\b", lower))
        has_metric = any(k in lower for k in ["%", "latency", "throughput", "availability", "downtime", "ms"])
        return has_number or has_metric

    def _is_assertive(self, text: str) -> bool:
        lower = (text or "").lower()
        return any(re.search(pattern, lower) for pattern in self.ASSERTIVE_PATTERNS)

    def _is_evolution(self, text: str) -> bool:
        lower = (text or "").lower()
        return any(
            k in lower
            for k in [
                "replaced",
                "migrated",
                "switched",
                "moved to",
                "later we",
                "eventually",
                "then we",
            ]
        )

    def _subjects_for_category(self, category: str, detected_subjects: list[str]) -> list[str]:
        if not detected_subjects:
            fallback = {
                "LEADERSHIP": ["Leadership"],
                "SCALE": ["Scale"],
                "DECISION": ["Decision"],
                "ARCHITECTURE": ["Architecture"],
            }
            return fallback.get(category, [category.title()])

        if category == "LEADERSHIP":
            picked = [s for s in detected_subjects if s == "Leadership"]
            return picked or ["Leadership"]

        if category == "SCALE":
            picked = [s for s in detected_subjects if s == "Scale"]
            return picked or ["Scale"]

        if category in {"ARCHITECTURE", "DECISION"}:
            architecture_subjects = {"Redis", "Kafka", "Kubernetes", "Caching", "Architecture"}
            picked = [s for s in detected_subjects if s in architecture_subjects]
            return picked[:2] or ["Architecture"]

        return detected_subjects[:2]

    def _extract_pattern_claims(self, answer_text: str) -> list[dict]:
        text = (answer_text or "").strip()
        lower = text.lower()
        claims: list[dict] = []
        subjects = self._detect_subjects(text)
        assertive = self._is_assertive(text)
        specific = self._has_specifics(text)
        negated = self._negation(text)
        evolution = self._is_evolution(text)

        if len(text.split()) < 4:
            return claims

        for category, patterns in self.CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, lower):
                    subjects_for_category = self._subjects_for_category(category, subjects)
                    for subject in subjects_for_category:
                        claims.append(
                            {
                                "category": category,
                                "subject": subject,
                                "assertion": text,
                                "metadata": {
                                    "source": "pattern",
                                    "negated": negated,
                                    "assertive": assertive,
                                    "has_specifics": specific,
                                    "evolution": evolution,
                                },
                            }
                        )
                    break

        return claims

    def extract(self, answer_text: str, skill_names: list[str]) -> list[dict]:
        claims = []
        claims.extend(self._extract_skill_claims(answer_text, skill_names))
        claims.extend(self._extract_pattern_claims(answer_text))
        deduped = self._dedupe(claims)
        return deduped[: self.MAX_CLAIMS_PER_TURN]
