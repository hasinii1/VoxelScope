from pathlib import Path
import numpy as np
import pydicom

# Tags that can identify a patient. We blank them.
PHI_TAGS = [
    "PatientName", "PatientID", "PatientBirthDate", "PatientSex",
    "PatientAddress", "PatientTelephoneNumbers", "OtherPatientIDs",
    "InstitutionName", "InstitutionAddress", "ReferringPhysicianName",
    "PerformingPhysicianName", "OperatorsName", "AccessionNumber",
    "StudyDate", "SeriesDate", "AcquisitionDate", "ContentDate",
]


def anonymize(ds: pydicom.Dataset) -> pydicom.Dataset:
    """Blank identifying tags in place and remove vendor-private tags."""
    for tag in PHI_TAGS:
        if tag in ds:
            ds.data_element(tag).value = ""
    ds.remove_private_tags()
    ds.PatientIdentityRemoved = "YES"
    return ds


def load_dicom_series(folder):
    """
    Read a folder of .dcm slices into one 3D volume in Hounsfield Units.
    Returns (volume[rows, cols, slices], spacing_mm, metadata dict).
    """
    slices = []
    for p in Path(folder).rglob("*"):
        if not p.is_file():
            continue
        try:
            ds = pydicom.dcmread(p, force=True)
            if hasattr(ds, "PixelData") and hasattr(ds, "ImagePositionPatient"):
                slices.append(ds)
        except Exception:
            continue
    if not slices:
        raise ValueError("No valid DICOM slices found")

    slices.sort(key=lambda s: float(s.ImagePositionPatient[2]))

    volume = []
    for s in slices:
        slope = float(getattr(s, "RescaleSlope", 1))
        intercept = float(getattr(s, "RescaleIntercept", 0))
        volume.append(s.pixel_array.astype(np.float32) * slope + intercept)
    volume = np.stack(volume, axis=-1)

    first = slices[0]
    row_sp, col_sp = [float(x) for x in first.PixelSpacing]
    if len(slices) > 1:
        z_sp = abs(float(slices[1].ImagePositionPatient[2]) - float(slices[0].ImagePositionPatient[2]))
    else:
        z_sp = float(getattr(first, "SliceThickness", 1))

    meta = {
        "modality": str(getattr(first, "Modality", "unknown")),
        "num_slices": len(slices),
        "shape": tuple(volume.shape),
        "spacing_mm": (row_sp, col_sp, z_sp),
    }
    return volume, (row_sp, col_sp, z_sp), meta