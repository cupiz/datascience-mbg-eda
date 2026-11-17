# -*- coding: utf-8 -*-
"""Skrip Pelatihan Model Lokal End-to-End PlateGuard MBG (Sesuai Project Charter).

Menjalankan seluruh tahapan pemodelan secara reprodusibel di mesin lokal:
  1. Memuat dataset mentah & menerapkan guardrail pembuangan kolom bocor (DROP_LEAK).
  2. Membagi 80:20 holdout terstratifikasi kuartil target (sama persis dengan Fase 2).
  3. Membangun pipeline ETL bebas leakage termasuk target-encoding kolom `province` (38 provinsi).
  4. Mengevaluasi 6 keluarga algoritma: MeanPredictor, Ridge, Random Forest,
     HistGradientBoosting, LightGBM, dan XGBoost dengan laporan 5-Fold CV per-fold.
  5. Optimasi Bayesian Optuna berbasis 5-Fold CV pada kandidat boosting terbaik.
  6. Menyimpan artefak produksi (.joblib + .pkl), laporan metrik per-fold, dataset terproses,
     visualisasi TreeSHAP, serta mencatat seluruh eksperimen & model ke MLflow.

Contoh pemakaian:
  python train.py --n-trials 30 --cv-folds 5
  python train.py --no-province-te --n-trials 15
"""
import argparse
import inspect
import json
import os
import pickle
import sys
import time
import warnings
from typing import Any, Dict, List, Tuple

os.environ.setdefault("MLFLOW_DISABLE_AGENT_HINT", "1")

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import mlflow
import mlflow.sklearn
import numpy as np
import optuna
import pandas as pd
import shap
from lightgbm import LGBMRegressor
from sklearn.base import clone
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from xgboost import XGBRegressor

BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

import etl_pipeline
from etl_pipeline import DROP_LEAK, RAW, TARGET, build_pipeline, stratified_split

RANDOM_STATE = 42


def calc_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Menghitung metrik regresi standar proyek (MAE, RMSE, R2)."""
    return {
        "MAE": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "R2": round(float(r2_score(y_true, y_pred)), 4),
    }


def load_clean_raw() -> pd.DataFrame:
    """Memuat CSV mentah dan memastikan seluruh fitur bocor telah dibuang."""
    if not os.path.exists(RAW):
        raise FileNotFoundError(
            f"Dataset mentah tidak ditemukan di {RAW}. Jalankan `python download_data.py` lebih dulu."
        )
    df = pd.read_csv(RAW)
    for col in DROP_LEAK:
        assert col in df.columns, f"Skema dataset berubah: kolom {col} tidak ada."
    df = df.drop(columns=DROP_LEAK)
    assert not df.isna().any().any(), "Dataset mengandung nilai kosong tak terduga."
    return df


def verify_transformed_guardrail(X_tr: pd.DataFrame, X_te: pd.DataFrame) -> None:
    """Memastikan hasil transformasi bebas dari fitur bocor dan NaN."""
    feats = set(X_tr.columns)
    for bad in ("waste_adjusted", "compliance_tier", "confidence", "distribution_id", "cot_nutrition"):
        assert not any(bad in f for f in feats), f"Fitur bocor lolos ke fitur latih: {bad}"
    assert not X_tr.isna().any().any() and not X_te.isna().any().any(), "Terdapat NaN pasca-ETL."


def prepare_cv_folds(
    X_train_raw: pd.DataFrame,
    y_train: pd.Series,
    scenario: str,
    use_province_te: bool,
    cv_folds: int,
) -> List[Tuple[pd.DataFrame, np.ndarray, pd.DataFrame, np.ndarray]]:
    """Menyiapkan matriks fitur per fold agar state ETL/TargetEncoder di-fit eksklusif di train fold."""
    kf = KFold(n_splits=cv_folds, shuffle=True, random_state=RANDOM_STATE)
    folds = []
    y_arr = y_train.to_numpy(dtype=float)

    for tr_idx, val_idx in kf.split(X_train_raw):
        pipe = build_pipeline(scenario, use_province_te=use_province_te)
        X_tr_raw = X_train_raw.iloc[tr_idx]
        X_va_raw = X_train_raw.iloc[val_idx]
        y_tr_k, y_va_k = y_arr[tr_idx], y_arr[val_idx]

        X_tr_arr = pipe.fit_transform(X_tr_raw, y_tr_k)
        cols = list(pipe[-2].get_feature_names_out())
        X_tr_df = pd.DataFrame(X_tr_arr, columns=cols)
        X_va_df = pd.DataFrame(pipe.transform(X_va_raw), columns=cols)
        verify_transformed_guardrail(X_tr_df, X_va_df)
        folds.append((X_tr_df, y_tr_k, X_va_df, y_va_k))

    return folds


def make_base_candidates() -> Dict[str, Any]:
    """Kandidat model regresi sesuai spesifikasi Project Charter."""
    return {
        "MeanPredictor": DummyRegressor(strategy="mean"),
        "Ridge": Ridge(alpha=1.0),
        "RandomForest": RandomForestRegressor(
            n_estimators=250,
            max_depth=16,
            min_samples_leaf=4,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "HistGradientBoosting": HistGradientBoostingRegressor(
            max_iter=400, random_state=RANDOM_STATE
        ),
        "LightGBM": LGBMRegressor(
            n_estimators=400,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbose=-1,
        ),
        "XGBoost": XGBRegressor(
            n_estimators=400,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
    }


def evaluate_model_cv(
    model_name: str,
    estimator: Any,
    folds: List[Tuple[pd.DataFrame, np.ndarray, pd.DataFrame, np.ndarray]],
) -> Tuple[List[Dict[str, Any]], Dict[str, float]]:
    """Menjalankan evaluasi k-fold dan mengembalikan metrik tiap fold serta ringkasan mean/std."""
    fold_rows = []
    for k_idx, (X_tr, y_tr, X_va, y_va) in enumerate(folds, start=1):
        est = clone(estimator)
        est.fit(X_tr, y_tr)
        preds = est.predict(X_va)
        m = calc_metrics(y_va, preds)
        fold_rows.append({"model": model_name, "fold": k_idx, **m})

    maes = [r["MAE"] for r in fold_rows]
    rmses = [r["RMSE"] for r in fold_rows]
    r2s = [r["R2"] for r in fold_rows]
    summary = {
        "cv_mae_mean": round(float(np.mean(maes)), 4),
        "cv_mae_std": round(float(np.std(maes)), 4),
        "cv_rmse_mean": round(float(np.mean(rmses)), 4),
        "cv_rmse_std": round(float(np.std(rmses)), 4),
        "cv_r2_mean": round(float(np.mean(r2s)), 4),
        "cv_r2_std": round(float(np.std(r2s)), 4),
    }
    return fold_rows, summary


def tune_top_booster_optuna(
    family: str,
    folds: List[Tuple[pd.DataFrame, np.ndarray, pd.DataFrame, np.ndarray]],
    n_trials: int,
) -> Tuple[Any, Dict[str, Any]]:
    """Optimasi hiperparameter Bayesian menggunakan Optuna di atas lipatan 5-fold CV."""
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    sampler = optuna.samplers.TPESampler(seed=RANDOM_STATE)

    def objective(trial: optuna.Trial) -> float:
        common = {
            "n_estimators": trial.suggest_int("n_estimators", 250, 900),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.10, log=True),
            "subsample": trial.suggest_float("subsample", 0.65, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.60, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-3, 2.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 2.0, log=True),
            "random_state": RANDOM_STATE,
            "n_jobs": -1,
        }
        if family == "XGBoost":
            model = XGBRegressor(
                **common,
                max_depth=trial.suggest_int("max_depth", 3, 7),
                min_child_weight=trial.suggest_int("min_child_weight", 1, 10),
            )
        else:
            model = LGBMRegressor(
                **common,
                num_leaves=trial.suggest_int("num_leaves", 15, 63),
                min_child_samples=trial.suggest_int("min_child_samples", 10, 50),
                verbose=-1,
            )

        fold_maes = []
        for X_tr, y_tr, X_va, y_va in folds:
            m = clone(model)
            m.fit(X_tr, y_tr)
            fold_maes.append(mean_absolute_error(y_va, m.predict(X_va)))
        return float(np.mean(fold_maes))

    study = optuna.create_study(direction="minimize", sampler=sampler)
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best_params = dict(study.best_params)
    if family == "XGBoost":
        tuned_est = XGBRegressor(**best_params, random_state=RANDOM_STATE, n_jobs=-1)
    else:
        tuned_est = LGBMRegressor(**best_params, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1)
    return tuned_est, best_params


def generate_shap_plots(model: Any, X_te: pd.DataFrame, scenario: str, best_label: str) -> List[str]:
    """Menghasilkan dan menyimpan plot TreeSHAP beeswarm serta bar importance."""
    fig_dir = os.path.join(BASE, "figures_fase3")
    os.makedirs(fig_dir, exist_ok=True)
    saved_paths: List[str] = []

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_te)

    bee_path = os.path.join(fig_dir, f"shap_beeswarm_{scenario}.png")
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X_te, show=False, max_display=15)
    plt.title(f"SHAP Beeswarm - Skenario {scenario.upper()} ({best_label})")
    plt.tight_layout()
    plt.savefig(bee_path, dpi=150)
    plt.close()
    saved_paths.append(bee_path)

    bar_path = os.path.join(fig_dir, f"shap_bar_{scenario}.png")
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X_te, plot_type="bar", show=False, max_display=15)
    plt.title(f"SHAP Feature Importance - Skenario {scenario.upper()} ({best_label})")
    plt.tight_layout()
    plt.savefig(bar_path, dpi=150)
    plt.close()
    saved_paths.append(bar_path)
    return saved_paths


def log_mlflow_run(
    scenario: str,
    model_name: str,
    params: Dict[str, Any],
    fold_rows: List[Dict[str, Any]],
    cv_summary: Dict[str, float],
    holdout_metrics: Dict[str, float],
    use_province_te: bool,
    n_features: int,
    fitted_model: Any = None,
    extra_artifacts: List[str] | None = None,
) -> None:
    """Mencatat parameter, metrik per fold, holdout, dan artefak model ke MLflow."""
    if mlflow.active_run() is not None:
        mlflow.end_run()
    run_name = f"{scenario}-{model_name}".replace(" ", "_")
    with mlflow.start_run(run_name=run_name):
        mlflow.set_tags({
            "scenario": scenario,
            "model_family": model_name,
            "province_target_encoding": str(use_province_te),
        })
        safe_params = {
            k: v for k, v in {"scenario": scenario, "n_features": n_features, "province_te": use_province_te, **params}.items()
        }
        mlflow.log_params(safe_params)

        metrics_payload = {
            **cv_summary,
            "holdout_mae": holdout_metrics["MAE"],
            "holdout_rmse": holdout_metrics["RMSE"],
            "holdout_r2": holdout_metrics["R2"],
        }
        for row in fold_rows:
            k = row["fold"]
            metrics_payload[f"cv_fold_{k}_mae"] = row["MAE"]
            metrics_payload[f"cv_fold_{k}_rmse"] = row["RMSE"]
            metrics_payload[f"cv_fold_{k}_r2"] = row["R2"]
        mlflow.log_metrics(metrics_payload)

        for path in (extra_artifacts or []):
            if os.path.exists(path):
                mlflow.log_artifact(path)

        if fitted_model is not None:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                sig_params = inspect.signature(mlflow.sklearn.log_model).parameters
                log_kw: Dict[str, Any] = {}
                if "serialization_format" in sig_params:
                    # Hindari penolakan skops terhadap tipe LightGBM/XGBoost di MLflow >= 3.x
                    log_kw["serialization_format"] = "cloudpickle"
                if "pip_requirements" in sig_params:
                    # Hindari jeda lama pemindaian pip freeze lingkungan Anaconda/Kaggle
                    log_kw["pip_requirements"] = [
                        "scikit-learn", "xgboost", "lightgbm", "joblib", "pandas", "numpy"
                    ]
                if "name" in sig_params:
                    mlflow.sklearn.log_model(fitted_model, name="model", **log_kw)
                else:
                    mlflow.sklearn.log_model(fitted_model, artifact_path="model", **log_kw)


def run_scenario_training(
    df: pd.DataFrame,
    scenario: str,
    use_province_te: bool,
    cv_folds: int,
    n_trials: int,
    run_shap: bool,
) -> Dict[str, Any]:
    """Melatih, menvalidasi 5-fold, tuning Optuna, dan menyimpan hasil untuk satu skenario."""
    print(f"\n{'=' * 72}")
    print(f"SKENARIO: {scenario.upper()} | Province Target-Encoding: {use_province_te} | CV: {cv_folds}-Fold")
    print(f"{'=' * 72}")

    train_df, test_df = stratified_split(df, test_size=0.2, random_state=RANDOM_STATE)
    X_train_raw = train_df.drop(columns=[TARGET])
    y_train = train_df[TARGET]
    X_test_raw = test_df.drop(columns=[TARGET])
    y_test = test_df[TARGET]

    # 1. Pre-transform fold CV secara ketat untuk isolasi fitting ETL & TargetEncoder
    t_fold = time.time()
    folds = prepare_cv_folds(X_train_raw, y_train, scenario, use_province_te, cv_folds)
    n_feats = folds[0][0].shape[1]
    print(f"Fold {cv_folds}-CV disiapkan dalam {time.time() - t_fold:.2f}s (jumlah fitur = {n_feats}).")

    # 2. Bangun matriks penuh train/test holdout dengan ETL bersih
    full_pipe = build_pipeline(scenario, use_province_te=use_province_te)
    X_tr_full_arr = full_pipe.fit_transform(X_train_raw, y_train.to_numpy(dtype=float))
    feat_cols = list(full_pipe[-2].get_feature_names_out())
    X_tr_full = pd.DataFrame(X_tr_full_arr, columns=feat_cols)
    X_te_full = pd.DataFrame(full_pipe.transform(X_test_raw), columns=feat_cols)
    verify_transformed_guardrail(X_tr_full, X_te_full)

    # 3. Benchmark seluruh kandidat Charter pada CV & holdout
    candidates = make_base_candidates()
    all_cv_rows: List[Dict[str, Any]] = []
    holdout_records: List[Dict[str, Any]] = []
    fitted_models: Dict[str, Any] = {}
    cv_summaries: Dict[str, Dict[str, float]] = {}

    for name, est in candidates.items():
        fold_rows, cv_sum = evaluate_model_cv(name, est, folds)
        for row in fold_rows:
            all_cv_rows.append({"scenario": scenario, **row})
        cv_summaries[name] = cv_sum

        model_full = clone(est)
        model_full.fit(X_tr_full, y_train)
        fitted_models[name] = model_full
        h_metrics = calc_metrics(y_test.to_numpy(dtype=float), model_full.predict(X_te_full))
        holdout_records.append({
            "model": name,
            **cv_sum,
            "holdout_MAE": h_metrics["MAE"],
            "holdout_RMSE": h_metrics["RMSE"],
            "holdout_R2": h_metrics["R2"],
        })
        fold_maes_str = " | ".join(f"F{r['fold']}:{r['MAE']:.3f}" for r in fold_rows)
        print(
            f"  {name:22s} CV MAE={cv_sum['cv_mae_mean']:.3f}±{cv_sum['cv_mae_std']:.3f} "
            f"[{fold_maes_str}] -> Holdout MAE={h_metrics['MAE']:.3f} RMSE={h_metrics['RMSE']:.3f} R2={h_metrics['R2']:.3f}"
        )

        params_to_log = model_full.get_params() if hasattr(model_full, "get_params") else {}
        simple_params = {k: v for k, v in params_to_log.items() if isinstance(v, (int, float, str, bool)) or v is None}
        log_mlflow_run(
            scenario, name, simple_params, fold_rows, cv_sum, h_metrics,
            use_province_te, n_feats, fitted_model=None
        )

    # 4. Pilih booster terbaik antara XGBoost & LightGBM lalu optimasi Optuna (5-Fold CV)
    booster_choice = min(["XGBoost", "LightGBM"], key=lambda m: cv_summaries[m]["cv_mae_mean"])
    print(f"\n-> Tuning Optuna ({n_trials} trial x {cv_folds}-Fold CV) pada kandidat terbaik: {booster_choice}...")
    t_opt = time.time()
    tuned_est, best_params = tune_top_booster_optuna(booster_choice, folds, n_trials=n_trials)
    tuned_name = f"{booster_choice} (Optuna)"

    opt_fold_rows, opt_cv_sum = evaluate_model_cv(tuned_name, tuned_est, folds)
    for row in opt_fold_rows:
        all_cv_rows.append({"scenario": scenario, **row})
    cv_summaries[tuned_name] = opt_cv_sum

    best_model = clone(tuned_est)
    best_model.fit(X_tr_full, y_train)
    opt_holdout = calc_metrics(y_test.to_numpy(dtype=float), best_model.predict(X_te_full))
    holdout_records.append({
        "model": tuned_name,
        **opt_cv_sum,
        "holdout_MAE": opt_holdout["MAE"],
        "holdout_RMSE": opt_holdout["RMSE"],
        "holdout_R2": opt_holdout["R2"],
    })
    print(
        f"  {tuned_name:22s} ({time.time() - t_opt:.1f}s) CV MAE={opt_cv_sum['cv_mae_mean']:.3f}±{opt_cv_sum['cv_mae_std']:.3f} "
        f"-> Holdout MAE={opt_holdout['MAE']:.3f} RMSE={opt_holdout['RMSE']:.3f} R2={opt_holdout['R2']:.3f}"
    )

    # 5. Simpan dataset terproses, pipeline, dan model terbaik (.joblib + .pkl)
    proc_dir = os.path.join(BASE, "data", "processed", scenario)
    os.makedirs(proc_dir, exist_ok=True)
    X_tr_full.round(4).to_csv(os.path.join(proc_dir, "X_train.csv"), index=False)
    X_te_full.round(4).to_csv(os.path.join(proc_dir, "X_test.csv"), index=False)
    y_train.to_csv(os.path.join(proc_dir, "y_train.csv"), index=False)
    y_test.to_csv(os.path.join(proc_dir, "y_test.csv"), index=False)

    models_dir = os.path.join(BASE, "models")
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(full_pipe, os.path.join(models_dir, f"pipeline_{scenario}.joblib"))

    bundle = {
        "name": f"[{scenario}] {tuned_name}",
        "model": best_model,
        "params": best_params,
        "features": feat_cols,
        "use_province_te": use_province_te,
        "cv_5fold_summary": opt_cv_sum,
        "cv_per_fold": opt_fold_rows,
        "holdout_metrics": opt_holdout,
    }
    joblib.dump(bundle, os.path.join(models_dir, f"best_{scenario}.joblib"))
    with open(os.path.join(models_dir, f"best_{scenario}.pkl"), "wb") as fp:
        pickle.dump(bundle, fp)

    shap_files: List[str] = []
    if run_shap:
        shap_files = generate_shap_plots(best_model, X_te_full, scenario, tuned_name)
        print(f"  SHAP plots tersimpan: {', '.join(os.path.basename(p) for p in shap_files)}")

    log_mlflow_run(
        scenario,
        tuned_name,
        best_params,
        opt_fold_rows,
        opt_cv_sum,
        opt_holdout,
        use_province_te,
        n_feats,
        fitted_model=best_model,
        extra_artifacts=shap_files,
    )

    return {
        "scenario": scenario,
        "best_model": f"[{scenario}] {tuned_name}",
        "MAE": round(opt_holdout["MAE"], 3),
        "RMSE": round(opt_holdout["RMSE"], 3),
        "R2": round(opt_holdout["R2"], 3),
        "target_MAE<=3.0": bool(opt_holdout["MAE"] <= 3.0),
        "target_R2>=0.35": bool(opt_holdout["R2"] >= 0.35),
        "target_RMSE<=4.5": bool(opt_holdout["RMSE"] <= 4.5),
        "n_features": n_feats,
        "use_province_te": use_province_te,
        "best_params": best_params,
        "cv_5fold_summary": opt_cv_sum,
        "cv_per_fold": opt_fold_rows,
        "holdout_all_models": sorted(holdout_records, key=lambda r: r["holdout_MAE"]),
        "all_cv_rows": all_cv_rows,
    }


def main():
    parser = argparse.ArgumentParser(description="PlateGuard MBG Local Training Pipeline (Charter Compliant)")
    parser.add_argument("--n-trials", type=int, default=30, help="Jumlah trial Optuna per skenario (default: 30)")
    parser.add_argument("--cv-folds", type=int, default=5, help="Jumlah lipatan Cross-Validation (default: 5)")
    parser.add_argument("--no-province-te", action="store_true", help="Nonaktifkan target-encoding kolom province")
    parser.add_argument("--no-shap", action="store_true", help="Lewati generasi gambar SHAP")
    parser.add_argument("--mlflow-uri", type=str, default=f"sqlite:///{os.path.join(BASE, 'mlruns.db')}", help="Tracking URI MLflow")
    args = parser.parse_args()

    use_province_te = not args.no_province_te
    os.chdir(BASE)
    mlflow.set_tracking_uri(args.mlflow_uri)
    mlflow.set_experiment("plateguard-mbg-training")

    df = load_clean_raw()
    results = {}
    all_cv_rows: List[Dict[str, Any]] = []

    for scenario in ("pra", "posthoc"):
        res = run_scenario_training(
            df=df,
            scenario=scenario,
            use_province_te=use_province_te,
            cv_folds=args.cv_folds,
            n_trials=args.n_trials,
            run_shap=not args.no_shap,
        )
        all_cv_rows.extend(res.pop("all_cv_rows"))
        results[scenario] = res

    cv_csv_path = os.path.join(BASE, "models", "cv_per_fold_report.csv")
    pd.DataFrame(all_cv_rows).to_csv(cv_csv_path, index=False)

    metrics_path = os.path.join(BASE, "models", "fase3_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1, ensure_ascii=False)

    print(f"\n{'=' * 72}")
    print("PELATIHAN SELESAI! Ringkasan artefak tersimpan:")
    print(f"  - Laporan CV per-fold : {cv_csv_path}")
    print(f"  - Metrik lengkap JSON : {metrics_path}")
    print(f"  - Model (.joblib+.pkl): {os.path.join(BASE, 'models')}")
    print(f"  - MLflow Tracking URI : {args.mlflow_uri}")
    print(f"{'=' * 72}")


if __name__ == "__main__":
    main()
