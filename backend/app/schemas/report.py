from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: str
    trial_session_id: str
    report_content: dict
    generated_at: datetime
    pdf_path: Optional[str] = None

    class Config:
        from_attributes = True
