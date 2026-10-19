import time
import numpy as np
import torch
from monai.inferers import sliding_window_inference
from monai.networks.layers import Norm
from monai.networks.nets import UNet
from monai.transforms import (
    AsDiscreted, Compose, CropForegroundd, EnsureChannelFirstd, EnsureTyped,
    Invertd, LoadImaged, Orientationd, ScaleIntensityRanged, Spacingd,
)

_models = {}


def _load_model(weights_path, norm, device):
    key = (str(weights_path), norm, device.type)
    if key not in _models:
        model = UNet(
            spatial_dims=3, in_channels=1, out_channels=2,
            channels=(16, 32, 64, 128, 256), strides=(2, 2, 2, 2),
            num_res_units=2,
            norm=Norm.BATCH if norm == "batch" else Norm.INSTANCE,
        ).to(device)
        model.load_state_dict(torch.load(weights_path, map_location=device))
        model.eval()
        _models[key] = model
    return _models[key]


def segment(volume_path, weights_path, norm="batch"):
    """Returns (mask uint8 array in original space, affine, seconds, device name)."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = _load_model(weights_path, norm, device)

    pre = Compose([
        LoadImaged(keys="image"),
        EnsureChannelFirstd(keys="image"),
        ScaleIntensityRanged(keys="image", a_min=-57, a_max=164, b_min=0.0, b_max=1.0, clip=True),
        CropForegroundd(keys="image", source_key="image", allow_smaller=True),
        Orientationd(keys="image", axcodes="RAS"),
        Spacingd(keys="image", pixdim=(1.5, 1.5, 2.0), mode="bilinear"),
        EnsureTyped(keys="image"),
    ])
    post = Compose([
        Invertd(keys="pred", transform=pre, orig_keys="image", nearest_interp=False, to_tensor=True),
        AsDiscreted(keys="pred", argmax=True),
    ])

    t0 = time.time()
    data = pre({"image": str(volume_path)})
    x = data["image"].unsqueeze(0).to(device)
    sw_batch = 4 if device.type == "cuda" else 1
    with torch.no_grad():
        out = sliding_window_inference(x, (96, 96, 96), sw_batch, model)
    data["pred"] = out[0]
    data = post(data)
    mask = data["pred"][0].cpu().numpy().astype(np.uint8)
    affine = np.array(data["pred"].affine)
    return mask, affine, round(time.time() - t0, 2), device.type