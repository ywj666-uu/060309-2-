import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SAEnum, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.core.enums import TrialPhase


class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (
        UniqueConstraint("trial_session_id", "group_id", "phase", name="uq_trial_group_phase"),
        CheckConstraint("argumentation_quality >= 0 AND argumentation_quality <= 10"),
        CheckConstraint("evidence_usage >= 0 AND evidence_usage <= 10"),
        CheckConstraint("legal_reasoning >= 0 AND legal_reasoning <= 10"),
        CheckConstraint("presentation >= 0 AND presentation <= 10"),
        CheckConstraint("overall_score >= 0 AND overall_score <= 10"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    trial_session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trial_sessions.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("groups.id"), nullable=False)
    judge_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    phase: Mapped[str] = mapped_column(SAEnum(TrialPhase, name="trial_phase", create_type=False), nullable=False)
    argumentation_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_usage: Mapped[int] = mapped_column(Integer, nullable=False)
    legal_reasoning: Mapped[int] = mapped_column(Integer, nullable=False)
    presentation: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scored_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))


class SubmissionScore(Base):
    """Per-item score: judge scores each individual submission (evidence/argument)."""
    __tablename__ = "submission_scores"
    __table_args__ = (
        UniqueConstraint("submission_id", "judge_id", name="uq_submission_judge"),
        CheckConstraint("score >= 0 AND score <= 10"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    judge_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    trial_session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trial_sessions.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scored_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
