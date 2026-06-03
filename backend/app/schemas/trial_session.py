from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.core.enums import TrialStatus, TrialPhase, TrialWinner, GroupSide


class PhaseConfigCreate(BaseModel):
    phase: TrialPhase
    duration_seconds: int = Field(ge=60, le=3600)
    weight: float = Field(default=1.0, ge=0.1, le=10.0)


class TrialSessionCreate(BaseModel):
    case_id: str
    title: str = Field(min_length=1, max_length=200)
    judge_id: Optional[str] = None
    phase_configs: list[PhaseConfigCreate] = []


class TrialSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    judge_id: Optional[str] = None
    phase_duration_seconds: Optional[int] = Field(None, ge=60, le=3600)


class PhaseConfigResponse(BaseModel):
    id: str
    phase: TrialPhase
    duration_seconds: int
    weight: float
    order_index: int
    is_active: bool
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrialSessionResponse(BaseModel):
    id: str
    case_id: str
    title: str
    status: TrialStatus
    current_phase: Optional[TrialPhase] = None
    phase_started_at: Optional[datetime] = None
    phase_duration_seconds: int
    created_by: str
    judge_id: Optional[str] = None
    winner: Optional[TrialWinner] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    phase_configs: list[PhaseConfigResponse] = []

    class Config:
        from_attributes = True


class TrialSessionListResponse(BaseModel):
    id: str
    title: str
    status: TrialStatus
    current_phase: Optional[TrialPhase] = None
    created_at: datetime

    class Config:
        from_attributes = True
