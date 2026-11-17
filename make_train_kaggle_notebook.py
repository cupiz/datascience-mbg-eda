# -*- coding: utf-8 -*-
"""Generator train_kaggle.ipynb dari logika train.py untuk dieksekusi di Kaggle/Colab."""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
CELLS = []


def md(text: str) -> None:
    CELLS.append(("markdown", text.strip("\n")))


def code(text: str) -> None:
    CELLS.append(("code", text.strip("\n")))


md("""
# PlateGuard MBG — Training Lengkap di Kaggle (Sesuai Project Charter)

Notebook ini mengadaptasi [`train.py`](https://github.com/cupiz/datascience-mbg-eda/blob/main/train.py) agar seluruh pipeline pelatihan dapat dijalankan interaktif di **Kaggle Notebooks** atau **Google Colab** lengkap dengan output inline.

### Yang Dicakup Notebook Ini (Checklist Charter)
1. **Guardrail Anti-Kebocoran Data:** Eliminasi `waste_adjusted_effective_cost_idr`, `bgn_program_compliance_tier`, `confidence_score`, narasi CoT, dan `distribution_id`.
2. **Feature Engineering + `province` Target-Encoding:** `ReflectionLog`, `Log1p`, `QuantileBinner`, fitur rasio & interaksi, ditambah `TargetEncoder` untuk 38 provinsi (`34` fitur pra / `38` fitur post-hoc) yang di-*fit* ketat hanya pada lipatan latih.
3. **6 Keluarga Algoritma Charter:** `MeanPredictor`, `Ridge`, **`RandomForest`**, `HistGradientBoosting`, `LightGBM`, dan `XGBoost`.
4. **5-Fold CV Per-Fold + Optuna (30 Trial):** Laporan lengkap Fold 1 s.d. Fold 5 (MAE, RMSE, $R^2$) dan evaluasi akhir pada 2.600 data uji holdout.
5. **Explainable AI (TreeSHAP) + MLflow + Paket Unduh Kaggle:** Grafik SHAP inline, pelacakan eksperimen `mlruns.db`, model `.joblib` & `.pkl`, serta arsip `plateguard_kaggle_outputs.zip` di `/kaggle/working/`.

### Cara Menjalankan di Kaggle
1. Buat Notebook baru di Kaggle, unggah berkas `train_kaggle.ipynb` ini.
2. Pada panel kanan: aktifkan **Settings → Internet: On** (akselerator CPU sudah cukup cepat, ~2–5 menit).
3. Klik **Run All**. Setelah selesai, unduh **`plateguard_kaggle_outputs.zip`** dari tab **Output** lalu ekstrak ke folder `Proyek_MBG/` lokal.
""")

code("""
# Sel 1 — Setup Repositori & Dependensi (Kaggle / Colab / Lokal)
%matplotlib inline
import os
import subprocess
import sys

os.environ["MLFLOW_DISABLE_AGENT_HINT"] = "1"

REPO_URL = "https://github.com/cupiz/datascience-mbg-eda.git"
REPO_DIR = "datascience-mbg-eda"

# Deteksi apakah notebook dijalankan langsung dari dalam folder proyek atau di cloud (/kaggle/working)
if os.path.exists("train.py") and os.path.exists("etl_pipeline.py"):
    print("Berjalan langsung di direktori repositori lokal:", os.getcwd())
else:
    if os.path.isdir(REPO_DIR):
        os.chdir(REPO_DIR)
        subprocess.run(["git", "pull", "--ff-only"], check=False)
    else:
        subprocess.run(["git", "clone", "--depth", "1", REPO_URL, REPO_DIR], check=True)
        os.chdir(REPO_DIR)

if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())

# Pastikan scikit-learn >= 1.4 untuk TargetEncoder + pustaka ML/MLflow tersedia
import sklearn
sk_ver = tuple(int(p) for p in sklearn.__version__.split(".")[:2])
reqs = []
if sk_ver < (1, 4):
    reqs.append("scikit-learn>=1.4.0")

for pkg, pip_name in [
    ("xgboost", "xgboost"),
    ("lightgbm", "lightgbm"),
    ("optuna", "optuna"),
    ("shap", "shap"),
    ("mlflow", "mlflow"),
    ("kagglehub", "kagglehub"),
    ("joblib", "joblib"),
]:
    try:
        __import__(pkg)
    except ImportError:
        reqs.append(pip_name)

if reqs:
    print("Memasang paket tambahan:", reqs)
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", *reqs], check=True)

print("Siap! Working directory:", os.getcwd())
""")

md("""
### Langkah 1 — Akuisisi Dataset & Guardrail Kebocoran Data

Karena file CSV mentah tidak di-commit ke GitHub (`data/*.csv` masuk `.gitignore`), sel berikut otomatis mengecek input Kaggle maupun mengunduh dataset publik `luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry` via `kagglehub`, lalu menerapkan pembersihan kolom bocor lewat fungsi `load_clean_raw()` di `train.py`.
""")

code("""
# Sel 2 — Unduh Dataset Otomatis & Validasi Guardrail Awal
import glob
import shutil
import pandas as pd
import etl_pipeline
import train

RAW_PATH = etl_pipeline.RAW
os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)

if not os.path.exists(RAW_PATH):
    # Cek apakah dataset sudah ditambahkan lewat Kaggle Add Input (/kaggle/input)
    kaggle_matches = glob.glob("/kaggle/input/**/indonesia_mbg_nationwide_enriched_2026.csv", recursive=True)
    if kaggle_matches:
        shutil.copy(kaggle_matches[0], RAW_PATH)
        print("Dataset disalin dari Kaggle Input:", kaggle_matches[0])
    else:
        import kagglehub
        dl_dir = kagglehub.dataset_download("luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry")
        src_csv = os.path.join(dl_dir, "indonesia_mbg_nationwide_enriched_2026.csv")
        if not os.path.exists(src_csv):
            src_csv = glob.glob(os.path.join(dl_dir, "*.csv"))[0]
        shutil.copy(src_csv, RAW_PATH)
        print("Dataset diunduh via kagglehub:", src_csv)
else:
    print("Dataset lokal sudah tersedia:", RAW_PATH)

df_clean = train.load_clean_raw()
print(f"Dimensi pasca-guardrail: {df_clean.shape[0]:,} baris x {df_clean.shape[1]} kolom")
print("Kolom bocor yang dibuang:", etl_pipeline.DROP_LEAK)
print(f"Provinsi unik: {df_clean['province'].nunique()} | Null: {int(df_clean.isna().sum().sum())}")
display(df_clean.head(3))
""")

md("""
### Langkah 2 — Konfigurasi Eksperimen, Stratified Split 80:20 & Transformasi Fitur + `province` Target-Encoding

- `train_df` (`10.400` baris) dan `test_df` (`2.600` baris) dipartisi secara deterministik berdasarkan kuartil target (`random_state=42`).
- Seluruh transformator (`ReflectionLog`, `Log1p`, `QuantileBinner`, `OneHotEncoder`, **`TargetEncoder(province)`**, dan `StandardScaler`) di-*fit* secara terisolasi pada tiap lipatan latih (`5-fold CV`) agar tidak ada kebocoran target ke data validasi maupun uji.
""")

code("""
# Sel 3 — Konfigurasi Pelatihan & Persiapan 5-Fold CV + Matriks Holdout
import time

N_TRIALS = 30          # Ubah ke 15 jika ingin run lebih singkat
CV_FOLDS = 5           # Sesuai target validasi silang 5-fold Charter
USE_PROVINCE_TE = True # Target-encoding 38 provinsi

train_df, test_df = etl_pipeline.stratified_split(df_clean, test_size=0.2, random_state=train.RANDOM_STATE)
X_train_raw = train_df.drop(columns=[etl_pipeline.TARGET])
y_train = train_df[etl_pipeline.TARGET]
X_test_raw = test_df.drop(columns=[etl_pipeline.TARGET])
y_test = test_df[etl_pipeline.TARGET]

print(f"Train: {X_train_raw.shape} (target mean={y_train.mean():.3f}%) | Test Holdout: {X_test_raw.shape} (target mean={y_test.mean():.3f}%)")

folds_by_scenario = {}
holdout_data = {}

for sc in ("pra", "posthoc"):
    t0 = time.time()
    folds = train.prepare_cv_folds(X_train_raw, y_train, sc, USE_PROVINCE_TE, CV_FOLDS)
    full_pipe = etl_pipeline.build_pipeline(sc, use_province_te=USE_PROVINCE_TE)
    X_tr_arr = full_pipe.fit_transform(X_train_raw, y_train.to_numpy(dtype=float))
    feat_cols = list(full_pipe[-2].get_feature_names_out())
    X_tr_df = pd.DataFrame(X_tr_arr, columns=feat_cols)
    X_te_df = pd.DataFrame(full_pipe.transform(X_test_raw), columns=feat_cols)
    train.verify_transformed_guardrail(X_tr_df, X_te_df)

    folds_by_scenario[sc] = folds
    holdout_data[sc] = (full_pipe, X_tr_df, X_te_df, feat_cols)
    print(f"[{sc.upper():7s}] siap dalam {time.time()-t0:.2f}s | jumlah fitur = {len(feat_cols)} | TE province aktif: {'prov_te__province' in feat_cols}")
""")

md("""
### Langkah 3 — Uji Ablasi Singkat: Pengaruh `province` Target-Encoding

Sebelum menjalankan benchmark seluruh model, sel ini membandingkan kinerja 5-fold CV `XGBoost` default **tanpa** target-encoding provinsi (`33/37` fitur) vs **dengan** target-encoding provinsi (`34/38` fitur).
""")

code("""
# Sel 4 — Ablasi Tanpa vs Dengan Province Target-Encoding
from sklearn.base import clone
from xgboost import XGBRegressor

ablation_rows = []
xgb_probe = XGBRegressor(n_estimators=400, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9, random_state=42, n_jobs=-1)

for sc in ("pra", "posthoc"):
    folds_no_te = train.prepare_cv_folds(X_train_raw, y_train, sc, use_province_te=False, cv_folds=CV_FOLDS)
    _, sum_no = train.evaluate_model_cv("XGBoost", xgb_probe, folds_no_te)
    _, sum_yes = train.evaluate_model_cv("XGBoost", xgb_probe, folds_by_scenario[sc])
    ablation_rows.append({
        "Skenario": sc, "Konfigurasi": f"Tanpa Province TE ({folds_no_te[0][0].shape[1]} fitur)",
        "CV MAE": sum_no["cv_mae_mean"], "CV RMSE": sum_no["cv_rmse_mean"], "CV R2": sum_no["cv_r2_mean"],
    })
    ablation_rows.append({
        "Skenario": sc, "Konfigurasi": f"Dengan Province TE ({folds_by_scenario[sc][0][0].shape[1]} fitur)",
        "CV MAE": sum_yes["cv_mae_mean"], "CV RMSE": sum_yes["cv_rmse_mean"], "CV R2": sum_yes["cv_r2_mean"],
    })

display(pd.DataFrame(ablation_rows))
""")

md("""
### Langkah 4 — Benchmark 6 Algoritma Charter & Laporan 5-Fold CV Per-Fold

Mengevaluasi `MeanPredictor`, `Ridge`, **`RandomForest`**, `HistGradientBoosting`, `LightGBM`, dan `XGBoost` pada setiap lipatan Fold 1 s.d. Fold 5 serta pada holdout test set (2.600 baris).
""")

code("""
# Sel 5 — Benchmark 6 Kandidat Model & Rekap Metrik Per-Fold
import numpy as np

candidates = train.make_base_candidates()
all_cv_rows = []
holdout_records = {sc: [] for sc in ("pra", "posthoc")}
cv_summaries = {sc: {} for sc in ("pra", "posthoc")}
base_records_for_mlflow = {sc: [] for sc in ("pra", "posthoc")}

for sc in ("pra", "posthoc"):
    folds = folds_by_scenario[sc]
    _, X_tr_full, X_te_full, feat_cols = holdout_data[sc]
    print(f"\\n=== SKENARIO {sc.upper()} ({len(feat_cols)} fitur) ===")

    for name, est in candidates.items():
        fold_rows, cv_sum = train.evaluate_model_cv(name, est, folds)
        for row in fold_rows:
            all_cv_rows.append({"scenario": sc, **row})
        cv_summaries[sc][name] = cv_sum

        model_full = clone(est)
        model_full.fit(X_tr_full, y_train)
        h_metrics = train.calc_metrics(y_test.to_numpy(dtype=float), model_full.predict(X_te_full))

        holdout_records[sc].append({
            "model": name, **cv_sum,
            "holdout_MAE": h_metrics["MAE"], "holdout_RMSE": h_metrics["RMSE"], "holdout_R2": h_metrics["R2"],
        })
        base_records_for_mlflow[sc].append((name, model_full, fold_rows, cv_sum, h_metrics))
        print(f"  {name:22s} CV MAE={cv_sum['cv_mae_mean']:.3f}±{cv_sum['cv_mae_std']:.3f} -> Holdout MAE={h_metrics['MAE']:.3f} RMSE={h_metrics['RMSE']:.3f} R2={h_metrics['R2']:.3f}")

df_cv_base = pd.DataFrame(all_cv_rows)
print("\\nContoh Ringkasan Per-Fold (Fold 1..5) Model Base:")
display(df_cv_base.pivot_table(index=["scenario", "model"], columns="fold", values="MAE").round(3))
""")

md("""
### Langkah 5 — Optimasi Bayesian Optuna (`30 Trial x 5-Fold CV`)

Memilih booster terbaik per skenario (`XGBoost` vs `LightGBM`), melakukan optimasi Bayesian pada ruang parameter yang dipagari di lipatan 5-Fold CV, lalu mengevaluasi model final satu kali pada 2.600 data holdout dan memeriksa ketercapaian target Project Charter (`MAE <= 3,0`, `RMSE <= 4,5`, `R2 >= 0,35`).
""")

code("""
# Sel 6 — Optuna Bayesian Hyperparameter Tuning & Evaluasi Final Holdout
best_bundles = {}
final_results = {}

for sc in ("pra", "posthoc"):
    folds = folds_by_scenario[sc]
    full_pipe, X_tr_full, X_te_full, feat_cols = holdout_data[sc]
    booster_choice = min(["XGBoost", "LightGBM"], key=lambda m: cv_summaries[sc][m]["cv_mae_mean"])
    print(f"\\n[{sc.upper()}] Menjalankan Optuna ({N_TRIALS} trial x {CV_FOLDS}-Fold) untuk {booster_choice}...")

    t_opt = time.time()
    tuned_est, best_params = train.tune_top_booster_optuna(booster_choice, folds, n_trials=N_TRIALS)
    tuned_name = f"{booster_choice} (Optuna)"

    opt_fold_rows, opt_cv_sum = train.evaluate_model_cv(tuned_name, tuned_est, folds)
    for row in opt_fold_rows:
        all_cv_rows.append({"scenario": sc, **row})

    best_model = clone(tuned_est)
    best_model.fit(X_tr_full, y_train)
    opt_holdout = train.calc_metrics(y_test.to_numpy(dtype=float), best_model.predict(X_te_full))

    holdout_records[sc].append({
        "model": tuned_name, **opt_cv_sum,
        "holdout_MAE": opt_holdout["MAE"], "holdout_RMSE": opt_holdout["RMSE"], "holdout_R2": opt_holdout["R2"],
    })
    holdout_sorted = sorted(holdout_records[sc], key=lambda r: r["holdout_MAE"])
    best_bundles[sc] = (tuned_name, best_model, best_params, opt_fold_rows, opt_cv_sum, opt_holdout)

    final_results[sc] = {
        "scenario": sc,
        "best_model": f"[{sc}] {tuned_name}",
        "MAE": round(opt_holdout["MAE"], 3),
        "RMSE": round(opt_holdout["RMSE"], 3),
        "R2": round(opt_holdout["R2"], 3),
        "target_MAE<=3.0": bool(opt_holdout["MAE"] <= 3.0),
        "target_R2>=0.35": bool(opt_holdout["R2"] >= 0.35),
        "target_RMSE<=4.5": bool(opt_holdout["RMSE"] <= 4.5),
        "n_features": len(feat_cols),
        "use_province_te": USE_PROVINCE_TE,
        "best_params": best_params,
        "cv_5fold_summary": opt_cv_sum,
        "cv_per_fold": opt_fold_rows,
        "holdout_all_models": holdout_sorted,
    }
    print(f"Selesai ({time.time()-t_opt:.1f}s) | Best Params: {best_params}")
    display(pd.DataFrame(holdout_sorted))
    print("Status Target Charter:", {k: final_results[sc][k] for k in ["best_model", "MAE", "RMSE", "R2", "target_MAE<=3.0", "target_R2>=0.35", "target_RMSE<=4.5"]})
""")

md("""
### Langkah 6 — Interpretabilitas Explainable AI (TreeSHAP Inline)

Menghitung nilai Shapley pada 2.600 sampel uji holdout untuk kedua model terbaik, menyimpan ke `figures_fase3/`, dan menampilkan grafik Beeswarm + Feature Importance langsung di sel output.
""")

code("""
# Sel 7 — Visualisasi & Penyimpanan Plot TreeSHAP
import matplotlib.pyplot as plt
import shap

os.makedirs("figures_fase3", exist_ok=True)
shap_files_by_sc = {}

for sc in ("pra", "posthoc"):
    tuned_name, best_model, _, _, _, _ = best_bundles[sc]
    _, _, X_te_full, _ = holdout_data[sc]
    explainer = shap.TreeExplainer(best_model)
    sv = explainer.shap_values(X_te_full)

    bee_path = f"figures_fase3/shap_beeswarm_{sc}.png"
    plt.figure(figsize=(10, 6))
    shap.summary_plot(sv, X_te_full, show=False, max_display=15)
    plt.title(f"SHAP Beeswarm - Skenario {sc.upper()} ({tuned_name})")
    plt.tight_layout()
    plt.savefig(bee_path, dpi=150)
    plt.show()
    plt.close()

    bar_path = f"figures_fase3/shap_bar_{sc}.png"
    plt.figure(figsize=(10, 6))
    shap.summary_plot(sv, X_te_full, plot_type="bar", show=False, max_display=15)
    plt.title(f"SHAP Feature Importance - Skenario {sc.upper()} ({tuned_name})")
    plt.tight_layout()
    plt.savefig(bar_path, dpi=150)
    plt.show()
    plt.close()

    shap_files_by_sc[sc] = [bee_path, bar_path]
    print(f"[{sc.upper()}] SHAP disimpan:", bee_path, "dan", bar_path)
""")

md("""
### Langkah 7 — Logging MLflow, Ekspor Artefak (`.joblib` + `.pkl` + CSV + JSON), & Arsip Zip Kaggle

Sel terakhir mencatat seluruh riwayat eksperimen ke MLflow (`mlruns.db`), menyimpan artefak yang langsung kompatibel dengan `api.py` dan `app.py`, lalu membungkus semuanya menjadi `plateguard_kaggle_outputs.zip` di `/kaggle/working/` agar mudah diunduh.
""")

code("""
# Sel 8 — Simpan Artefak Produksi, Log MLflow, & Buat Zip Download Kaggle
import json
import pickle
import zipfile
import joblib
import mlflow

TRACKING_URI = f"sqlite:///{os.path.abspath('mlruns.db')}"
if mlflow.active_run() is not None:
    mlflow.end_run()
mlflow.set_tracking_uri(TRACKING_URI)
mlflow.set_experiment("plateguard-mbg-training")

os.makedirs("models", exist_ok=True)
for sc in ("pra", "posthoc"):
    full_pipe, X_tr_full, X_te_full, feat_cols = holdout_data[sc]
    tuned_name, best_model, best_params, opt_fold_rows, opt_cv_sum, opt_holdout = best_bundles[sc]

    # Simpan dataset terproses baru (termasuk prov_te__province)
    proc_dir = f"data/processed/{sc}"
    os.makedirs(proc_dir, exist_ok=True)
    X_tr_full.round(4).to_csv(f"{proc_dir}/X_train.csv", index=False)
    X_te_full.round(4).to_csv(f"{proc_dir}/X_test.csv", index=False)
    y_train.to_csv(f"{proc_dir}/y_train.csv", index=False)
    y_test.to_csv(f"{proc_dir}/y_test.csv", index=False)

    # Simpan pipeline & model terbaik (.joblib untuk API/Streamlit + .pkl sesuai Charter)
    joblib.dump(full_pipe, f"models/pipeline_{sc}.joblib")
    bundle = {
        "name": f"[{sc}] {tuned_name}",
        "model": best_model,
        "params": best_params,
        "features": feat_cols,
        "use_province_te": USE_PROVINCE_TE,
        "cv_5fold_summary": opt_cv_sum,
        "cv_per_fold": opt_fold_rows,
        "holdout_metrics": opt_holdout,
    }
    joblib.dump(bundle, f"models/best_{sc}.joblib")
    with open(f"models/best_{sc}.pkl", "wb") as fp:
        pickle.dump(bundle, fp)

    # Log semua model pembanding & model tuned ke MLflow
    for m_name, m_obj, f_rows, cv_sum, h_met in base_records_for_mlflow[sc]:
        raw_p = m_obj.get_params() if hasattr(m_obj, "get_params") else {}
        simple_p = {k: v for k, v in raw_p.items() if isinstance(v, (int, float, str, bool)) or v is None}
        train.log_mlflow_run(sc, m_name, simple_p, f_rows, cv_sum, h_met, USE_PROVINCE_TE, len(feat_cols))

    train.log_mlflow_run(
        sc, tuned_name, best_params, opt_fold_rows, opt_cv_sum, opt_holdout,
        USE_PROVINCE_TE, len(feat_cols), fitted_model=best_model, extra_artifacts=shap_files_by_sc[sc]
    )

pd.DataFrame(all_cv_rows).to_csv("models/cv_per_fold_report.csv", index=False)
with open("models/fase3_metrics.json", "w", encoding="utf-8") as fh:
    json.dump(final_results, fh, indent=1, ensure_ascii=False)

# Kemas semua artefak ke zip di /kaggle/working (bila di Kaggle) atau direktori kerja saat ini
out_root = "/kaggle/working" if os.path.isdir("/kaggle/working") else os.getcwd()
zip_path = os.path.join(out_root, "plateguard_kaggle_outputs.zip")
INCLUDE_DIRS = ["models", "figures_fase3", "data/processed", "mlruns"]
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for d in INCLUDE_DIRS:
        if os.path.exists(d):
            for root_dir, _, files in os.walk(d):
                for fn in files:
                    fp = os.path.join(root_dir, fn)
                    zf.write(fp, arcname=os.path.relpath(fp, "."))
    if os.path.exists("mlruns.db"):
        zf.write("mlruns.db", arcname="mlruns.db")

print("SUKSES! Ringkasan MLflow runs:", mlflow.search_runs(experiment_names=["plateguard-mbg-training"]).shape[0], "runs tercatat.")
print("Zip hasil siap diunduh di:", zip_path, f"({os.path.getsize(zip_path)/1e6:.2f} MB)")
print("\\nLangkah sinkron lokal:")
print("1. Unduh plateguard_kaggle_outputs.zip dari tab Output Kaggle.")
print("2. Ekstrak ke folder Proyek_MBG/ (menimpa models/, figures_fase3/, data/processed/).")
print("3. Jalankan `mlflow ui --backend-store-uri sqlite:///mlruns.db` atau langsung jalankan app.py/api.py.")
""")

nb = {
    "cells": [
        {
            "cell_type": kind,
            "id": f"tk-{i:02d}",
            "metadata": {},
            **(
                {"source": text.splitlines(keepends=True)}
                if kind == "markdown"
                else {"source": text.splitlines(keepends=True), "outputs": [], "execution_count": None}
            ),
        }
        for i, (kind, text) in enumerate(CELLS)
    ],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

out_path = os.path.join(BASE, "train_kaggle.ipynb")
with open(out_path, "w", encoding="utf-8") as fh:
    json.dump(nb, fh, ensure_ascii=False, indent=1)
print(f"OK: {len(nb['cells'])} sel ditulis -> {out_path}")
