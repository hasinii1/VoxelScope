import numpy as np
from scipy import ndimage


def mask_to_boxes(mask: np.ndarray, spacing_mm=(1.0, 1.0, 1.0), min_voxels: int = 30):
    """
    Turn a binary 3D mask into detections: one 3D bounding box and volume (ml) per blob.
    """
    labeled, n = ndimage.label(mask > 0)             # each separate blob gets its own number
    voxel_ml = float(np.prod(spacing_mm)) / 1000.0   # mm^3 -> ml
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(labeled), start=1):
        size = int((labeled[sl] == i).sum())
        if size < min_voxels:                        # ignore tiny specks (noise)
            continue
        boxes.append({
            "min": [s.start for s in sl],
            "max": [s.stop - 1 for s in sl],
            "voxels": size,
            "volume_ml": round(size * voxel_ml, 3),
        })
    return sorted(boxes, key=lambda b: b["voxels"], reverse=True)


def iou_3d(a, b):
    """IoU between two boxes {"min": [..], "max": [..]}, used to evaluate detection."""
    lo = np.maximum(a["min"], b["min"])
    hi = np.minimum(a["max"], b["max"])
    inter = np.prod(np.clip(hi - lo + 1, 0, None))
    vol = lambda x: np.prod(np.array(x["max"]) - np.array(x["min"]) + 1)
    return float(inter / (vol(a) + vol(b) - inter))