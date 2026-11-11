# -*- coding: utf-8 -*-
"""Fase 2: Pipeline ETL bebas leakage untuk regresi plate_waste_percentage.

Menghasilkan (dijalankan: python etl_pipeline.py):
  data/processed/<skenario>/X_train.csv, X_test.csv, y_train.csv, y_test.csv
  models/pipeline_<skenario>.joblib

Dua skenario fitur (lihat Laporan EDA 9.3):
  pra     = fitur yang diketahui SEBELUM distribusi (perencanaan porsi/menu)
  posthoc = pra + primary_food_waste_driver (akar masalah, diketahui pasca-makan)

Aturan anti-leakage yang ditegakkan pipeline ini:
  1. Kolom bocor/artefak dibuang: waste_adjusted_effective_cost_idr
     (= biaya/(1-waste/100), deterministik dari target), bgn_program_compliance_tier
     (aturan tier memakai ambang waste 20-30%), confidence_score, kolom narasi CoT,
     distribution_id.
  2. Semua transformer yang menyimpan state (ReflectionLog, QuantileBinner,
     OneHotEncoder, StandardScaler) HANYA di-fit pada data train.
  3. province (38 kategori, high-cardinality) sengaja ditunda ke Fase 3
     (target-encoding), bukan one-hot di sini.
"""
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "data", "indonesia_mbg_nationwide_enriched_2026.csv")
TARGET = "plate_waste_percentage"

DROP_LEAK = [
    "waste_adjusted_effective_cost_idr",   # fungsi deterministik target
    "bgn_program_compliance_tier",         # aturan tier memakai ambang target
    "confidence_score",                    # artefak anotasi dataset
    "cot_nutrition_logistics_rationale",   # narasi yang memuat label
    "distribution_id",                     # identifier
]
NUM_PASS = [
    "kitchen_daily_capacity_portions", "raw_ingredient_cost_per_portion_idr",
    "student_attendance_rate_pct", "local_farmer_sourcing_pct",
    "total_meal_cost_idr", "estimated_calories_kcal", "estimated_protein_grams",
    "cost_to_nutrition_ratio", "local_economic_multiplier_score",
]
NUM_LOG = ["delivery_distance_km", "transit_time_minutes",
           "spoilage_risk_index", "transit_cooling_rate_c_per_min"]
TEMP = "food_arrival_temperature_celsius"
CAT_BASE = ["regional_cluster", "beneficiary_category", "protein_type",
            "delivery_transport_mode"]
DRIVER = "primary_food_waste_driver"
FE_COLS = ["biaya_per_kkal", "kecepatan_km_jam", "interaksi_suhu_transit"]
BIN_COL = "jarak_bin"


class FeatureBuilder(BaseEstimator, TransformerMixin):
    """Rekayasa fitur stateless dari kolom mentah (aman: tidak belajar apa pun)."""

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = X.copy()
        X["biaya_per_kkal"] = X["total_meal_cost_idr"] / X["estimated_calories_kcal"]
        X["kecepatan_km_jam"] = X["delivery_distance_km"] / (X["transit_time_minutes"] / 60)
        X["interaksi_suhu_transit"] = X[TEMP] * X["transit_time_minutes"]
        return X


class Log1p(BaseEstimator, TransformerMixin):
    """log(1+x) untuk variabel condong kanan; nama fitur diberi prefiks log_."""

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        return np.log1p(np.asarray(X, dtype=float))

    def get_feature_names_out(self, input_features=None):
        return np.asarray([f"log_{n}" for n in input_features])


class ReflectionLog(BaseEstimator, TransformerMixin):
    """log(max_train + 1 - x): memperbaiki skew KIRI (suhu tiba, skew -2.13).
    max disimpan saat fit agar tidak mengintip data test."""

    def fit(self, X, y=None):
        self.max_ = float(np.asarray(X).max())
        return self

    def transform(self, X):
        x = np.asarray(X, dtype=float)
        return np.log(self.max_ + 1 - np.minimum(x, self.max_)).reshape(-1, 1)

    def get_feature_names_out(self, input_features=None):
        return np.asarray([f"refllog_{input_features[0]}"])


class QuantileBinner(BaseEstimator, TransformerMixin):
    """Binning kuartil (Sangat Dekat..Sangat Jauh); tepi kuartil dari train saja."""

    def __init__(self, n_bins=4):
        self.n_bins = n_bins

    def fit(self, X, y=None):
        x = np.asarray(X, dtype=float).ravel()
        qs = np.linspace(0, 1, self.n_bins + 1)[1:-1]
        self.edges_ = np.quantile(x, qs)
        return self

    def transform(self, X):
        x = np.asarray(X, dtype=float).ravel()
        return np.digitize(x, self.edges_).reshape(-1, 1)

    def get_feature_names_out(self, input_features=None):
        return np.asarray([f"bin_{input_features[0]}"])


def build_pipeline(scenario):
    cats = CAT_BASE + ([DRIVER] if scenario == "posthoc" else [])
    ct = ColumnTransformer(transformers=[
        ("num", "passthrough", NUM_PASS),
        ("log", Log1p(), NUM_LOG),
        ("temp", ReflectionLog(), [TEMP]),
        ("bin", QuantileBinner(4), ["delivery_distance_km"]),
        ("fe", "passthrough", FE_COLS),
        ("cat", OneHotEncoder(handle_unknown="ignore", drop="first",
                              sparse_output=False), cats),
    ])
    return Pipeline([
        ("fe", FeatureBuilder()),
        ("ct", ct),
        ("scale", StandardScaler()),
    ])


def stratified_split(df, test_size=0.2, random_state=42):
    """Split 80:20 dengan stratifikasi kuartil target (charter Fase 2)."""
    strata = pd.qcut(df[TARGET], 4, labels=False, duplicates="drop")
    idx_test = []
    rng = np.random.RandomState(random_state)
    for s in np.unique(strata):
        ids = np.where(strata == s)[0]
        rng.shuffle(ids)
        idx_test.extend(ids[: int(round(len(ids) * test_size))])
    idx_test = np.array(sorted(idx_test))
    mask = np.zeros(len(df), dtype=bool)
    mask[idx_test] = True
    return df[~mask].reset_index(drop=True), df[mask].reset_index(drop=True)


def run_scenario(df, scenario):
    train_df, test_df = stratified_split(df)
    pipe = build_pipeline(scenario)
    pipe.fit(train_df.drop(columns=[TARGET]), train_df[TARGET])
    X_tr = pd.DataFrame(pipe.transform(train_df.drop(columns=[TARGET])),
                        columns=pipe[-2].get_feature_names_out())
    X_te = pd.DataFrame(pipe.transform(test_df.drop(columns=[TARGET])),
                        columns=X_tr.columns)

    # ---- self-test (guardrail, jangan dihapus) ----
    feats = set(X_tr.columns)
    for bad in ["waste_adjusted", "compliance_tier", "confidence", "distribution_id"]:
        assert not any(bad in c for c in feats), f"fitur bocor lolos: {bad}"
    assert not X_tr.isna().any().any() and not X_te.isna().any().any(), "NaN pasca-transform"
    assert len(X_tr) + len(X_te) == len(df), "jumlah baris berubah"
    assert abs(X_tr.values.mean()) < 0.05, "scaler tidak di-fit pada train"
    q_tr = pd.qcut(train_df[TARGET], 4, labels=False, duplicates="drop").value_counts(normalize=True)
    q_te = pd.qcut(test_df[TARGET], 4, labels=False, duplicates="drop").value_counts(normalize=True)
    assert (q_tr.sort_index() - q_te.sort_index()).abs().max() < 0.02, "stratifikasi kuartil meleset"

    out = os.path.join(BASE, "data", "processed", scenario)
    os.makedirs(out, exist_ok=True)
    X_tr.round(4).to_csv(os.path.join(out, "X_train.csv"), index=False)
    X_te.round(4).to_csv(os.path.join(out, "X_test.csv"), index=False)
    train_df[TARGET].to_csv(os.path.join(out, "y_train.csv"), index=False)
    test_df[TARGET].to_csv(os.path.join(out, "y_test.csv"), index=False)
    mdir = os.path.join(BASE, "models")
    os.makedirs(mdir, exist_ok=True)
    joblib.dump(pipe, os.path.join(mdir, f"pipeline_{scenario}.joblib"))
    print(f"[{scenario}] fitur={X_tr.shape[1]} train={X_tr.shape[0]} test={X_te.shape[0]} "
          f"-> {out} + models/pipeline_{scenario}.joblib  [self-test OK]")
    return X_tr, X_te


def main():
    df = pd.read_csv(RAW)
    # sanity: kolom bocor memang harus ada di raw (agar DROP bermakna), lalu buang
    for c in DROP_LEAK:
        assert c in df.columns, f"skema raw berubah: {c} hilang"
    df = df.drop(columns=DROP_LEAK)
    assert not df.isna().any().any(), "raw berasumsi 0 null (dataset v4); tambah imputer bila berubah"
    for s in ("pra", "posthoc"):
        run_scenario(df, s)
    print("Selesai. Dataset siap latih Fase 3 ada di data/processed/<skenario>/.")


if __name__ == "__main__":
    main()
