"""
SQLAlchemy ORM models for local PostgreSQL.
All 9 domain models: User, InterviewSession, AIResponse, Document,
MockResult, Question, UserQuestionProgress, CreditTransaction, MentorSession.
"""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    String, DateTime, Boolean, Text, Integer, Float, Enum, ForeignKey, JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


# ── Enums ─────────────────────────────────────────────────
class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"

class SessionStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class QuestionDifficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class QuestionCategory(str, enum.Enum):
    coding = "coding"
    behavioral = "behavioral"
    system_design = "system_design"
    technical = "technical"
    hr = "hr"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _gen_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ── 1. User ───────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_gen_uuid
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    auth_provider: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
    )
    provider_id: Mapped[str | None] = mapped_column(String(320), nullable=True)

    # ── Plan & credits ──
    plan: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
    credits: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Security & preferences ──
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    # Relationships
    sessions = relationship("InterviewSession", back_populates="user", lazy="selectin")
    documents = relationship("Document", back_populates="user", lazy="selectin")
    ai_responses = relationship("AIResponse", back_populates="user", lazy="selectin")
    mock_results = relationship("MockResult", back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} plan={self.plan}>"


# ── 2. InterviewSession ──────────────────────────────────
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), default="Untitled Session")
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SessionStatus.active.value)
    mode: Mapped[str] = mapped_column(String(30), default="neuralwhisper")
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    credits_used: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── 10. ResumeAnalysis (ARIA) ────────────────────────────
class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Input fields
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    current_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    career_situation: Mapped[str] = mapped_column(String(30), default="standard")
    company_culture: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tone_mode: Mapped[str] = mapped_column(String(30), default="corporate")

    # ARIA analysis output (JSON blobs)
    intake_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Full 5-pass intake
    generated_resume: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Complete resume JSON
    score_card: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 16-check scoring
    keyword_matrix: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    gap_brief: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    precision_edits: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Scores (denormalized for quick queries)
    ats_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_latest: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="sessions")
    ai_responses = relationship("AIResponse", back_populates="session", lazy="selectin")


# ── 3. AIResponse ────────────────────────────────────────
class AIResponse(Base):
    __tablename__ = "ai_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    question_detected: Mapped[str | None] = mapped_column(Text, nullable=True)
    direct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_points: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    star_example: Mapped[str | None] = mapped_column(Text, nullable=True)
    avoid_saying: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(20), nullable=True)  # thumbs_up / thumbs_down
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    session = relationship("InterviewSession", back_populates="ai_responses")
    user = relationship("User", back_populates="ai_responses")


# ── 4. Document ──────────────────────────────────────────
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), default="general")  # resume, jd, research, portfolio
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, processing, ready
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="documents")


# ── 5. MockResult ────────────────────────────────────────
class MockResult(Base):
    __tablename__ = "mock_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    interview_type: Mapped[str] = mapped_column(String(50), nullable=False)
    company: Mapped[str | None] = mapped_column(String(100), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="mid")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    technical_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    problem_solving_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_management_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    questions_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="mock_results")


# ── 6. Question ──────────────────────────────────────────
class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    company: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    hints: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    frequency: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


# ── 7. UserQuestionProgress ─────────────────────────────
class UserQuestionProgress(Base):
    __tablename__ = "user_question_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False, index=True)
    is_saved: Mapped[bool] = mapped_column(Boolean, default=False)
    last_practiced: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)  # SM-2 algorithm
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    best_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


# ── 8. CreditTransaction ────────────────────────────────
class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # positive = add, negative = deduct
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)  # purchase, usage, bonus, refund
    stripe_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


# ── 9. MentorSession ────────────────────────────────────
class MentorSession(Base):
    __tablename__ = "mentor_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    helper_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    session_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="waiting")  # waiting, connected, ended
    hints_sent: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── 11. UserMemory — Persistent Memory System ────────────
class MemoryType(str, enum.Enum):
    observation = "observation"     # raw captured event
    summary = "summary"             # AI-compressed summary
    insight = "insight"             # pattern / learning extracted
    session_recap = "session_recap" # end-of-session digest


class UserMemory(Base):
    """Persistent memory store inspired by claude-mem.
    Captures interview observations, compresses them into summaries,
    and serves relevant context back into future sessions."""
    __tablename__ = "user_memories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_gen_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=True, index=True)

    memory_type: Mapped[str] = mapped_column(String(30), default=MemoryType.observation.value, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    compressed: Mapped[str | None] = mapped_column(Text, nullable=True)      # AI-compressed version
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)            # ["behavioral", "aws", ...]
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)   # extra context
    importance: Mapped[float] = mapped_column(Float, default=0.5)             # 0.0-1.0 relevance weight
    access_count: Mapped[int] = mapped_column(Integer, default=0)             # retrieval frequency
    last_accessed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # optional TTL

    user = relationship("User")
