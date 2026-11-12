# -*- coding: utf-8 -*-
"""PlateGuard MBG - Production REST API Service (FastAPI)

Fase 4: Deployment Backend
Menyediakan endpoint inferensi real-time (< 3 detik) untuk prediksi persentase
sisa makanan (plate waste) per rencana distribusi SPPG program Makan Bergizi Gratis (MBG).

Jalankan lokal:
  uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""
import os
import sys
import time
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Pastikan modul etl_pipeline terdeteksi untuk deserialisasi pipeline
BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

import __main__
import etl_pipeline
from etl_pipeline import FeatureBuilder, Log1p, QuantileBinner, ReflectionLog

# Alias ke __main__ agar joblib unpickler menemukan kelas transformer
__main__.FeatureBuilder = FeatureBuilder
__main__.Log1p = Log1p
__main__.QuantileBinner = QuantileBinner
__main__.ReflectionLog = ReflectionLog

# Inisialisasi FastAPI
app = FastAPI(
    title="PlateGuard MBG - Predictive API",
    description=(
        "Sistem Prediksi Sisa Makanan (Plate Waste) Program Makan Bergizi Gratis (MBG) "
        "Badan Gizi Nasional berbasis Gradient Boosting Regression."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware agar bisa diakses oleh frontend/dashboard Streamlit
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model store
MODELS: Dict = {}


def load_artifacts():
    """Memuat pipeline transformasi dan model machine learning ke memori."""
    pra_model_path = os.path.join(BASE, "models", "best_pra.joblib")
    pra_pipe_path = os.path.join(BASE, "models", "pipeline_pra.joblib")
    post_model_path = os.path.join(BASE, "models", "best_posthoc.joblib")
    post_pipe_path = os.path.join(BASE, "models", "pipeline_posthoc.joblib")
    metrics_path = os.path.join(BASE, "models", "fase3_metrics.json")

    if os.path.exists(pra_model_path) and os.path.exists(pra_pipe_path):
        MODELS["pra_pipe"] = joblib.load(pra_pipe_path)
        MODELS["pra_model"] = joblib.load(pra_model_path)["model"]
        print("✅ Model Pra-distribusi (XGBoost) berhasil dimuat.")

    if os.path.exists(post_model_path) and os.path.exists(post_pipe_path):
        MODELS["post_pipe"] = joblib.load(post_pipe_path)
        MODELS["post_model"] = joblib.load(post_model_path)["model"]
        print("✅ Model Post-Hoc (XGBoost) berhasil dimuat.")

    if os.path.exists(metrics_path):
        import json
        with open(metrics_path, "r", encoding="utf-8") as f:
            MODELS["metrics"] = json.load(f)


# Muat saat inisialisasi modul
load_artifacts()


@app.on_event("startup")
def startup_event():
    if not MODELS:
        load_artifacts()


# ================= SCHEMAS =================

class DistributionPlanInput(BaseModel):
    """Payload input untuk skenario Pra-distribusi (Perencanaan Operasional)."""
    kitchen_daily_capacity_portions: int = Field(1500, description="Kapasitas harian dapur SPPG (porsi)", ge=100, le=5000)
    raw_ingredient_cost_per_portion_idr: float = Field(12000.0, description="Biaya bahan baku per porsi (Rp)", ge=5000, le=25000)
    delivery_distance_km: float = Field(8.5, description="Jarak pengantaran dari SPPG ke sekolah (km)", ge=0.1, le=50.0)
    transit_time_minutes: float = Field(30.0, description="Estimasi waktu perjalanan pengantaran (menit)", ge=1.0, le=180.0)
    food_arrival_temperature_celsius: float = Field(65.0, description="Estimasi suhu makanan saat tiba di sekolah (°C)", ge=20.0, le=85.0)
    estimated_calories_kcal: float = Field(680.0, description="Estimasi kandungan energi makanan (kkal)", ge=300.0, le=1200.0)
    estimated_protein_grams: float = Field(24.0, description="Estimasi kandungan protein makanan (gram)", ge=10.0, le=60.0)
    regional_cluster: str = Field("Jawa Metropolitan", description="Klaster geografis wilayah")
    beneficiary_category: str = Field("Siswa SD / Madrasah Ibtidaiyah", description="Kelompok penerima manfaat")
    protein_type: str = Field("Daging Ayam Broiler", description="Komoditas lauk protein utama")
    delivery_transport_mode: str = Field("Mobil Pickup Termal", description="Moda transportasi pengiriman")

    # Fitur opsional dengan default otomatis
    student_attendance_rate_pct: Optional[float] = Field(92.0, ge=50.0, le=100.0)
    local_farmer_sourcing_pct: Optional[float] = Field(72.0, ge=0.0, le=100.0)
    total_meal_cost_idr: Optional[float] = Field(None, description="Total biaya per porsi (Rp)")
    cost_to_nutrition_ratio: Optional[float] = Field(None, description="Rasio biaya terhadap gizi")
    local_economic_multiplier_score: Optional[float] = Field(7.1, ge=1.0, le=10.0)
    spoilage_risk_index: Optional[float] = Field(None, description="Indeks risiko pembusukan makanan")
    transit_cooling_rate_c_per_min: Optional[float] = Field(None, description="Laju penurunan suhu (°C/menit)")


class PostHocAuditInput(DistributionPlanInput):
    """Payload input untuk skenario Post-Hoc (Evaluasi Akar Masalah)."""
    primary_food_waste_driver: str = Field(
        "Prior-Snack-Consumption",
        description="Pemicu utama sisa makanan yang teramati pasca-konsumsi"
    )


class PredictionResponse(BaseModel):
    scenario: str
    predicted_plate_waste_percentage: float
    risk_level: str
    waste_category: str
    estimated_loss_per_portion_idr: float
    effective_cost_per_portion_idr: float
    recommendations: List[str]
    model_version: str
    latency_ms: float


# ================= UTILITY FUNCTIONS =================

def preprocess_payload(data: DistributionPlanInput) -> pd.DataFrame:
    """Mengonversi payload Pydantic menjadi DataFrame siap diproses pipeline."""
    row = data.dict()

    # Hitung nilai turunan jika tidak diisi user
    if row["total_meal_cost_idr"] is None:
        row["total_meal_cost_idr"] = row["raw_ingredient_cost_per_portion_idr"] + 2000.0

    if row["cost_to_nutrition_ratio"] is None:
        gizi_total = (row["estimated_calories_kcal"] / 100.0) + row["estimated_protein_grams"]
        row["cost_to_nutrition_ratio"] = float(row["total_meal_cost_idr"] / max(1.0, gizi_total) * 1.5)

    if row["transit_cooling_rate_c_per_min"] is None:
        delta_t = max(0.0, 72.0 - row["food_arrival_temperature_celsius"])
        row["transit_cooling_rate_c_per_min"] = float(delta_t / max(1.0, row["transit_time_minutes"]))

    if row["spoilage_risk_index"] is None:
        row["spoilage_risk_index"] = float(
            max(1.0, min(10.0, 1.5 + (row["transit_time_minutes"] * 0.05) + max(0.0, (60.0 - row["food_arrival_temperature_celsius"]) * 0.1)))
        )

    return pd.DataFrame([row])


def generate_recommendations(pred_waste: float, raw_row: Dict) -> List[str]:
    """Menghasilkan rekomendasi aksi mitigasi operasional berbasis temuan SHAP."""
    recs = []
    temp = raw_row.get("food_arrival_temperature_celsius", 65.0)
    transit = raw_row.get("transit_time_minutes", 30.0)
    kkal = raw_row.get("estimated_calories_kcal", 680.0)
    cluster = raw_row.get("regional_cluster", "")

    if pred_waste >= 15.0:
        recs.append("⚠️ RISIKO TINGGI: Estimasi sisa makanan di atas ambang batas 15%. Perlu intervensi sebelum pengiriman.")

    if temp < 60.0:
        recs.append(f"🌡️ KRITIS SUHU ({temp:.1f}°C < 60°C): Makanan tiba di bawah batas aman termal. Gunakan boks termal terinsulasi ganda atau persingkat waktu keberangkatan.")

    if transit > 60.0:
        recs.append(f"⏱️ WAKTU TRANSIT EKSTREM ({transit:.0f} menit): Alihkan dapur satelit terdekat atau sesuaikan jadwal pengantaran agar makanan tidak tertahan lama di jalan.")

    if kkal > 800.0:
        recs.append(f"🍱 PORSI BERLEBIH ({kkal:.0f} kkal): Kalori terlalu besar untuk target penerima. Pertimbangkan pengurangan porsi nasi/karbohidrat sebesar 10-15%.")
    elif kkal < 500.0:
        recs.append(f"🥗 DEFISIT ENERGI ({kkal:.0f} kkal): Kalori terlalu rendah. Tingkatkan densitas nutrisi lauk protein pendamping.")

    if "3T" in cluster:
        recs.append("📍 ZONA 3T: Wilayah perintis memiliki risiko logistik tertinggi (47,5% bermasalah). Prioritaskan pemantauan rantai pasok terpadu.")

    if not recs:
        recs.append("✅ Rencana distribusi optimal. Parameter suhu, porsi, dan rute berada dalam zona aman.")

    return recs


# ================= ENDPOINTS =================

@app.get("/", tags=["Info"])
def root():
    return {
        "service": "PlateGuard MBG - Predictive API",
        "description": "API Prediksi Sisa Makanan Distribusi Makan Bergizi Gratis (MBG) 2026",
        "endpoints": {
            "health": "/health",
            "metrics": "/metrics",
            "predict_pra": "/predict/pra",
            "predict_posthoc": "/predict/posthoc",
            "documentation": "/docs"
        },
        "status": "Online"
    }


@app.get("/health", tags=["Monitoring"])
def health_check():
    models_ready = "pra_model" in MODELS and "post_model" in MODELS
    return {
        "status": "healthy" if models_ready else "degraded",
        "models_loaded": {
            "pra_distribution": "pra_model" in MODELS,
            "post_hoc": "post_model" in MODELS
        },
        "timestamp": time.time()
    }


@app.get("/metrics", tags=["Monitoring"])
def get_metrics():
    if "metrics" in MODELS:
        return MODELS["metrics"]
    metrics_path = os.path.join(BASE, "models", "fase3_metrics.json")
    if os.path.exists(metrics_path):
        import json
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Metrics belum tersedia.")


@app.post("/predict/pra", response_model=PredictionResponse, tags=["Inference"])
def predict_pra_distribution(plan: DistributionPlanInput):
    """
    Prediksi Sisa Makanan Skenario Pra-distribusi (Data Perencanaan).
    Digunakan oleh pengelola dapur SPPG sebelum armada kirim diberangkatkan.
    """
    t0 = time.time()
    if "pra_pipe" not in MODELS or "pra_model" not in MODELS:
        load_artifacts()
        if "pra_model" not in MODELS:
            raise HTTPException(status_code=503, detail="Model pra-distribusi belum siap.")

    df_raw = preprocess_payload(plan)

    try:
        X_trans = MODELS["pra_pipe"].transform(df_raw)
        pred_waste = float(MODELS["pra_model"].predict(X_trans)[0])
        pred_waste = round(float(np.clip(pred_waste, 0.0, 100.0)), 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan inferensi: {str(e)}")

    # Hitung metrik dampak ekonomi
    cost_total = float(df_raw["total_meal_cost_idr"].iloc[0])
    loss_idr = round(cost_total * (pred_waste / 100.0), 2)
    effective_cost = round(cost_total / max(0.01, (1.0 - pred_waste / 100.0)), 2)

    # Tingkat risiko
    if pred_waste < 10.0:
        risk = "Rendah"
        cat = "Eksplisit Efisien (Terkendali)"
    elif pred_waste <= 15.0:
        risk = "Sedang"
        cat = "Standar Kepatuhan (Waspada)"
    else:
        risk = "Tinggi"
        cat = "Pemborosan Kritis (Intervensi Diperlukan)"

    recs = generate_recommendations(pred_waste, df_raw.iloc[0].to_dict())
    latency = round((time.time() - t0) * 1000, 2)

    return PredictionResponse(
        scenario="pra-distribusi",
        predicted_plate_waste_percentage=pred_waste,
        risk_level=risk,
        waste_category=cat,
        estimated_loss_per_portion_idr=loss_idr,
        effective_cost_per_portion_idr=effective_cost,
        recommendations=recs,
        model_version="XGBoost-Optuna-v1.0",
        latency_ms=latency
    )


@app.post("/predict/posthoc", response_model=PredictionResponse, tags=["Inference"])
def predict_posthoc_audit(plan: PostHocAuditInput):
    """
    Prediksi Sisa Makanan Skenario Post-Hoc (Evaluasi Akar Masalah).
    Menyertakan faktor pemicu sisa makanan untuk audit mutu pasca-konsumsi.
    """
    t0 = time.time()
    if "post_pipe" not in MODELS or "post_model" not in MODELS:
        load_artifacts()
        if "post_model" not in MODELS:
            raise HTTPException(status_code=503, detail="Model post-hoc belum siap.")

    df_raw = preprocess_payload(plan)
    df_raw["primary_food_waste_driver"] = plan.primary_food_waste_driver

    try:
        X_trans = MODELS["post_pipe"].transform(df_raw)
        pred_waste = float(MODELS["post_model"].predict(X_trans)[0])
        pred_waste = round(float(np.clip(pred_waste, 0.0, 100.0)), 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan inferensi post-hoc: {str(e)}")

    cost_total = float(df_raw["total_meal_cost_idr"].iloc[0])
    loss_idr = round(cost_total * (pred_waste / 100.0), 2)
    effective_cost = round(cost_total / max(0.01, (1.0 - pred_waste / 100.0)), 2)

    risk = "Rendah" if pred_waste < 10.0 else ("Sedang" if pred_waste <= 15.0 else "Tinggi")
    recs = generate_recommendations(pred_waste, df_raw.iloc[0].to_dict())

    # Tambahan insight pemicu spesifik
    if plan.primary_food_waste_driver == "Prior-Snack-Consumption":
        recs.append("🔍 AKAR MASALAH (Jajanan): Koordinasi dengan pihak sekolah untuk membatasi jam operasional kantin 2 jam sebelum makan bergizi disajikan.")
    elif plan.primary_food_waste_driver == "Sub-Optimal-Arrival-Temperature":
        recs.append("🔍 AKAR MASALAH (Suhu Rendah): Lakukan audit ketat pada rantai insulasi termal armada kirim.")

    latency = round((time.time() - t0) * 1000, 2)

    return PredictionResponse(
        scenario="post-hoc",
        predicted_plate_waste_percentage=pred_waste,
        risk_level=risk,
        waste_category=f"Audit Mutu: Pemicu Utama '{plan.primary_food_waste_driver}'",
        estimated_loss_per_portion_idr=loss_idr,
        effective_cost_per_portion_idr=effective_cost,
        recommendations=recs,
        model_version="XGBoost-Optuna-PostHoc-v1.0",
        latency_ms=latency
    )


@app.post("/predict/batch", tags=["Inference"])
def predict_batch_pra(plans: List[DistributionPlanInput]):
    """Inferensi sekaligus untuk batch rencana distribusi (hingga 100 rencana)."""
    t0 = time.time()
    if len(plans) > 100:
        raise HTTPException(status_code=400, detail="Maksimum batch adalah 100 rencana distribusi.")

    results = []
    for plan in plans:
        res = predict_pra_distribution(plan)
        results.append(res.dict())

    total_time = round((time.time() - t0) * 1000, 2)
    avg_waste = round(float(np.mean([r["predicted_plate_waste_percentage"] for r in results])), 2)

    return {
        "total_plans": len(plans),
        "average_predicted_waste_pct": avg_waste,
        "batch_latency_ms": total_time,
        "results": results
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
