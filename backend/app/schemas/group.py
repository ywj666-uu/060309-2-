from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.core.enums import GroupSide


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    side: GroupSide


class GroupMemberAdd(BaseModel):
    user_id: str
    role_in_group: Optional[str] = None


class DrawLotsRequest(BaseModel):
    student_ids: list[str] = Field(min_length=2)


class GroupMemberResponse(BaseModel):
    id: str
    user_id: str
    role_in_group: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    assigned_at: datetime

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: str
    trial_session_id: str
    name: str
    side: GroupSide
    drawn_at: datetime
    created_at: datetime
    members: list[GroupMemberResponse] = []

    class Config:
        from_attributes = True
