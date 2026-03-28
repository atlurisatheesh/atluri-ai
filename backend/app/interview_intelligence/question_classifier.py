"""
Question Classifier — Full Taxonomy + Framework Auto-Router
Classifies any interview question into 10+ types and auto-selects the optimal answer framework.
"""

from __future__ import annotations
import re
from enum import Enum
from dataclasses import dataclass


class QuestionType(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    SYSTEM_DESIGN = "system_design"
    CASE_STUDY = "case_study"
    PRODUCT = "product"
    SITUATIONAL = "situational"
    MOTIVATION_FIT = "motivation_fit"
    SALARY_NEGOTIATION = "salary_negotiation"
    STRESS_TRICK = "stress_trick"
    QUESTIONS_FOR_INTERVIEWER = "questions_for_interviewer"
    ONLINE_ASSESSMENT = "online_assessment"
    LEADERSHIP = "leadership"
    UNKNOWN = "unknown"


class AnswerFramework(str, Enum):
    STAR = "STAR"
    STAR_L = "STAR-L"              # STAR + Learnings (failure questions)
    CAR = "CAR"                    # Context-Action-Result (shorter behavioral)
    THINK_ALOUD = "Think-Aloud"    # Coding / problem-solving
    ISSUE_TREE = "Issue-Tree"      # Consulting / case
    PAST_PRESENT_FUTURE = "Past-Present-Future"  # "Tell me about yourself"
    WHY_HOW_WHAT = "Why-How-What"  # Motivation / vision
    CIRCLES = "CIRCLES"            # PM product design
    MECE = "MECE"                  # Structured analysis
    PYRAMID = "Pyramid-Principle"  # Executive-level
    PREP = "PREP"                  # Point-Reason-Example-Point


class DifficultyLevel(str, Enum):
    BASELINE = "baseline"
    PROBING = "probing"
    STRESS = "stress"
    TRICK = "trick"


# Behavioral sub-types
class BehavioralCompetency(str, Enum):
    LEADERSHIP = "leadership_influence"
    CONFLICT = "conflict_resolution"
    FAILURE = "failure_learning"
    AMBIGUITY = "ambiguity_decisions"
    COLLABORATION = "collaboration"
    STAKEHOLDER = "customer_stakeholder"
    INNOVATION = "innovation"
    PRIORITIZATION = "prioritization"


@dataclass
class ClassificationResult:
    question_type: QuestionType
    sub_type: str
    competency: str
    difficulty: DifficultyLevel
    framework: AnswerFramework
    secondary_framework: AnswerFramework | None
    confidence: float
    max_answer_seconds: int
    coaching_note: str


# ── Trigger pattern registry ──────────────────────────────────────────

_BEHAVIORAL_TRIGGERS = [
    r"tell me about a time",
    r"give me an example",
    r"describe a situation",
    r"walk me through a time",
    r"share an experience",
    r"can you recall",
    r"have you ever had to",
    r"what did you do when",
    r"how did you handle",
    r"describe a challenge",
]

_FAILURE_TRIGGERS = [
    r"fail(ed|ure)?",
    r"mistake",
    r"wrong",
    r"didn.t work",
    r"went badly",
    r"learned from",
    r"what.s your (biggest|greatest) weakness",
]

_TECHNICAL_TRIGGERS = [
    r"implement",
    r"algorithm",
    r"data structure",
    r"time complexity",
    r"space complexity",
    r"big[\s-]?o",
    r"write (a |the )?(code|function|method|class)",
    r"debug",
    r"optimize",
    r"binary (search|tree)",
    r"hash (map|table|set)",
    r"linked list",
    r"dynamic programming",
    r"recursion",
    r"sort(ing)?",
    r"(bfs|dfs|breadth|depth)[\s-]?first",
    r"sql query",
    r"api (design|endpoint)",
]

_SYSTEM_DESIGN_TRIGGERS = [
    r"design (a |an )?system",
    r"architect(ure)?",
    r"scale (to|for)",
    r"million(s)? (of )?(users|requests|qps)",
    r"high availability",
    r"(url|link) shortener",
    r"design (twitter|netflix|uber|whatsapp|instagram|youtube|slack)",
    r"microservice",
    r"distributed",
    r"load balanc",
    r"caching (strategy|layer)",
    r"message queue",
    r"database (schema|design|shard)",
]

_CASE_STUDY_TRIGGERS = [
    r"market siz(e|ing)",
    r"how many .+ in",
    r"estimate (the|how)",
    r"profitab(le|ility)",
    r"market entry",
    r"acqui(re|sition)",
    r"due diligence",
    r"growth strategy",
    r"(revenue|cost) (declin|increas|drop)",
    r"business (problem|case|model)",
]

_PRODUCT_TRIGGERS = [
    r"design (a |an )?(product|feature|app)",
    r"improve (google|facebook|amazon|spotify)",
    r"dau (drop|declin|increas)",
    r"(success )?metrics? (for|of|to measure)",
    r"prioriti(ze|zation)",
    r"roadmap",
    r"go[\s-]?to[\s-]?market",
    r"product[\s-]?market[\s-]?fit",
    r"a\/b test",
    r"user (research|persona|journey)",
    r"feature (request|priorit)",
]

_SITUATIONAL_TRIGGERS = [
    r"what would you do if",
    r"how would you handle",
    r"imagine (that|you)",
    r"suppose (that|you)",
    r"hypothetically",
    r"if you were (asked|told|given)",
    r"what.s your approach (to|for|if)",
]

_MOTIVATION_TRIGGERS = [
    r"why (this|our) (company|role|team|position)",
    r"why (do you|are you) (want|interested|applying|leaving)",
    r"tell me about yourself",
    r"walk me through your (resume|background|career)",
    r"where do you see yourself",
    r"(career|professional) goals",
    r"what motivates you",
    r"why should we hire you",
    r"what (makes|sets) you (different|apart|unique)",
]

_SALARY_TRIGGERS = [
    r"salary (expectation|requirement|range)",
    r"compensation",
    r"how much (do you|are you) (expect|make|earn|looking)",
    r"current (salary|pay|compensation)",
    r"total comp",
    r"equity",
    r"(base|bonus|stock|rsu)",
]

_STRESS_TRICK_TRIGGERS = [
    r"(greatest|biggest) weakness",
    r"sell me th(is|at) pen",
    r"why (shouldn.t|should) we (not )?hire you",
    r"(what|how) (are|do) you (worst|bad|terrible) at",
    r"if you were (a|an) (animal|color|tree|food)",
    r"rate yourself",
    r"brainteas(er|ing)",
    r"how many (golf|tennis|piano) balls",
    r"(manhole|coin|egg) (cover|problem|drop)",
]

_LEADERSHIP_TRIGGERS = [
    r"(led|lead|managed|mentored|coached) (a )?team",
    r"cross[\s-]?functional",
    r"strategic (decision|initiative|direction)",
    r"executive (stakeholder|leadership|sponsor)",
    r"org(anization)? (change|transform|restructur)",
    r"(built|grew|scaled) (a |the )?(team|org|department)",
    r"(hire|fired|performance review|difficult conversation)",
]

_OA_TRIGGERS = [
    r"given (an )?array",
    r"given (a )?string",
    r"given (a )?matrix",
    r"return (the|an?)",
    r"find (the|all) (maximum|minimum|longest|shortest|kth)",
    r"input\s*:",
    r"output\s*:",
    r"example\s*\d?\s*:",
    r"constraints?\s*:",
]

# ── Competency detection (for behavioral sub-typing) ──────────────────

_COMPETENCY_PATTERNS: dict[BehavioralCompetency, list[str]] = {
    BehavioralCompetency.LEADERSHIP: [r"lead", r"mentor", r"coach", r"influence", r"delegate"],
    BehavioralCompetency.CONFLICT: [r"conflict", r"disagree", r"difficult (person|colleague|teammate)", r"push\s?back"],
    BehavioralCompetency.FAILURE: [r"fail", r"mistake", r"wrong", r"learn.+from"],
    BehavioralCompetency.AMBIGUITY: [r"ambigu", r"unclear", r"uncertain", r"pressure", r"ambiguous"],
    BehavioralCompetency.COLLABORATION: [r"collaborat", r"team", r"cross[\s-]?functional", r"partner"],
    BehavioralCompetency.STAKEHOLDER: [r"stakeholder", r"client", r"customer", r"executive"],
    BehavioralCompetency.INNOVATION: [r"innovat", r"creative", r"novel", r"new approach", r"initiative"],
    BehavioralCompetency.PRIORITIZATION: [r"prioriti", r"deadline", r"multiple (task|project)", r"time (manag|constrain)"],
}

# ── Framework routing table ───────────────────────────────────────────

_TYPE_TO_FRAMEWORK: dict[QuestionType, AnswerFramework] = {
    QuestionType.BEHAVIORAL: AnswerFramework.STAR,
    QuestionType.TECHNICAL: AnswerFramework.THINK_ALOUD,
    QuestionType.SYSTEM_DESIGN: AnswerFramework.THINK_ALOUD,
    QuestionType.CASE_STUDY: AnswerFramework.ISSUE_TREE,
    QuestionType.PRODUCT: AnswerFramework.CIRCLES,
    QuestionType.SITUATIONAL: AnswerFramework.PREP,
    QuestionType.MOTIVATION_FIT: AnswerFramework.PAST_PRESENT_FUTURE,
    QuestionType.SALARY_NEGOTIATION: AnswerFramework.PREP,
    QuestionType.STRESS_TRICK: AnswerFramework.STAR_L,
    QuestionType.LEADERSHIP: AnswerFramework.STAR,
    QuestionType.ONLINE_ASSESSMENT: AnswerFramework.THINK_ALOUD,
    QuestionType.QUESTIONS_FOR_INTERVIEWER: AnswerFramework.WHY_HOW_WHAT,
    QuestionType.UNKNOWN: AnswerFramework.PREP,
}

_TYPE_TO_SECONDARY: dict[QuestionType, AnswerFramework | None] = {
    QuestionType.BEHAVIORAL: AnswerFramework.CAR,
    QuestionType.TECHNICAL: None,
    QuestionType.SYSTEM_DESIGN: AnswerFramework.MECE,
    QuestionType.CASE_STUDY: AnswerFramework.MECE,
    QuestionType.PRODUCT: AnswerFramework.MECE,
    QuestionType.SITUATIONAL: AnswerFramework.STAR,
    QuestionType.MOTIVATION_FIT: AnswerFramework.WHY_HOW_WHAT,
    QuestionType.SALARY_NEGOTIATION: None,
    QuestionType.STRESS_TRICK: AnswerFramework.PREP,
    QuestionType.LEADERSHIP: AnswerFramework.PYRAMID,
    QuestionType.ONLINE_ASSESSMENT: None,
    QuestionType.QUESTIONS_FOR_INTERVIEWER: None,
    QuestionType.UNKNOWN: None,
}

# ── Max answer time per type (seconds) ────────────────────────────────

_TYPE_TO_MAX_SECONDS: dict[QuestionType, int] = {
    QuestionType.BEHAVIORAL: 120,
    QuestionType.TECHNICAL: 300,
    QuestionType.SYSTEM_DESIGN: 600,
    QuestionType.CASE_STUDY: 300,
    QuestionType.PRODUCT: 240,
    QuestionType.SITUATIONAL: 120,
    QuestionType.MOTIVATION_FIT: 90,
    QuestionType.SALARY_NEGOTIATION: 60,
    QuestionType.STRESS_TRICK: 90,
    QuestionType.LEADERSHIP: 150,
    QuestionType.ONLINE_ASSESSMENT: 900,
    QuestionType.QUESTIONS_FOR_INTERVIEWER: 60,
    QuestionType.UNKNOWN: 120,
}

_TYPE_TO_COACHING: dict[QuestionType, str] = {
    QuestionType.BEHAVIORAL: "Use STAR structure: Situation → Task → Action → Result. Lead with the outcome.",
    QuestionType.TECHNICAL: "Think aloud: Clarify → Brute Force → Optimize → Code → Test. State time/space complexity.",
    QuestionType.SYSTEM_DESIGN: "Cover: Requirements → Scale → Components → Data Model → APIs → Trade-offs → Bottlenecks.",
    QuestionType.CASE_STUDY: "Use Issue Tree: Structure → Hypothesis → Data → Synthesis → Recommendation.",
    QuestionType.PRODUCT: "Use CIRCLES: Comprehend → Identify → Report → Cut → List → Evaluate → Summarize.",
    QuestionType.SITUATIONAL: "Acknowledge complexity → State principles → Walk through decision → Expected outcome.",
    QuestionType.MOTIVATION_FIT: "Past → Present → Future + Why Here. Keep to 90 seconds.",
    QuestionType.SALARY_NEGOTIATION: "Deflect in early rounds. In final rounds, anchor high with market data range.",
    QuestionType.STRESS_TRICK: "Reframe. Never answer weakness without a growth story. Show self-awareness.",
    QuestionType.LEADERSHIP: "Lead with team impact. Quantify: team size, revenue, scale. Show strategic thinking.",
    QuestionType.ONLINE_ASSESSMENT: "Read constraints first. Solve brute force → optimize. Cover ALL edge cases.",
    QuestionType.QUESTIONS_FOR_INTERVIEWER: "Ask about: team direction, success metrics, culture, challenges, company research.",
    QuestionType.UNKNOWN: "Structure your answer clearly. Use concrete examples with metrics.",
}


def _match_score(text: str, patterns: list[str]) -> float:
    """Count how many patterns match the text, return as a ratio 0..1."""
    text_lower = text.lower()
    hits = sum(1 for p in patterns if re.search(p, text_lower))
    return hits / max(len(patterns), 1)


def _detect_competency(text: str) -> tuple[str, BehavioralCompetency | None]:
    """Detect the behavioral competency being assessed."""
    best_comp = None
    best_score = 0.0
    for comp, patterns in _COMPETENCY_PATTERNS.items():
        score = _match_score(text, patterns)
        if score > best_score:
            best_score = score
            best_comp = comp
    if best_comp and best_score > 0:
        return best_comp.value, best_comp
    return "general", None


def _detect_difficulty(text: str) -> DifficultyLevel:
    """Infer difficulty level from question phrasing."""
    lower = text.lower()
    stress_markers = [r"be (more )?specific", r"what exactly", r"prove", r"challenge", r"push\s?back", r"disagree"]
    trick_markers = [r"sell me", r"greatest weakness", r"if you were a", r"brainteas"]
    probe_markers = [r"why (did|didn.t) you", r"what would you have done differently", r"elaborate", r"drill (down|deeper)"]

    if any(re.search(p, lower) for p in trick_markers):
        return DifficultyLevel.TRICK
    if any(re.search(p, lower) for p in stress_markers):
        return DifficultyLevel.STRESS
    if any(re.search(p, lower) for p in probe_markers):
        return DifficultyLevel.PROBING
    return DifficultyLevel.BASELINE


def classify_question(question_text: str) -> ClassificationResult:
    """
    Classify an interview question into type, sub-type, competency, difficulty,
    and auto-select the optimal answer framework. Runs in <1ms (no LLM call).
    """
    scores: dict[QuestionType, float] = {}

    type_patterns: list[tuple[QuestionType, list[str]]] = [
        (QuestionType.BEHAVIORAL, _BEHAVIORAL_TRIGGERS),
        (QuestionType.TECHNICAL, _TECHNICAL_TRIGGERS),
        (QuestionType.SYSTEM_DESIGN, _SYSTEM_DESIGN_TRIGGERS),
        (QuestionType.CASE_STUDY, _CASE_STUDY_TRIGGERS),
        (QuestionType.PRODUCT, _PRODUCT_TRIGGERS),
        (QuestionType.SITUATIONAL, _SITUATIONAL_TRIGGERS),
        (QuestionType.MOTIVATION_FIT, _MOTIVATION_TRIGGERS),
        (QuestionType.SALARY_NEGOTIATION, _SALARY_TRIGGERS),
        (QuestionType.STRESS_TRICK, _STRESS_TRICK_TRIGGERS),
        (QuestionType.LEADERSHIP, _LEADERSHIP_TRIGGERS),
        (QuestionType.ONLINE_ASSESSMENT, _OA_TRIGGERS),
    ]

    for qtype, patterns in type_patterns:
        scores[qtype] = _match_score(question_text, patterns)

    # Check for failure sub-type override
    is_failure = _match_score(question_text, _FAILURE_TRIGGERS) > 0.1

    # Winner
    best_type = max(scores, key=lambda k: scores[k])
    best_score = scores[best_type]

    if best_score < 0.05:
        best_type = QuestionType.UNKNOWN

    # Competency detection
    competency_label, _ = _detect_competency(question_text)

    # Framework routing (with failure override)
    framework = _TYPE_TO_FRAMEWORK[best_type]
    if is_failure and best_type == QuestionType.BEHAVIORAL:
        framework = AnswerFramework.STAR_L

    # "Tell me about yourself" override
    lower = question_text.lower()
    if re.search(r"tell me about yourself", lower):
        framework = AnswerFramework.PAST_PRESENT_FUTURE
        best_type = QuestionType.MOTIVATION_FIT

    # Sub-type label
    sub_type = best_type.value
    if best_type == QuestionType.BEHAVIORAL and is_failure:
        sub_type = "behavioral_failure"
    elif best_type == QuestionType.BEHAVIORAL:
        sub_type = f"behavioral_{competency_label}"

    return ClassificationResult(
        question_type=best_type,
        sub_type=sub_type,
        competency=competency_label,
        difficulty=_detect_difficulty(question_text),
        framework=framework,
        secondary_framework=_TYPE_TO_SECONDARY.get(best_type),
        confidence=min(best_score * 5, 1.0),  # Normalize to 0..1
        max_answer_seconds=_TYPE_TO_MAX_SECONDS[best_type],
        coaching_note=_TYPE_TO_COACHING[best_type],
    )


def get_framework_instructions(framework: AnswerFramework) -> str:
    """Return structured instructions for the given answer framework."""
    instructions: dict[AnswerFramework, str] = {
        AnswerFramework.STAR: (
            "Structure: Situation (context, 1-2 sentences) → Task (your responsibility) → "
            "Action (specific steps YOU took, 60% of answer) → Result (quantified outcome). "
            "Lead with the outcome for senior roles."
        ),
        AnswerFramework.STAR_L: (
            "Structure: Situation → Task → Action → Result → Learning. "
            "Acknowledge the failure honestly, then show growth. End with what you learned "
            "and how you applied it since."
        ),
        AnswerFramework.CAR: (
            "Structure: Context (brief setup) → Action (what you did) → Result (impact). "
            "More concise than STAR. Use when story is straightforward."
        ),
        AnswerFramework.THINK_ALOUD: (
            "Structure: Clarify constraints → Brute force approach → Optimize → Code → Test. "
            "State time/space complexity for EVERY solution. Think out loud throughout."
        ),
        AnswerFramework.ISSUE_TREE: (
            "Structure: Break problem into MECE branches → Form hypothesis → Gather data → "
            "Synthesize findings → Deliver recommendation. Number your branches."
        ),
        AnswerFramework.PAST_PRESENT_FUTURE: (
            "Structure: Past (relevant background, 20s) → Present (current focus, 30s) → "
            "Future (why this role/company, 30s). Total: 90 seconds max."
        ),
        AnswerFramework.WHY_HOW_WHAT: (
            "Structure: Why (your purpose/motivation) → How (your approach/values) → "
            "What (concrete plans/actions). Align with company mission."
        ),
        AnswerFramework.CIRCLES: (
            "Structure: Comprehend situation → Identify users → Report needs → "
            "Cut through prioritization → List solutions → Evaluate trade-offs → Summarize."
        ),
        AnswerFramework.MECE: (
            "Ensure your analysis is Mutually Exclusive, Collectively Exhaustive. "
            "No overlaps, no gaps. Present in numbered branches."
        ),
        AnswerFramework.PYRAMID: (
            "Lead with conclusion/recommendation first, then supporting arguments, "
            "then evidence. Executive-friendly: answer first, detail second."
        ),
        AnswerFramework.PREP: (
            "Structure: Point (your position) → Reason (why) → Example (concrete proof) → "
            "Point (restate). Clear and decisive."
        ),
    }
    return instructions.get(framework, "Structure your answer clearly with concrete examples.")
