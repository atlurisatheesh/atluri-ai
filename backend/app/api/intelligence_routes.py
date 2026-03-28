"""
Interview Intelligence API Routes — Exposes all interview intelligence
features: question classification, context map, JD analysis, follow-up
prediction, interviewer questions, competency radar, and session privacy.
"""

from __future__ import annotations
import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.interview_intelligence.question_classifier import (
    classify_question,
    get_framework_instructions,
    QuestionType,
    AnswerFramework,
)
from app.interview_intelligence.followup_predictor import (
    predict_followups,
    predictions_to_dict,
)
from app.interview_intelligence.key_phrase_extractor import extract_key_phrase
from app.interview_intelligence.context_map_generator import (
    generate_context_map,
    context_map_to_dict,
)
from app.interview_intelligence.jd_signal_decoder import (
    analyze_job_description,
    jd_analysis_to_dict,
)
from app.interview_intelligence.questions_to_ask import (
    generate_interviewer_questions,
    questions_to_dict,
)
from app.interview_intelligence.competency_scorer import (
    build_competency_radar,
    radar_to_dict,
)
from app.interview_intelligence.speech_metrics import (
    SpeechMetricsEngine,
    snapshot_to_dict,
    snapshot_to_coaching_chips,
)
from app.interview_intelligence.recovery_engine import (
    RecoveryEngine,
    recovery_to_dict,
)
from app.interview_intelligence.session_auto_wipe import get_auto_wiper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/intelligence", tags=["interview-intelligence"])


# ── Request / Response Models ─────────────────────────────────────────

class ClassifyRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)


class FollowUpRequest(BaseModel):
    current_question: str = Field(..., min_length=3)
    answer_summary: str = Field(default="")
    role: str = Field(default="Software Engineer")
    company: str = Field(default="General")
    interview_round: str = Field(default="Technical")
    questions_so_far: list[str] = Field(default_factory=list)


class KeyPhraseRequest(BaseModel):
    answer_text: str = Field(..., min_length=10)
    question_type: str = Field(default="general")
    framework: str = Field(default="STAR")


class ContextMapRequest(BaseModel):
    resume_text: str = Field(..., min_length=20)
    job_description: str = Field(..., min_length=20)
    company: str = Field(default="General")
    role: str = Field(default="Software Engineer")
    interview_round: str = Field(default="Technical")


class JDAnalyzeRequest(BaseModel):
    job_description: str = Field(..., min_length=20, max_length=10000)


class InterviewerQuestionsRequest(BaseModel):
    role: str = Field(default="Software Engineer")
    company: str = Field(default="General")
    interview_round: str = Field(default="Technical")
    topics_covered: list[str] = Field(default_factory=list)
    interviewer_info: str = Field(default="Unknown")


class CompetencyRequest(BaseModel):
    session_scores: dict = Field(default_factory=dict)
    question_types_answered: list[str] = Field(default_factory=list)
    speech_stats: dict | None = None


class RecoveryCheckRequest(BaseModel):
    question_text: str = Field(default="")
    answer_text: str = Field(default="")
    answer_duration: float = Field(default=0)
    silence_seconds: float = Field(default=0)


class SessionWipeRequest(BaseModel):
    session_id: str


# ── Classification Endpoint ──────────────────────────────────────────

@router.post("/classify")
async def classify_question_endpoint(req: ClassifyRequest):
    """
    Classify an interview question into type, sub-type, competency,
    difficulty, and auto-select the optimal answer framework.
    Returns classification + framework instructions in <1ms.
    """
    result = classify_question(req.question)
    return {
        "question_type": result.question_type.value,
        "sub_type": result.sub_type,
        "competency": result.competency,
        "difficulty": result.difficulty.value,
        "framework": result.framework.value,
        "secondary_framework": result.secondary_framework.value if result.secondary_framework else None,
        "framework_instructions": get_framework_instructions(result.framework),
        "confidence": result.confidence,
        "max_answer_seconds": result.max_answer_seconds,
        "coaching_note": result.coaching_note,
    }


# ── Follow-Up Prediction Endpoint ────────────────────────────────────

@router.post("/predict-followups")
async def predict_followups_endpoint(req: FollowUpRequest):
    """
    Predict the 3 most likely follow-up questions the interviewer
    will ask next, with answer skeletons.
    """
    prediction = await predict_followups(
        current_question=req.current_question,
        answer_summary=req.answer_summary,
        role=req.role,
        company=req.company,
        interview_round=req.interview_round,
        questions_so_far=req.questions_so_far,
    )
    return predictions_to_dict(prediction)


# ── Key Phrase Extraction ─────────────────────────────────────────────

@router.post("/key-phrase")
async def extract_key_phrase_endpoint(req: KeyPhraseRequest):
    """
    Extract the single most powerful opening sentence from an AI answer.
    The candidate says this IMMEDIATELY while reading the rest.
    """
    result = await extract_key_phrase(
        answer_text=req.answer_text,
        question_type=req.question_type,
        framework=req.framework,
    )
    return result


# ── Context Map Generation ────────────────────────────────────────────

@router.post("/context-map")
async def generate_context_map_endpoint(req: ContextMapRequest):
    """
    Generate a pre-interview intelligence briefing from resume + JD.
    Returns: top strengths, gaps, predicted questions, STAR stories,
    value proposition, red flags, company talking points.
    """
    context_map = await generate_context_map(
        resume_text=req.resume_text,
        job_description=req.job_description,
        company=req.company,
        role=req.role,
        interview_round=req.interview_round,
    )
    return context_map_to_dict(context_map)


# ── JD Signal Decoder ─────────────────────────────────────────────────

@router.post("/jd-analyze")
async def analyze_jd_endpoint(req: JDAnalyzeRequest):
    """
    Deep-analyze a job description for hidden cultural signals,
    red/green flags, seniority level, and interview format prediction.
    """
    analysis = analyze_job_description(req.job_description)
    raw = jd_analysis_to_dict(analysis)
    # Transform flat signals into categorized lists for frontend
    red_flags = []
    green_flags = []
    culture_signals = []
    salary_signals = []
    for s in raw.get("signals", []):
        entry = {
            "pattern": s.get("signal_type", ""),
            "match": s.get("phrase", ""),
            "interpretation": s.get("decoded_meaning", ""),
            "severity": s.get("severity", "medium"),
        }
        if s.get("signal_type") == "red_flag":
            red_flags.append(entry)
        elif s.get("signal_type") == "green_flag":
            green_flags.append(entry)
        elif s.get("signal_type") == "culture_signal":
            culture_signals.append(entry)
        elif s.get("signal_type") == "salary_signal":
            salary_signals.append(entry)
        else:
            red_flags.append(entry)  # default bucket
    return {
        "red_flags": red_flags,
        "green_flags": green_flags,
        "culture_signals": culture_signals,
        "hidden_requirements": raw.get("must_have_skills", []),
        "must_have_skills": raw.get("must_have_skills", []),
        "nice_to_have_skills": raw.get("nice_to_have_skills", []),
        "estimated_seniority": raw.get("estimated_seniority", "unknown"),
        "salary_signals": salary_signals,
        "culture_profile": raw.get("culture_profile", {}),
        "interview_format_prediction": raw.get("interview_format_prediction", []),
        "red_flag_score": raw.get("overall_red_flag_score", 0),
    }


# ── Questions to Ask Interviewer ──────────────────────────────────────

@router.post("/interviewer-questions")
async def interviewer_questions_endpoint(req: InterviewerQuestionsRequest):
    """
    Generate 5 intelligent, role-specific closing questions
    to ask the interviewer.
    """
    questions = await generate_interviewer_questions(
        role=req.role,
        company=req.company,
        interview_round=req.interview_round,
        topics_covered=req.topics_covered,
        interviewer_info=req.interviewer_info,
    )
    return {"questions": questions_to_dict(questions)}


# ── Competency Radar ──────────────────────────────────────────────────

@router.post("/competency-radar")
async def competency_radar_endpoint(req: CompetencyRequest):
    """
    Build a 6-dimension competency radar chart from session data.
    Returns scores for: Communication, Technical, Leadership,
    Problem-Solving, Culture Fit, Strategic Thinking.
    """
    radar = build_competency_radar(
        session_scores=req.session_scores,
        question_types_answered=req.question_types_answered,
        speech_stats=req.speech_stats,
    )
    return radar_to_dict(radar)


# ── Recovery Check ────────────────────────────────────────────────────

@router.post("/recovery-check")
async def recovery_check_endpoint(req: RecoveryCheckRequest):
    """
    Check if the candidate is struggling and needs recovery assistance.
    Returns bridge phrases, pivot strategies, and buy-time techniques.
    """
    engine = RecoveryEngine()
    if req.silence_seconds > 0:
        import time
        engine._last_speech_time = time.time() - req.silence_seconds

    packet = engine.check_all(
        question_text=req.question_text,
        answer_text=req.answer_text,
        answer_duration=req.answer_duration,
    )
    return {
        "recovery_needed": packet is not None,
        "recovery": recovery_to_dict(packet),
    }


# ── Question Type Taxonomy (list all types) ───────────────────────────

@router.get("/question-types")
async def list_question_types():
    """List all supported question types with their default frameworks."""
    types = []
    for qt in QuestionType:
        if qt == QuestionType.UNKNOWN:
            continue
        from app.interview_intelligence.question_classifier import (
            _TYPE_TO_FRAMEWORK, _TYPE_TO_MAX_SECONDS, _TYPE_TO_COACHING,
        )
        types.append({
            "type": qt.value,
            "framework": _TYPE_TO_FRAMEWORK[qt].value,
            "max_seconds": _TYPE_TO_MAX_SECONDS[qt],
            "coaching_note": _TYPE_TO_COACHING[qt],
        })
    return {"question_types": types}


# ── Framework Library (list all frameworks) ───────────────────────────

@router.get("/frameworks")
async def list_frameworks():
    """List all supported answer frameworks with instructions."""
    frameworks = []
    for fw in AnswerFramework:
        frameworks.append({
            "framework": fw.value,
            "instructions": get_framework_instructions(fw),
        })
    return {"frameworks": frameworks}


# ── Session Auto-Wipe ─────────────────────────────────────────────────

@router.get("/privacy/retention")
async def get_retention_info():
    """Get current data retention policy info."""
    wiper = get_auto_wiper()
    return wiper.get_retention_info()


@router.post("/privacy/wipe-session")
async def wipe_session(req: SessionWipeRequest):
    """Manually wipe a specific session's data immediately."""
    wiper = get_auto_wiper()
    success = wiper.manual_wipe(req.session_id)
    return {"wiped": success, "session_id": req.session_id}


@router.post("/privacy/wipe-all")
async def wipe_all_user_data(request: Request):
    """GDPR right to erasure — wipe ALL session data for the requesting user."""
    user_id = getattr(request.state, "user_id", "anonymous")
    wiper = get_auto_wiper()
    count = wiper.wipe_all_user_data(user_id)
    return {"wiped_count": count, "user_id": user_id}
