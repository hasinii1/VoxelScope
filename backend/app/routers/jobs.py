import sys
from datetime import datetime
from pathlib import Path

import nibabel as nib
import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from scipy import ndimage
from sqlalchemy.orm import Session

from .. import storage
from ..database import SessionLocal, get_db
from ..models import Job, Result, Study
from ..schemas import AnalyzeRequest, JobOut

# make the top-level "inference" folder importable
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

router = APIRouter(tags=["jobs"])

MODELS = {
    "spleen": {
        "weights": ROOT / "inference" / "spleen_v2.pth",
        "norm": "instance",
        "largest_only": True,
    },
}


def run_job(job_id: int):
    from inference.segment import segment
    from inference.postprocessing import mask_to_boxes

    db = SessionLocal()
    job = db.get(Job, job_id)
    try:
        job.status, job.started_at = "running", datetime.utcnow()
        db.commit()

        study = db.get(Study, job.study_id)
        cfg = MODELS[job.model_name]
        mask, affine, seconds, device = segment(study.volume_path, cfg["weights"], cfg["norm"])

        # a spleen is one organ: keep only the largest connected region
        if cfg.get("largest_only"):
            labeled, n = ndimage.label(mask)
            if n > 1:
                sizes = ndimage.sum(mask, labeled, range(1, n + 1))
                mask = (labeled == (1 + int(np.argmax(sizes)))).astype(np.uint8)

        out = storage.mask_path(study.id, job.id)
        nib.save(nib.Nifti1Image(mask, affine), str(out))

        boxes = mask_to_boxes(mask, study.spacing_mm)
        db.add(Result(
            job_id=job.id, mask_path=str(out), boxes=boxes,
            volume_ml=round(sum(b["volume_ml"] for b in boxes), 2),
            num_findings=len(boxes),
        ))
        job.status, job.device, job.inference_seconds = "done", device, seconds
    except Exception as e:
        job.status, job.error = "failed", str(e)[:480]
    finally:
        job.finished_at = datetime.utcnow()
        db.commit()
        db.close()


@router.post("/studies/{study_id}/analyze", response_model=JobOut)
def analyze(study_id: int, body: AnalyzeRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if body.model not in MODELS:
        raise HTTPException(400, f"Model not available yet. Choose from {sorted(MODELS)}")
    if not db.get(Study, study_id):
        raise HTTPException(404, "Study not found")
    job = Job(study_id=study_id, model_name=body.model, status="queued")
    db.add(job)
    db.commit()
    db.refresh(job)
    bg.add_task(run_job, job.id)
    return job


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.id.desc()).limit(50).all()


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}/result")
def get_result(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or not job.result:
        raise HTTPException(404, "No result yet")
    r = job.result
    return {"job_id": job.id, "boxes": r.boxes, "volume_ml": r.volume_ml,
            "num_findings": r.num_findings, "inference_seconds": job.inference_seconds,
            "device": job.device}


@router.get("/jobs/{job_id}/mask")
def get_mask(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or not job.result:
        raise HTTPException(404, "No mask yet")
    return FileResponse(job.result.mask_path, media_type="application/gzip", filename="mask.nii.gz")


@router.get("/models")
def list_models():
    return [
        {"id": "spleen", "name": "Spleen segmentation", "dataset": "MSD Task09 Spleen",
         "dice": 0.90, "available": True},
    ]