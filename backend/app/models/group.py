import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.core.enums import GroupSide


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = (UniqueConstraint("trial_session_id", "side", name="uq_trial_side"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    trial_session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trial_sessions.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    side: Mapped[str] = mapped_column(SAEnum(GroupSide, name="group_side"), nullable=False)
    drawn_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    trial_session: Mapped["TrialSession"] = relationship(back_populates="groups")
    members: Mapped[list["GroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_user"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    role_in_group: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    group: Mapped["Group"] = relationship(back_populates="members")
