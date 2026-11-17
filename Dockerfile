# Stage 1: Build Next.js Static Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend + Static Frontend (Hugging Face Spaces port 7860)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app

# Dependensi sistem untuk XGBoost/LightGBM dan healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pasang dependensi Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Buat user non-root (UID 1000 kompatibel dengan Hugging Face Spaces)
RUN useradd -m -u 1000 user

# Salin artefak backend, model, figur, dan hasil build frontend
COPY . /app/
COPY --from=frontend-builder /frontend/out /app/static
RUN chown -R user:user /app

USER user

EXPOSE 7860 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
