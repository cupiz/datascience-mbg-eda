# -*- coding: utf-8 -*-
"""EDA lengkap dataset MBG 2026 - menghasilkan figures/ + eda_results.json
Dijalankan dengan Anaconda Python 3.12 (pandas, numpy, matplotlib, seaborn, scipy, sklearn).
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import MinMaxScaler, StandardScaler

plt.rcParams.update({"figure.dpi": 150, "font.size": 9})
sns.set_theme(style="whitegrid")

BASE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(BASE, "figures")
os.makedirs(FIG, exist_ok=True)

df = pd.read_csv(os.path.join(BASE, "data", "indonesia_mbg_nationwide_enriched_2026.csv"))
R = {}

# ---------- Bab 2/3: struktur ----------
R["shape"] = list(df.shape)
R["dtypes"] = {c: str(t) for c, t in df.dtypes.items()}
num_cols = [c for c in df.select_dtypes(include=[np.number]).columns]
cat_cols = [c for c in df.select_dtypes(include=["object"]).columns
            if c not in ("distribution_id", "cot_nutrition_logistics_rationale")]
R["num_cols"] = num_cols
R["cat_cols"] = cat_cols
R["n_nulls"] = int(df.isnull().sum().sum())
R["nulls_per_col"] = {c: int(v) for c, v in df.isnull().sum().items() if v > 0}
R["n_dup_rows"] = int(df.duplicated().sum())
R["n_dup_id"] = int(df.duplicated(subset=["distribution_id"]).sum())
R["id_unique"] = bool(df.distribution_id.is_unique)

desc = df[num_cols].describe().T
R["describe"] = desc.round(3).to_dict(orient="index")

# ---------- Bab 4: missing ----------
fig, ax = plt.subplots(figsize=(6, 2.2))
mv = df.isnull().sum()
ax.bar(range(len(mv)), mv.values, color="#c0392b")
ax.set_ylim(0, max(1, mv.max() * 1.2))
ax.set_title("Jumlah missing value per kolom (total = %d)" % mv.sum())
ax.set_xticks([])
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig01_missing.png"))
plt.close(fig)

# ---------- Bab 5: distribusi, skew, kurtosis ----------
sk = df[num_cols].skew()
ku = df[num_cols].kurtosis()  # excess kurtosis (Fisher)
R["skewness"] = sk.round(3).to_dict()
R["kurtosis_excess"] = ku.round(3).to_dict()

key9 = ["kitchen_daily_capacity_portions", "delivery_distance_km", "transit_time_minutes",
        "food_arrival_temperature_celsius", "plate_waste_percentage",
        "spoilage_risk_index", "total_meal_cost_idr", "estimated_calories_kcal",
        "cost_to_nutrition_ratio"]
fig, axes = plt.subplots(3, 3, figsize=(11, 8.5))
for ax, c in zip(axes.ravel(), key9):
    sns.histplot(df[c], kde=True, ax=ax, color="#2c7fb8", bins=40)
    ax.set_title("%s\nskew=%.2f  kurt=%.2f" % (c, sk[c], ku[c]), fontsize=8)
    ax.set_xlabel("")
fig.suptitle("Histogram + KDE variabel numerik kunci", y=1.0)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig02_hist_kde.png"), bbox_inches="tight")
plt.close(fig)

# ---------- Bab 7.1: kategorikal ----------
fig, axes = plt.subplots(2, 3, figsize=(13, 7.5))
order_target = ["Exemplary-Gold-Standard", "Standard-Compliant",
                "Marginal-Quality-At-Risk", "Non-Compliant-Intervention-Required"]
palette_target = {"Exemplary-Gold-Standard": "#27ae60", "Standard-Compliant": "#2c7fb8",
                  "Marginal-Quality-At-Risk": "#f39c12", "Non-Compliant-Intervention-Required": "#c0392b"}
for ax, c in zip(axes.ravel(), ["regional_cluster", "beneficiary_category", "protein_type",
                                "delivery_transport_mode", "primary_food_waste_driver"]):
    vc = df[c].value_counts()
    ax.barh(vc.index[::-1], vc.values[::-1], color="#34495e")
    ax.set_title(c, fontsize=9)
    for i, v in enumerate(vc.values[::-1]):
        ax.text(v + 60, i, f"{v:,} ({v/len(df)*100:.1f}%)".replace(",", "."), va="center", fontsize=7)
ax = axes.ravel()[5]
vc = df["bgn_program_compliance_tier"].value_counts().reindex(order_target)
ax.barh(vc.index[::-1], vc.values[::-1], color=[palette_target[i] for i in vc.index[::-1]])
ax.set_title("bgn_program_compliance_tier (TARGET)", fontsize=9)
for i, v in enumerate(vc.values[::-1]):
    ax.text(v + 60, i, f"{v:,} ({v/len(df)*100:.1f}%)".replace(",", "."), va="center", fontsize=7)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig03_bar_kategorikal.png"), bbox_inches="tight")
plt.close(fig)

R["tier_counts"] = df.bgn_program_compliance_tier.value_counts().to_dict()
R["tier_pct"] = (df.bgn_program_compliance_tier.value_counts(normalize=True) * 100).round(2).to_dict()

# ---------- Bab 6.1: transformasi log ----------
skewed = sk[sk.abs() > 1].index.tolist()
R["skewed_gt1"] = skewed
fig, axes = plt.subplots(2, len(skewed), figsize=(4 * len(skewed), 6))
if len(skewed) == 1:
    axes = axes.reshape(2, 1)
R["skew_log_after"] = {}
for j, c in enumerate(skewed):
    x = df[c]
    tr = np.log1p(x) if (x >= 0).all() else np.log(x - x.min() + 1)
    R["skew_log_after"][c] = round(float(tr.skew()), 3)
    sns.histplot(x, kde=True, ax=axes[0, j], color="#c0392b", bins=40)
    axes[0, j].set_title("SEBELUM %s\nskew=%.2f" % (c, sk[c]), fontsize=8)
    sns.histplot(tr, kde=True, ax=axes[1, j], color="#27ae60", bins=40)
    axes[1, j].set_title("SESUDAH log1p\nskew=%.2f" % tr.skew(), fontsize=8)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig04_log_transform.png"), bbox_inches="tight")
plt.close(fig)

# ---------- Bab 6.2: scaling demo ----------
demo_cols = ["delivery_distance_km", "total_meal_cost_idr", "spoilage_risk_index"]
X = df[demo_cols].values
std = StandardScaler().fit_transform(X)
mm = MinMaxScaler().fit_transform(X)
R["scaling_demo"] = {
    "raw_mean": X.mean(axis=0).round(2).tolist(),
    "raw_std": X.std(axis=0).round(2).tolist(),
    "standardized_mean": std.mean(axis=0).round(6).tolist(),
    "standardized_std": std.std(axis=0).round(6).tolist(),
    "minmax_min": mm.min(axis=0).round(6).tolist(),
    "minmax_max": mm.max(axis=0).round(6).tolist(),
}

# ---------- Bab 6.4: feature engineering ----------
dfe = df.copy()
dfe["biaya_per_kkal"] = dfe["total_meal_cost_idr"] / dfe["estimated_calories_kcal"]
dfe["kecepatan_rata2_km_jam"] = dfe["delivery_distance_km"] / (dfe["transit_time_minutes"] / 60)
dfe["sisa_gram_per_porsi_proxy"] = dfe["plate_waste_percentage"] / 100 * 500  # asumsi porsi 500 g
bins = pd.qcut(dfe["delivery_distance_km"], 4, labels=["Sangat Dekat", "Dekat", "Jauh", "Sangat Jauh"])
dfe["jarak_kategori"] = bins
R["fe_biaya_per_kkal"] = dfe["biaya_per_kkal"].describe().round(2).to_dict()
R["fe_kecepatan"] = dfe["kecepatan_rata2_km_jam"].describe().round(2).to_dict()
R["fe_jarak_kategori_counts"] = dfe["jarak_kategori"].value_counts().to_dict()
R["corr_fe_target_ordinal"] = None  # dihitung di bawah

# ---------- Bab 7.2: bivariate ----------
tier_ord = {t: i for i, t in enumerate(order_target)}  # 0=terbaik .. 3=terburuk
dfe["tier_ordinal"] = dfe["bgn_program_compliance_tier"].map(tier_ord)

fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))
axes[0].scatter(df.delivery_distance_km, df.transit_time_minutes, s=4, alpha=0.25, color="#2c7fb8")
r, p = stats.pearsonr(df.delivery_distance_km, df.transit_time_minutes)
axes[0].set_title("Jarak vs Waktu Transit (Pearson r=%.3f, p<0.001)" % r)
axes[0].set_xlabel("delivery_distance_km"); axes[0].set_ylabel("transit_time_minutes")
axes[1].scatter(df.plate_waste_percentage, df.waste_adjusted_effective_cost_idr, s=4, alpha=0.25, color="#c0392b")
r2, p2 = stats.pearsonr(df.plate_waste_percentage, df.waste_adjusted_effective_cost_idr)
axes[1].set_title("Sisa Makanan vs Biaya Efektif (Pearson r=%.3f)" % r2)
axes[1].set_xlabel("plate_waste_percentage"); axes[1].set_ylabel("waste_adjusted_effective_cost_idr")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig05_scatter.png"), bbox_inches="tight")
plt.close(fig)
R["pearson_jarak_transit"] = {"r": round(float(r), 3), "p": float(p)}
R["pearson_sisa_biayaefektif"] = {"r": round(float(r2), 3), "p": float(p2)}

# boxplot per tier
fig, axes = plt.subplots(2, 2, figsize=(12, 8))
for ax, c in zip(axes.ravel(), ["plate_waste_percentage", "spoilage_risk_index",
                                "food_arrival_temperature_celsius", "cost_to_nutrition_ratio"]):
    sns.boxplot(data=dfe, x="bgn_program_compliance_tier", y=c, order=order_target,
                palette=palette_target, ax=ax, hue="bgn_program_compliance_tier",
                legend=False)
    ax.set_title(c, fontsize=9)
    ax.tick_params(axis="x", rotation=25, labelsize=7)
    ax.set_xlabel("")
fig.suptitle("Distribusi variabel kunci per tier kepatuhan (target)")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig06_box_per_tier.png"), bbox_inches="tight")
plt.close(fig)

grp = dfe.groupby("bgn_program_compliance_tier")[
    ["plate_waste_percentage", "spoilage_risk_index", "food_arrival_temperature_celsius",
     "transit_time_minutes", "cost_to_nutrition_ratio", "total_meal_cost_idr"]].mean().reindex(order_target)
R["tier_means"] = grp.round(2).to_dict(orient="index")

# ---------- Bab 7.3: korelasi ----------
corr_num = num_cols + ["biaya_per_kkal", "kecepatan_rata2_km_jam", "tier_ordinal"]
C = dfe[corr_num].corr()
R["corr_top_with_target"] = (C["tier_ordinal"].drop("tier_ordinal")
                             .sort_values(key=abs, ascending=False).head(12).round(3).to_dict())
fig, ax = plt.subplots(figsize=(13, 11))
sns.heatmap(C, annot=True, fmt=".2f", cmap="RdBu_r", center=0, annot_kws={"size": 6},
            square=True, linewidths=0.3, ax=ax, cbar_kws={"shrink": 0.7})
ax.set_title("Matriks korelasi Pearson (tier_ordinal: 0=Exemplary .. 3=Non-Compliant)", fontsize=11)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig07_corr_heatmap.png"), bbox_inches="tight")
plt.close(fig)

# Spearman untuk hubungan non-linear utama
sp = dfe[["plate_waste_percentage", "spoilage_risk_index", "transit_time_minutes",
          "food_arrival_temperature_celsius", "tier_ordinal"]].corr(method="spearman")
R["spearman_key"] = sp.round(3).to_dict()

# Cramer's V: cluster vs tier
from scipy.stats import chi2_contingency
def cramers_v(x, y):
    ct = pd.crosstab(x, y)
    chi2 = chi2_contingency(ct)[0]
    n = ct.values.sum()
    return float(np.sqrt(chi2 / (n * (min(ct.shape) - 1))))
R["cramers_cluster_tier"] = round(cramers_v(df.regional_cluster, df.bgn_program_compliance_tier), 3)
R["cramers_protein_tier"] = round(cramers_v(df.protein_type, df.bgn_program_compliance_tier), 3)
R["cramers_driver_tier"] = round(cramers_v(df.primary_food_waste_driver, df.bgn_program_compliance_tier), 3)
chi2v, pv, dofv, _ = chi2_contingency(pd.crosstab(df.regional_cluster, df.bgn_program_compliance_tier))
R["chi2_cluster_tier"] = {"chi2": round(float(chi2v), 1), "p": float(pv), "dof": int(dofv)}

# ---------- Bab 8: outliers ----------
q1 = df[num_cols].quantile(0.25)
q3 = df[num_cols].quantile(0.75)
iqr = q3 - q1
low = q1 - 1.5 * iqr
high = q3 + 1.5 * iqr
out_iqr = ((df[num_cols] < low) | (df[num_cols] > high)).sum()
z = np.abs(stats.zscore(df[num_cols]))
out_z = pd.Series((z > 3).sum(axis=0), index=num_cols)
R["outliers_iqr"] = out_iqr[out_iqr > 0].to_dict()
R["outliers_z3"] = out_z[out_z > 0].to_dict()
R["outliers_iqr_pct"] = {c: round(v / len(df) * 100, 2) for c, v in out_iqr[out_iqr > 0].items()}

fig, axes = plt.subplots(1, 4, figsize=(12, 3.4))
for ax, c in zip(axes, ["spoilage_risk_index", "plate_waste_percentage",
                        "transit_time_minutes", "delivery_distance_km"]):
    sns.boxplot(y=df[c], ax=ax, color="#8e9aaf")
    ax.set_title("IQR outliers: %d (%.1f%%)" % (out_iqr[c], out_iqr[c] / len(df) * 100), fontsize=8)
    ax.set_ylabel(c, fontsize=8)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig08_outlier_box.png"), bbox_inches="tight")
plt.close(fig)

# ---------- Bab 9: insight pendukung ----------
# tingkat bermasalah (Marginal + Non-Compliant) per cluster
dfe["bermasalah"] = dfe.bgn_program_compliance_tier.isin(
    ["Marginal-Quality-At-Risk", "Non-Compliant-Intervention-Required"])
by_cluster = dfe.groupby("regional_cluster")["bermasalah"].mean().sort_values(ascending=False) * 100
R["bermasalah_pct_per_cluster"] = by_cluster.round(2).to_dict()
by_prov = dfe.groupby("province")["bermasalah"].agg(["mean", "count"])
by_prov = by_prov[by_prov["count"] >= 100]
R["bermasalah_pct_provinsi_teratas"] = (by_prov["mean"].sort_values(ascending=False).head(8) * 100).round(1).to_dict()
R["bermasalah_pct_provinsi_terendah"] = (by_prov["mean"].sort_values().head(5) * 100).round(1).to_dict()

fig, ax = plt.subplots(figsize=(8, 3.6))
by_cluster.plot.bar(ax=ax, color="#c0392b")
ax.set_ylabel("% distribusi bermasalah (Marginal + Non-Compliant)")
ax.set_title("Risiko kepatuhan per klaster wilayah")
ax.tick_params(axis="x", rotation=15, labelsize=8)
for i, v in enumerate(by_cluster.values):
    ax.text(i, v + 0.5, "%.1f%%" % v, ha="center", fontsize=8)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig09_bermasalah_cluster.png"), bbox_inches="tight")
plt.close(fig)

# waste driver per tier (stacked)
ct = pd.crosstab(df.primary_food_waste_driver, df.bgn_program_compliance_tier)[order_target]
ctn = ct.div(ct.sum(axis=1), axis=0) * 100
fig, ax = plt.subplots(figsize=(9, 4))
bottom = np.zeros(len(ctn))
colors = [palette_target[t] for t in ctn.columns]
for t, col in zip(ctn.columns, ctn.T.values):
    ax.barh(ctn.index, col, left=bottom, color=colors[order_target.index(t)], label=t)
    bottom += col
ax.set_xlabel("% dalam tiap pemicu sisa makanan")
ax.set_title("Komposisi tier kepatuhan per pemicu utama sisa makanan")
ax.legend(fontsize=7, loc="lower right")
ax.tick_params(axis="y", labelsize=8)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig10_driver_tier.png"), bbox_inches="tight")
plt.close(fig)
R["driver_tier_crosstab_pct"] = ctn.round(1).to_dict(orient="index")

# suhu tiba < 60C (batas makanan panas) vs tier
dfe["suhu_dibawah_60"] = dfe.food_arrival_temperature_celsius < 60
R["pct_suhu_dibawah_60"] = round(float(dfe.suhu_dibawah_60.mean() * 100), 2)
R["bermasalah_by_suhu60"] = (dfe.groupby("suhu_dibawah_60")["bermasalah"].mean() * 100).round(1).to_dict()

# ringkasan biaya
R["total_biaya_harian_idr"] = float((df.total_meal_cost_idr * df.kitchen_daily_capacity_portions).sum())
R["rataan_biaya_porsi"] = round(float(df.total_meal_cost_idr.mean()), 0)
R["rataan_sisa_piring_pct"] = round(float(df.plate_waste_percentage.mean()), 2)
R["rataan_kkal"] = round(float(df.estimated_calories_kcal.mean()), 1)
R["rataan_protein_g"] = round(float(df.estimated_protein_grams.mean()), 1)
R["rataan_suhu_tiba"] = round(float(df.food_arrival_temperature_celsius.mean()), 1)

# refleksi utk skew kiri (log1p tidak cocok utk suhu tiba)
t = df.food_arrival_temperature_celsius
refl = np.log(t.max() + 1 - t)
R["skew_reflect_after"] = {"food_arrival_temperature_celsius": round(float(refl.skew()), 3)}
R["temp_max"] = float(t.max())

# baseline model sanity (dummy vs logistic vs RF) - untuk rekomendasi Bab 9.3
# PENTING: target TIDAK boleh ikut jadi fitur (kebocoran data)
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder
feat_num = [c for c in num_cols if c != "confidence_score"]
# province (38 kategori) sengaja tidak disertakan pada baseline ini,
# menyamai konfigurasi yang dilaporkan pada Laporan EDA Bab 9.1
cat_feats = ["regional_cluster", "beneficiary_category", "protein_type",
             "delivery_transport_mode", "primary_food_waste_driver"]
Xe = pd.get_dummies(df[feat_num + cat_feats], columns=cat_feats, drop_first=True).astype(float)
y = LabelEncoder().fit_transform(df.bgn_program_compliance_tier)
Xtr, Xte, ytr, yte = train_test_split(Xe, y, test_size=0.2, random_state=42, stratify=y)
dummy = pd.Series(ytr).value_counts(normalize=True).max()
lr = LogisticRegression(max_iter=3000)
lr_acc = cross_val_score(lr, Xtr, ytr, cv=3, scoring="accuracy").mean()
rf = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1)
rf_acc = cross_val_score(rf, Xtr, ytr, cv=3, scoring="accuracy").mean()
from sklearn.ensemble import HistGradientBoostingClassifier
hgb = HistGradientBoostingClassifier(random_state=42, max_iter=200)
hgb_acc = cross_val_score(hgb, Xtr, ytr, cv=3, scoring="accuracy").mean()
R["baseline_dummy_acc"] = round(float(dummy), 3)
R["logreg_cv_acc"] = round(float(lr_acc), 3)
R["rf_cv_acc"] = round(float(rf_acc), 3)
R["hgb_cv_acc"] = round(float(hgb_acc), 3)
R["leakage_note"] = ("Target tier hampir deterministik dari fitur (RF CV acc ~1.0): "
                     "label diturunkan berbasis aturan; bahas di keterbatasan.")
rf.fit(Xtr, ytr)
importances = pd.Series(rf.feature_importances_, index=Xe.columns).sort_values(ascending=False).head(10)
R["rf_top_features"] = importances.round(4).to_dict()

# ---------- Proyek regresi (Tugas 1 final): target plate_waste_percentage ----------
# Verifikasi kebocoran: waste_adjusted_effective_cost_idr = total/(1 - waste/100)
calc_eff = df.total_meal_cost_idr / (1 - df.plate_waste_percentage / 100)
R["leak_effective_cost_maxdiff"] = round(
    float((calc_eff - df.waste_adjusted_effective_cost_idr).abs().max()), 4)

yw = df.plate_waste_percentage.values
R["waste_mean_predictor_mae"] = round(float(np.abs(yw - yw.mean()).mean()), 3)
R["corr_with_waste"] = (df.select_dtypes(include=[np.number]).corr()["plate_waste_percentage"]
                        .drop("plate_waste_percentage")
                        .sort_values(key=abs, ascending=False).round(3).to_dict())

from sklearn.model_selection import KFold, cross_validate
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.pipeline import make_pipeline

num_w = [c for c in num_cols if c not in
         ("plate_waste_percentage", "waste_adjusted_effective_cost_idr", "confidence_score")]
cat4 = ["regional_cluster", "beneficiary_category", "protein_type", "delivery_transport_mode"]
Xw = pd.get_dummies(df[num_w + cat4], columns=cat4, drop_first=True).astype(float)
cvw = KFold(5, shuffle=True, random_state=42)
SCORING = ["r2", "neg_mean_absolute_error", "neg_mean_squared_error"]

def cv_run(model):
    r = cross_validate(model, Xw, yw, cv=cvw, scoring=SCORING)
    return {"r2": round(float(r["test_r2"].mean()), 3),
            "mae": round(float(-r["test_neg_mean_absolute_error"].mean()), 3),
            "rmse": round(float(np.sqrt(-r["test_neg_mean_squared_error"].mean())), 3)}

R["reg_ridge"] = cv_run(make_pipeline(StandardScaler(), Ridge(alpha=1.0)))
R["reg_hgb"] = cv_run(HistGradientBoostingRegressor(random_state=42, max_iter=300))
R["reg_rf"] = cv_run(RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1))

# skenario fitur: +driver (post-hoc) dan +tier (DEMO kebocoran label, jangan dipakai)
Xw2 = pd.concat([Xw, pd.get_dummies(df["primary_food_waste_driver"],
                                    prefix="drv", drop_first=True).astype(float)], axis=1)
_hgb = HistGradientBoostingRegressor(random_state=42, max_iter=300)
_r = cross_validate(_hgb, Xw2, yw, cv=cvw, scoring=SCORING)
R["reg_hgb_driver"] = {"r2": round(float(_r["test_r2"].mean()), 3),
                       "mae": round(float(-_r["test_neg_mean_absolute_error"].mean()), 3),
                       "rmse": round(float(np.sqrt(-_r["test_neg_mean_squared_error"].mean())), 3)}
Xw3 = pd.concat([Xw2, pd.get_dummies(df["bgn_program_compliance_tier"],
                                     prefix="tier", drop_first=True).astype(float)], axis=1)
_r = cross_validate(_hgb, Xw3, yw, cv=cvw, scoring=SCORING)
R["reg_hgb_leak_tier_demo"] = {"r2": round(float(_r["test_r2"].mean()), 3),
                               "mae": round(float(-_r["test_neg_mean_absolute_error"].mean()), 3),
                               "rmse": round(float(np.sqrt(-_r["test_neg_mean_squared_error"].mean())), 3)}

with open(os.path.join(BASE, "eda_results.json"), "w", encoding="utf-8") as f:
    json.dump(R, f, indent=1, ensure_ascii=False, default=str)

print("SELESAI. Figures:", sorted(os.listdir(FIG)))
print("Top corr with target:", R["corr_top_with_target"])
print("Baseline dummy=%.3f LR=%.3f RF=%.3f" % (dummy, lr_acc, rf_acc))
print("Bermasalah per cluster:", R["bermasalah_pct_per_cluster"])
