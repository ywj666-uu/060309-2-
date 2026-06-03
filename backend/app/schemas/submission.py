from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.core.enums import TrialPhase, SubmissionType


class SubmissionCreate(BaseModel):
    phase: TrialPhase
    submission_type: SubmissionType
    title: str = Field(min_length=1, max_length=200)
    content: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: str
    trial_session_id: str
    group_id: str
    user_id: str
    phase: TrialPhase
    submission_type: SubmissionType
    title: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True
