## VoxelScope

AI-powered CT segmentation of the **spleen**, with a measured volume, a 3D box and a browser viewer.
Explore. Analyze. Visualize.

> **Educational project. Not a medical device. Not for diagnosis.** Only public, anonymised data is used.

### [VoxelScope](https://voxelscope-1.onrender.com/)

### Features
- Upload a CT as NIfTI (`.nii`, `.nii.gz`) or a DICOM series (`.zip`)
- 3D UNet segmentation of the spleen (MONAI, PyTorch)
- Volume in ml and a 3D bounding box
- Multi-planar 3D viewer with mask opacity and CT window presets
- Download the mask and a report, or delete a scan
- Safeguards: consent screen, CT check on upload, result warnings

### Tech stack
Python, FastAPI, SQLAlchemy, SQLite, SimpleITK, PyTorch, MONAI, React, Vite, Niivue, Docker, pytest

### How it works
1. Upload: the file is checked and converted to one NIfTI (patient headers are dropped)
2. Analyse: a background job preprocesses the scan and runs the 3D UNet with sliding windows
3. Measure: the largest region becomes the finding, with a volume and a 3D box
4. View: the mask is shown in red over the scan in the browser

### Data and model
- Data: Medical Segmentation Decathlon, Task09 Spleen (41 CT scans, 32 train and 9 validation)
- Model: MONAI 3D UNet, trained 300 epochs on a free Kaggle GPU
- Preprocessing: RAS orientation, 1.5 x 1.5 x 2.0 mm spacing, soft-tissue window (-57 to 164 HU)

### Run it
**Local**
```powershell
cd backend
..\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
# second terminal
cd frontend
npm run dev
```
Open http://localhost:5173 (put the weights at `inference/spleen_v2.pth`).

**Docker**
```powershell
docker compose up --build
```
Open http://localhost:8080 (API docs at `/docs`).

**Tests:** `cd backend` then `pytest tests -q`

### API
| Method | Path | Purpose |
|---|---|---|
| POST | `/studies` | Upload a scan |
| GET | `/studies` | List scans |
| DELETE | `/studies/{id}` | Delete a scan |
| POST | `/studies/{id}/analyze` | Start an analysis |
| GET | `/jobs/{id}` | Job status |
| GET | `/jobs/{id}/result` | Volume, boxes, timing |
| GET | `/jobs/{id}/mask` | Download the mask |

### Limitations
- Spleen only
- The box is derived from the mask, not from a separate detector

### Credit
Medical Segmentation Decathlon (Task09 Spleen), CC BY-SA 4.0. Simpson et al., 2019.

**VoxelScope — Making complex data easier to explore.**
