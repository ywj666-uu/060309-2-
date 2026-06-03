from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.core.enums import DifficultyLevel


class EvidenceItem(BaseModel):
    number: str
    description: str


class CaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    background_facts: str = Field(min_length=1)
    relevant_laws: str = Field(min_length=1)
    difficulty_level: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    evidence_items: list[EvidenceItem] = []


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    background_facts: Optional[str] = None
    relevant_laws: Optional[str] = None
    difficulty_level: Optional[DifficultyLevel] = None
    evidence_items: Optional[list[EvidenceItem]] = None


class CaseAttachmentResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class CaseResponse(BaseModel):
    id: str
    title: str
    description: str
    background_facts: str
    relevant_laws: str
    difficulty_level: DifficultyLevel
    evidence_items: list[EvidenceItem] = []
    created_by: str
    created_at: datetime
    updated_at: datetime
    attachments: list[CaseAttachmentResponse] = []

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    id: str
    title: str
    difficulty_level: DifficultyLevel
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True
