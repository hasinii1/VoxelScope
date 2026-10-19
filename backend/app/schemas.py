from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StudyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    file_type: str
    modality: str
    shape: list[int]
    spacing_mm: list[float]
    uploaded_at: datetime


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    study_id: int
    model_name: str
    status: str
    error: str | None = None
    device: str | None = None
    inference_seconds: float | None = None


class AnalyzeRequest(BaseModel):
    model: str   # "spleen" | "lung"