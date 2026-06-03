import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.core.enums import TrialStatus, TrialPhase, TrialWinner


class TrialSession(Base):
    __tablename__ = "trial_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(TrialStatus, name="trial_status"), default=TrialStatus.PENDING)
    current_phase: Mapped[Optional[str]] = mapped_column(SAEnum(TrialPhase, name="trial_phase"), nullable=True)
    phase_started_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    phase_duration_seconds: Mapped[int] = mapped_column(Integer, default=300)
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    judge_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    winner: Mapped[Optional[str]] = mapped_column(SAEnum(TrialWinner, name="trial_winner"), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    groups: Mapped[list["Group"]] = relationship(back_populates="trial_session", cascade="all, delete-orphan")
    phase_configs: Mapped[list["PhaseConfig"]] = relationship(back_populates="trial_session", cascade="all, delete-orphan")


class PhaseConfig(Base):
    __tablename__ = "phase_configs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    trial_session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trial_sessions.id", ondelete="CASCADE"), nullable=False)
    phase: Mapped[str] = mapped_column(SAEnum(TrialPhase, name="trial_phase", create_type=False), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    trial_session: Mapped["TrialSession"] = relationship(back_populates="phase_configs")
