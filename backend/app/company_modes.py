COMPANY_MODES = {
    "general": {
        "label": "General",
        "chat_style": "balanced practical guidance",
        "interview_focus": "clear and structured answers",
    },
    "amazon": {
        "label": "Amazon",
        "chat_style": "ownership, metrics, and customer impact",
        "interview_focus": "Leadership Principles, trade-offs, and measurable outcomes",
    },
    "google": {
        "label": "Google",
        "chat_style": "problem decomposition, fundamentals, and clarity",
        "interview_focus": "structured reasoning, algorithmic rigor, and collaboration",
    },
    "meta": {
        "label": "Meta",
        "chat_style": "execution speed, impact, and cross-functional influence",
        "interview_focus": "product impact, ambiguity handling, and scaling decisions",
    },
    "microsoft": {
        "label": "Microsoft",
        "chat_style": "customer obsession, platform thinking, and pragmatic delivery",
        "interview_focus": "collaboration, architecture clarity, and measurable outcomes",
    },
    "apple": {
        "label": "Apple",
        "chat_style": "precision, craftsmanship, and end-user quality",
        "interview_focus": "attention to detail, performance, and cross-stack ownership",
    },
    "netflix": {
        "label": "Netflix",
        "chat_style": "high ownership, judgment, and business impact",
        "interview_focus": "senior-level trade-offs, scale reliability, and candid communication",
    },
    "uber": {
        "label": "Uber",
        "chat_style": "operational excellence, speed, and real-world constraints",
        "interview_focus": "system reliability, marketplace thinking, and execution under pressure",
    },
    "stripe": {
        "label": "Stripe",
        "chat_style": "developer empathy, correctness, and financial rigor",
        "interview_focus": "API design, security, and dependable systems",
    },
    "atlassian": {
        "label": "Atlassian",
        "chat_style": "team effectiveness, clarity, and long-term maintainability",
        "interview_focus": "collaboration patterns, product mindset, and scalable engineering",
    },
    "linkedin": {
        "label": "LinkedIn",
        "chat_style": "member value, trust, and marketplace impact",
        "interview_focus": "data-informed decisions, platform reliability, and cross-team execution",
    },
    "salesforce": {
        "label": "Salesforce",
        "chat_style": "customer success, enterprise scale, and platform consistency",
        "interview_focus": "multi-tenant architecture, integrations, and secure product delivery",
    },
    "oracle": {
        "label": "Oracle",
        "chat_style": "enterprise robustness, performance, and operational control",
        "interview_focus": "database fundamentals, distributed systems, and reliability engineering",
    },
    "adobe": {
        "label": "Adobe",
        "chat_style": "creative workflows, product polish, and measurable user outcomes",
        "interview_focus": "product craftsmanship, experimentation, and scalable services",
    },
    "nvidia": {
        "label": "NVIDIA",
        "chat_style": "performance optimization, systems thinking, and technical depth",
        "interview_focus": "parallelism, infrastructure scale, and architecture trade-offs",
    },
    "intel": {
        "label": "Intel",
        "chat_style": "engineering rigor, efficiency, and reliability",
        "interview_focus": "low-level performance, systems constraints, and validation discipline",
    },
    "ibm": {
        "label": "IBM",
        "chat_style": "enterprise transformation, resilience, and governance",
        "interview_focus": "hybrid-cloud architecture, integration, and operational excellence",
    },
    "cisco": {
        "label": "Cisco",
        "chat_style": "network reliability, security posture, and customer outcomes",
        "interview_focus": "distributed networking systems, troubleshooting, and scale",
    },
    "tesla": {
        "label": "Tesla",
        "chat_style": "first-principles thinking, velocity, and product execution",
        "interview_focus": "end-to-end ownership, optimization, and rapid iteration",
    },
    "airbnb": {
        "label": "Airbnb",
        "chat_style": "community trust, product quality, and platform impact",
        "interview_focus": "full-stack decisions, experimentation, and marketplace dynamics",
    },
    "doordash": {
        "label": "DoorDash",
        "chat_style": "operational problem-solving and local-market impact",
        "interview_focus": "logistics systems, latency, and experimentation at scale",
    },
    "spotify": {
        "label": "Spotify",
        "chat_style": "user delight, iterative product learning, and platform simplicity",
        "interview_focus": "data-driven product engineering and resilient microservices",
    },
    "shopify": {
        "label": "Shopify",
        "chat_style": "merchant outcomes, simplicity, and practical execution",
        "interview_focus": "developer experience, scale for SMBs, and product reliability",
    },
    "dropbox": {
        "label": "Dropbox",
        "chat_style": "clarity, reliability, and user trust",
        "interview_focus": "storage systems, sync consistency, and product performance",
    },
    "uber_eats": {
        "label": "Uber Eats",
        "chat_style": "marketplace operations and growth execution",
        "interview_focus": "dispatch optimization, service quality, and scalable operations",
    },
    "lyft": {
        "label": "Lyft",
        "chat_style": "safety, marketplace balance, and pragmatic scaling",
        "interview_focus": "real-time systems, reliability, and rider-driver economics",
    },
    "databricks": {
        "label": "Databricks",
        "chat_style": "data platform thinking, performance, and productionization",
        "interview_focus": "distributed compute, data pipelines, and platform architecture",
    },
    "snowflake": {
        "label": "Snowflake",
        "chat_style": "cloud-native data engineering and operational simplicity",
        "interview_focus": "query performance, data sharing, and resilient architecture",
    },
    "mongodb": {
        "label": "MongoDB",
        "chat_style": "developer-first design and scalable data operations",
        "interview_focus": "data modeling, indexing strategies, and reliability trade-offs",
    },
    "palantir": {
        "label": "Palantir",
        "chat_style": "mission outcomes, systems integration, and analytical rigor",
        "interview_focus": "problem framing, stakeholder context, and end-to-end delivery",
    },
    "servicenow": {
        "label": "ServiceNow",
        "chat_style": "enterprise workflow impact and platform consistency",
        "interview_focus": "automation design, platform extensibility, and reliability",
    },
    "sap": {
        "label": "SAP",
        "chat_style": "enterprise process reliability and business alignment",
        "interview_focus": "integration architecture, data consistency, and scalable systems",
    },
    "workday": {
        "label": "Workday",
        "chat_style": "enterprise trust, product quality, and execution discipline",
        "interview_focus": "platform architecture, data integrity, and service resilience",
    },
    "zoom": {
        "label": "Zoom",
        "chat_style": "real-time experience quality and global reliability",
        "interview_focus": "low-latency architecture, media quality, and scale operations",
    },
    "slack": {
        "label": "Slack",
        "chat_style": "communication clarity, product usability, and iteration speed",
        "interview_focus": "real-time messaging systems, integrations, and reliability",
    },
}


def normalize_company_mode(mode: str | None) -> str:
    candidate = str(mode or "general").strip().lower()
    return candidate if candidate in COMPANY_MODES else "general"


def get_company_mode_prompt(mode: str | None) -> str:
    normalized = normalize_company_mode(mode)
    preset = COMPANY_MODES[normalized]
    return (
        f"Company mode: {preset['label']}. "
        f"Bias guidance toward {preset['chat_style']}. "
        f"For interview prep, emphasize {preset['interview_focus']}."
    )


def list_company_modes() -> list[dict[str, str]]:
    general = COMPANY_MODES.get("general", {})
    items: list[dict[str, str]] = [
        {
            "id": "general",
            "label": str(general.get("label") or "General"),
            "chat_style": str(general.get("chat_style") or "balanced practical guidance"),
            "interview_focus": str(general.get("interview_focus") or "clear and structured answers"),
        }
    ]

    others = [
        (key, value)
        for key, value in COMPANY_MODES.items()
        if key != "general"
    ]
    others.sort(key=lambda pair: str((pair[1] or {}).get("label") or pair[0]).lower())

    for key, value in others:
        payload = value if isinstance(value, dict) else {}
        items.append({
            "id": key,
            "label": str(payload.get("label") or key.title()),
            "chat_style": str(payload.get("chat_style") or ""),
            "interview_focus": str(payload.get("interview_focus") or ""),
        })

    return items
