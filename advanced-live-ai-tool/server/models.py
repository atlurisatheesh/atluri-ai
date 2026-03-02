from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SAEnum
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid
import enum

Base = declarative_base()


def gen_uuid():
    return str(uuid.uuid4())


class PlanType(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class QuestionDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuestionCategory(str, enum.Enum):
    CODING = "coding"
    BEHAVIORAL = "behavioral"
    SYSTEM_DESIGN = "system_design"
    TECHNICAL = "technical"
    HR = "hr"


# ─── USER ──────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # null for OAuth
    avatar_url = Column(String, nullable=True)
    plan = Column(SAEnum(PlanType), default=PlanType.FREE)
    credits = Column(Integer, default=10)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("InterviewSession", back_populates="user")
    documents = relationship("Document", back_populates="user")
    responses = relationship("AIResponse", back_populates="user")
    mock_results = relationship("MockResult", back_populates="user")


# ─── INTERVIEW SESSION ────────────────────────────────────────
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Untitled Session")
    platform = Column(String, nullable=True)  # zoom, meet, teams
    status = Column(SAEnum(SessionStatus), default=SessionStatus.ACTIVE)
    mode = Column(String, default="neuralwhisper")  # neuralwhisper, codeforge, mentorlink
    transcript = Column(Text, default="")
    duration_seconds = Column(Integer, default=0)
    ai_model = Column(String, default="gpt-4o")
    credits_used = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    metadata_json = Column(JSON, default=dict)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    responses = relationship("AIResponse", back_populates="session")


# ─── AI RESPONSE ──────────────────────────────────────────────
class AIResponse(Base):
    __tablename__ = "ai_responses"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    question_detected = Column(Text, nullable=True)
    direct_answer = Column(Text, nullable=True)
    key_points = Column(JSON, default=list)
    star_example = Column(Text, nullable=True)
    avoid_saying = Column(JSON, default=list)
    confidence = Column(Float, default=0.0)
    model_used = Column(String, default="gpt-4o")
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    feedback = Column(String, nullable=True)  # thumbs_up, thumbs_down
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="responses")
    user = relationship("User", back_populates="responses")


# ─── DOCUMENT ─────────────────────────────────────────────────
class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)  # resume, jd, research, portfolio
    file_url = Column(String, nullable=True)
    content_text = Column(Text, default="")
    embedding_status = Column(String, default="pending")  # pending, processing, ready
    is_active = Column(Boolean, default=False)
    file_size = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")


# ─── MOCK INTERVIEW RESULT ───────────────────────────────────
class MockResult(Base):
    __tablename__ = "mock_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    interview_type = Column(String, nullable=False)
    company = Column(String, nullable=True)
    difficulty = Column(String, default="mid")
    duration_minutes = Column(Integer, default=30)
    overall_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    problem_solving_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    time_management_score = Column(Float, default=0.0)
    questions_data = Column(JSON, default=list)  # [{question, answer, score, feedback}]
    ai_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="mock_results")


# ─── QUESTION BANK ────────────────────────────────────────────
class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=gen_uuid)
    text = Column(Text, nullable=False)
    category = Column(SAEnum(QuestionCategory), nullable=False)
    difficulty = Column(SAEnum(QuestionDifficulty), nullable=False)
    company = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    solution = Column(Text, nullable=True)
    hints = Column(JSON, default=list)
    frequency = Column(Integer, default=0)  # how often asked
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── USER QUESTION PROGRESS ──────────────────────────────────
class UserQuestionProgress(Base):
    __tablename__ = "user_question_progress"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    is_saved = Column(Boolean, default=False)
    last_practiced = Column(DateTime, nullable=True)
    next_review = Column(DateTime, nullable=True)  # spaced repetition
    ease_factor = Column(Float, default=2.5)
    attempts = Column(Integer, default=0)
    best_score = Column(Float, default=0.0)


# ─── CREDIT TRANSACTION ──────────────────────────────────────
class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)  # positive = credit, negative = debit
    balance_after = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False)  # purchase, usage, refund, reward
    stripe_payment_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── MENTOR LINK SESSION ─────────────────────────────────────
class MentorSession(Base):
    __tablename__ = "mentor_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("users.id"), nullable=False)
    helper_id = Column(String, nullable=True)
    session_code = Column(String, unique=True, nullable=False)
    status = Column(String, default="waiting")  # waiting, connected, ended
    hints_sent = Column(JSON, default=list)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
