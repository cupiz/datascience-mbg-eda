# -*- coding: utf-8 -*-
"""PlateGuard MBG - Production REST API Service (FastAPI).

Fase 4: Deployment Backend.
Menyediakan endpoint inferensi real-time (< 3 detik) untuk prediksi persentase
sisa makanan (plate waste) per rencana distribusi SPPG program Makan Bergizi Gratis (MBG).

Jalankan lokal:
  uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""
from contextlib import asynccontextmanager
import io
import json
import os
import sys
import time
import warnings
from typing import Any, Dict, List, Literal, Optional

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
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
        warnings.simplefilter("ignore")
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

    agg_path = os.path.join(BASE, "data", "processed", "overview_aggregates.json")
    if os.path.exists(agg_path):
        with open(agg_path, "r", encoding="utf-8") as f:
            MODELS["overview"] = json.load(f)

    cv_path = os.path.join(BASE, "models", "cv_per_fold_report.csv")
    if os.path.exists(cv_path):
        MODELS["cv_folds"] = pd.read_csv(cv_path).to_dict(orient="records")

    audit_path = os.path.join(BASE, "data", "processed", "holdout_audit.csv")
    if os.path.exists(audit_path):
        MODELS["holdout_audit"] = pd.read_csv(audit_path)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        if "pra_model" in MODELS and "pra_pipe" in MODELS:
            MODELS["pra_explainer"] = shap.TreeExplainer(MODELS["pra_model"])
            MODELS["pra_feat_cols"] = list(MODELS["pra_pipe"][-2].get_feature_names_out())
            dummy_pra = preprocess_payload(DistributionPlanInput())
            MODELS["pra_explainer"].shap_values(MODELS["pra_pipe"].transform(dummy_pra))
        if "post_model" in MODELS and "post_pipe" in MODELS:
            MODELS["post_explainer"] = shap.TreeExplainer(MODELS["post_model"])
            MODELS["post_feat_cols"] = list(MODELS["post_pipe"][-2].get_feature_names_out())
            dummy_post = preprocess_payload(PostHocAuditInput())
            dummy_post["primary_food_waste_driver"] = "Prior-Snack-Consumption"
            MODELS["post_explainer"].shap_values(MODELS["post_pipe"].transform(dummy_post))


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


class ExplanationContribution(BaseModel):
    key: str
    label: str
    display_value: str
    shap_pp: float


class ExplainResponse(PredictionResponse):
    base_value_pct: float
    raw_predicted_pct: float
    contributions: List[ExplanationContribution]
    derived_telemetry: Dict[str, Any]
    alert_flags: List[str]


def _group_shap_contributions(
    feat_cols: List[str],
    shap_vec: np.ndarray,
    df_raw: pd.DataFrame,
    scenario: str,
) -> List[ExplanationContribution]:
    """Mengelompokkan nilai TreeSHAP dummy OHE & transformasi agar intuitif dan eksak secara aditif."""
    row = df_raw.iloc[0].to_dict()
    cat_prefixes = {
        "cat__regional_cluster_": ("regional_cluster", "Klaster Wilayah"),
        "cat__beneficiary_category_": ("beneficiary_category", "Jenjang Penerima"),
        "cat__protein_type_": ("protein_type", "Komoditas Protein"),
        "cat__delivery_transport_mode_": ("delivery_transport_mode", "Moda Transportasi"),
        "cat__primary_food_waste_driver_": ("primary_food_waste_driver", "Pemicu Utama (Post-Hoc)"),
    }
    numeric_meta = {
        "num__kitchen_daily_capacity_portions": ("Kapasitas Dapur SPPG", f"{int(row.get('kitchen_daily_capacity_portions', 0)):,} porsi/hr"),
        "num__raw_ingredient_cost_per_portion_idr": ("Biaya Bahan Baku", f"Rp{int(row.get('raw_ingredient_cost_per_portion_idr', 0)):,}"),
        "num__student_attendance_rate_pct": ("Tingkat Kehadiran", f"{float(row.get('student_attendance_rate_pct', 0)):.1f}%"),
        "num__local_farmer_sourcing_pct": ("Serapan Petani Lokal", f"{float(row.get('local_farmer_sourcing_pct', 0)):.1f}%"),
        "num__total_meal_cost_idr": ("Total Biaya Porsi", f"Rp{int(row.get('total_meal_cost_idr', 0)):,}"),
        "num__estimated_calories_kcal": ("Kandungan Energi", f"{float(row.get('estimated_calories_kcal', 0)):.0f} kkal"),
        "num__estimated_protein_grams": ("Kandungan Protein", f"{float(row.get('estimated_protein_grams', 0)):.1f} g"),
        "num__cost_to_nutrition_ratio": ("Rasio Biaya/Protein", f"Rp{float(row.get('cost_to_nutrition_ratio', 0)):.0f}/g"),
        "num__local_economic_multiplier_score": ("Skor Pengganda Lokal", f"{float(row.get('local_economic_multiplier_score', 0)):.2f}/10"),
        "log__log_delivery_distance_km": ("Jarak Pengantaran", f"{float(row.get('delivery_distance_km', 0)):.1f} km"),
        "bin__bin_delivery_distance_km": ("Jarak Pengantaran", f"{float(row.get('delivery_distance_km', 0)):.1f} km"),
        "log__log_transit_time_minutes": ("Durasi Transit", f"{float(row.get('transit_time_minutes', 0)):.0f} menit"),
        "log__log_spoilage_risk_index": ("Indeks Risiko Basi", f"{float(row.get('spoilage_risk_index', 0)):.2f}/10"),
        "log__log_transit_cooling_rate_c_per_min": ("Laju Pendinginan", f"{float(row.get('transit_cooling_rate_c_per_min', 0)):.3f}°C/mnt"),
        "temp__refllog_food_arrival_temperature_celsius": ("Suhu Makanan Tiba", f"{float(row.get('food_arrival_temperature_celsius', 0)):.1f}°C"),
        "fe__biaya_per_kkal": ("Biaya per Energi", f"Rp{float(row.get('total_meal_cost_idr', 0)) / max(1.0, float(row.get('estimated_calories_kcal', 1))):.1f}/kkal"),
        "fe__kecepatan_km_jam": ("Kecepatan Armada", f"{float(row.get('delivery_distance_km', 0)) / max(1.0 / 60.0, float(row.get('transit_time_minutes', 1)) / 60.0):.1f} km/jam"),
        "fe__interaksi_suhu_transit": ("Interaksi Suhu x Transit", f"{float(row.get('food_arrival_temperature_celsius', 0)):.1f}°C · {float(row.get('transit_time_minutes', 0)):.0f}m"),
        "prov_te__province": ("Efek Provinsi (TargetEnc)", str(row.get("province", "-"))),
    }

    buckets: Dict[str, Dict[str, Any]] = {}
    for col, val in zip(feat_cols, shap_vec):
        matched_cat = False
        for pref, (raw_col, label) in cat_prefixes.items():
            if col.startswith(pref):
                key = f"grp_{raw_col}"
                if key not in buckets:
                    buckets[key] = {"key": key, "label": label, "display_value": str(row.get(raw_col, "-")), "shap": 0.0}
                buckets[key]["shap"] += float(val)
                matched_cat = True
                break
        if matched_cat:
            continue

        if col in numeric_meta:
            label, disp = numeric_meta[col]
            key = "grp_distance" if "delivery_distance_km" in col else col
            if key not in buckets:
                buckets[key] = {"key": key, "label": label, "display_value": disp, "shap": 0.0}
            buckets[key]["shap"] += float(val)
        else:
            if col not in buckets:
                buckets[col] = {"key": col, "label": col, "display_value": scenario, "shap": 0.0}
            buckets[col]["shap"] += float(val)

    items = [
        ExplanationContribution(
            key=v["key"],
            label=v["label"],
            display_value=v["display_value"],
            shap_pp=round(v["shap"], 3),
        )
        for v in buckets.values()
    ]
    items.sort(key=lambda x: abs(x.shap_pp), reverse=True)
    return items[:12]


def _extract_flags(pred_waste: float, df_raw: pd.DataFrame) -> List[str]:
    row = df_raw.iloc[0].to_dict()
    flags: List[str] = []
    if float(row.get("food_arrival_temperature_celsius", 65.0)) < 60.0:
        flags.append("COLD_ARRIVAL_BELOW_60C")
    if pred_waste >= 20.0:
        flags.append("HIGH_WASTE_ABOVE_20PCT")
    elif pred_waste >= 15.0:
        flags.append("INTERVENTION_THRESHOLD_15PCT")
    if float(row.get("transit_time_minutes", 0.0)) > 60.0:
        flags.append("EXTREME_TRANSIT_OVER_60M")
    if "3T" in str(row.get("regional_cluster", "")):
        flags.append("CLUSTER_3T_VULNERABLE")
    return flags


def _explain_inference(scenario: str, plan: DistributionPlanInput, is_posthoc: bool) -> ExplainResponse:
    t0 = time.time()
    key_pipe = "post_pipe" if is_posthoc else "pra_pipe"
    key_model = "post_model" if is_posthoc else "pra_model"
    key_exp = "post_explainer" if is_posthoc else "pra_explainer"
    key_cols = "post_feat_cols" if is_posthoc else "pra_feat_cols"
    key_name = "post_name" if is_posthoc else "pra_name"

    if key_model not in MODELS or key_exp not in MODELS:
        load_artifacts()
        if key_model not in MODELS:
            raise HTTPException(status_code=503, detail=f"Model {scenario} belum siap.")

    df_raw = preprocess_payload(plan)
    if is_posthoc:
        df_raw["primary_food_waste_driver"] = getattr(plan, "primary_food_waste_driver", "Prior-Snack-Consumption")

    try:
        X_trans = MODELS[key_pipe].transform(df_raw)
        raw_pred = float(MODELS[key_model].predict(X_trans)[0])
        pred_waste = round(float(np.clip(raw_pred, 0.0, 100.0)), 2)
        shap_vals = MODELS[key_exp].shap_values(X_trans)
        sv = np.asarray(shap_vals)[0] if np.asarray(shap_vals).ndim > 1 else np.asarray(shap_vals)
        base_val = MODELS[key_exp].expected_value
        base_scalar = float(np.asarray(base_val).reshape(-1)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghitung prediksi & TreeSHAP: {str(e)}")

    extra_recs: Optional[List[str]] = None
    if is_posthoc:
        driver = str(df_raw["primary_food_waste_driver"].iloc[0])
        driver_notes = {
            "Prior-Snack-Consumption": "AKAR MASALAH (Jajanan, 63,43% kasus): Koordinasikan pembatasan kantin/jajanan 2 jam sebelum jam makan MBG.",
            "Excessive-Portion-Size": "AKAR MASALAH (Porsi Berlebih, 22,40% kasus): Kalibrasi ulang gramasi karbohidrat sesuai jenjang sekolah.",
            "Sub-Optimal-Arrival-Temperature": "AKAR MASALAH (Suhu Rendah, 8,58% kasus): Audit rantai insulasi boks termal armada kirim.",
            "Delivery-Transit-Delay": "AKAR MASALAH (Keterlambatan, 4,04% kasus): Optimalkan rute pengiriman dan penjadwalan SPPG.",
            "Low-Palatability-Menu": "AKAR MASALAH (Penerimaan Menu, 1,55% kasus): Lakukan survei preferensi rasa & variasi bumbu lokal.",
        }
        if driver in driver_notes:
            extra_recs = [driver_notes[driver]]

    base_resp = _build_response(scenario, pred_waste, df_raw, str(MODELS.get(key_name, "Optuna-LGBM")), t0, extra_recs=extra_recs)
    if is_posthoc:
        base_resp.waste_category = f"Audit Mutu ({df_raw['primary_food_waste_driver'].iloc[0]})"

    row_dict = df_raw.iloc[0].to_dict()
    derived = {
        "total_meal_cost_idr": round(float(row_dict["total_meal_cost_idr"]), 0),
        "cost_to_nutrition_ratio": round(float(row_dict["cost_to_nutrition_ratio"]), 2),
        "spoilage_risk_index": round(float(row_dict["spoilage_risk_index"]), 2),
        "transit_cooling_rate_c_per_min": round(float(row_dict["transit_cooling_rate_c_per_min"]), 3),
        "local_economic_multiplier_score": round(float(row_dict["local_economic_multiplier_score"]), 2),
        "biaya_per_kkal": round(float(row_dict["total_meal_cost_idr"]) / max(1.0, float(row_dict["estimated_calories_kcal"])), 2),
        "kecepatan_km_jam": round(float(row_dict["delivery_distance_km"]) / max(1.0 / 60.0, float(row_dict["transit_time_minutes"]) / 60.0), 1),
    }
    feat_cols = MODELS.get(key_cols, [f"f_{i}" for i in range(len(sv))])
    contributions = _group_shap_contributions(feat_cols, sv, df_raw, scenario)

    return ExplainResponse(
        **base_resp.model_dump(),
        base_value_pct=round(base_scalar, 2),
        raw_predicted_pct=round(raw_pred, 2),
        contributions=contributions,
        derived_telemetry=derived,
        alert_flags=_extract_flags(pred_waste, df_raw),
    )


@app.get("/api/info", tags=["Info"])
def api_info():
    if "pra_model" not in MODELS:
        load_artifacts()
    return {
        "service": "PlateGuard MBG - Predictive API v2",
        "description": "API Prediksi Sisa Makanan Distribusi Makan Bergizi Gratis (MBG) 2026",
        "models": {
            "pra": MODELS.get("pra_name"),
            "posthoc": MODELS.get("post_name"),
        },
        "endpoints": {
            "health": "/health",
            "overview": "/api/overview",
            "benchmark": "/api/benchmark",
            "holdout_samples": "/api/holdout-samples",
            "explain_pra": "/api/explain/pra",
            "explain_posthoc": "/api/explain/posthoc",
            "predict_pra": "/predict/pra",
            "predict_posthoc": "/predict/posthoc",
            "predict_batch": "/predict/batch",
            "documentation": "/docs",
        },
        "status": "Online",
    }


@app.get("/health", tags=["Monitoring"])
@app.get("/api/health", tags=["Monitoring"])
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
        "pra_model_name": MODELS.get("pra_name"),
        "posthoc_model_name": MODELS.get("post_name"),
        "timestamp": time.time(),
    }


@app.get("/metrics", tags=["Monitoring"])
@app.get("/api/metrics", tags=["Monitoring"])
def get_metrics():
    if "metrics" not in MODELS:
        load_artifacts()
    if "metrics" in MODELS:
        return MODELS["metrics"]
    raise HTTPException(status_code=404, detail="Metrics belum tersedia.")


@app.get("/api/overview", tags=["Analytics"])
def get_overview():
    if "overview" not in MODELS and "eda" not in MODELS:
        load_artifacts()
    return {
        "eda": MODELS.get("eda", {}),
        "aggregates": MODELS.get("overview", {}),
    }


@app.get("/api/benchmark", tags=["Analytics"])
def get_benchmark():
    if "metrics" not in MODELS or "cv_folds" not in MODELS:
        load_artifacts()
    eda = MODELS.get("eda", {})
    return {
        "metrics": MODELS.get("metrics", {}),
        "cv_folds": MODELS.get("cv_folds", []),
        "leakage_audit": {
            "valid_posthoc_cv": {"mae": 2.929, "rmse": 3.761, "r2": 0.551, "label": "Pipeline Sah (Anti-Leakage)"},
            "leaked_hgb_demo": eda.get("reg_hgb_leak_tier_demo", {"mae": 2.363, "rmse": 3.146, "r2": 0.682}),
            "effective_cost_formula_maxdiff_idr": eda.get("leak_effective_cost_maxdiff", 0.5),
            "rejected_features": [
                {
                    "column": "waste_adjusted_effective_cost_idr",
                    "reason": "Turunan langsung variabel target: total_meal_cost_idr / (1 - plate_waste_percentage/100) dengan selisih maks Rp0,5.",
                },
                {
                    "column": "bgn_program_compliance_tier",
                    "reason": "Ditentukan langsung memakai ambang sisa piring 20%-30%, sehingga menaikkan R2 semu dari 0,55 ke 0,68.",
                },
            ],
        },
        "te_ablation": [
            {"scenario": "pra", "config": "Tanpa Province TE (33 fitur)", "cv_mae": 3.7115, "cv_rmse": 4.6377, "cv_r2": 0.3074},
            {"scenario": "pra", "config": "Dengan Province TE (34 fitur)", "cv_mae": 3.7102, "cv_rmse": 4.6376, "cv_r2": 0.3075},
            {"scenario": "posthoc", "config": "Tanpa Province TE (37 fitur)", "cv_mae": 2.9893, "cv_rmse": 3.8217, "cv_r2": 0.5297},
            {"scenario": "posthoc", "config": "Dengan Province TE (38 fitur)", "cv_mae": 2.9840, "cv_rmse": 3.8139, "cv_r2": 0.5316},
        ],
    }


def _filter_holdout(
    cluster: Optional[str] = None,
    province: Optional[str] = None,
    risk_tier: Optional[str] = None,
    q: Optional[str] = None,
) -> pd.DataFrame:
    if "holdout_audit" not in MODELS:
        load_artifacts()
    df = MODELS.get("holdout_audit")
    if df is None:
        raise HTTPException(status_code=404, detail="Holdout audit dataset belum tersedia.")
    sub = df
    if cluster and cluster != "Semua":
        sub = sub[sub["regional_cluster"] == cluster]
    if province and province != "Semua":
        sub = sub[sub["province"] == province]
    if risk_tier == "optimal":
        sub = sub[sub["actual_waste_pct"] < 10.0]
    elif risk_tier == "waspada":
        sub = sub[(sub["actual_waste_pct"] >= 10.0) & (sub["actual_waste_pct"] < 20.0)]
    elif risk_tier == "kritis":
        sub = sub[sub["actual_waste_pct"] >= 20.0]
    if q:
        ql = q.strip().lower()
        if ql:
            mask = (
                sub["distribution_id"].str.lower().str.contains(ql, na=False)
                | sub["province"].str.lower().str.contains(ql, na=False)
                | sub["protein_type"].str.lower().str.contains(ql, na=False)
                | sub["beneficiary_category"].str.lower().str.contains(ql, na=False)
            )
            sub = sub[mask]
    return sub


@app.get("/api/holdout-samples", tags=["Analytics"])
def get_holdout_samples(
    cluster: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    risk_tier: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: str = Query("abs_error_desc"),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    sub = _filter_holdout(cluster=cluster, province=province, risk_tier=risk_tier, q=q).copy()
    sub["abs_error_pra"] = (sub["actual_waste_pct"] - sub["pred_pra_pct"]).abs().round(2)
    sub["abs_error_posthoc"] = (sub["actual_waste_pct"] - sub["pred_posthoc_pct"]).abs().round(2)

    if sort_by == "actual_desc":
        sub = sub.sort_values("actual_waste_pct", ascending=False)
    elif sort_by == "actual_asc":
        sub = sub.sort_values("actual_waste_pct", ascending=True)
    elif sort_by == "pred_pra_desc":
        sub = sub.sort_values("pred_pra_pct", ascending=False)
    elif sort_by == "abs_error_asc":
        sub = sub.sort_values("abs_error_pra", ascending=True)
    else:
        sub = sub.sort_values("abs_error_pra", ascending=False)

    total = int(len(sub))
    if total > 0:
        mae_pra = round(float(sub["abs_error_pra"].mean()), 3)
        mae_post = round(float(sub["abs_error_posthoc"].mean()), 3)
        mean_actual = round(float(sub["actual_waste_pct"].mean()), 2)
    else:
        mae_pra, mae_post, mean_actual = 0.0, 0.0, 0.0

    page = sub.iloc[offset: offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "slice_metrics": {
            "mae_pra": mae_pra,
            "mae_posthoc": mae_post,
            "mean_actual_waste_pct": mean_actual,
        },
        "items": page.to_dict(orient="records"),
    }


@app.get("/api/holdout-export", tags=["Analytics"])
def export_holdout_csv(
    cluster: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    risk_tier: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
):
    sub = _filter_holdout(cluster=cluster, province=province, risk_tier=risk_tier, q=q)
    buf = io.StringIO()
    sub.to_csv(buf, index=False)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=plateguard_holdout_audit.csv"},
    )


@app.post("/predict/pra", response_model=PredictionResponse, tags=["Inference"])
@app.post("/api/predict/pra", response_model=PredictionResponse, tags=["Inference"])
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
@app.post("/api/predict/posthoc", response_model=PredictionResponse, tags=["Inference"])
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


@app.post("/api/explain/pra", response_model=ExplainResponse, tags=["Inference"])
def explain_pra_distribution(plan: DistributionPlanInput):
    """Prediksi + Penjelasan TreeSHAP Lokal Skenario Pra-Distribusi."""
    return _explain_inference("pra-distribusi", plan, is_posthoc=False)


@app.post("/api/explain/posthoc", response_model=ExplainResponse, tags=["Inference"])
def explain_posthoc_audit(plan: PostHocAuditInput):
    """Prediksi + Penjelasan TreeSHAP Lokal Skenario Post-Hoc."""
    return _explain_inference("post-hoc", plan, is_posthoc=True)


@app.post("/predict/batch", tags=["Inference"])
@app.post("/api/predict/batch", tags=["Inference"])
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


FIGURES_DIR = os.path.join(BASE, "figures")
if os.path.exists(FIGURES_DIR):
    app.mount("/figures", StaticFiles(directory=FIGURES_DIR), name="figures")

FIGURES_F3_DIR = os.path.join(BASE, "figures_fase3")
if os.path.exists(FIGURES_F3_DIR):
    app.mount("/figures-fase3", StaticFiles(directory=FIGURES_F3_DIR), name="figures_fase3")

STATIC_DIR = os.path.join(BASE, "static")
if os.path.exists(os.path.join(STATIC_DIR, "index.html")):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    @app.exception_handler(404)
    async def spa_404_handler(request, _exc):
        req_path = request.url.path.strip("/")
        if req_path.startswith("api/") or req_path in ("health", "metrics", "docs", "redoc", "openapi.json"):
            return JSONResponse({"detail": "Endpoint tidak ditemukan"}, status_code=404)
        for candidate in (
            os.path.join(STATIC_DIR, req_path, "index.html"),
            os.path.join(STATIC_DIR, f"{req_path}.html"),
            os.path.join(STATIC_DIR, "index.html"),
        ):
            if os.path.exists(candidate):
                return FileResponse(candidate)
        return JSONResponse({"detail": "Not Found"}, status_code=404)
else:
    @app.get("/", tags=["Info"])
    def root():
        return api_info()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)
