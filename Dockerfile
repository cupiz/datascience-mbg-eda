# PlateGuard MBG - Production Multi-Service Container
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

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

# Buat user non-root demi keamanan produksi
RUN useradd --create-home --shell /bin/bash appuser

# Salin artefak proyek, model, figur, dan konfigurasi
COPY . /app/
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000 8501

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
