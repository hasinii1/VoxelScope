import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./voxelscope.db")
STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "300"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")