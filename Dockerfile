FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
ENV VITE_API_URL=same
RUN npm run build

FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /code
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt "monai[nibabel]"
COPY backend backend
COPY inference inference
COPY --from=web /web/dist frontend_dist
ENV DATABASE_URL=sqlite:////data/voxelscope.db STORAGE_DIR=/data/storage PORT=7860
RUN mkdir -p /data && chmod -R 777 /data
WORKDIR /code/backend
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]