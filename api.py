# -*- coding: utf-8 -*-
"""PlateGuard MBG - Production REST API Service (FastAPI).

Fase 4: Deployment Backend.
Menyediakan endpoint inferensi real-time (< 3 detik) untuk prediksi persentase
sisa makanan (plate waste) per rencana distribusi SPPG program Makan Bergizi Gratis (MBG).

Jalankan lokal:
  uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""
from contextlib import asynccontextmanager
import json
import os
import sys
import time
import warnings
from typing import Dict, List, Literal, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

import __main__
import etl_pipeline
from etl_pipeline import FeatureBuilder, Log1p, QuantileBinner, ReflectionLog

# Alias ke __main__ agar joblib unpickler menemukan kelas transformer kustom
__main__.FeatureBuilder = FeatureBuilder
__main__.Log1p = Log1p
__main__.QuantileBinner = QuantileBinner
__main__.ReflectionLog = ReflectionLog

VALID_CLUSTER = Literal[
    "Daerah Pedesaan & Kepulauan",
    "Jawa Metropolitan",
    "Luar Jawa Urban",
    "Wilayah 3T Perbatasan & Pedalaman",
]
VALID_BENEFICIARY = Literal[
    "Siswa SD / Madrasah Ibtidaiyah",
    "Siswa SMP / MTs",
    "Siswa SMA / SMK / MA",
    "Santri Pondok Pesantren",
    "Balita & Ibu Hamil Posyandu",
]
VALID_PROTEIN = Literal[
    "Daging Ayam Broiler",
    "Telur Ayam Boiler",
    "Ikan Kembung / Lele / Bandeng",
    "Daging Sapi / Kerbau",
    "Susu Pasteurisasi Segar",
]
VALID_TRANSPORT = Literal[
    "Motor Listrik / Roda Tiga Box",
    "Mobil Pickup Termal",
    "Mobil Van Tertutup",
    "Perahu Ketinting Sungai / Laut",
    "Jalan Kaki / Gerobak",
]
VALID_DRIVER = Literal[
    "Prior-Snack-Consumption",
    "Excessive-Portion-Size",
    "Sub-Optimal-Arrival-Temperature",
    "Delivery-Transit-Delay",
    "Low-Palatability-Menu",
]
VALID_PROVINCE = Literal[
    "Aceh", "Bali", "Bangka Belitung", "Banten", "Bengkulu", "DI Yogyakarta",
    "DKI Jakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur",
    "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur",
    "Kalimantan Utara", "Kepulauan Riau", "Lampung", "Maluku", "Maluku Utara",
    "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat",
    "Papua Barat Daya", "Papua Pegunungan", "Papua Selatan", "Papua Tengah", "Riau",
    "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara",
    "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara",
]

MODELS: Dict = {}


def load_artifacts() -> None:
    """Memuat pipeline transformasi dan model machine learning ke memori."""
    pra_model_path = os.path.join(BASE, "models", "best_pra.joblib")
    pra_pipe_path = os.path.join(BASE, "models", "pipeline_pra.joblib")
    post_model_path = os.path.join(BASE, "models", "best_posthoc.joblib")
    post_pipe_path = os.path.join(BASE, "models", "pipeline_posthoc.joblib")
    metrics_path = os.path.join(BASE, "models", "fase3_metrics.json")
    eda_path = os.path.join(BASE, "eda_results.json")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        if os.path.exists(pra_model_path) and os.path.exists(pra_pipe_path):
            MODELS["pra_pipe"] = joblib.load(pra_pipe_path)
            b_pra = joblib.load(pra_model_path)
            MODELS["pra_model"] = b_pra["model"]
            MODELS["pra_name"] = b_pra.get("name") or b_pra.get("algoritma") or type(b_pra["model"]).__name__

        if os.path.exists(post_model_path) and os.path.exists(post_pipe_path):
            MODELS["post_pipe"] = joblib.load(post_pipe_path)
            b_post = joblib.load(post_model_path)
            MODELS["post_model"] = b_post["model"]
            MODELS["post_name"] = b_post.get("name") or b_post.get("algoritma") or type(b_post["model"]).__name__

    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            MODELS["metrics"] = json.load(f)

    if os.path.exists(eda_path):
        with open(eda_path, "r", encoding="utf-8") as f:
            MODELS["eda"] = json.load(f)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_artifacts()
    yield


app = FastAPI(
    title="PlateGuard MBG - Predictive API",
    description=(
        "API Prediksi Sisa Makanan (Plate Waste) Program Makan Bergizi Gratis (MBG) "
        "Badan Gizi Nasional berbasis Gradient Boosting Regression."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DistributionPlanInput(BaseModel):
    """Payload input untuk skenario Pra-distribusi (Perencanaan Operasional)."""

    kitchen_daily_capacity_portions: int = Field(
        1780, description="Kapasitas harian dapur SPPG (porsi)", ge=100, le=5000
    )
    raw_ingredient_cost_per_portion_idr: float = Field(
        11300.0, description="Biaya bahan baku per porsi (Rp)", ge=5000, le=25000
    )
    delivery_distance_km: float = Field(
        6.8, description="Jarak pengantaran dari SPPG ke sekolah (km)", ge=0.1, le=50.0
    )
    transit_time_minutes: float = Field(
        25.0, description="Estimasi waktu perjalanan pengantaran (menit)", ge=1.0, le=180.0
    )
    food_arrival_temperature_celsius: float = Field(
        65.0, description="Estimasi suhu makanan saat tiba di sekolah (°C)", ge=20.0, le=85.0
    )
    estimated_calories_kcal: float = Field(
        680.0, description="Estimasi kandungan energi makanan (kkal)", ge=300.0, le=1200.0
    )
    estimated_protein_grams: float = Field(
        22.7, description="Estimasi kandungan protein makanan (gram)", ge=10.0, le=60.0
    )
    regional_cluster: VALID_CLUSTER = Field(
        "Jawa Metropolitan", description="Klaster geografis wilayah"
    )
    province: VALID_PROVINCE = Field(
        "Jawa Tengah", description="Nama provinsi distribusi (38 provinsi, target-encoded)"
    )
    beneficiary_category: VALID_BENEFICIARY = Field(
        "Siswa SD / Madrasah Ibtidaiyah", description="Kelompok penerima manfaat"
    )
    protein_type: VALID_PROTEIN = Field(
        "Daging Ayam Broiler", description="Komoditas lauk protein utama"
    )
    delivery_transport_mode: VALID_TRANSPORT = Field(
        "Mobil Pickup Termal", description="Moda transportasi pengiriman"
    )

    student_attendance_rate_pct: Optional[float] = Field(94.4, ge=50.0, le=100.0)
    local_farmer_sourcing_pct: Optional[float] = Field(73.7, ge=0.0, le=100.0)
    total_meal_cost_idr: Optional[float] = Field(None, description="Total biaya per porsi (Rp)")
    cost_to_nutrition_ratio: Optional[float] = Field(
        None, description="Rasio total biaya terhadap gram protein"
    )
    local_economic_multiplier_score: Optional[float] = Field(None, ge=1.0, le=10.0)
    spoilage_risk_index: Optional[float] = Field(
        None, description="Indeks risiko pembusukan makanan (0.43 - 10.0)"
    )
    transit_cooling_rate_c_per_min: Optional[float] = Field(
        None, description="Laju penurunan suhu (°C/menit)"
    )


class PostHocAuditInput(DistributionPlanInput):
    """Payload input untuk skenario Post-Hoc (Evaluasi Akar Masalah)."""

    primary_food_waste_driver: VALID_DRIVER = Field(
        "Prior-Snack-Consumption",
        description="Pemicu utama sisa makanan yang teramati pasca-konsumsi",
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


def compute_spoilage_proxy(temp_c: float, transit_min: float, dist_km: float) -> float:
    """Estimasi spoilage_risk_index terkalibrasi dari pola dataset MBG (R2 = 0.91)."""
    val = (
        0.5645
        + 0.0505 * transit_min
        + 0.1611 * max(0.0, 70.0 - temp_c)
        + 0.0620 * max(0.0, 60.0 - temp_c)
        - 0.0926 * dist_km
    )
    return float(np.clip(val, 0.43, 10.0))


def preprocess_payload(data: DistributionPlanInput) -> pd.DataFrame:
    """Mengonversi payload Pydantic menjadi DataFrame siap diproses pipeline."""
    row = data.model_dump()

    if row["total_meal_cost_idr"] is None:
        # Rasio median total/raw di dataset = 1.20x dengan plafon anggaran Rp15.000
        row["total_meal_cost_idr"] = round(min(15000.0, row["raw_ingredient_cost_per_portion_idr"] * 1.20), 0)

    if row["cost_to_nutrition_ratio"] is None:
        # Rumus pasti dataset: total_meal_cost_idr / estimated_protein_grams
        row["cost_to_nutrition_ratio"] = round(
            float(row["total_meal_cost_idr"] / max(1.0, row["estimated_protein_grams"])), 2
        )

    if row["transit_cooling_rate_c_per_min"] is None:
        # Suhu awal masak rata-rata tersirat dataset = 75.0 C
        delta_t = max(0.5, 75.0 - row["food_arrival_temperature_celsius"])
        row["transit_cooling_rate_c_per_min"] = round(
            max(0.106, float(delta_t / max(1.0, row["transit_time_minutes"]))), 3
        )

    if row["spoilage_risk_index"] is None:
        row["spoilage_risk_index"] = round(
            compute_spoilage_proxy(
                row["food_arrival_temperature_celsius"],
                row["transit_time_minutes"],
                row["delivery_distance_km"],
            ),
            2,
        )

    if row["local_economic_multiplier_score"] is None:
        sourcing = row["local_farmer_sourcing_pct"] or 73.7
        row["local_economic_multiplier_score"] = round(
            float(np.clip(1.20 + 0.082 * sourcing, 3.37, 9.70)), 2
        )

    return pd.DataFrame([row])


def generate_recommendations(pred_waste: float, raw_row: Dict) -> List[str]:
    """Menghasilkan rekomendasi aksi mitigasi operasional berbasis temuan SHAP."""
    recs: List[str] = []
    temp = raw_row.get("food_arrival_temperature_celsius", 65.0)
    transit = raw_row.get("transit_time_minutes", 25.0)
    kkal = raw_row.get("estimated_calories_kcal", 680.0)
    cluster = raw_row.get("regional_cluster", "")

    if pred_waste >= 15.0:
        recs.append(
            "RISIKO TINGGI: Estimasi sisa makanan >= 15%. Perlu penyesuaian menu, porsi, atau jadwal kirim sebelum berangkat."
        )
    if temp < 60.0:
        recs.append(
            f"KRITIS SUHU ({temp:.1f}°C < 60°C): Di bawah batas aman HACCP. Gunakan boks termal terinsulasi ganda atau percepat pengiriman."
        )
    if transit > 60.0:
        recs.append(
            f"TRANSIT EKSTREM ({transit:.0f} menit): Alihkan ke dapur SPPG satelit terdekat atau majukan jadwal masak-kirim."
        )
    if kkal > 800.0:
        recs.append(
            f"PORSI PADAT ({kkal:.0f} kkal): Evaluasi kesesuaian porsi karbohidrat dengan jenjang usia penerima."
        )
    elif kkal < 550.0:
        recs.append(
            f"ENERGI RENDAH ({kkal:.0f} kkal): Tingkatkan densitas energi dan variasi lauk pendamping."
        )
    if "3T" in cluster:
        recs.append(
            "ZONA 3T: Wilayah perintis memiliki 47,52% distribusi bermasalah. Prioritaskan pengemasan termal dan pemantauan rantai pasok."
        )
    if not recs:
        recs.append("Rencana distribusi optimal. Parameter suhu, porsi, dan rute berada di zona aman.")
    return recs


def _build_response(scenario: str, pred_waste: float, df_raw: pd.DataFrame, model_version: str, t0: float, extra_recs: Optional[List[str]] = None) -> PredictionResponse:
    cost_total = float(df_raw["total_meal_cost_idr"].iloc[0])
    loss_idr = round(cost_total * (pred_waste / 100.0), 2)
    effective_cost = round(cost_total / max(0.01, (1.0 - pred_waste / 100.0)), 2)

    if pred_waste < 10.0:
        risk, cat = "Rendah", "Efisien / Exemplary (< 10%)"
    elif pred_waste <= 15.0:
        risk, cat = "Sedang", "Standar Terkendali (10% - 15%)"
    else:
        risk, cat = "Tinggi", "Pemborosan Tinggi (> 15%, Intervensi Diperlukan)"

    recs = generate_recommendations(pred_waste, df_raw.iloc[0].to_dict())
    if extra_recs:
        recs.extend(extra_recs)

    return PredictionResponse(
        scenario=scenario,
        predicted_plate_waste_percentage=pred_waste,
        risk_level=risk,
        waste_category=cat,
        estimated_loss_per_portion_idr=loss_idr,
        effective_cost_per_portion_idr=effective_cost,
        recommendations=recs,
        model_version=model_version,
        latency_ms=round((time.time() - t0) * 1000, 2),
    )


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
            "predict_batch": "/predict/batch",
            "documentation": "/docs",
        },
        "status": "Online",
    }


@app.get("/health", tags=["Monitoring"])
def health_check():
    if "pra_model" not in MODELS or "post_model" not in MODELS:
        load_artifacts()
    models_ready = "pra_model" in MODELS and "post_model" in MODELS
    return {
        "status": "healthy" if models_ready else "degraded",
        "models_loaded": {
            "pra_distribution": "pra_model" in MODELS,
            "post_hoc": "post_model" in MODELS,
        },
        "timestamp": time.time(),
    }


@app.get("/metrics", tags=["Monitoring"])
def get_metrics():
    if "metrics" not in MODELS:
        load_artifacts()
    if "metrics" in MODELS:
        return MODELS["metrics"]
    raise HTTPException(status_code=404, detail="Metrics belum tersedia.")


@app.post("/predict/pra", response_model=PredictionResponse, tags=["Inference"])
def predict_pra_distribution(plan: DistributionPlanInput):
    """Prediksi Sisa Makanan Skenario Pra-distribusi (Perencanaan Operasional)."""
    t0 = time.time()
    if "pra_pipe" not in MODELS or "pra_model" not in MODELS:
        load_artifacts()
        if "pra_model" not in MODELS:
            raise HTTPException(status_code=503, detail="Model pra-distribusi belum siap.")

    df_raw = preprocess_payload(plan)
    try:
        X_trans = MODELS["pra_pipe"].transform(df_raw)
        pred_waste = round(float(np.clip(MODELS["pra_model"].predict(X_trans)[0], 0.0, 100.0)), 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan inferensi: {str(e)}")

    return _build_response("pra-distribusi", pred_waste, df_raw, str(MODELS.get("pra_name", "Optuna-Pra-v1.1")), t0)


@app.post("/predict/posthoc", response_model=PredictionResponse, tags=["Inference"])
def predict_posthoc_audit(plan: PostHocAuditInput):
    """Prediksi Sisa Makanan Skenario Post-Hoc (Evaluasi Akar Masalah)."""
    t0 = time.time()
    if "post_pipe" not in MODELS or "post_model" not in MODELS:
        load_artifacts()
        if "post_model" not in MODELS:
            raise HTTPException(status_code=503, detail="Model post-hoc belum siap.")

    df_raw = preprocess_payload(plan)
    df_raw["primary_food_waste_driver"] = plan.primary_food_waste_driver

    try:
        X_trans = MODELS["post_pipe"].transform(df_raw)
        pred_waste = round(float(np.clip(MODELS["post_model"].predict(X_trans)[0], 0.0, 100.0)), 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan inferensi post-hoc: {str(e)}")

    driver_notes = {
        "Prior-Snack-Consumption": "AKAR MASALAH (Jajanan, 63,43% kasus): Koordinasikan pembatasan kantin/jajanan 2 jam sebelum jam makan MBG.",
        "Excessive-Portion-Size": "AKAR MASALAH (Porsi Berlebih, 22,40% kasus): Kalibrasi ulang gramasi karbohidrat sesuai jenjang sekolah.",
        "Sub-Optimal-Arrival-Temperature": "AKAR MASALAH (Suhu Rendah, 8,58% kasus): Audit rantai insulasi boks termal armada kirim.",
        "Delivery-Transit-Delay": "AKAR MASALAH (Keterlambatan, 4,04% kasus): Optimalkan rute pengiriman dan penjadwalan SPPG.",
        "Low-Palatability-Menu": "AKAR MASALAH (Penerimaan Menu, 1,55% kasus): Lakukan survei preferensi rasa & variasi bumbu lokal.",
    }
    extra = [driver_notes[plan.primary_food_waste_driver]]
    resp = _build_response("post-hoc", pred_waste, df_raw, str(MODELS.get("post_name", "Optuna-PostHoc-v1.1")), t0, extra_recs=extra)
    resp.waste_category = f"Audit Mutu ({plan.primary_food_waste_driver})"
    return resp


@app.post("/predict/batch", tags=["Inference"])
def predict_batch_pra(plans: List[DistributionPlanInput]):
    """Inferensi batch untuk hingga 100 rencana distribusi pra-kirim."""
    t0 = time.time()
    if not plans:
        raise HTTPException(status_code=400, detail="Daftar rencana tidak boleh kosong.")
    if len(plans) > 100:
        raise HTTPException(status_code=400, detail="Maksimum batch adalah 100 rencana distribusi.")

    results = [predict_pra_distribution(plan).model_dump() for plan in plans]
    avg_waste = round(float(np.mean([r["predicted_plate_waste_percentage"] for r in results])), 2)

    return {
        "total_plans": len(plans),
        "average_predicted_waste_pct": avg_waste,
        "batch_latency_ms": round((time.time() - t0) * 1000, 2),
        "results": results,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
