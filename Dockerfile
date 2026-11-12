# PlateGuard MBG - Production Multi-Service Container
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Hindari penulisan bytecode .pyc dan aktifkan unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install dependency sistem yang dibutuhkan untuk kompilasi C/C++ (XGBoost/LightGBM)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Salin dan install requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Salin seluruh kode proyek, model, figur, dan data
COPY . /app/

# Port exposure (8000 untuk FastAPI, 8501 untuk Streamlit)
EXPOSE 8000 8501

# Default command: Jalankan FastAPI backend
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
