from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Study(Base):
    __tablename__ = "studies"
    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(20))        # "dicom" | "nifti"
    volume_path: Mapped[str] = mapped_column(String(500))     # converted .nii.gz
    modality: Mapped[str] = mapped_column(String(20), default="CT")
    shape: Mapped[list] = mapped_column(JSON)                 # [x, y, z]
    spacing_mm: Mapped[list] = mapped_column(JSON)            # [sx, sy, sz]
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    jobs: Mapped[list["Job"]] = relationship(back_populates="study", cascade="all, delete")


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"))
    model_name: Mapped[str] = mapped_column(String(50))       # "spleen" | "lung"
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued/running/done/failed
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    device: Mapped[str | None] = mapped_column(String(20), nullable=True)  # gpu / cpu
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    inference_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    study: Mapped["Study"] = relationship(back_populates="jobs")
    result: Mapped["Result | None"] = relationship(
        back_populates="job", uselist=False, cascade="all, delete"
    )


class Result(Base):
    __tablename__ = "results"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), unique=True)
    mask_path: Mapped[str] = mapped_column(String(500))
    boxes: Mapped[list] = mapped_column(JSON, default=list)
    volume_ml: Mapped[float | None] = mapped_column(Float, nullable=True)
    num_findings: Mapped[int] = mapped_column(Integer, default=0)
    job: Mapped["Job"] = relationship(back_populates="result")