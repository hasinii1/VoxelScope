import tempfile
import zipfile
from pathlib import Path
import shutil

import SimpleITK as sitk
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import MAX_UPLOAD_MB
from ..database import get_db
from ..models import Study
from ..schemas import StudyOut
from .. import storage

router = APIRouter(prefix="/studies", tags=["studies"])


def _save_upload(upload: UploadFile, dest: Path):
    """Stream the upload to disk and enforce a size limit."""
    limit = MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    with open(dest, "wb") as f:
        while chunk := upload.file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                raise HTTPException(413, f"File larger than {MAX_UPLOAD_MB} MB")
            f.write(chunk)


def _safe_unzip(zip_path: Path, out_dir: Path):
    """Extract, refusing paths that escape the target folder (zip-slip attack)."""
    out_root = out_dir.resolve()
    with zipfile.ZipFile(zip_path) as z:
        for member in z.namelist():
            target = (out_dir / member).resolve()
            if not str(target).startswith(str(out_root)):
                raise HTTPException(400, "Unsafe zip file")
        z.extractall(out_dir)


def _read_dicom_folder(folder: Path) -> sitk.Image:
    """SimpleITK sorts slices by position, applies slope/intercept and orientation."""
    for d in [folder, *[p for p in folder.rglob("*") if p.is_dir()]]:
        ids = sitk.ImageSeriesReader.GetGDCMSeriesIDs(str(d))
        if ids:
            files = sitk.ImageSeriesReader.GetGDCMSeriesFileNames(str(d), ids[0])
            reader = sitk.ImageSeriesReader()
            reader.SetFileNames(files)
            return reader.Execute()
    raise HTTPException(400, "No DICOM series found in the zip")


@router.post("", response_model=StudyOut)
def upload_study(file: UploadFile = File(...), db: Session = Depends(get_db)):
    name = (file.filename or "").lower()
    if name.endswith((".nii", ".nii.gz")):
        file_type = "nifti"
    elif name.endswith(".zip"):
        file_type = "dicom"
    else:
        raise HTTPException(400, "Upload a .nii/.nii.gz file or a .zip of DICOM slices")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        ext = ".zip" if file_type == "dicom" else (".nii" if name.endswith(".nii") else ".nii.gz")
        raw = tmp / ("upload" + ext)
        _save_upload(file, raw)
        try:
            if file_type == "dicom":
                extract_dir = tmp / "dicom"
                extract_dir.mkdir()
                _safe_unzip(raw, extract_dir)
                image = _read_dicom_folder(extract_dir)
            else:
                image = sitk.ReadImage(str(raw))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Could not read the scan: {e}")

        if image.GetDimension() != 3:
            raise HTTPException(400, "Expected a 3D volume")
        
        w, h, d = image.GetSize()
        if min(w, h, d) < 16 or w * h * d > 700 * 512 * 512:
            raise HTTPException(400, "Scan size is outside the supported range")
        stats = sitk.StatisticsImageFilter()
        stats.Execute(image)
        if stats.GetMinimum() > -200:
            raise HTTPException(400, "This does not look like a CT scan (no air-level values). Upload a CT volume.")
        study = Study(
            filename=file.filename,
            file_type=file_type,
            volume_path="",
            shape=list(image.GetSize()),
            spacing_mm=[float(s) for s in image.GetSpacing()],
        )
        db.add(study)
        db.commit()
        db.refresh(study)

        out = storage.volume_path(study.id)
        # Only pixel data and geometry are saved. DICOM headers (patient info) are dropped.
        sitk.WriteImage(image, str(out), useCompression=True, compressionLevel=1)
        study.volume_path = str(out)
        db.commit()
        db.refresh(study)
    return study


@router.get("", response_model=list[StudyOut])
def list_studies(db: Session = Depends(get_db)):
    return db.query(Study).order_by(Study.uploaded_at.desc()).all()


@router.get("/{study_id}/volume")
def get_volume(study_id: int, db: Session = Depends(get_db)):
    study = db.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")
    return FileResponse(study.volume_path, media_type="application/gzip", filename="volume.nii.gz")

@router.delete("/{study_id}")
def delete_study(study_id: int, db: Session = Depends(get_db)):
    study = db.get(Study, study_id)
    if not study:
        raise HTTPException(404, "Study not found")
    shutil.rmtree(storage.study_dir(study_id), ignore_errors=True)
    db.delete(study)  # jobs and results are removed by the cascade
    db.commit()
    return {"deleted": study_id}