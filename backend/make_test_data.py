"""Creates test files: a fake CT with two 'organs' as a .nii.gz, and a DICOM zip."""
import os
import shutil
import numpy as np
import nibabel as nib
import SimpleITK as sitk

shape = (128, 128, 64)
spacing = (1.5, 1.5, 2.5)

# Fake CT: soft-tissue background with noise, plus two bright spheres
vol = np.random.normal(40, 10, shape).astype(np.float32)
xx, yy, zz = np.ogrid[:shape[0], :shape[1], :shape[2]]
for cx, cy, cz, r in [(45, 60, 32, 14), (95, 70, 30, 8)]:
    sphere = (xx - cx) ** 2 + (yy - cy) ** 2 + ((zz - cz) * 1.6) ** 2 < r ** 2
    vol[sphere] = 120

affine = np.diag([*spacing, 1.0])
nib.save(nib.Nifti1Image(vol, affine), "test_scan.nii.gz")
print("created test_scan.nii.gz")

# Fake DICOM series (written slice by slice with SimpleITK)
os.makedirs("test_dicom", exist_ok=True)
img = sitk.GetImageFromArray(np.clip(vol, -1024, 3000).astype(np.int16).transpose(2, 1, 0))
img.SetSpacing(spacing)
writer = sitk.ImageFileWriter()
writer.KeepOriginalImageUIDOn()
for i in range(img.GetDepth()):
    sl = img[:, :, i]
    sl.SetMetaData("0008|0060", "CT")
    sl.SetMetaData("0010|0010", "Test^Patient")
    sl.SetMetaData("0010|0020", "12345")
    sl.SetMetaData("0020|000e", "1.2.826.0.1.3680043.2.1125.1")
    sl.SetMetaData("0020|0013", str(i + 1))
    sl.SetMetaData("0020|0032", f"0\\0\\{i * spacing[2]}")
    writer.SetFileName(os.path.join("test_dicom", f"slice_{i:03d}.dcm"))
    writer.Execute(sl)

shutil.make_archive("test_dicom", "zip", "test_dicom")
print("created test_dicom.zip")