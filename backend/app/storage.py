from pathlib import Path
from .config import STORAGE_DIR


def study_dir(study_id: int) -> Path:
    p = Path(STORAGE_DIR) / f"study_{study_id}"
    p.mkdir(parents=True, exist_ok=True)
    return p


def volume_path(study_id: int) -> Path:
    return study_dir(study_id) / "volume.nii.gz"


def mask_path(study_id: int, job_id: int) -> Path:
    return study_dir(study_id) / f"mask_job{job_id}.nii.gz"