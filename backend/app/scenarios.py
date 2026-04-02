"""
Scenario System — Role-specific interview scenarios with prompts, question banks,
and evaluation criteria.  Mirrors company_modes.py in shape so the rest of the
stack can consume it identically.
"""

from __future__ import annotations

# ────────────────────────────────────────────────────────────────────
# CATEGORIES  (used for grouping in the UI)
# ────────────────────────────────────────────────────────────────────
SCENARIO_CATEGORIES = [
    {"id": "engineering", "label": "Engineering", "icon": "💻"},
    {"id": "design", "label": "System Design", "icon": "🏗️"},
    {"id": "behavioral", "label": "Behavioral & Leadership", "icon": "🧠"},
    {"id": "product", "label": "Product & Strategy", "icon": "📊"},
    {"id": "data", "label": "Data & ML", "icon": "📈"},
    {"id": "management", "label": "Management", "icon": "👔"},
    {"id": "specialized", "label": "Specialized Roles", "icon": "🔒"},
    {"id": "ai_ml", "label": "AI & Machine Learning", "icon": "🤖"},
    {"id": "security_cyber", "label": "Security & Cyber", "icon": "🛡️"},
    {"id": "creative", "label": "Creative & Design", "icon": "🎨"},
    {"id": "emerging_tech", "label": "Emerging Tech", "icon": "🚀"},
    {"id": "business", "label": "Business & Operations", "icon": "💼"},
    {"id": "infrastructure", "label": "Infrastructure & Cloud", "icon": "☁️"},
]

# ────────────────────────────────────────────────────────────────────
# SCENARIOS  — each entry is a complete interview scenario definition
# ────────────────────────────────────────────────────────────────────
SCENARIOS: dict[str, dict] = {
    # ─── ENGINEERING ──────────────────────────────────────────────
    "sde_fullstack": {
        "label": "Full-Stack SDE Loop",
        "category": "engineering",
        "description": "End-to-end software engineer loop covering coding, system design, and behavioral rounds — modeled after Big Tech on-site interviews.",
        "tags": ["full-stack", "sde", "coding", "on-site", "loop"],
        "system_prompt": (
            "You are a senior interviewer conducting a full-stack software engineer loop. "
            "Alternate between coding, system design, and behavioral questions. "
            "Probe for clean code, scalability thinking, and real project ownership."
        ),
        "question_bank": [
            "Given an array of intervals, merge all overlapping intervals and return the result.",
            "Design a REST API for a collaborative document editor with conflict resolution.",
            "Tell me about a production incident you owned end-to-end — what broke, how did you fix it, and what changed after?",
            "Implement an LRU cache that supports O(1) get and put.",
            "Walk me through how you would decompose a monolith into microservices for an e-commerce checkout.",
            "Describe a time you pushed back on a technical decision and what the outcome was.",
            "Write a function that finds the longest substring without repeating characters.",
            "How would you design the notification system for a social media app?",
        ],
        "evaluation_criteria": {
            "coding_correctness": {"weight": 0.25, "description": "Correct, efficient solutions with edge-case handling"},
            "system_design": {"weight": 0.25, "description": "Scalable architecture, trade-off awareness, failure modes"},
            "communication": {"weight": 0.20, "description": "Clear explanation, structured thinking"},
            "ownership": {"weight": 0.15, "description": "Real examples of end-to-end delivery"},
            "collaboration": {"weight": 0.15, "description": "Team dynamics, conflict resolution"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "system-design", "behavioral"],
    },

    "backend_engineer": {
        "label": "Backend Engineer",
        "category": "engineering",
        "description": "Backend-focused interview covering APIs, databases, concurrency, and distributed systems.",
        "tags": ["backend", "api", "databases", "concurrency", "distributed"],
        "system_prompt": (
            "You are interviewing a backend engineer. Focus on API design, database modeling, "
            "concurrency patterns, caching strategies, and production reliability. "
            "Expect concrete examples with latency numbers and failure handling."
        ),
        "question_bank": [
            "Design a rate limiter that works across a distributed cluster of API servers.",
            "Explain the trade-offs between SQL and NoSQL for a high-write analytics pipeline.",
            "How would you handle a database migration on a table with 500M rows and zero downtime?",
            "Implement a thread-safe producer-consumer queue.",
            "Walk me through your approach to debugging a memory leak in a production service.",
            "Design the data model and API for a permission system supporting roles, groups, and inheritance.",
            "How do you ensure exactly-once processing in an event-driven architecture?",
        ],
        "evaluation_criteria": {
            "technical_depth": {"weight": 0.30, "description": "Deep understanding of backend fundamentals"},
            "system_design": {"weight": 0.25, "description": "Scalable and reliable architecture decisions"},
            "problem_solving": {"weight": 0.20, "description": "Structured debugging and root cause analysis"},
            "production_mindset": {"weight": 0.15, "description": "Monitoring, alerting, graceful degradation"},
            "communication": {"weight": 0.10, "description": "Clear explanation of complex concepts"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "system-design"],
    },

    "frontend_engineer": {
        "label": "Frontend Engineer",
        "category": "engineering",
        "description": "Frontend-focused interview covering UI architecture, performance, accessibility, and state management.",
        "tags": ["frontend", "react", "css", "performance", "accessibility", "ui"],
        "system_prompt": (
            "You are interviewing a frontend engineer. Focus on component architecture, "
            "rendering performance, accessibility, state management, and browser internals. "
            "Ask candidates to reason about UI trade-offs and user experience."
        ),
        "question_bank": [
            "Design a virtualized list component that renders 100K rows smoothly.",
            "Explain the React reconciliation algorithm and when it breaks down.",
            "How would you build a drag-and-drop interface that works across touch and mouse?",
            "Walk me through your approach to making a complex dashboard accessible (WCAG AA).",
            "Implement debounce and throttle from scratch — explain when you'd use each.",
            "How do you handle state management in a large application with shared state across routes?",
            "Describe a time you improved web performance significantly — what metrics moved and by how much?",
        ],
        "evaluation_criteria": {
            "ui_architecture": {"weight": 0.25, "description": "Component design, state patterns, re-render optimization"},
            "browser_fundamentals": {"weight": 0.20, "description": "Event loop, rendering pipeline, network"},
            "performance": {"weight": 0.20, "description": "Core Web Vitals awareness, bundle optimization"},
            "accessibility": {"weight": 0.15, "description": "ARIA, keyboard navigation, screen readers"},
            "communication": {"weight": 0.20, "description": "Clear reasoning about UI trade-offs"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "system-design"],
    },

    "mobile_engineer": {
        "label": "Mobile Engineer (iOS/Android)",
        "category": "engineering",
        "description": "Mobile-focused interview covering platform-specific architecture, performance, and offline-first patterns.",
        "tags": ["mobile", "ios", "android", "swift", "kotlin", "react-native"],
        "system_prompt": (
            "You are interviewing a mobile engineer. Cover app architecture (MVVM/MVI), "
            "lifecycle management, offline storage, performance profiling, and platform "
            "guidelines. Probe for real shipping experience and crash-free rate thinking."
        ),
        "question_bank": [
            "How would you architect an offline-first mobile app with sync conflict resolution?",
            "Explain the iOS app lifecycle and how you handle state restoration.",
            "Design a smooth infinite-scroll feed with image caching and prefetching.",
            "How do you approach reducing app startup time below 1 second?",
            "Walk me through debugging an ANR / main-thread freeze in production.",
            "Describe your approach to A/B testing features in a mobile release cycle.",
            "How would you implement end-to-end encryption for a messaging app on mobile?",
        ],
        "evaluation_criteria": {
            "platform_knowledge": {"weight": 0.25, "description": "Deep iOS/Android platform understanding"},
            "architecture": {"weight": 0.25, "description": "Clean architecture, dependency injection, testability"},
            "performance": {"weight": 0.20, "description": "Memory, battery, rendering optimization"},
            "shipping_experience": {"weight": 0.15, "description": "Release process, rollback, monitoring"},
            "communication": {"weight": 0.15, "description": "Clear articulation of mobile-specific trade-offs"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "system-design"],
    },

    "devops_sre": {
        "label": "DevOps / SRE",
        "category": "engineering",
        "description": "Site reliability and DevOps interview covering CI/CD, infrastructure as code, incident management, and observability.",
        "tags": ["devops", "sre", "infrastructure", "ci/cd", "kubernetes", "terraform"],
        "system_prompt": (
            "You are interviewing a DevOps / SRE engineer. Focus on CI/CD pipeline design, "
            "infrastructure automation, incident response, SLO/SLA management, and "
            "observability. Expect candidates to discuss real outage experiences."
        ),
        "question_bank": [
            "Design a CI/CD pipeline for a microservices architecture with canary deployments.",
            "How do you manage Terraform state across multiple teams without conflicts?",
            "Walk me through your incident response process for a P1 outage at 3 AM.",
            "Design an observability stack for a 200-service Kubernetes cluster.",
            "How would you implement zero-downtime database migrations in a containerized environment?",
            "Explain how you set and maintain SLOs — give a concrete example with error budgets.",
            "Describe a time you reduced deployment lead time significantly — what changed?",
        ],
        "evaluation_criteria": {
            "infrastructure_design": {"weight": 0.25, "description": "IaC, networking, security posture"},
            "reliability_thinking": {"weight": 0.25, "description": "SLOs, error budgets, failure domains"},
            "incident_response": {"weight": 0.20, "description": "Triage speed, communication, postmortem quality"},
            "automation": {"weight": 0.15, "description": "CI/CD, GitOps, self-healing systems"},
            "communication": {"weight": 0.15, "description": "Clear escalation and stakeholder updates"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design", "behavioral"],
    },

    # ─── SYSTEM DESIGN ────────────────────────────────────────────
    "system_design_deep": {
        "label": "System Design Deep Dive",
        "category": "design",
        "description": "Dedicated system design interview — whiteboard-style, focusing on scalability, trade-offs, and failure modes for large-scale systems.",
        "tags": ["system-design", "architecture", "scalability", "whiteboard", "distributed"],
        "system_prompt": (
            "You are a senior system design interviewer. Walk the candidate through designing "
            "a large-scale system. Probe requirements gathering, capacity estimation, data "
            "modeling, API design, scaling strategy, and failure handling. Push for concrete "
            "numbers and trade-off reasoning."
        ),
        "question_bank": [
            "Design a URL shortener that handles 1B redirects per day.",
            "Design Twitter's home timeline — how do you handle fan-out for users with 50M followers?",
            "Design a real-time collaborative document editor like Google Docs.",
            "Design a distributed task scheduler that handles 10M jobs per hour with at-least-once guarantees.",
            "Design a global CDN with cache invalidation for a video streaming platform.",
            "Design a payment processing system with exactly-once transaction guarantees.",
            "Design an ad-serving system that selects and renders ads within 50ms at 100K QPS.",
        ],
        "evaluation_criteria": {
            "requirements_gathering": {"weight": 0.15, "description": "Clarifies scope, constraints, and scale"},
            "high_level_design": {"weight": 0.25, "description": "Clean component breakdown and data flow"},
            "deep_dive": {"weight": 0.25, "description": "Detailed design of critical components"},
            "trade_offs": {"weight": 0.20, "description": "Explicit trade-off reasoning with alternatives"},
            "scalability": {"weight": 0.15, "description": "Capacity math, bottleneck identification"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design"],
    },

    "api_design": {
        "label": "API Design Review",
        "category": "design",
        "description": "Focused API design interview covering RESTful principles, GraphQL, versioning, error handling, and developer experience.",
        "tags": ["api", "rest", "graphql", "design", "developer-experience"],
        "system_prompt": (
            "You are interviewing for API design skills. Focus on REST/GraphQL principles, "
            "resource modeling, pagination, error contracts, versioning strategy, and "
            "backward compatibility. Evaluate developer empathy and documentation thinking."
        ),
        "question_bank": [
            "Design the API for a multi-tenant SaaS project management tool.",
            "How would you evolve an API from v1 to v2 without breaking existing clients?",
            "Design a GraphQL schema for an e-commerce platform — how do you handle N+1 queries?",
            "Walk me through your approach to API error handling and status code design.",
            "How would you design a webhook system with retry logic and delivery guarantees?",
            "Design a real-time API (WebSocket vs SSE vs polling) for a stock trading dashboard.",
        ],
        "evaluation_criteria": {
            "api_principles": {"weight": 0.30, "description": "REST/GraphQL best practices, resource modeling"},
            "developer_experience": {"weight": 0.25, "description": "Discoverability, documentation, error clarity"},
            "scalability": {"weight": 0.20, "description": "Pagination, rate limiting, caching headers"},
            "evolution": {"weight": 0.15, "description": "Versioning, deprecation, backward compatibility"},
            "communication": {"weight": 0.10, "description": "Clear reasoning about design choices"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design"],
    },

    # ─── BEHAVIORAL & LEADERSHIP ──────────────────────────────────
    "behavioral_star": {
        "label": "Behavioral (STAR Deep Dive)",
        "category": "behavioral",
        "description": "Pure behavioral interview focusing on STAR-format stories covering conflict, failure, leadership, and impact.",
        "tags": ["behavioral", "star", "conflict", "leadership", "failure"],
        "system_prompt": (
            "You are a behavioral interviewer. Ask questions that require specific, real "
            "examples using the STAR framework. Probe deeply into Situation, Task, Action, "
            "and Result. Challenge vague answers by asking for concrete numbers, names of "
            "outcomes, and what the candidate specifically did vs. the team."
        ),
        "question_bank": [
            "Tell me about a time you had to make a difficult decision without complete information.",
            "Describe a situation where you strongly disagreed with your team's direction. What did you do?",
            "Give me an example of a time you failed at something important. What did you learn?",
            "Tell me about a project where you had to influence people without direct authority.",
            "Describe the most impactful technical or process improvement you drove and how you measured success.",
            "Tell me about a time you received tough feedback. How did you respond?",
            "Walk me through a situation where you had to balance shipping fast with maintaining quality.",
            "Describe a time you mentored someone and the measurable impact it had.",
        ],
        "evaluation_criteria": {
            "specificity": {"weight": 0.25, "description": "Concrete real examples, not hypotheticals"},
            "star_structure": {"weight": 0.25, "description": "Clear Situation → Task → Action → Result flow"},
            "self_awareness": {"weight": 0.20, "description": "Honest reflection, growth from failures"},
            "impact": {"weight": 0.15, "description": "Measurable outcomes and business impact"},
            "communication": {"weight": 0.15, "description": "Concise, engaging storytelling"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral"],
    },

    "leadership_principles": {
        "label": "Leadership Principles",
        "category": "behavioral",
        "description": "Leadership-focused interview inspired by Amazon LP style — probes ownership, bias for action, customer obsession, and disagree-and-commit.",
        "tags": ["leadership", "amazon-lp", "ownership", "customer-obsession", "disagree-commit"],
        "system_prompt": (
            "You are a bar-raiser interviewer focused on leadership principles. Probe for "
            "Customer Obsession, Ownership, Bias for Action, Disagree and Commit, "
            "Deliver Results, and Dive Deep. Expect concrete data points and insist on "
            "separating individual contribution from team outcomes."
        ),
        "question_bank": [
            "Tell me about a time you went above and beyond for a customer or user even when it wasn't in scope.",
            "Describe a situation where you took ownership of a failing project that wasn't yours.",
            "Give me an example of a time you had to disagree and commit. What was the outcome?",
            "Tell me about a decision you made with incomplete data that turned out well. What was your reasoning?",
            "Describe a time you dove deep into metrics or data to uncover a non-obvious problem.",
            "Walk me through a time you delivered results under extreme pressure — what trade-offs did you make?",
            "Tell me about building or hiring for a high-performing team. How did you raise the bar?",
            "Describe a time you simplified a process or system that was overly complex.",
        ],
        "evaluation_criteria": {
            "ownership": {"weight": 0.25, "description": "End-to-end accountability, beyond job description"},
            "customer_impact": {"weight": 0.20, "description": "User/customer outcome driving decisions"},
            "data_driven": {"weight": 0.20, "description": "Metrics, measurement, evidence-based decisions"},
            "bias_for_action": {"weight": 0.15, "description": "Speed, calculated risk-taking"},
            "communication": {"weight": 0.20, "description": "Crisp storytelling with clear takeaways"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["behavioral", "leadership"],
    },

    # ─── PRODUCT & STRATEGY ───────────────────────────────────────
    "product_manager": {
        "label": "Product Manager",
        "category": "product",
        "description": "PM interview covering product sense, metrics, prioritization, strategy, and cross-functional execution.",
        "tags": ["product", "pm", "strategy", "metrics", "prioritization"],
        "system_prompt": (
            "You are interviewing a Product Manager. Cover product sense (designing new "
            "features), metrics definition, prioritization frameworks, go-to-market, and "
            "stakeholder management. Push for crisp frameworks and concrete examples."
        ),
        "question_bank": [
            "How would you improve Instagram Stories for creators? Walk me through your approach.",
            "Define the north-star metric for a food delivery app and the supporting metrics tree.",
            "You have 3 engineers for 1 quarter — how do you prioritize between tech debt, a new feature, and a growth experiment?",
            "Tell me about a product launch you led — what went well and what would you change?",
            "Design a new feature for LinkedIn that increases recruiter engagement by 20%.",
            "How would you evaluate whether to build, buy, or partner for a payments integration?",
            "Walk me through how you run a product review with engineering and design.",
        ],
        "evaluation_criteria": {
            "product_sense": {"weight": 0.25, "description": "User empathy, problem framing, creative solutions"},
            "analytical_rigor": {"weight": 0.25, "description": "Metrics, data-informed prioritization"},
            "strategy": {"weight": 0.20, "description": "Market awareness, competitive positioning"},
            "execution": {"weight": 0.15, "description": "Roadmap clarity, stakeholder management"},
            "communication": {"weight": 0.15, "description": "Structured frameworks, crisp delivery"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    "product_design": {
        "label": "Product Design (UX)",
        "category": "product",
        "description": "Product design interview covering user research, information architecture, design critique, and design systems.",
        "tags": ["design", "ux", "user-research", "information-architecture", "design-systems"],
        "system_prompt": (
            "You are interviewing a Product Designer / UX lead. Evaluate user research "
            "methodology, information architecture, interaction patterns, design critique "
            "skills, and design system thinking. Ask the candidate to reason through "
            "real design problems step by step."
        ),
        "question_bank": [
            "Redesign the checkout flow for an e-commerce app to reduce cart abandonment.",
            "How would you conduct user research for a new feature with 0 existing data?",
            "Critique a design you've shipped — what would you change with hindsight?",
            "Design an onboarding experience for a complex B2B analytics tool.",
            "How do you balance design consistency (design system) with page-specific creativity?",
            "Walk me through your design process from ambiguous problem to shipped solution.",
        ],
        "evaluation_criteria": {
            "user_empathy": {"weight": 0.25, "description": "Understanding of user needs and pain points"},
            "design_process": {"weight": 0.25, "description": "Structured approach from research to delivery"},
            "visual_interaction": {"weight": 0.20, "description": "UI craft, interaction design quality"},
            "systems_thinking": {"weight": 0.15, "description": "Design system, scalability of patterns"},
            "communication": {"weight": 0.15, "description": "Articulating design rationale and trade-offs"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    # ─── DATA & ML ────────────────────────────────────────────────
    "data_science": {
        "label": "Data Scientist / ML Engineer",
        "category": "data",
        "description": "Data science interview covering statistics, ML modeling, feature engineering, experiment design, and production ML.",
        "tags": ["data-science", "ml", "statistics", "experiments", "modeling"],
        "system_prompt": (
            "You are interviewing a Data Scientist / ML Engineer. Cover probability & "
            "statistics, ML modeling (supervised/unsupervised), feature engineering, "
            "A/B testing & experiment design, and model deployment. Push for mathematical "
            "rigor and real-world deployment experience."
        ),
        "question_bank": [
            "Design an ML system to detect fraudulent transactions in real time with < 100ms latency.",
            "How would you design an A/B test to measure the impact of a new recommendation algorithm?",
            "Explain the bias-variance trade-off and how you manage it in practice.",
            "Walk me through feature engineering for a churn prediction model — what signals would you use?",
            "How do you handle class imbalance in a dataset with 0.1% positive rate?",
            "Design a content recommendation system for a news app with 10M daily users.",
            "Tell me about a model you deployed to production — how did you monitor and retrain it?",
        ],
        "evaluation_criteria": {
            "statistical_rigor": {"weight": 0.25, "description": "Sound probability, hypothesis testing, causal inference"},
            "ml_depth": {"weight": 0.25, "description": "Model selection, training, evaluation methodology"},
            "engineering": {"weight": 0.20, "description": "Feature pipelines, model serving, monitoring"},
            "business_impact": {"weight": 0.15, "description": "Connecting ML outcomes to business metrics"},
            "communication": {"weight": 0.15, "description": "Explaining complex concepts to non-technical stakeholders"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "system-design"],
    },

    "data_engineer": {
        "label": "Data Engineer",
        "category": "data",
        "description": "Data engineering interview covering pipelines, warehousing, streaming, data quality, and orchestration.",
        "tags": ["data-engineering", "pipelines", "spark", "warehouse", "streaming"],
        "system_prompt": (
            "You are interviewing a Data Engineer. Focus on ETL/ELT pipeline design, "
            "data warehousing (star schema, slowly changing dimensions), streaming "
            "architectures (Kafka, Flink), data quality frameworks, and orchestration "
            "(Airflow, Dagster). Expect production-scale thinking."
        ),
        "question_bank": [
            "Design a data pipeline that ingests 10TB/day of clickstream data into a warehouse.",
            "How would you design a slowly changing dimension (SCD Type 2) for a customer table?",
            "Walk me through debugging a Spark job that's running 10x slower than expected.",
            "Design a real-time streaming pipeline for fraud detection using Kafka and Flink.",
            "How do you implement data quality checks at each stage of a pipeline?",
            "Describe your approach to schema evolution in a data lake.",
        ],
        "evaluation_criteria": {
            "pipeline_design": {"weight": 0.30, "description": "Scalable, maintainable pipeline architecture"},
            "data_modeling": {"weight": 0.25, "description": "Warehouse design, schema modeling"},
            "debugging": {"weight": 0.20, "description": "Performance tuning, root-cause analysis"},
            "data_quality": {"weight": 0.15, "description": "Testing, validation, monitoring"},
            "communication": {"weight": 0.10, "description": "Clear articulation of complex data flows"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design", "coding"],
    },

    # ─── MANAGEMENT ───────────────────────────────────────────────
    "engineering_manager": {
        "label": "Engineering Manager",
        "category": "management",
        "description": "EM interview covering people management, technical strategy, delivery execution, and organizational design.",
        "tags": ["em", "manager", "people", "delivery", "strategy", "hiring"],
        "system_prompt": (
            "You are interviewing an Engineering Manager. Cover people management (hiring, "
            "performance reviews, coaching), technical strategy, delivery execution, "
            "cross-functional partnership, and organizational design. Push for concrete "
            "examples with team sizes, timelines, and measurable outcomes."
        ),
        "question_bank": [
            "How do you handle an underperforming engineer on your team? Walk me through a specific example.",
            "Describe how you've built and scaled a team from 3 to 15 engineers.",
            "Tell me about a time you had to make a build-vs-buy decision — how did you evaluate it?",
            "How do you balance tech debt reduction with feature delivery when leadership wants both?",
            "Walk me through how you run sprint planning and retrospectives.",
            "Describe a cross-team dependency that threatened your timeline — how did you resolve it?",
            "How do you create a culture of psychological safety on your team?",
            "Tell me about the most impactful organizational change you drove.",
        ],
        "evaluation_criteria": {
            "people_management": {"weight": 0.25, "description": "Hiring, coaching, difficult conversations"},
            "technical_judgment": {"weight": 0.20, "description": "Architecture decisions, tech strategy"},
            "delivery_execution": {"weight": 0.20, "description": "Planning, prioritization, shipping"},
            "organizational_design": {"weight": 0.15, "description": "Team structure, cross-team coordination"},
            "communication": {"weight": 0.20, "description": "Stakeholder management, executive presence"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["behavioral", "leadership"],
    },

    "technical_program_manager": {
        "label": "Technical Program Manager",
        "category": "management",
        "description": "TPM interview covering program execution, risk management, cross-team coordination, and technical communication.",
        "tags": ["tpm", "program-management", "risk", "coordination", "execution"],
        "system_prompt": (
            "You are interviewing a Technical Program Manager. Evaluate program planning, "
            "risk identification and mitigation, cross-team dependency management, "
            "executive communication, and technical depth sufficient to challenge engineers. "
            "Expect structured frameworks and real program examples."
        ),
        "question_bank": [
            "Walk me through how you would plan a 6-month platform migration across 8 teams.",
            "Describe a program that went off-track — how did you identify the risk and recover?",
            "How do you manage competing priorities across three VP-level stakeholders?",
            "Tell me about a time you had to cut scope to meet a deadline — how did you decide what to cut?",
            "How do you communicate status to executives vs. engineering teams differently?",
            "Describe your approach to dependency tracking across distributed teams.",
        ],
        "evaluation_criteria": {
            "program_planning": {"weight": 0.25, "description": "Milestone decomposition, resource planning"},
            "risk_management": {"weight": 0.25, "description": "Proactive risk identification and mitigation"},
            "stakeholder_management": {"weight": 0.20, "description": "Executive communication, alignment"},
            "technical_depth": {"weight": 0.15, "description": "Enough depth to challenge engineering decisions"},
            "communication": {"weight": 0.15, "description": "Crisp, structured updates and escalations"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral", "leadership"],
    },

    # ─── SPECIALIZED ──────────────────────────────────────────────
    "security_engineer": {
        "label": "Security Engineer",
        "category": "specialized",
        "description": "Security engineering interview covering threat modeling, secure coding, incident response, and compliance.",
        "tags": ["security", "appsec", "threat-modeling", "incident-response", "compliance"],
        "system_prompt": (
            "You are interviewing a Security Engineer. Cover threat modeling (STRIDE/DREAD), "
            "secure SDLC, vulnerability assessment, incident response, and compliance "
            "frameworks (SOC2, GDPR). Push for real-world experience with breaches, "
            "pentests, or security architecture decisions."
        ),
        "question_bank": [
            "Perform a threat model for a user authentication system with OAuth2 and MFA.",
            "How would you implement a secrets management solution for a microservices platform?",
            "Walk me through your incident response process for a suspected data breach.",
            "Design a security review process for a CI/CD pipeline.",
            "How do you prioritize vulnerability remediation across 200 services?",
            "Explain CSRF, SSRF, and how you defend against each in a modern web app.",
            "Tell me about a security incident you handled — what was the timeline and outcome?",
        ],
        "evaluation_criteria": {
            "threat_modeling": {"weight": 0.25, "description": "Systematic identification of attack vectors"},
            "secure_coding": {"weight": 0.20, "description": "OWASP awareness, secure-by-default patterns"},
            "incident_response": {"weight": 0.20, "description": "Triage, containment, forensics, communication"},
            "architecture": {"weight": 0.20, "description": "Defense in depth, zero trust, least privilege"},
            "communication": {"weight": 0.15, "description": "Translating risk to business stakeholders"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design", "behavioral"],
    },

    "qa_sdet": {
        "label": "QA / SDET",
        "category": "specialized",
        "description": "Quality engineering interview covering test strategy, automation frameworks, CI integration, and production quality.",
        "tags": ["qa", "sdet", "testing", "automation", "quality"],
        "system_prompt": (
            "You are interviewing a QA / SDET engineer. Cover test strategy design, "
            "automation framework architecture, CI/CD test integration, performance "
            "testing, and production quality monitoring. Push for test pyramid thinking "
            "and concrete metric improvements."
        ),
        "question_bank": [
            "Design a test strategy for a microservices e-commerce platform — where do you invest most?",
            "How would you build a test automation framework from scratch for a mobile app?",
            "Walk me through your approach to testing a payments API for correctness and reliability.",
            "How do you decide what to automate vs. what to keep as manual exploratory testing?",
            "Design a performance testing suite for an API that must handle 50K concurrent users.",
            "Tell me about a time your testing caught a critical bug before production — what was the test?",
        ],
        "evaluation_criteria": {
            "test_strategy": {"weight": 0.30, "description": "Test pyramid, risk-based testing, coverage analysis"},
            "automation": {"weight": 0.25, "description": "Framework design, maintainability, CI integration"},
            "technical_depth": {"weight": 0.20, "description": "Coding skills, debugging, tool proficiency"},
            "quality_mindset": {"weight": 0.15, "description": "Shift-left, production monitoring, user advocacy"},
            "communication": {"weight": 0.10, "description": "Clear bug reports, stakeholder risk communication"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "behavioral"],
    },

    "startup_cto": {
        "label": "Startup CTO Screen",
        "category": "specialized",
        "description": "Technical co-founder / startup CTO interview covering technology choices, team building, product-market fit, and velocity.",
        "tags": ["startup", "cto", "architecture", "hiring", "product-market-fit"],
        "system_prompt": (
            "You are interviewing a startup CTO / technical co-founder. Evaluate technology "
            "stack decisions, team-building from zero, balancing speed with quality, "
            "product-market fit instincts, and investor-ready technical communication. "
            "Challenge non-obvious trade-offs and scalability timing."
        ),
        "question_bank": [
            "You're building a marketplace MVP — walk me through your tech stack choices and why.",
            "How do you decide when to take on tech debt vs. build it right the first time?",
            "Describe how you'd hire your first 5 engineers — what profiles and in what order?",
            "How do you communicate technical risk to non-technical co-founders or investors?",
            "Walk me through scaling your architecture from 100 to 100K users — what changes at each stage?",
            "Tell me about a time you pivoted the technical approach based on user feedback.",
            "How do you build engineering culture from scratch?",
        ],
        "evaluation_criteria": {
            "technical_breadth": {"weight": 0.20, "description": "Full-stack technology judgment"},
            "execution_speed": {"weight": 0.20, "description": "MVP thinking, iteration velocity"},
            "team_building": {"weight": 0.20, "description": "Hiring, culture, retention at early stage"},
            "business_acumen": {"weight": 0.20, "description": "Product-market fit, investor communication"},
            "communication": {"weight": 0.20, "description": "Executive presence, vision articulation"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design", "behavioral", "leadership"],
    },

    "hr_culture_fit": {
        "label": "HR / Culture Fit Screen",
        "category": "behavioral",
        "description": "HR phone screen covering motivation, culture fit, compensation expectations, and career goals.",
        "tags": ["hr", "culture", "fit", "phone-screen", "motivation"],
        "system_prompt": (
            "You are an HR interviewer conducting a culture fit phone screen. Ask about "
            "career motivation, why this company, work style preferences, team dynamics, "
            "and availability. Keep questions warm but evaluative. Probe for genuine "
            "interest and values alignment."
        ),
        "question_bank": [
            "Why are you interested in this role and this company specifically?",
            "What's your ideal engineering culture — how do you like to work?",
            "Tell me about your career trajectory — where do you see yourself in 3 years?",
            "How do you handle disagreements with teammates or managers?",
            "What are you looking for in your next role that you don't have today?",
            "Describe your ideal manager — what management style brings out your best work?",
        ],
        "evaluation_criteria": {
            "motivation": {"weight": 0.25, "description": "Genuine interest, thoughtful career reasoning"},
            "culture_alignment": {"weight": 0.25, "description": "Values match, team dynamics awareness"},
            "self_awareness": {"weight": 0.25, "description": "Honest reflection, growth mindset"},
            "communication": {"weight": 0.25, "description": "Warm, clear, professional tone"},
        },
        "difficulty_modifier": -1,
        "focus_areas": ["behavioral"],
    },

    "salary_negotiation": {
        "label": "Salary Negotiation Mock",
        "category": "specialized",
        "description": "Mock salary negotiation practice covering anchoring, counter-offers, total compensation, and closing strategies.",
        "tags": ["negotiation", "salary", "compensation", "offer", "counter-offer"],
        "system_prompt": (
            "You are a hiring manager / recruiter in a salary negotiation role-play. "
            "Present an initial offer and respond realistically to the candidate's negotiation "
            "attempts. Push back on unreasonable asks, but yield on well-reasoned arguments. "
            "Evaluate anchoring technique, market data usage, and professional tone."
        ),
        "question_bank": [
            "We'd like to extend an offer of $180K base, $50K signing, and 10K RSUs over 4 years. What are your thoughts?",
            "That's higher than our initial range. Can you help me understand what's driving that number?",
            "We can move on base but equity is standard across the band — what's most important to you?",
            "If we meet you at $200K base, could you sign this week?",
            "We have a competing candidate — what would make this a clear yes for you?",
            "Let's talk total compensation including benefits, PTO, and remote flexibility.",
        ],
        "evaluation_criteria": {
            "anchoring_technique": {"weight": 0.25, "description": "Strategic opening, market data support"},
            "reasoning": {"weight": 0.25, "description": "Logical justification, value articulation"},
            "professionalism": {"weight": 0.20, "description": "Tone, relationship preservation"},
            "flexibility": {"weight": 0.15, "description": "Creative problem-solving, package thinking"},
            "closing": {"weight": 0.15, "description": "Clear decision framework, urgency management"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral"],
    },

    # ─── AI & MACHINE LEARNING ────────────────────────────────────
    "ai_infrastructure_engineer": {
        "label": "AI Infrastructure Engineer",
        "category": "ai_ml",
        "description": "Designed for AI infrastructure interviews and scaling discussions. Perfect for practicing GPU cluster optimization, LLM infrastructure, model serving, and distributed training.",
        "tags": ["ai-infra", "gpu", "llm", "model-serving", "distributed-training", "mlops"],
        "system_prompt": (
            "You are interviewing an AI Infrastructure Engineer. Focus on GPU cluster "
            "management, distributed training (DeepSpeed, FSDP, Megatron), model serving "
            "(vLLM, TensorRT, Triton), ML pipeline orchestration, and cost optimization. "
            "Push for real experience with large-scale training runs and production inference."
        ),
        "question_bank": [
            "Design an inference serving platform for a 70B-parameter LLM with < 200ms P99 latency.",
            "How would you optimize GPU utilization across a 1000-GPU training cluster?",
            "Walk me through setting up distributed training with FSDP for a large vision model.",
            "Design a model registry and deployment pipeline for 50+ ML models in production.",
            "How do you handle GPU memory fragmentation during mixed workload scheduling?",
            "Explain your approach to monitoring and alerting for ML training jobs at scale.",
            "Design a cost-efficient spot-instance training strategy with checkpointing.",
        ],
        "evaluation_criteria": {
            "gpu_systems": {"weight": 0.25, "description": "GPU memory, CUDA, cluster networking (NVLink, InfiniBand)"},
            "distributed_training": {"weight": 0.25, "description": "Parallelism strategies, fault tolerance"},
            "serving_infra": {"weight": 0.20, "description": "Inference optimization, batching, caching"},
            "mlops": {"weight": 0.15, "description": "Pipeline automation, versioning, monitoring"},
            "cost_optimization": {"weight": 0.15, "description": "Resource efficiency, spot strategies"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design", "coding"],
    },

    "ai_research_scientist": {
        "label": "AI Research Scientist",
        "category": "ai_ml",
        "description": "Perfect for AI research interviews and technical discussions. Ideal for practicing machine learning model design, optimization, and NLP research.",
        "tags": ["ai-research", "ml", "nlp", "deep-learning", "transformers", "publications"],
        "system_prompt": (
            "You are interviewing an AI Research Scientist. Cover deep learning theory, "
            "novel architecture design, experiment methodology, paper review skills, and "
            "ability to bridge research to production. Push for mathematical rigor and "
            "creative problem-solving."
        ),
        "question_bank": [
            "Explain the attention mechanism in detail — why does it work better than RNNs for sequence tasks?",
            "Design a training strategy for a new multimodal model combining vision and language.",
            "How would you approach reducing hallucination in large language models?",
            "Walk me through designing an experiment to compare two model architectures fairly.",
            "Explain the relationship between model scale, compute, and performance (scaling laws).",
            "How do you handle distribution shift between training and deployment?",
            "Describe a novel approach to few-shot learning for a domain with limited labeled data.",
        ],
        "evaluation_criteria": {
            "theoretical_depth": {"weight": 0.30, "description": "Math foundations, architecture understanding"},
            "experimental_rigor": {"weight": 0.25, "description": "Methodology, controls, reproducibility"},
            "creativity": {"weight": 0.20, "description": "Novel approaches, cross-domain thinking"},
            "practical_impact": {"weight": 0.15, "description": "Research-to-production translation"},
            "communication": {"weight": 0.10, "description": "Paper-quality clarity in explanations"},
        },
        "difficulty_modifier": 2,
        "focus_areas": ["coding", "system-design"],
    },

    "generative_ai_engineer": {
        "label": "Generative AI Engineer",
        "category": "ai_ml",
        "description": "Ideal for generative AI interviews and model development discussions. Perfect for practicing text, image, or code generation with tools like GPT, Stable Diffusion, and fine-tuning.",
        "tags": ["genai", "llm", "gpt", "stable-diffusion", "fine-tuning", "rag", "prompt-engineering"],
        "system_prompt": (
            "You are interviewing a Generative AI Engineer. Cover LLM application building "
            "(RAG, agents, function calling), fine-tuning strategies (LoRA, QLoRA, RLHF), "
            "prompt engineering, evaluation frameworks, and production deployment of gen-AI "
            "systems. Push for practical experience with real products."
        ),
        "question_bank": [
            "Design a RAG system for a legal document search with 10M documents.",
            "How would you evaluate the quality of a code generation model? What metrics matter?",
            "Walk me through fine-tuning an LLM for a specific domain — what data do you need and why?",
            "Design a multi-agent system that can research, plan, and execute complex tasks.",
            "How do you handle prompt injection attacks in a production LLM application?",
            "Explain the trade-offs between fine-tuning, RAG, and in-context learning for knowledge-heavy tasks.",
            "Design an evaluation framework for a customer support chatbot powered by GPT-4.",
        ],
        "evaluation_criteria": {
            "llm_fundamentals": {"weight": 0.25, "description": "Tokenization, attention, fine-tuning mechanics"},
            "application_design": {"weight": 0.25, "description": "RAG, agents, prompt engineering"},
            "evaluation": {"weight": 0.20, "description": "Metrics, benchmarks, human evaluation design"},
            "production_readiness": {"weight": 0.15, "description": "Safety, monitoring, cost management"},
            "creativity": {"weight": 0.15, "description": "Novel applications and solutions"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design", "coding"],
    },

    "prompt_engineer": {
        "label": "Prompt Engineer",
        "category": "ai_ml",
        "description": "Great for practicing prompt engineering interviews and AI interaction discussions. Great for practicing prompt optimization, bias mitigation, and evaluation.",
        "tags": ["prompt-engineering", "llm", "ai-interaction", "evaluation", "bias"],
        "system_prompt": (
            "You are interviewing a Prompt Engineer. Evaluate their ability to craft effective "
            "prompts, design evaluation rubrics, handle edge cases, and optimize LLM outputs "
            "for specific use cases. Push for systematic approaches over ad-hoc tweaking."
        ),
        "question_bank": [
            "Design a prompt chain for extracting structured data from unstructured medical reports.",
            "How would you systematically reduce hallucination in a factual Q&A system?",
            "Walk me through your approach to prompt evaluation and iteration.",
            "Design a prompt for a code review assistant — how do you handle different languages and styles?",
            "How do you handle prompt injection while maintaining useful functionality?",
            "Compare zero-shot, few-shot, and chain-of-thought prompting for a classification task.",
            "Design an A/B test framework for comparing prompt variations at scale.",
        ],
        "evaluation_criteria": {
            "prompt_craft": {"weight": 0.30, "description": "Systematic prompt design methodology"},
            "evaluation_design": {"weight": 0.25, "description": "Metrics, rubrics, automated evaluation"},
            "safety_awareness": {"weight": 0.20, "description": "Injection defense, bias mitigation"},
            "domain_knowledge": {"weight": 0.15, "description": "Understanding of LLM capabilities and limits"},
            "communication": {"weight": 0.10, "description": "Clear documentation of prompt decisions"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "behavioral"],
    },

    # ─── SECURITY & CYBER ─────────────────────────────────────────
    "penetration_tester": {
        "label": "Penetration Tester (Ethical Hacker)",
        "category": "security_cyber",
        "description": "Designed for penetration testing interviews and ethical hacking scenarios. Perfect for practicing vulnerability assessments, attack methodologies, and report writing.",
        "tags": ["pentest", "ethical-hacking", "owasp", "vulnerability", "red-team"],
        "system_prompt": (
            "You are interviewing a Penetration Tester / Ethical Hacker. Cover reconnaissance "
            "methodology, vulnerability identification (OWASP Top 10), exploitation techniques, "
            "privilege escalation, report writing, and responsible disclosure. Push for "
            "real engagement experience and structured methodology."
        ),
        "question_bank": [
            "Walk me through your methodology for a web application penetration test.",
            "You find an IDOR vulnerability — how do you escalate and assess full impact?",
            "Explain the difference between SSRF and CSRF and your approach to testing for each.",
            "How would you test for authentication bypass in a modern SPA with JWT?",
            "Describe your report writing process — how do you communicate risk to executives?",
            "Walk me through a real penetration test you conducted (sanitized) and the findings.",
            "How do you prioritize vulnerabilities when you find 50+ issues in a single engagement?",
        ],
        "evaluation_criteria": {
            "methodology": {"weight": 0.25, "description": "Systematic approach, reconnaissance to reporting"},
            "technical_depth": {"weight": 0.25, "description": "Vulnerability knowledge, exploitation skill"},
            "reporting": {"weight": 0.20, "description": "Clear communication of risk and remediation"},
            "ethics": {"weight": 0.15, "description": "Responsible disclosure, scope adherence"},
            "tooling": {"weight": 0.15, "description": "Tool proficiency (Burp, Nmap, Metasploit, etc.)"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding", "system-design"],
    },

    "bug_bounty_trainer": {
        "label": "Bug Bounty Trainer",
        "category": "security_cyber",
        "description": "Designed for bug bounty and ethical hacking interviews. Perfect for practicing XSS, IDOR, and SSRF vulnerability hunting. Essential for web security.",
        "tags": ["bug-bounty", "xss", "idor", "ssrf", "web-security", "hackerone"],
        "system_prompt": (
            "You are a bug bounty mentor conducting a training interview. Present increasingly "
            "complex web security scenarios and evaluate the candidate's ability to identify, "
            "exploit, and report vulnerabilities. Focus on XSS, IDOR, SSRF, SQL injection, "
            "and authentication bypasses."
        ),
        "question_bank": [
            "You see a URL parameter reflected in the page — walk me through your XSS testing approach.",
            "How do you test for IDOR when the API uses UUIDs instead of sequential IDs?",
            "Describe how you'd chain an SSRF with cloud metadata to escalate access.",
            "Walk me through testing a file upload endpoint for security vulnerabilities.",
            "How do you approach testing for business logic flaws in an e-commerce checkout?",
            "Explain your recon process when starting a new bug bounty program.",
            "Design a methodology for testing GraphQL APIs for security issues.",
        ],
        "evaluation_criteria": {
            "vulnerability_hunting": {"weight": 0.30, "description": "Finding bugs others miss, creative payloads"},
            "exploitation": {"weight": 0.25, "description": "Chaining vulnerabilities, impact escalation"},
            "methodology": {"weight": 0.20, "description": "Systematic recon and testing approach"},
            "reporting": {"weight": 0.15, "description": "Clear PoC, impact description, remediation advice"},
            "ethics": {"weight": 0.10, "description": "Scope adherence, responsible disclosure"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding"],
    },

    "digital_forensics_analyst": {
        "label": "Digital Forensics Analyst",
        "category": "security_cyber",
        "description": "Perfect for digital forensics interviews and cyber investigation scenarios. Ideal for practicing evidence analysis, incident response, and chain of custody.",
        "tags": ["forensics", "incident-response", "evidence", "malware", "chain-of-custody"],
        "system_prompt": (
            "You are interviewing a Digital Forensics Analyst. Cover evidence acquisition and "
            "preservation, disk and memory forensics, network forensics, malware analysis, "
            "chain of custody procedures, and expert witness testimony preparation."
        ),
        "question_bank": [
            "Walk me through your process for acquiring a forensic image from a compromised server.",
            "How do you analyze a memory dump for indicators of compromise?",
            "Describe your approach to timeline reconstruction during an incident investigation.",
            "How do you maintain chain of custody for digital evidence in a legal proceeding?",
            "Walk me through analyzing a suspicious executable — what tools and methodology do you use?",
            "How do you handle anti-forensics techniques during an investigation?",
            "Describe a complex investigation you led and how you pieced together the attack narrative.",
        ],
        "evaluation_criteria": {
            "evidence_handling": {"weight": 0.25, "description": "Acquisition, preservation, chain of custody"},
            "analysis_skills": {"weight": 0.25, "description": "Disk, memory, network forensics depth"},
            "methodology": {"weight": 0.20, "description": "Systematic investigation, timeline reconstruction"},
            "tooling": {"weight": 0.15, "description": "FTK, EnCase, Volatility, Wireshark proficiency"},
            "communication": {"weight": 0.15, "description": "Report writing, expert testimony preparation"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design", "behavioral"],
    },

    # ─── CREATIVE & DESIGN ────────────────────────────────────────
    "graphic_designer": {
        "label": "Graphic Designer",
        "category": "creative",
        "description": "Perfect for graphic design interviews and creative reviews. Ideal for practicing logo creation, social media visuals, and design collaboration.",
        "tags": ["graphic-design", "logo", "branding", "visual-design", "adobe", "figma"],
        "system_prompt": (
            "You are interviewing a Graphic Designer. Evaluate their design thinking, "
            "brand awareness, typography and color theory knowledge, portfolio critique "
            "capability, and collaboration with stakeholders. Ask about their creative "
            "process from brief to delivery."
        ),
        "question_bank": [
            "Walk me through your design process for creating a brand identity from scratch.",
            "How do you handle a client who keeps requesting changes that you believe weaken the design?",
            "Explain your approach to typography pairing and when you break conventional rules.",
            "Critique a recent design trend — what works, what doesn't, and why?",
            "How do you ensure brand consistency across 20+ different touchpoints?",
            "Describe your process for designing for accessibility while maintaining visual appeal.",
            "Walk me through creating a social media campaign visual system for a product launch.",
        ],
        "evaluation_criteria": {
            "visual_craft": {"weight": 0.25, "description": "Typography, color, composition, attention to detail"},
            "design_thinking": {"weight": 0.25, "description": "Problem-solving, user-centered approach"},
            "brand_awareness": {"weight": 0.20, "description": "Brand systems, consistency, market awareness"},
            "collaboration": {"weight": 0.15, "description": "Stakeholder management, feedback handling"},
            "tool_proficiency": {"weight": 0.15, "description": "Adobe Creative Suite, Figma, prototyping"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    "three_d_artist": {
        "label": "3D Artist",
        "category": "creative",
        "description": "Ideal for 3D art interviews and design sessions for games, film, or AR/VR. Perfect for practicing modeling, texturing, and optimization workflows.",
        "tags": ["3d-art", "modeling", "texturing", "blender", "maya", "unreal", "unity"],
        "system_prompt": (
            "You are interviewing a 3D Artist. Cover modeling techniques, texturing and "
            "materials (PBR workflows), rigging and animation, real-time vs offline rendering, "
            "and optimization for games/AR/VR. Evaluate portfolio discussion and problem-solving."
        ),
        "question_bank": [
            "Walk me through your workflow for creating a game-ready character from concept to engine.",
            "How do you optimize a 3D model for real-time rendering while maintaining visual quality?",
            "Explain your texturing approach — when do you use substance vs hand-painted?",
            "How do you handle LOD (Level of Detail) for a large open-world game environment?",
            "Describe your rigging approach for a character with complex deformations.",
            "Walk me through creating photorealistic materials using PBR workflows.",
            "How do you collaborate with technical artists and engineers on performance targets?",
        ],
        "evaluation_criteria": {
            "modeling_skill": {"weight": 0.25, "description": "Topology, edge flow, optimization"},
            "texturing": {"weight": 0.25, "description": "Material creation, UV mapping, PBR"},
            "technical_knowledge": {"weight": 0.20, "description": "Engine limitations, optimization"},
            "artistic_eye": {"weight": 0.15, "description": "Composition, proportions, style"},
            "collaboration": {"weight": 0.15, "description": "Pipeline integration, feedback iteration"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    "interior_designer": {
        "label": "Interior Designer",
        "category": "creative",
        "description": "Designed for interior design interviews and client consultations. Great for practicing space planning, material selection, and sustainable design.",
        "tags": ["interior-design", "space-planning", "materials", "sustainable", "residential", "commercial"],
        "system_prompt": (
            "You are interviewing an Interior Designer. Cover space planning, material "
            "selection, color psychology, client consultation process, building codes, "
            "and sustainable design practices. Evaluate both creative vision and "
            "practical execution."
        ),
        "question_bank": [
            "Walk me through your design process for a residential renovation from client brief to installation.",
            "How do you balance aesthetic vision with budget constraints?",
            "Describe your approach to space planning for a 500 sqft studio apartment.",
            "How do you incorporate sustainable and eco-friendly materials into your designs?",
            "Walk me through resolving a conflict between a client's taste and functional requirements.",
            "How do you stay current with design trends while developing a timeless design?",
            "Describe a challenging commercial project and how you navigated code requirements.",
        ],
        "evaluation_criteria": {
            "design_vision": {"weight": 0.25, "description": "Creative concepts, spatial awareness"},
            "technical_knowledge": {"weight": 0.25, "description": "Materials, building codes, construction"},
            "client_management": {"weight": 0.20, "description": "Communication, expectation management"},
            "sustainability": {"weight": 0.15, "description": "Eco-friendly approaches, LEED awareness"},
            "project_management": {"weight": 0.15, "description": "Budgeting, timelines, vendor coordination"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    "nft_game_designer": {
        "label": "NFT Game Designer",
        "category": "creative",
        "description": "Ideal for NFT game design interviews and Web3 gaming discussions. Perfect for practicing play-to-earn mechanics, NFT integration, and tokenomics.",
        "tags": ["nft", "web3", "gaming", "play-to-earn", "tokenomics", "blockchain-gaming"],
        "system_prompt": (
            "You are interviewing an NFT Game Designer. Cover game economy design, "
            "tokenomics, play-to-earn mechanics, NFT utility beyond speculation, "
            "player retention, and sustainable Web3 game models. Challenge on the "
            "balance between economic incentives and fun gameplay."
        ),
        "question_bank": [
            "Design a play-to-earn economy that avoids the death spiral seen in many Web3 games.",
            "How do you create NFT utility that enhances gameplay rather than just speculation?",
            "Walk me through designing a token economy with dual-token model for a game.",
            "How do you balance free-to-play players and NFT holders in terms of game experience?",
            "Describe your approach to preventing bot farming in a blockchain game.",
            "Design an interoperable NFT system that works across multiple games.",
            "How do you handle the regulatory implications of play-to-earn mechanics?",
        ],
        "evaluation_criteria": {
            "game_economy": {"weight": 0.25, "description": "Sustainable tokenomics, inflation control"},
            "game_design": {"weight": 0.25, "description": "Fun core loop, player retention"},
            "blockchain_knowledge": {"weight": 0.20, "description": "Smart contracts, gas optimization, chains"},
            "player_psychology": {"weight": 0.15, "description": "Motivation, fairness, community"},
            "business_model": {"weight": 0.15, "description": "Revenue sustainability, regulatory awareness"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["product", "system-design"],
    },

    "voice_interface_designer": {
        "label": "Voice Interface Designer (VUI)",
        "category": "creative",
        "description": "Designed for voice interface design interviews and conversational UX discussions. Perfect for practicing voice-first experiences for Alexa, Google Assistant, and Siri.",
        "tags": ["vui", "voice", "alexa", "google-assistant", "conversational-design", "ux"],
        "system_prompt": (
            "You are interviewing a Voice Interface Designer. Cover conversation design "
            "patterns, error handling in voice, multimodal experiences, personality design, "
            "and voice-first UX principles. Evaluate understanding of both the technology "
            "and human conversation dynamics."
        ),
        "question_bank": [
            "Design a voice ordering experience for a coffee shop — handle edge cases and errors.",
            "How do you handle misrecognition gracefully without frustrating the user?",
            "Walk me through designing a multimodal experience that works on both screen and voice-only.",
            "How do you give a voice assistant a consistent personality across different contexts?",
            "Design a voice-based health check-in for elderly users living alone.",
            "Explain your approach to testing and iterating on voice interface designs.",
            "How do you handle multi-turn conversations with context carryover?",
        ],
        "evaluation_criteria": {
            "conversation_design": {"weight": 0.30, "description": "Natural dialog flow, turn-taking, repair"},
            "error_handling": {"weight": 0.25, "description": "Graceful degradation, disambiguation"},
            "user_empathy": {"weight": 0.20, "description": "Inclusive design, diverse user needs"},
            "technical_awareness": {"weight": 0.15, "description": "ASR/NLU limitations, platform capabilities"},
            "personality_design": {"weight": 0.10, "description": "Consistent brand voice and character"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    # ─── EMERGING TECH ────────────────────────────────────────────
    "blockchain_developer": {
        "label": "Blockchain Development",
        "category": "emerging_tech",
        "description": "Ideal for blockchain development interviews and smart contract discussions. Perfect for practicing dApp design, security audits, and DeFi.",
        "tags": ["blockchain", "smart-contracts", "solidity", "defi", "web3", "ethereum"],
        "system_prompt": (
            "You are interviewing a Blockchain Developer. Cover smart contract development "
            "(Solidity/Rust), DeFi protocol design, security audit methodology, gas "
            "optimization, layer 2 scaling, and cross-chain interoperability."
        ),
        "question_bank": [
            "Design a decentralized lending protocol — walk me through the smart contract architecture.",
            "How do you prevent reentrancy attacks? Show me the vulnerable and fixed code.",
            "Walk me through a smart contract security audit process and common vulnerability patterns.",
            "Design a gas-efficient NFT contract that supports batch minting and royalties.",
            "Explain the trade-offs between optimistic rollups and zk-rollups for scaling.",
            "How would you implement a cross-chain bridge with security guarantees?",
            "Describe your testing strategy for smart contracts including fuzzing.",
        ],
        "evaluation_criteria": {
            "smart_contract_dev": {"weight": 0.25, "description": "Solidity/Rust proficiency, patterns"},
            "security": {"weight": 0.25, "description": "Vulnerability awareness, audit methodology"},
            "architecture": {"weight": 0.20, "description": "Protocol design, composability"},
            "gas_optimization": {"weight": 0.15, "description": "Efficient code, storage patterns"},
            "ecosystem_knowledge": {"weight": 0.15, "description": "L2s, bridges, consensus mechanisms"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding", "system-design"],
    },

    "quantum_computing": {
        "label": "Quantum Computing",
        "category": "emerging_tech",
        "description": "Ideal for quantum computing interviews and algorithm development discussions. Perfect for practicing quantum circuit design, error correction, and quantum advantage.",
        "tags": ["quantum", "qiskit", "quantum-algorithms", "error-correction", "quantum-ml"],
        "system_prompt": (
            "You are interviewing a Quantum Computing researcher/engineer. Cover quantum "
            "circuit design, quantum algorithms (Grover, Shor, VQE), error correction "
            "codes, quantum-classical hybrid approaches, and understanding of current "
            "hardware limitations. Probe for practical NISQ-era thinking."
        ),
        "question_bank": [
            "Explain Grover's algorithm and its practical limitations on current hardware.",
            "Design a variational quantum eigensolver (VQE) for molecular simulation.",
            "How do you handle noise in NISQ devices — what error mitigation strategies exist?",
            "Walk me through implementing a quantum circuit for quantum key distribution.",
            "What are the main approaches to quantum error correction and their overhead?",
            "Explain the quantum advantage debate — for which problems is quantum computing actually useful today?",
            "Design a hybrid quantum-classical optimization pipeline for a logistics problem.",
        ],
        "evaluation_criteria": {
            "theoretical_foundation": {"weight": 0.30, "description": "Quantum mechanics, linear algebra, algorithms"},
            "circuit_design": {"weight": 0.25, "description": "Gate optimization, transpilation, noise awareness"},
            "practical_knowledge": {"weight": 0.20, "description": "NISQ limitations, hardware awareness"},
            "problem_solving": {"weight": 0.15, "description": "Identifying quantum-suitable problems"},
            "communication": {"weight": 0.10, "description": "Explaining quantum concepts to classical audiences"},
        },
        "difficulty_modifier": 2,
        "focus_areas": ["coding", "system-design"],
    },

    "robotics_engineering": {
        "label": "Robotics Engineering",
        "category": "emerging_tech",
        "description": "Perfect for robotics engineering interviews and automation discussions. Ideal for practicing control systems, sensor integration, and ROS.",
        "tags": ["robotics", "ros", "control-systems", "sensors", "autonomous", "embedded"],
        "system_prompt": (
            "You are interviewing a Robotics Engineer. Cover control systems (PID, MPC), "
            "sensor fusion (LiDAR, camera, IMU), path planning, ROS/ROS2 architecture, "
            "embedded systems, and safety. Push for real-world deployment experience."
        ),
        "question_bank": [
            "Design a control system for a robotic arm that needs sub-millimeter precision.",
            "How do you fuse data from LiDAR, cameras, and IMU for accurate localization?",
            "Walk me through implementing SLAM for a warehouse autonomous mobile robot.",
            "Design a safety system for a collaborative robot working alongside humans.",
            "How do you handle sensor failure gracefully in an autonomous system?",
            "Explain your approach to path planning in a dynamic environment with moving obstacles.",
            "Describe the ROS2 architecture decisions for a multi-robot coordination system.",
        ],
        "evaluation_criteria": {
            "control_systems": {"weight": 0.25, "description": "PID tuning, MPC, stability analysis"},
            "sensor_fusion": {"weight": 0.25, "description": "Kalman filters, sensor characterization"},
            "software_architecture": {"weight": 0.20, "description": "ROS2, real-time constraints"},
            "safety": {"weight": 0.15, "description": "Fail-safe design, ISO compliance"},
            "practical_experience": {"weight": 0.15, "description": "Real hardware deployment, debugging"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding", "system-design"],
    },

    "ar_vr_developer": {
        "label": "Augmented Reality (AR) / Virtual Reality (VR) Developer",
        "category": "emerging_tech",
        "description": "Ideal for AR/VR development interviews and immersive tech discussions. Perfect for practicing 3D rendering, spatial computing, and user interaction in XR.",
        "tags": ["ar", "vr", "xr", "unity", "unreal", "spatial-computing", "3d"],
        "system_prompt": (
            "You are interviewing an AR/VR Developer. Cover 3D rendering pipelines, "
            "spatial mapping and tracking, interaction design for immersive environments, "
            "performance optimization for head-mounted displays, and cross-platform "
            "development (Quest, Vision Pro, HoloLens)."
        ),
        "question_bank": [
            "Design a collaborative AR workspace application — how do you handle spatial anchors?",
            "How do you maintain consistent 90fps in a VR application with complex scenes?",
            "Walk me through implementing hand tracking and gesture recognition for VR.",
            "How do you handle motion sickness in VR — what design patterns help?",
            "Design an AR navigation system for indoor spaces without GPS.",
            "Explain your approach to rendering optimization for standalone headsets (Quest).",
            "How do you test and iterate on XR experiences with limited device access?",
        ],
        "evaluation_criteria": {
            "rendering": {"weight": 0.25, "description": "3D graphics, shaders, optimization"},
            "spatial_computing": {"weight": 0.25, "description": "Tracking, mapping, anchoring"},
            "interaction_design": {"weight": 0.20, "description": "UX for 3D, gesture, gaze, haptics"},
            "performance": {"weight": 0.15, "description": "Frame budget management, thermal constraints"},
            "platform_knowledge": {"weight": 0.15, "description": "SDK/API for major platforms"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding", "system-design"],
    },

    "spatial_computing_developer": {
        "label": "Spatial Computing Developer (Apple Vision Pro)",
        "category": "emerging_tech",
        "description": "Ideal for spatial computing interviews and immersive app development discussions. Perfect for practicing visionOS, ARKit, and 3D rendering.",
        "tags": ["spatial-computing", "visionos", "arkit", "realitykit", "apple-vision-pro", "swift"],
        "system_prompt": (
            "You are interviewing a Spatial Computing Developer specializing in Apple Vision Pro. "
            "Cover visionOS development, RealityKit, ARKit, spatial UI design, "
            "eye/hand tracking, and SharePlay integration. Push for understanding of "
            "Apple's Human Interface Guidelines for spatial computing."
        ),
        "question_bank": [
            "Design a spatial computing productivity app — how do you handle window placement and persistence?",
            "How do you optimize 3D content rendering for Apple Vision Pro's display requirements?",
            "Walk me through implementing a shared spatial experience using SharePlay.",
            "How do you design for eye tracking input while maintaining user privacy?",
            "Describe your approach to testing spatial computing apps without constant hardware access.",
            "Design a spatial data visualization tool — how do you leverage depth perception?",
            "How do you handle the transition between immersive and passthrough modes?",
        ],
        "evaluation_criteria": {
            "visionos_knowledge": {"weight": 0.25, "description": "RealityKit, ARKit, SwiftUI spatial APIs"},
            "spatial_design": {"weight": 0.25, "description": "HIG compliance, ergonomics, spatial layout"},
            "performance": {"weight": 0.20, "description": "Thermal management, battery, rendering budget"},
            "interaction_patterns": {"weight": 0.15, "description": "Eye, hand, voice input design"},
            "apple_ecosystem": {"weight": 0.15, "description": "Integration with iOS, SharePlay, iCloud"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding", "system-design"],
    },

    "autonomous_vehicle_engineer": {
        "label": "Autonomous Vehicle Engineer",
        "category": "emerging_tech",
        "description": "Perfect for autonomous vehicle engineering interviews and self-driving tech discussions. Ideal for practicing path planning, sensor fusion, and safety-critical systems.",
        "tags": ["autonomous-vehicles", "self-driving", "perception", "path-planning", "safety-critical"],
        "system_prompt": (
            "You are interviewing an Autonomous Vehicle Engineer. Cover perception systems, "
            "sensor fusion, path planning and motion prediction, safety-critical software "
            "development, simulation/testing, and regulatory compliance. Push for "
            "understanding of real-world edge cases."
        ),
        "question_bank": [
            "Design the perception pipeline for an autonomous vehicle — from raw sensor data to object tracking.",
            "How do you handle the long tail of edge cases in autonomous driving?",
            "Walk me through motion prediction for pedestrians at an intersection.",
            "Design a simulation framework for testing autonomous driving at scale.",
            "How do you ensure functional safety (ISO 26262) in your software architecture?",
            "Explain your approach to sensor degradation — what happens when a LiDAR fails?",
            "Design a decision-making system for a self-driving car at a complex intersection.",
        ],
        "evaluation_criteria": {
            "perception": {"weight": 0.25, "description": "Object detection, tracking, sensor fusion"},
            "planning": {"weight": 0.25, "description": "Path planning, motion prediction, decision-making"},
            "safety": {"weight": 0.20, "description": "ISO 26262, redundancy, graceful degradation"},
            "testing": {"weight": 0.15, "description": "Simulation, validation methodology"},
            "systems_thinking": {"weight": 0.15, "description": "Full-stack AV architecture understanding"},
        },
        "difficulty_modifier": 2,
        "focus_areas": ["system-design", "coding"],
    },

    "iot_solutions_architect": {
        "label": "IoT Solutions Architect",
        "category": "emerging_tech",
        "description": "Designed for IoT solutions architect interviews and system design discussions. Great for practicing IoT architecture, device connectivity, and edge computing.",
        "tags": ["iot", "edge-computing", "mqtt", "device-management", "embedded", "smart-home"],
        "system_prompt": (
            "You are interviewing an IoT Solutions Architect. Cover device connectivity "
            "protocols (MQTT, CoAP, LoRaWAN), edge computing, device lifecycle management, "
            "security for constrained devices, data pipelines from edge to cloud, and "
            "scalability for millions of devices."
        ),
        "question_bank": [
            "Design an IoT platform that manages 1M devices with real-time telemetry.",
            "How do you secure firmware updates for IoT devices in the field?",
            "Walk me through choosing between MQTT, CoAP, and HTTP for different IoT use cases.",
            "Design an edge computing pipeline that preprocesses sensor data before cloud upload.",
            "How do you handle intermittent connectivity for IoT devices in remote locations?",
            "Design a predictive maintenance system using sensor data from industrial equipment.",
            "Walk me through your approach to device provisioning and identity management at scale.",
        ],
        "evaluation_criteria": {
            "architecture": {"weight": 0.25, "description": "Scalable IoT platform design, protocols"},
            "security": {"weight": 0.25, "description": "Device identity, OTA updates, encryption"},
            "edge_computing": {"weight": 0.20, "description": "Local processing, data reduction"},
            "reliability": {"weight": 0.15, "description": "Offline handling, message delivery guarantees"},
            "scalability": {"weight": 0.15, "description": "Device management at millions scale"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design"],
    },

    "neurotechnology_engineer": {
        "label": "Neurotechnology Engineer",
        "category": "emerging_tech",
        "description": "Ideal for neurotechnology engineering interviews and neural interface discussions. Perfect for practicing signal processing, brain-computer interfaces, and biocompatibility.",
        "tags": ["neurotech", "bci", "eeg", "neural-interfaces", "signal-processing", "biomedical"],
        "system_prompt": (
            "You are interviewing a Neurotechnology Engineer. Cover brain-computer interface "
            "design, neural signal processing (EEG, ECoG, spike sorting), machine learning "
            "for neural decoding, biocompatibility and safety, and regulatory pathways (FDA)."
        ),
        "question_bank": [
            "Design a real-time BCI system for cursor control — from neural signal to screen movement.",
            "How do you handle signal noise and artifacts in EEG recordings?",
            "Walk me through your approach to neural decoding using machine learning.",
            "Design a closed-loop neurostimulation system — what safety considerations are critical?",
            "How do you validate a BCI system for clinical use?",
            "Explain the trade-offs between invasive and non-invasive neural recording methods.",
            "Describe your approach to real-time signal processing with strict latency requirements.",
        ],
        "evaluation_criteria": {
            "signal_processing": {"weight": 0.25, "description": "Filtering, artifact removal, feature extraction"},
            "ml_decoding": {"weight": 0.25, "description": "Neural decoding algorithms, real-time inference"},
            "hardware_knowledge": {"weight": 0.20, "description": "Electrodes, amplifiers, ADCs"},
            "safety_regulatory": {"weight": 0.15, "description": "Biocompatibility, FDA pathways"},
            "research_translation": {"weight": 0.15, "description": "Lab to product pipeline"},
        },
        "difficulty_modifier": 2,
        "focus_areas": ["coding", "system-design"],
    },

    # ─── INFRASTRUCTURE & CLOUD ───────────────────────────────────
    "cicd_system_architect": {
        "label": "CI/CD System Architect",
        "category": "infrastructure",
        "description": "Ideal for CI/CD pipeline design interviews and deployment discussions. Great for practicing GitHub Actions, Docker-based deployments, and release strategies.",
        "tags": ["cicd", "github-actions", "docker", "kubernetes", "deployment", "release"],
        "system_prompt": (
            "You are interviewing a CI/CD System Architect. Cover pipeline design patterns, "
            "build optimization, deployment strategies (blue-green, canary, rolling), "
            "artifact management, environment promotion, and developer experience."
        ),
        "question_bank": [
            "Design a CI/CD pipeline for a monorepo with 50 services and 200 developers.",
            "How do you reduce build times from 30 minutes to under 5 minutes?",
            "Walk me through implementing canary deployments with automated rollback.",
            "Design an environment promotion strategy from dev to staging to production.",
            "How do you handle database migrations in an automated deployment pipeline?",
            "Describe your approach to testing in CI — what runs in PR vs merge vs deploy?",
            "Design a self-service deployment platform that empowers product teams.",
        ],
        "evaluation_criteria": {
            "pipeline_design": {"weight": 0.25, "description": "Efficient, maintainable pipeline architecture"},
            "deployment_strategies": {"weight": 0.25, "description": "Safe rollout, rollback, feature flags"},
            "developer_experience": {"weight": 0.20, "description": "Fast feedback loops, self-service"},
            "reliability": {"weight": 0.15, "description": "Flaky test handling, infrastructure stability"},
            "security": {"weight": 0.15, "description": "Secret management, supply chain security"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design"],
    },

    "site_reliability_engineer": {
        "label": "Site Reliability Engineer (SRE)",
        "category": "infrastructure",
        "description": "SLIs/SLOs, incident response, capacity planning, chaos testing, and deep observability.",
        "tags": ["sre", "reliability", "slo", "incident-response", "chaos-engineering", "observability"],
        "system_prompt": (
            "You are interviewing an SRE specialist. Focus deeply on SLI/SLO definition, "
            "error budget policies, incident management maturity, chaos engineering, "
            "capacity planning, and building reliability culture across engineering teams."
        ),
        "question_bank": [
            "Define SLIs and SLOs for a payment processing service — what error budget policy would you use?",
            "Design a chaos engineering program for a company with no reliability testing culture.",
            "Walk me through incident management for a cascading failure across 5 services.",
            "How do you perform capacity planning for a service with seasonal 10x traffic spikes?",
            "Design an observability stack that correlates logs, metrics, and traces for fast debugging.",
            "How do you balance reliability investment against feature development with engineering leadership?",
            "Describe implementing a game day exercise and what you learned from it.",
        ],
        "evaluation_criteria": {
            "slo_engineering": {"weight": 0.25, "description": "SLI selection, error budgets, burn rate alerts"},
            "incident_management": {"weight": 0.25, "description": "Response process, communication, postmortem"},
            "chaos_engineering": {"weight": 0.20, "description": "Experiment design, blast radius control"},
            "capacity_planning": {"weight": 0.15, "description": "Load testing, growth modeling"},
            "culture_building": {"weight": 0.15, "description": "Reliability advocacy, toil reduction"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design", "behavioral"],
    },

    "cloud_data_engineer": {
        "label": "Cloud Data Engineer",
        "category": "infrastructure",
        "description": "Perfect for cloud data engineering interviews and data platform design. Great for lakehouse architectures, streaming/batch pipelines, and data governance.",
        "tags": ["cloud-data", "lakehouse", "databricks", "snowflake", "streaming", "batch"],
        "system_prompt": (
            "You are interviewing a Cloud Data Engineer. Cover lakehouse architectures "
            "(Delta Lake, Iceberg), cloud-native data pipelines (Databricks, Snowflake), "
            "streaming and batch processing, data governance, cost optimization, and "
            "multi-cloud data strategies."
        ),
        "question_bank": [
            "Design a lakehouse architecture for a company migrating from a legacy data warehouse.",
            "How do you implement data governance and access control across a multi-team data platform?",
            "Walk me through optimizing a Spark job that processes 50TB of data daily.",
            "Design a real-time and batch unified processing pipeline for e-commerce analytics.",
            "How do you handle schema evolution in a Delta Lake / Iceberg environment?",
            "Describe your approach to cost optimization in a cloud data platform (Snowflake/Databricks).",
            "Design a data quality framework with automated testing and alerting.",
        ],
        "evaluation_criteria": {
            "architecture": {"weight": 0.25, "description": "Lakehouse, medallion pattern, cloud-native design"},
            "data_processing": {"weight": 0.25, "description": "Spark, streaming, batch optimization"},
            "governance": {"weight": 0.20, "description": "Access control, lineage, cataloging"},
            "cost_optimization": {"weight": 0.15, "description": "Compute sizing, storage tiering"},
            "reliability": {"weight": 0.15, "description": "Pipeline monitoring, data quality assurance"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design", "coding"],
    },

    "distributed_systems_architect": {
        "label": "Distributed Systems & Microservices Architect",
        "category": "infrastructure",
        "description": "End-to-end microservices strategy (request/event-driven), DDD, API versioning, service mesh, resilience, observability, and deployment.",
        "tags": ["distributed-systems", "microservices", "ddd", "service-mesh", "event-driven", "api-versioning"],
        "system_prompt": (
            "You are interviewing a Distributed Systems Architect. Cover microservices decomposition "
            "(DDD bounded contexts), event-driven architecture, service mesh (Istio/Linkerd), "
            "API gateway and versioning, distributed transactions (saga pattern), and "
            "observability. Push for production battle scars."
        ),
        "question_bank": [
            "Walk me through decomposing a monolith into microservices — where do you draw service boundaries?",
            "Design a saga pattern for an order fulfillment workflow across 4 services.",
            "How do you implement service-to-service communication — when sync vs async?",
            "Design an API gateway with rate limiting, auth, and version routing.",
            "How do you debug a distributed transaction failure across 8 microservices?",
            "Walk me through implementing a service mesh and the operational overhead it introduces.",
            "Design an event-driven architecture with guaranteed ordering and exactly-once semantics.",
        ],
        "evaluation_criteria": {
            "architecture_patterns": {"weight": 0.25, "description": "DDD, event sourcing, CQRS, saga"},
            "resilience": {"weight": 0.25, "description": "Circuit breakers, retries, bulkheads, fallbacks"},
            "communication": {"weight": 0.20, "description": "Sync/async trade-offs, message ordering"},
            "observability": {"weight": 0.15, "description": "Distributed tracing, correlation IDs"},
            "operational_maturity": {"weight": 0.15, "description": "Deployment, rollback, incident handling"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design"],
    },

    "network_automation_engineer": {
        "label": "Network Automation Engineer",
        "category": "infrastructure",
        "description": "Designed for network automation engineering interviews and infrastructure optimization discussions. Great for practicing automation, SDN, and network programmability.",
        "tags": ["network-automation", "sdn", "ansible", "terraform", "network-programmability"],
        "system_prompt": (
            "You are interviewing a Network Automation Engineer. Cover network programmability "
            "(NETCONF, RESTCONF, gRPC), infrastructure as code for networking (Ansible, "
            "Terraform), SDN concepts, intent-based networking, and telemetry-driven operations."
        ),
        "question_bank": [
            "Design an automated network provisioning pipeline for a multi-cloud environment.",
            "How do you implement configuration drift detection and auto-remediation?",
            "Walk me through automating a zero-touch provisioning process for 1000 switches.",
            "Design a network telemetry and analytics pipeline for proactive issue detection.",
            "How do you test network automation changes safely before applying to production?",
            "Explain your approach to migrating from CLI-based to API-driven network management.",
            "Design a self-service network change request system for development teams.",
        ],
        "evaluation_criteria": {
            "automation_skills": {"weight": 0.25, "description": "Ansible, Terraform, Python, API-driven config"},
            "network_fundamentals": {"weight": 0.25, "description": "Protocols, routing, switching, security"},
            "programmability": {"weight": 0.20, "description": "NETCONF, RESTCONF, gRPC, YANG models"},
            "testing": {"weight": 0.15, "description": "Network simulation, change validation"},
            "reliability": {"weight": 0.15, "description": "Rollback strategies, impact assessment"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["system-design", "coding"],
    },

    "fintech_platform_architect": {
        "label": "FinTech Platform Architect",
        "category": "infrastructure",
        "description": "Payments, double-entry ledger, KYC/AML, PCI scope reduction, open banking, reconciliation, fraud/risk, and auditability.",
        "tags": ["fintech", "payments", "ledger", "kyc", "aml", "pci", "open-banking"],
        "system_prompt": (
            "You are interviewing a FinTech Platform Architect. Cover payment processing "
            "systems, double-entry ledger design, KYC/AML compliance, PCI-DSS scope reduction, "
            "open banking APIs, reconciliation, and fraud detection. Push for regulatory "
            "awareness and production payment experience."
        ),
        "question_bank": [
            "Design a double-entry ledger system for a neobank handling 1M transactions per day.",
            "How do you reduce PCI-DSS scope while supporting multiple payment methods?",
            "Walk me through implementing KYC/AML checks in a user onboarding flow.",
            "Design a real-time fraud detection system for card transactions.",
            "How do you handle reconciliation across multiple payment processors?",
            "Design an open banking API that complies with PSD2 requirements.",
            "Walk me through handling idempotency in payment processing to prevent double charges.",
        ],
        "evaluation_criteria": {
            "payment_systems": {"weight": 0.25, "description": "Processing flows, settlement, reconciliation"},
            "compliance": {"weight": 0.25, "description": "PCI, KYC/AML, SOX, PSD2 understanding"},
            "architecture": {"weight": 0.20, "description": "Ledger design, event sourcing, auditability"},
            "fraud_risk": {"weight": 0.15, "description": "Detection systems, risk scoring"},
            "reliability": {"weight": 0.15, "description": "Idempotency, exactly-once, disaster recovery"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design"],
    },

    # ─── BUSINESS & OPERATIONS ────────────────────────────────────
    "operations_manager": {
        "label": "Operations Manager",
        "category": "business",
        "description": "Designed for operations management interviews and process optimization discussions. Great for practicing workflow streamlining, KPIs, and continuous improvement.",
        "tags": ["operations", "process-optimization", "kpi", "lean", "six-sigma"],
        "system_prompt": (
            "You are interviewing an Operations Manager. Cover process optimization, "
            "KPI design and tracking, team management, vendor coordination, lean/six sigma "
            "methodology, and scaling operations. Push for measurable impact examples."
        ),
        "question_bank": [
            "How would you optimize a fulfillment process that has a 15% error rate?",
            "Design a KPI dashboard for operations — what metrics matter most and why?",
            "Walk me through a process improvement initiative you led — what methodology did you use?",
            "How do you handle a supply chain disruption that affects 30% of your operations?",
            "Describe your approach to vendor management and SLA negotiation.",
            "How do you scale operations from 100 to 10,000 orders per day?",
            "Walk me through implementing continuous improvement culture in a team resistant to change.",
        ],
        "evaluation_criteria": {
            "process_optimization": {"weight": 0.25, "description": "Lean thinking, waste reduction, efficiency"},
            "metrics_driven": {"weight": 0.25, "description": "KPI design, data-informed decisions"},
            "leadership": {"weight": 0.20, "description": "Team management, change management"},
            "problem_solving": {"weight": 0.15, "description": "Root cause analysis, structured approach"},
            "communication": {"weight": 0.15, "description": "Stakeholder updates, cross-team coordination"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral", "leadership"],
    },

    "supply_chain_analyst": {
        "label": "Supply Chain Analyst",
        "category": "business",
        "description": "Designed for supply chain analyst interviews and logistics discussions. Great for practicing demand forecasting, inventory optimization, and logistics planning.",
        "tags": ["supply-chain", "logistics", "demand-forecasting", "inventory", "procurement"],
        "system_prompt": (
            "You are interviewing a Supply Chain Analyst. Cover demand forecasting, "
            "inventory optimization, logistics network design, procurement strategy, "
            "and supply chain risk management. Push for quantitative analysis and "
            "real-world disruption handling."
        ),
        "question_bank": [
            "Design a demand forecasting model for a seasonal product with high variability.",
            "How do you optimize inventory levels to balance carrying costs with stockout risk?",
            "Walk me through analyzing a logistics network for cost reduction opportunities.",
            "How do you handle supplier diversification to reduce concentration risk?",
            "Design a supply chain control tower dashboard — what real-time metrics are essential?",
            "Describe your approach to S&OP (Sales and Operations Planning) meetings.",
            "How would you handle a sudden 40% increase in demand while lead times double?",
        ],
        "evaluation_criteria": {
            "analytical_skills": {"weight": 0.25, "description": "Forecasting, optimization, statistical methods"},
            "supply_chain_knowledge": {"weight": 0.25, "description": "End-to-end supply chain understanding"},
            "risk_management": {"weight": 0.20, "description": "Disruption handling, contingency planning"},
            "tools_systems": {"weight": 0.15, "description": "ERP, SCM tools, data analysis"},
            "communication": {"weight": 0.15, "description": "Cross-functional collaboration, reporting"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral"],
    },

    "digital_marketing_analyst": {
        "label": "Digital Marketing Analyst",
        "category": "business",
        "description": "Ideal for digital marketing interviews and campaign strategy discussions. Perfect for practicing SEO, ad campaigns, and data-driven marketing optimization.",
        "tags": ["digital-marketing", "seo", "ppc", "analytics", "campaigns", "growth"],
        "system_prompt": (
            "You are interviewing a Digital Marketing Analyst. Cover campaign strategy, "
            "analytics and attribution, SEO/SEM, social media marketing, conversion "
            "optimization, and marketing technology stack. Push for measurable results."
        ),
        "question_bank": [
            "Design a multi-channel marketing campaign for a B2B SaaS product launch.",
            "How do you set up marketing attribution to understand which channels drive conversions?",
            "Walk me through optimizing a Google Ads campaign with a declining ROAS.",
            "How do you design and analyze an A/B test for a landing page?",
            "Describe your approach to content marketing strategy and measuring its ROI.",
            "How do you handle a 50% budget cut while maintaining lead generation targets?",
            "Design a customer acquisition funnel and the metrics you'd track at each stage.",
        ],
        "evaluation_criteria": {
            "analytics": {"weight": 0.25, "description": "Data analysis, attribution, experimentation"},
            "channel_expertise": {"weight": 0.25, "description": "SEO, PPC, social, email, content"},
            "strategy": {"weight": 0.20, "description": "Campaign planning, audience targeting"},
            "optimization": {"weight": 0.15, "description": "CRO, funnel optimization, budget allocation"},
            "communication": {"weight": 0.15, "description": "Reporting, stakeholder presentations"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral"],
    },

    "seo_specialist": {
        "label": "SEO Specialist",
        "category": "business",
        "description": "Technical SEO audits, on-page optimization, content strategy, backlinks, and measurement.",
        "tags": ["seo", "technical-seo", "on-page", "backlinks", "content-strategy", "analytics"],
        "system_prompt": (
            "You are interviewing an SEO Specialist. Cover technical SEO auditing, "
            "on-page optimization, content strategy, link building, Core Web Vitals, "
            "structured data, and search analytics. Push for real ranking improvements "
            "with concrete numbers."
        ),
        "question_bank": [
            "Walk me through a technical SEO audit for a 100K-page e-commerce site.",
            "How do you prioritize SEO fixes when technical, content, and link issues all exist?",
            "Design a content strategy to rank for a competitive keyword cluster.",
            "How do you diagnose and fix a sudden 30% traffic drop?",
            "Walk me through implementing structured data (schema markup) for an e-commerce site.",
            "How do you measure the ROI of SEO investment compared to paid channels?",
            "Describe your approach to international SEO with hreflang and geo-targeting.",
        ],
        "evaluation_criteria": {
            "technical_seo": {"weight": 0.25, "description": "Crawling, indexing, site architecture, Core Web Vitals"},
            "content_strategy": {"weight": 0.25, "description": "Keyword research, content optimization, topical authority"},
            "analytics": {"weight": 0.20, "description": "Search Console, GA4, ranking tracking"},
            "link_building": {"weight": 0.15, "description": "Ethical outreach, digital PR, authority building"},
            "communication": {"weight": 0.15, "description": "Reporting, stakeholder education"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["behavioral"],
    },

    "saas_product_manager": {
        "label": "SaaS Product Manager",
        "category": "business",
        "description": "Perfect for SaaS product management interviews and cloud-based product strategy discussions. Ideal for practicing feature prioritization, PLG, and SaaS metrics.",
        "tags": ["saas", "product-management", "plg", "product-led-growth", "metrics", "subscription"],
        "system_prompt": (
            "You are interviewing a SaaS Product Manager. Cover product-led growth, "
            "SaaS metrics (MRR, churn, LTV/CAC, NDR), pricing strategy, feature "
            "prioritization, onboarding optimization, and B2B product management. "
            "Push for concrete examples with numbers."
        ),
        "question_bank": [
            "Design a product-led growth onboarding flow for a B2B SaaS analytics tool.",
            "How do you diagnose and reduce churn when it increases from 3% to 5% monthly?",
            "Walk me through pricing strategy design for a SaaS product with 3 tiers.",
            "How do you prioritize between self-serve vs enterprise features?",
            "Design a metrics dashboard for a SaaS business — what are the critical health indicators?",
            "Tell me about a feature you launched that significantly improved activation rate.",
            "How do you balance technical debt reduction with feature development in a SaaS product?",
        ],
        "evaluation_criteria": {
            "saas_metrics": {"weight": 0.25, "description": "MRR, churn, LTV, CAC, NDR understanding"},
            "product_strategy": {"weight": 0.25, "description": "PLG, pricing, positioning"},
            "execution": {"weight": 0.20, "description": "Roadmap, prioritization, cross-functional delivery"},
            "user_insights": {"weight": 0.15, "description": "Research methods, data-informed decisions"},
            "communication": {"weight": 0.15, "description": "Stakeholder management, product presentations"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["product", "behavioral"],
    },

    "technical_writer": {
        "label": "Technical Writer",
        "category": "business",
        "description": "Perfect for technical writing interviews and documentation reviews. Ideal for practicing clear, structured manuals, API references, and user guides.",
        "tags": ["technical-writing", "documentation", "api-docs", "user-guides", "style-guides"],
        "system_prompt": (
            "You are interviewing a Technical Writer. Cover documentation strategy, "
            "API documentation, user guide creation, style guide usage, audience analysis, "
            "and docs-as-code workflows. Evaluate writing clarity and information architecture."
        ),
        "question_bank": [
            "How would you document a complex API with 50+ endpoints for developer and non-technical audiences?",
            "Walk me through your process for creating documentation for a feature that's still being developed.",
            "How do you measure the effectiveness of documentation?",
            "Describe your approach to information architecture for a product with 200+ help articles.",
            "How do you handle conflicting feedback from engineers, designers, and product managers?",
            "Design a docs-as-code workflow integrated with CI/CD for automated publishing.",
            "Critique a piece of technical documentation — what makes it good or bad?",
        ],
        "evaluation_criteria": {
            "writing_clarity": {"weight": 0.30, "description": "Clear, concise, accurate technical writing"},
            "information_architecture": {"weight": 0.25, "description": "Organization, navigation, findability"},
            "audience_awareness": {"weight": 0.20, "description": "Adapting content for different expertise levels"},
            "process": {"weight": 0.15, "description": "Docs-as-code, collaboration, version control"},
            "tools": {"weight": 0.10, "description": "Markdown, API doc tools, static site generators"},
        },
        "difficulty_modifier": -1,
        "focus_areas": ["behavioral"],
    },

    # ─── ADDITIONAL SPECIALIZED ───────────────────────────────────
    "leetcode_algorithm": {
        "label": "LeetCode-Style Algorithm Challenges",
        "category": "engineering",
        "description": "Perfect for algorithmic coding interviews and problem-solving practice. Ideal for mastering LeetCode-style challenges with brute force, optimization, and time/space complexity analysis.",
        "tags": ["leetcode", "algorithms", "data-structures", "coding-challenge", "competitive-programming"],
        "system_prompt": (
            "You are a coding interviewer presenting LeetCode-style algorithm challenges. "
            "Start with problem description, probe for clarifying questions, evaluate "
            "brute force first, then push for optimization. Focus on time/space complexity "
            "analysis and edge case handling."
        ),
        "question_bank": [
            "Given a rotated sorted array, find the minimum element in O(log n).",
            "Implement a trie (prefix tree) and design word search with wildcard support.",
            "Find the median of two sorted arrays in O(log(min(m,n))) time.",
            "Design an algorithm to serialize and deserialize a binary tree.",
            "Given n intervals, find the minimum number of rooms required for all meetings.",
            "Implement a function to find all valid combinations of parens for n pairs.",
            "Design a data structure that supports insert, delete, and getRandom in O(1).",
            "Find the longest increasing subsequence in an array.",
        ],
        "evaluation_criteria": {
            "problem_solving": {"weight": 0.30, "description": "Pattern recognition, approach selection"},
            "coding": {"weight": 0.25, "description": "Clean, correct implementation"},
            "complexity_analysis": {"weight": 0.20, "description": "Time/space analysis, optimization"},
            "edge_cases": {"weight": 0.15, "description": "Boundary conditions, empty inputs, overflow"},
            "communication": {"weight": 0.10, "description": "Thinking aloud, explaining approach"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding"],
    },

    "cognitive_behavioral_coach": {
        "label": "Cognitive Behavioral Coach",
        "category": "behavioral",
        "description": "Ideal for mindset reframing and productivity coaching sessions. Perfect for practicing cognitive behavioral techniques and building sustainable confidence.",
        "tags": ["coaching", "cbt", "mindset", "confidence", "interview-anxiety", "reframing"],
        "system_prompt": (
            "You are a cognitive behavioral coach helping the candidate prepare mentally "
            "for interviews. Guide them through reframing negative thoughts, building "
            "confidence, managing anxiety, and developing sustainable preparation habits. "
            "Use CBT techniques and motivational interviewing."
        ),
        "question_bank": [
            "What's your biggest fear about the upcoming interview, and what evidence supports or contradicts it?",
            "Walk me through your inner dialogue when you get a question you can't answer immediately.",
            "How do you recover mentally after what you perceive as a bad interview?",
            "What would you tell a friend in your exact situation right now?",
            "Describe a time you overcame a challenge you initially thought was too hard — what shifted?",
            "What does your ideal interview performance look like, and what's one step toward it today?",
            "How do you distinguish between productive preparation and anxiety-driven over-preparation?",
        ],
        "evaluation_criteria": {
            "self_awareness": {"weight": 0.30, "description": "Ability to identify thought patterns and triggers"},
            "reframing_skill": {"weight": 0.25, "description": "Cognitive restructuring, evidence-based thinking"},
            "action_orientation": {"weight": 0.20, "description": "Converting insights into concrete steps"},
            "resilience": {"weight": 0.15, "description": "Bounce-back strategies, growth mindset"},
            "authenticity": {"weight": 0.10, "description": "Genuine reflection, not performative answers"},
        },
        "difficulty_modifier": -1,
        "focus_areas": ["behavioral"],
    },

    "reverse_engineer": {
        "label": "Reverse Engineer (Black Box Thinking)",
        "category": "specialized",
        "description": "Perfect for reverse engineering interviews and black box debugging. Ideal for practicing pattern deduction, system analysis, and forensic thinking.",
        "tags": ["reverse-engineering", "black-box", "debugging", "forensics", "binary-analysis"],
        "system_prompt": (
            "You are interviewing a Reverse Engineer. Cover binary analysis, protocol "
            "reverse engineering, black-box testing, malware analysis, decompilation, "
            "and systematic deduction from behavior. Push for methodical approaches "
            "to understanding unknown systems."
        ),
        "question_bank": [
            "You're given a binary with no documentation — walk me through your analysis approach.",
            "How do you reverse engineer a network protocol from captured traffic?",
            "Design a methodology for understanding an obfuscated API through black-box testing.",
            "Walk me through static vs dynamic analysis trade-offs for malware analysis.",
            "How do you identify and exploit a vulnerability in a compiled binary?",
            "Describe your approach to reverse engineering a file format from sample files.",
            "How do you document and share reverse engineering findings with your team?",
        ],
        "evaluation_criteria": {
            "methodology": {"weight": 0.25, "description": "Systematic approach to unknown systems"},
            "technical_skills": {"weight": 0.25, "description": "Assembly, decompilers, debuggers"},
            "pattern_recognition": {"weight": 0.20, "description": "Identifying structures, protocols, behaviors"},
            "tool_proficiency": {"weight": 0.15, "description": "IDA, Ghidra, Wireshark, x64dbg"},
            "documentation": {"weight": 0.15, "description": "Clear communication of findings"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["coding"],
    },

    "tech_support_engineer": {
        "label": "Tech Support Engineer",
        "category": "specialized",
        "description": "Perfect for tech support engineering interviews and customer success discussions. Ideal for practicing troubleshooting, ticket resolution, and customer communication.",
        "tags": ["tech-support", "troubleshooting", "customer-success", "help-desk", "escalation"],
        "system_prompt": (
            "You are interviewing a Tech Support Engineer. Cover systematic troubleshooting, "
            "customer communication, ticket prioritization, knowledge base management, "
            "and escalation procedures. Evaluate both technical capability and customer empathy."
        ),
        "question_bank": [
            "Walk me through troubleshooting a customer reporting 'the app is slow' with no other details.",
            "How do you prioritize when you have 20 open tickets and 5 are marked urgent?",
            "Describe your approach to creating a knowledge base article for a known recurring issue.",
            "How do you handle an angry customer who has been transferred three times?",
            "Walk me through debugging a complex integration issue between two SaaS products.",
            "How do you decide when to escalate vs continue troubleshooting?",
            "Design a support process for a product launch expecting 3x normal ticket volume.",
        ],
        "evaluation_criteria": {
            "troubleshooting": {"weight": 0.25, "description": "Systematic debugging, root cause analysis"},
            "customer_communication": {"weight": 0.25, "description": "Empathy, clarity, de-escalation"},
            "technical_depth": {"weight": 0.20, "description": "Understanding of systems, logs, APIs"},
            "process": {"weight": 0.15, "description": "Prioritization, documentation, escalation"},
            "knowledge_sharing": {"weight": 0.15, "description": "KB articles, runbooks, team training"},
        },
        "difficulty_modifier": -1,
        "focus_areas": ["behavioral"],
    },

    "big_data_engineer": {
        "label": "Big Data Engineer",
        "category": "data",
        "description": "Perfect for big data engineering interviews and data pipeline discussions. Ideal for practicing scalable data processing, real-time streaming, and distributed computing.",
        "tags": ["big-data", "hadoop", "spark", "kafka", "flink", "data-lake"],
        "system_prompt": (
            "You are interviewing a Big Data Engineer. Cover distributed data processing "
            "(Hadoop, Spark), real-time streaming (Kafka, Flink), data lake architecture, "
            "performance optimization, and data governance at scale. Push for concrete "
            "experience with petabyte-scale systems."
        ),
        "question_bank": [
            "Design a data processing pipeline for 100TB/day of IoT sensor data.",
            "How do you optimize a Spark job with heavy data skew on join operations?",
            "Walk me through choosing between Kafka Streams, Flink, and Spark Streaming.",
            "Design a data lake architecture with proper zones (bronze/silver/gold).",
            "How do you handle exactly-once processing in a distributed streaming pipeline?",
            "Describe your approach to managing a Hadoop/Spark cluster for cost efficiency.",
            "Design a real-time anomaly detection system processing 1M events per second.",
        ],
        "evaluation_criteria": {
            "distributed_computing": {"weight": 0.25, "description": "Spark, Flink, distributed SQL deep knowledge"},
            "architecture": {"weight": 0.25, "description": "Data lake, warehouse, pipeline design"},
            "optimization": {"weight": 0.20, "description": "Performance tuning, skew handling, partitioning"},
            "streaming": {"weight": 0.15, "description": "Real-time processing, windowing, state management"},
            "reliability": {"weight": 0.15, "description": "Fault tolerance, monitoring, data quality"},
        },
        "difficulty_modifier": 1,
        "focus_areas": ["system-design", "coding"],
    },

    "analytics_engineer": {
        "label": "Analytics Engineer (dbt/Warehouse)",
        "category": "data",
        "description": "Modeling, transformations, semantic layer, testing, documentation.",
        "tags": ["analytics-engineering", "dbt", "warehouse", "semantic-layer", "data-modeling"],
        "system_prompt": (
            "You are interviewing an Analytics Engineer. Cover dbt modeling best practices, "
            "dimensional modeling, semantic layer design, data testing frameworks, "
            "documentation, and stakeholder partnership. Push for clean modeling "
            "techniques and reproducible analytics."
        ),
        "question_bank": [
            "Design a dbt project structure for a company with 5 data sources and 50 business models.",
            "How do you implement slowly changing dimensions (SCD) in dbt?",
            "Walk me through your testing strategy for a critical revenue metrics model.",
            "Design a semantic layer that enables self-service analytics for business users.",
            "How do you handle breaking changes in upstream data sources?",
            "Describe your approach to documenting data models for non-technical stakeholders.",
            "Design a data freshness monitoring and alerting system for analytics pipelines.",
        ],
        "evaluation_criteria": {
            "data_modeling": {"weight": 0.30, "description": "Dimensional modeling, star schema, normalization"},
            "dbt_proficiency": {"weight": 0.25, "description": "Macros, incremental models, testing"},
            "data_quality": {"weight": 0.20, "description": "Testing, validation, freshness monitoring"},
            "documentation": {"weight": 0.15, "description": "Model docs, lineage, business glossary"},
            "collaboration": {"weight": 0.10, "description": "Stakeholder partnership, self-service enabling"},
        },
        "difficulty_modifier": 0,
        "focus_areas": ["coding", "system-design"],
    },
}


# ────────────────────────────────────────────────────────────────────
# PUBLIC API  (consumed by routes and engine)
# ────────────────────────────────────────────────────────────────────

def normalize_scenario(scenario_id: str | None) -> str | None:
    """Return None when unset, or the canonical key when valid."""
    if not scenario_id:
        return None
    candidate = str(scenario_id).strip().lower()
    return candidate if candidate in SCENARIOS else None


def get_scenario(scenario_id: str | None) -> dict | None:
    """Return full scenario dict or None."""
    key = normalize_scenario(scenario_id)
    return SCENARIOS.get(key) if key else None


def get_scenario_prompt(scenario_id: str | None) -> str:
    """Build a prompt fragment that can be injected into any LLM call."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        return ""
    criteria_lines = "\n".join(
        f"  - {name} ({int(c['weight']*100)}%): {c['description']}"
        for name, c in scenario["evaluation_criteria"].items()
    )
    return (
        f"\n[Scenario: {scenario['label']}]\n"
        f"{scenario['system_prompt']}\n"
        f"Focus areas: {', '.join(scenario['focus_areas'])}.\n"
        f"Evaluation criteria:\n{criteria_lines}\n"
    )


def get_scenario_question_bank(scenario_id: str | None) -> list[str]:
    """Return the curated question bank for a scenario, or empty list."""
    scenario = get_scenario(scenario_id)
    return list(scenario["question_bank"]) if scenario else []


def get_scenario_eval_criteria(scenario_id: str | None) -> dict:
    """Return evaluation criteria dict or empty."""
    scenario = get_scenario(scenario_id)
    return dict(scenario["evaluation_criteria"]) if scenario else {}


def list_scenarios() -> list[dict]:
    """Return all scenarios grouped-ready, sorted by category then label."""
    items: list[dict] = []
    for key, s in SCENARIOS.items():
        items.append({
            "id": key,
            "label": s["label"],
            "category": s["category"],
            "description": s["description"],
            "tags": s["tags"],
            "focus_areas": s["focus_areas"],
            "difficulty_modifier": s["difficulty_modifier"],
            "question_count": len(s["question_bank"]),
        })
    items.sort(key=lambda x: (x["category"], x["label"].lower()))
    return items


def list_scenario_categories() -> list[dict]:
    """Return category metadata for UI grouping."""
    return list(SCENARIO_CATEGORIES)
