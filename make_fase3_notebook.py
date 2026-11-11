# -*- coding: utf-8 -*-
"""Bangun fase3_modeling.ipynb: starter Fase 3 untuk dijalankan di Kaggle/Colab."""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
CELLS = []

def md(text):
    CELLS.append(("markdown", text.strip("\n")))

def code(text):
    CELLS.append(("code", text.strip("\n")))

md("""
# Fase 3 - Pemodelan Regresi Plate Waste (MBG 2026)

Charter: **Prediksi Persentase Sisa Makanan Distribusi MBG Berbasis Gradient
Boosting Regression** (PSIKS2W002, Iqbal Ahdagita Elbadra / 26MA41D022).

**Cara pakai (Kaggle atau Colab, sama saja):**
1. Kaggle: buat Notebook baru, **Settings > Internet On**. Colab: runtime T4/CPU biasa, tidak perlu GPU (data tabular 13 ribu baris).
2. Jalankan sel demi sel dari atas; sel 1 menyiapkan semuanya (clone repo + paket).
3. Estimasi waktu Run All: **10-20 menit CPU** (Optuna 30 trial adalah bagian terlama; kecilkan `N_TRIALS` bila perlu).

**Target charter yang dikejar (holdout, tanpa fitur bocor):** MAE <= 3,0 pp, R2 >= 0,35, RMSE <= 4,5 pp.
Baseline yang harus dikalahkan: mean-predictor MAE 4,44; HGB default pra MAE 3,66 / post-hoc 2,95.

**Skenario fitur:** `pra` (33 fitur, diketahui sebelum distribusi - untuk perencanaan) dan
`posthoc` (37 fitur, + pemicu sisa makanan - untuk analisis akar masalah). Keduanya dilatih di bawah.
""")

code("""
# Sel 1 - Setup environment: clone repo + pastikan paket tersedia
import os, subprocess, sys

REPO = "https://github.com/cupiz/datascience-mbg-eda.git"
PROJ = "datascience-mbg-eda"
if not os.path.isdir(PROJ):
    subprocess.run(["git", "clone", "--depth", "1", REPO], check=True)
os.chdir(PROJ)
sys.path.insert(0, os.getcwd())

NEED = ["xgboost", "lightgbm", "optuna", "shap", "joblib"]
missing = []
for pkg in NEED:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)
if missing:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", *missing], check=True)
    print("terpasang:", missing)
print("siap. cwd =", os.getcwd())
""")

code("""
# Sel 2 - Muat dataset siap latih Fase 2 (sudah di-commit di repo)
# Jika data/processed tidak ada, jalankan ulang ETL dari raw (butuh CSV mentah / kagglehub).
import pandas as pd

def load_scenario(s):
    base = f"data/processed/{s}"
    if os.path.exists(f"{base}/X_train.csv"):
        return (pd.read_csv(f"{base}/X_train.csv"), pd.read_csv(f"{base}/X_test.csv"),
                pd.read_csv(f"{base}/y_train.csv").iloc[:, 0], pd.read_csv(f"{base}/y_test.csv").iloc[:, 0])
    # fallback: regenerasi dari CSV mentah
    if not os.path.exists("data/indonesia_mbg_nationwide_enriched_2026.csv"):
        import kagglehub, shutil
        p = kagglehub.dataset_download("luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry")
        os.makedirs("data", exist_ok=True)
        shutil.copy(os.path.join(p, "indonesia_mbg_nationwide_enriched_2026.csv"), "data/")
    import etl_pipeline
    etl_pipeline.main()
    return load_scenario(s)

data = {s: load_scenario(s) for s in ("pra", "posthoc")}
for s, (Xtr, Xte, ytr, yte) in data.items():
    print(f"{s:8s} train={Xtr.shape} test={Xte.shape} | target mean={ytr.mean():.2f} std={ytr.std():.2f}")
""")

md("""
## Rencana Pemodelan

Tiga kandidat + pembanding, semua robust terhadap pencilan (pencilan DIPERTAHANKAN
sesuai keputusan Bab 8 laporan EDA):

| Model | Alasan ikut |
|---|---|
| Mean-predictor | Baseline jujur (MAE 4,44 pp) |
| Ridge ( scaled ) | Wakil keluarga linear; di cloud tanpa scaling pipeline, pakai fitur yang SUDAH ter-scale dari Fase 2 |
| HistGradientBoosting | Baseline terukur Fase 1-2 |
| XGBoost / LightGBM | Kandidat utama charter |

Metrik: **MAE, RMSE, R2** pada holdout 2.600 baris (split terstratifikasi kuartil, dibuat di Fase 2 - jangan di-split ulang).
""")

code("""
# Sel 3 - Helper evaluasi + baseline
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import Ridge

def evaluate(name, yte, pred, hasil):
    row = {"model": name,
           "MAE": round(mean_absolute_error(yte, pred), 3),
           "RMSE": round(np.sqrt(mean_squared_error(yte, pred)), 3),
           "R2": round(r2_score(yte, pred), 3)}
    hasil.append(row)
    print(f"{name:38s} MAE={row['MAE']:.3f} RMSE={row['RMSE']:.3f} R2={row['R2']:.3f}")
    return row

hasil = {s: [] for s in data}
for s, (Xtr, Xte, ytr, yte) in data.items():
    evaluate(f"[{s}] mean-predictor", yte, np.full(len(yte), ytr.mean()), hasil[s])
    evaluate(f"[{s}] Ridge(alpha=1)", yte, Ridge(alpha=1.0).fit(Xtr, ytr).predict(Xte), hasil[s])
""")

code("""
# Sel 4 - Tiga kandidat boosting dengan hiperparameter default-wajar (tanpa tuning dulu)
from sklearn.ensemble import HistGradientBoostingRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

CANDIDATES = {
    "HGB": HistGradientBoostingRegressor(random_state=42, max_iter=400),
    "XGBoost": XGBRegressor(n_estimators=400, learning_rate=0.06, subsample=0.9,
                            colsample_bytree=0.9, random_state=42, n_jobs=-1),
    "LightGBM": LGBMRegressor(n_estimators=400, learning_rate=0.06, subsample=0.9,
                              colsample_bytree=0.9, random_state=42, n_jobs=-1, verbose=-1),
}
fitted = {}
for s, (Xtr, Xte, ytr, yte) in data.items():
    for name, mdl in CANDIDATES.items():
        import copy; m = copy.deepcopy(mdl)
        m.fit(Xtr, ytr)
        fitted[(s, name)] = m
        evaluate(f"[{s}] {name} (default)", yte, m.predict(Xte), hasil[s])
""")

md("""
## Tuning Bayesian (Optuna) - sesuai charter Fase 3

Ruang pencarian kecil dan berpagar agar runtime cloud masuk akal (30 trial x 3-fold,
data train saja - holdout TIDAK disentuh selama tuning). Keluarga yang di-tuning:
algoritma terbaik dari Sel 4 per skenario.
""")

code("""
# Sel 5 - Optuna: tuning algoritma terbaik per skenario (3-fold CV pada train)
import optuna
from sklearn.model_selection import cross_validate, KFold
optuna.logging.set_verbosity(optuna.logging.WARNING)
N_TRIALS = 30

def best_of(s):
    # charter men-tuning XGBoost/LightGBM; HGB tetap ikut sebagai pembanding
    rows = [r for r in hasil[s] if r["model"].endswith("(default)")
            and ("XGBoost" in r["model"] or "LightGBM" in r["model"])]
    return min(rows, key=lambda r: r["MAE"])["model"].split("] ")[1].split(" ")[0]

def make_space(name, trial):
    common = dict(n_estimators=trial.suggest_int("n_estimators", 300, 900),
                  learning_rate=trial.suggest_float("learning_rate", 0.02, 0.15, log=True),
                  subsample=trial.suggest_float("subsample", 0.7, 1.0),
                  colsample_bytree=trial.suggest_float("colsample_bytree", 0.6, 1.0),
                  reg_lambda=trial.suggest_float("reg_lambda", 1e-3, 10.0, log=True))
    if name == "XGBoost":
        return XGBRegressor(random_state=42, n_jobs=-1, max_depth=trial.suggest_int("max_depth", 3, 10), **common)
    return LGBMRegressor(random_state=42, n_jobs=-1, verbose=-1,
                         num_leaves=trial.suggest_int("num_leaves", 15, 127), **common)

tuned = {}
kf = KFold(3, shuffle=True, random_state=42)
for s, (Xtr, Xte, ytr, yte) in data.items():
    name = best_of(s)
    def objective(trial, name=name, Xtr=Xtr, ytr=ytr):
        m = make_space(name, trial)
        r = cross_validate(m, Xtr, ytr, cv=kf, scoring="neg_mean_absolute_error")
        return -r["test_score"].mean()
    study = optuna.create_study(direction="minimize",
                                sampler=optuna.samplers.TPESampler(seed=42),
                                pruner=optuna.pruners.MedianPruner())
    study.optimize(objective, n_trials=N_TRIALS, show_progress_bar=False)
    best = make_space(name, study.best_trial)
    best.fit(Xtr, ytr)
    tuned[s] = (name, best, study.best_trial.params)
    print(f"[{s}] terbaik: {name} | CV MAE={study.best_value:.3f} | params={study.best_trial.params}")
    evaluate(f"[{s}] {name} (Optuna)", yte, best.predict(Xte), hasil[s])
""")

code("""
# Sel 6 - Rekap akhir vs target charter
summary = {}
for s in data:
    df_h = pd.DataFrame(hasil[s]).sort_values("MAE")
    print(f"\\n=== Skenario {s.upper()} ===")
    print(df_h.to_string(index=False))
    best = df_h.iloc[0]
    summary[s] = {"best_model": best["model"], "MAE": best["MAE"], "RMSE": best["RMSE"], "R2": best["R2"],
                  "target_MAE<=3.0": bool(best["MAE"] <= 3.0),
                  "target_R2>=0.35": bool(best["R2"] >= 0.35),
                  "target_RMSE<=4.5": bool(best["RMSE"] <= 4.5)}
    print("Status target charter:", summary[s])
""")

md("""
## SHAP - syarat interpretabilitas charter (dan adopsi sektor publik)

Beeswarm menunjukkan arah efek tiap fitur; bar plot menunjukkan besarnya kontribusi.
Catatan yang harus muncul di laporan: fitur `log_*` dan `refllog_*` adalah versi
tertransformasi (Fase 2), jelaskan dalam satuan asli saat presentasi.
""")

code("""
# Sel 7 - SHAP untuk model terbaik (kedua skenario)
import shap, matplotlib.pyplot as plt

os.makedirs("figures_fase3", exist_ok=True)
for s, (Xtr, Xte, ytr, yte) in data.items():
    name, mdl, _ = tuned[s]
    ex = shap.TreeExplainer(mdl)
    sv = ex.shap_values(Xte)
    plt.figure()
    shap.summary_plot(sv, Xte, show=False, max_display=15)
    plt.title(f"SHAP beeswarm - skenario {s} ({name})")
    plt.tight_layout(); plt.savefig(f"figures_fase3/shap_beeswarm_{s}.png", dpi=150); plt.close()
    plt.figure()
    shap.summary_plot(sv, Xte, plot_type="bar", show=False, max_display=15)
    plt.title(f"SHAP importance - skenario {s} ({name})")
    plt.tight_layout(); plt.savefig(f"figures_fase3/shap_bar_{s}.png", dpi=150); plt.close()
    print(s, "-> figures_fase3/shap_beeswarm_%s.png, shap_bar_%s.png" % (s, s))
""")

code("""
# Sel 8 - MLflow (opsional; file lokal mlruns/ - unduh folder ini bila perlu arsip)
try:
    import mlflow
    mlflow.set_tracking_uri("file:mlruns")
    mlflow.set_experiment("fase3-plate-waste")
    for s, (Xtr, Xte, ytr, yte) in data.items():
        name, mdl, params = tuned[s]
        with mlflow.start_run(run_name=f"{s}-{name}"):
            mlflow.log_params({"skenario": s, "algoritma": name, **params})
            mlflow.log_metrics({k: float(v) for k, v in summary[s].items() if isinstance(v, (int, float))})
            mlflow.log_artifacts("figures_fase3")
    print("MLflow: tercatat di ./mlruns (bisa di-zip dan di-commit/diunduh)")
except ImportError:
    print("mlflow tidak tersedia di environment ini - lewati (tidak wajib charter)")
""")

code("""
# Sel 9 - Simpan artefak + instruksi sinkron ke repo
import joblib, json

os.makedirs("models", exist_ok=True)
for s, (name, mdl, params) in tuned.items():
    joblib.dump({"model": mdl, "algoritma": name, "params": params}, f"models/best_{s}.joblib")
with open("models/fase3_metrics.json", "w", encoding="utf-8") as fh:
    json.dump(summary, fh, indent=1, ensure_ascii=False)
print("tersimpan: models/best_pra.joblib, models/best_posthoc.joblib, models/fase3_metrics.json")
print("\\nSinkronkan hasil ke GitHub (dari folder repo ini):")
print("  git add models figures_fase3 mlruns 2>/dev/null; git commit -m 'Fase 3: model final + SHAP + metrik'; git push")
print("Di Kaggle: gunakan tab Output untuk mengunduh models/ dan figures_fase3/, lalu commit dari lokal.")
""")

nb = {
    "cells": [
        {"cell_type": k, "id": f"f3-{i:02d}", "metadata": {},
         **({"source": t.splitlines(keepends=True)} if k == "markdown"
            else {"source": t.splitlines(keepends=True), "outputs": [], "execution_count": None})}
        for i, (k, t) in enumerate(CELLS)
    ],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}
out = os.path.join(BASE, "fase3_modeling.ipynb")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(nb, fh, ensure_ascii=False, indent=1)
print("OK:", len(nb["cells"]), "sel ->", out)
