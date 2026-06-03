from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.core.enums import TrialPhase


class ScoreCreate(BaseModel):
    group_id: str
    phase: TrialPhase
    argumentation_quality: int = Field(ge=0, le=10)
    evidence_usage: int = Field(ge=0, le=10)
    legal_reasoning: int = Field(ge=0, le=10)
    presentation: int = Field(ge=0, le=10)
    overall_score: int = Field(ge=0, le=10)
    comments: Optional[str] = None


class ScoreUpdate(BaseModel):
    argumentation_quality: Optional[int] = Field(None, ge=0, le=10)
    evidence_usage: Optional[int] = Field(None, ge=0, le=10)
    legal_reasoning: Optional[int] = Field(None, ge=0, le=10)
    presentation: Optional[int] = Field(None, ge=0, le=10)
    overall_score: Optional[int] = Field(None, ge=0, le=10)
    comments: Optional[str] = None


class ScoreResponse(BaseModel):
    id: str
    trial_session_id: str
    group_id: str
    judge_id: str
    phase: TrialPhase
    argumentation_quality: int
    evidence_usage: int
    legal_reasoning: int
    presentation: int
    overall_score: int
    comments: Optional[str] = None
    scored_at: datetime

    class Config:
        from_attributes = True


class SubmissionScoreCreate(BaseModel):
    submission_id: str
    score: int = Field(ge=0, le=10)
    comments: Optional[str] = None


class SubmissionScoreResponse(BaseModel):
    id: str
    submission_id: str
    judge_id: str
    trial_session_id: str
    score: int
    comments: Optional[str] = None
    scored_at: datetime

    class Config:
        from_attributes = True


class ScoreSummary(BaseModel):
    group_id: str
    side: str
    total_score: float
    phase_averages: dict[str, float]
