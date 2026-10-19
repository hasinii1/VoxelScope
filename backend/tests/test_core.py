import os
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(BACKEND), str(BACKEND.parent)]
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp).as_posix()}/test.db"  # a throwaway database
os.environ["STORAGE_DIR"] = f"{Path(_tmp).as_posix()}/storage"

import nibabel as nib
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from inference.postprocessing import iou_3d, mask_to_boxes

client = TestClient(app)


def nifti_bytes(arr):
    p = Path(_tmp) / "scan.nii.gz"
    nib.save(nib.Nifti1Image(arr.astype(np.float32), np.eye(4)), str(p))
    return p.read_bytes()


def ct_like():
    a = np.full((32, 32, 32), 40.0)
    a[:6] = -1000.0  # air, like a real CT
    return a


def upload(data, name="ct.nii.gz"):
    return client.post("/studies", files={"file": (name, data, "application/gzip")})


def test_boxes_keep_regions_and_drop_specks():
    m = np.zeros((20, 20, 20), dtype=np.uint8)
    m[2:7, 2:7, 2:7] = 1      # 125 voxels
    m[12:14, 12:14, 12:14] = 1  # 8 voxels (noise)
    boxes = mask_to_boxes(m, (1, 1, 1), min_voxels=30)
    assert len(boxes) == 1
    assert boxes[0]["min"] == [2, 2, 2] and boxes[0]["max"] == [6, 6, 6]
    assert boxes[0]["voxels"] == 125
    assert len(mask_to_boxes(m, (1, 1, 1), min_voxels=5)) == 2


def test_box_volume_in_ml():
    m = np.zeros((20, 20, 20), dtype=np.uint8)
    m[2:7, 2:7, 2:7] = 1  # 125 voxels of 2x2x2 mm = 1000 mm3 = 1 ml
    assert mask_to_boxes(m, (2, 2, 2), min_voxels=30)[0]["volume_ml"] == 1.0


def test_iou():
    a = {"min": [0, 0, 0], "max": [9, 9, 9]}
    assert iou_3d(a, a) == 1.0
    assert iou_3d(a, {"min": [20, 20, 20], "max": [29, 29, 29]}) == 0.0
    assert abs(iou_3d(a, {"min": [5, 0, 0], "max": [14, 9, 9]}) - 1 / 3) < 0.01


def test_upload_rejects_wrong_extension():
    assert upload(b"hello", "notes.txt").status_code == 400


def test_upload_rejects_non_ct():
    assert upload(nifti_bytes(np.full((32, 32, 32), 100.0))).status_code == 400


def test_upload_accepts_ct_like_and_delete_removes_it():
    r = upload(nifti_bytes(ct_like()))
    assert r.status_code == 200
    study = r.json()
    assert study["shape"] == [32, 32, 32]
    assert client.get(f"/studies/{study['id']}/volume").status_code == 200
    assert client.delete(f"/studies/{study['id']}").status_code == 200
    assert client.get(f"/studies/{study['id']}/volume").status_code == 404