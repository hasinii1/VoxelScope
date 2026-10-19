from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import FRONTEND_ORIGIN
from .database import Base, engine
from . import models  # noqa: F401  (registers the tables)
from .routers import studies, jobs

Base.metadata.create_all(bind=engine)

app = FastAPI(title="VoxelScope API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(studies.router)
app.include_router(jobs.router)


@app.get("/health")
def health():
    return {"status": "ok"}

from pathlib import Path
from fastapi.staticfiles import StaticFiles

_dist = Path(__file__).resolve().parents[2] / "frontend_dist"
if _dist.exists():  # only inside Docker, so local dev is unchanged
    app.mount("/", StaticFiles(directory=_dist, html=True), name="web")