# -*- coding: utf-8 -*-
"""Generate compact, deployment-ready aggregates and holdout audit table for PlateGuard v2.

Produces:
  - data/processed/overview_aggregates.json
  - data/processed/holdout_audit.csv
"""
import json
import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

import __main__
import etl_pipeline
from etl_pipeline import FeatureBuilder, Log1p, QuantileBinner, ReflectionLog, TARGET, stratified_split

__main__.FeatureBuilder = FeatureBuilder
__main__.Log1p = Log1p
__main__.QuantileBinner = QuantileBinner
__main__.ReflectionLog = ReflectionLog


def _is_bermasalah(g: pd.DataFrame) -> pd.Series:
    return g["bgn_program_compliance_tier"].isin([
        "Marginal-Quality-At-Risk",
        "Non-Compliant-Intervention-Required",
    ])


def _group_stats(df: pd.DataFrame, col: str) -> list[dict]:
    rows = []
    for key, g in df.groupby(col, sort=False):
        rows.append({
            "name": str(key),
            "count": int(len(g)),
            "share_pct": round(float(len(g) / len(df) * 100.0), 2),
            "mean_waste_pct": round(float(g[TARGET].mean()), 2),
            "median_waste_pct": round(float(g[TARGET].median()), 2),
            "bermasalah_pct": round(float(_is_bermasalah(g).mean() * 100.0), 2),
            "optimal_pct": round(float((g[TARGET] < 10.0).mean() * 100.0), 2),
            "mean_cost_idr": round(float(g["total_meal_cost_idr"].mean()), 0),
            "mean_effective_cost_idr": round(float(g["waste_adjusted_effective_cost_idr"].mean()), 0),
            "mean_temp_c": round(float(g["food_arrival_temperature_celsius"].mean()), 2),
            "below_60c_pct": round(float((g["food_arrival_temperature_celsius"] < 60.0).mean() * 100.0), 2),
            "mean_transit_min": round(float(g["transit_time_minutes"].mean()), 1),
            "mean_distance_km": round(float(g["delivery_distance_km"].mean()), 2),
        })
    return rows


def main() -> None:
    raw_path = os.path.join(BASE, "data", "indonesia_mbg_nationwide_enriched_2026.csv")
    df = pd.read_csv(raw_path)

    _, test_df = stratified_split(df)
    y_test_ref = pd.read_csv(os.path.join(BASE, "data", "processed", "pra", "y_test.csv")).iloc[:, 0].values
    max_diff = float(np.abs(test_df[TARGET].values - y_test_ref).max())
    assert max_diff < 1e-6, f"Holdout split mismatch: max_diff={max_diff}"

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        pra_pipe = joblib.load(os.path.join(BASE, "models", "pipeline_pra.joblib"))
        post_pipe = joblib.load(os.path.join(BASE, "models", "pipeline_posthoc.joblib"))
        pra_model = joblib.load(os.path.join(BASE, "models", "best_pra.joblib"))["model"]
        post_model = joblib.load(os.path.join(BASE, "models", "best_posthoc.joblib"))["model"]

    X_test_raw = test_df.drop(columns=[TARGET])
    pred_pra = np.clip(pra_model.predict(pra_pipe.transform(X_test_raw)), 0.0, 100.0)
    pred_post = np.clip(post_model.predict(post_pipe.transform(X_test_raw)), 0.0, 100.0)

    audit_cols = [
        "distribution_id", "province", "regional_cluster", "beneficiary_category",
        "protein_type", "delivery_transport_mode", "kitchen_daily_capacity_portions",
        "raw_ingredient_cost_per_portion_idr", "total_meal_cost_idr",
        "estimated_calories_kcal", "estimated_protein_grams",
        "delivery_distance_km", "transit_time_minutes", "food_arrival_temperature_celsius",
        "student_attendance_rate_pct", "local_farmer_sourcing_pct",
        "primary_food_waste_driver",
    ]
    audit_df = test_df[audit_cols].copy()
    audit_df["actual_waste_pct"] = test_df[TARGET].round(2)
    audit_df["pred_pra_pct"] = np.round(pred_pra, 2)
    audit_df["pred_posthoc_pct"] = np.round(pred_post, 2)

    out_audit = os.path.join(BASE, "data", "processed", "holdout_audit.csv")
    audit_df.to_csv(out_audit, index=False)

    temp_cold = df[df["food_arrival_temperature_celsius"] < 60.0]
    temp_warm = df[df["food_arrival_temperature_celsius"] >= 60.0]

    aggregates = {
        "n_total": int(len(df)),
        "n_train": int(len(df) - len(test_df)),
        "n_test": int(len(test_df)),
        "n_provinces": int(df["province"].nunique()),
        "summary": {
            "mean_waste_pct": round(float(df[TARGET].mean()), 2),
            "median_waste_pct": round(float(df[TARGET].median()), 2),
            "max_waste_pct": round(float(df[TARGET].max()), 2),
            "min_waste_pct": round(float(df[TARGET].min()), 2),
            "p90_waste_pct": round(float(np.percentile(df[TARGET], 90)), 2),
            "bermasalah_pct": round(float(_is_bermasalah(df).mean() * 100.0), 2),
            "optimal_pct": round(float((df[TARGET] < 10.0).mean() * 100.0), 2),
            "mean_cost_idr": round(float(df["total_meal_cost_idr"].mean()), 0),
            "mean_effective_cost_idr": round(float(df["waste_adjusted_effective_cost_idr"].mean()), 0),
            "mean_loss_per_portion_idr": round(float((df["waste_adjusted_effective_cost_idr"] - df["total_meal_cost_idr"]).mean()), 0),
            "mean_temp_c": round(float(df["food_arrival_temperature_celsius"].mean()), 2),
            "below_60c_pct": round(float((df["food_arrival_temperature_celsius"] < 60.0).mean() * 100.0), 2),
            "cold_arrival_bermasalah_pct": round(float(_is_bermasalah(temp_cold).mean() * 100.0), 1),
            "warm_arrival_bermasalah_pct": round(float(_is_bermasalah(temp_warm).mean() * 100.0), 1),
            "cold_arrival_mean_waste_pct": round(float(temp_cold[TARGET].mean()), 2),
            "warm_arrival_mean_waste_pct": round(float(temp_warm[TARGET].mean()), 2),
        },
        "clusters": sorted(_group_stats(df, "regional_cluster"), key=lambda x: -x["bermasalah_pct"]),
        "provinces": sorted(_group_stats(df, "province"), key=lambda x: -x["bermasalah_pct"]),
        "beneficiaries": sorted(_group_stats(df, "beneficiary_category"), key=lambda x: -x["mean_waste_pct"]),
        "proteins": sorted(_group_stats(df, "protein_type"), key=lambda x: -x["mean_waste_pct"]),
        "transports": sorted(_group_stats(df, "delivery_transport_mode"), key=lambda x: -x["mean_waste_pct"]),
        "drivers": sorted(_group_stats(df, "primary_food_waste_driver"), key=lambda x: -x["share_pct"]),
        "tiers": sorted(_group_stats(df, "bgn_program_compliance_tier"), key=lambda x: x["mean_waste_pct"]),
    }

    out_agg = os.path.join(BASE, "data", "processed", "overview_aggregates.json")
    with open(out_agg, "w", encoding="utf-8") as f:
        json.dump(aggregates, f, indent=2, ensure_ascii=False)

    print(f"OK | holdout max_diff={max_diff:.2e} | wrote {out_agg} and {out_audit} ({len(audit_df)} rows)")


if __name__ == "__main__":
    main()
