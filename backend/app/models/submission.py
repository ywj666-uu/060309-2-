import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.core.enums import TrialPhase, SubmissionType


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    trial_session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trial_sessions.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("groups.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    phase: Mapped[str] = mapped_column(SAEnum(TrialPhase, name="trial_phase", create_type=False), nullable=False)
    submission_type: Mapped[str] = mapped_column(SAEnum(SubmissionType, name="submission_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
