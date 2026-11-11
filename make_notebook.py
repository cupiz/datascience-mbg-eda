# -*- coding: utf-8 -*-
"""Generator dan Executor untuk eda_notebook.ipynb.

Membangun notebook interaktif yang rapi, dilengkapi:
1. Narasi markdown pengantar sebelum tiap sel kode.
2. Sel kode eksekusi yang menghasilkan grafik inline (%matplotlib inline) dan tabel display.
3. Narasi markdown interpretasi & temuan analitis tepat di bawah tiap sel kode/output.
4. Mengeksekusi seluruh sel sehingga notebook tersimpan lengkap dengan output hasil running.
"""
import json
import os
import sys
import nbformat
from nbconvert.preprocessors import ExecutePreprocessor

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_NB = os.path.join(BASE, "eda_notebook.ipynb")

# ----------------- KONTEN SEL NOTEBOOK -----------------

STEPS = [
    # === TAHAP 1: INISIALISASI & LOAD DATA ===
    {
        "intro": """## Sel 1 - Inisialisasi Environment, Library, & Pemuatan Data
Memuat dependensi analisis data (`pandas`, `numpy`, `matplotlib`, `seaborn`, `scipy`, `scikit-learn`), mengatur visualisasi inline, resolusi path adaptif, serta memuat dataset telemetri nasional MBG 2026.""",
        "code": """# -*- coding: utf-8 -*-
import json
import os
import sys

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import MinMaxScaler, StandardScaler

# Konfigurasi visualisasi inline
%matplotlib inline
plt.rcParams.update({"figure.dpi": 150, "font.size": 9})
sns.set_theme(style="whitegrid")

# Path resolution adaptif (berjalan di root workspace maupun subfolder Proyek_MBG)
try:
    BASE = os.path.dirname(os.path.abspath(__file__))
except NameError:
    BASE = os.getcwd()
    if not os.path.exists(os.path.join(BASE, "data")):
        if os.path.exists(os.path.join(BASE, "Proyek_MBG", "data")):
            BASE = os.path.join(BASE, "Proyek_MBG")

FIG = os.path.join(BASE, "figures")
os.makedirs(FIG, exist_ok=True)

DATA_PATH = os.path.join(BASE, "data", "indonesia_mbg_nationwide_enriched_2026.csv")
df = pd.read_csv(DATA_PATH)
R = {}

print(f"Dataset berhasil dimuat: {DATA_PATH}")
print(f"Dimensi data: {df.shape[0]:,} baris x {df.shape[1]} kolom")
display(df.head(3))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Inisialisasi Data
> - **Cakupan Data:** Dataset memuat **13.000 catatan distribusi harian** Program Makan Bergizi Gratis (MBG) tahun 2026 yang mencakup **38 provinsi** di Indonesia.
> - **Dimensi Awal:** Terdiri atas 26 kolom atribut operasional dapur Satuan Pelayanan Pemenuhan Gizi (SPPG), logistik transportasi, kualitas termal saat tiba, gizi, pembiayaan, hingga persentase sisa piring (*plate waste*).
> - **Relevansi Proyek:** Data karakteristik operasional pra-distribusi ini menjadi basis untuk membangun sistem prediksi sisa makanan secara preventif sebelum armada distribusi diberangkatkan."""
    },

    # === TAHAP 2: STRUKTUR DATA ===
    {
        "intro": """## Sel 2 - Struktur & Kualitas Dasar Dataset
Memisahkan fitur numerik (`num_cols`, 17 kolom) dan kategorikal (`cat_cols`), mengecualikan ID transaksi dan kolom narasi teks anotasi dari fitur pemodelan. Memvalidasi ketiadaan missing value, baris duplikat, serta menyusun tabel statistik deskriptif awal (`df.describe()`).""",
        "code": """# ---------- Struktur Data ----------
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

print("=== RINGKASAN ARSITEKTUR DATASET ===")
print(f"Dimensi Data         : {df.shape[0]:,} baris x {df.shape[1]} kolom")
print(f"Fitur Numerik ({len(num_cols)})   : {num_cols}")
print(f"Fitur Kategorikal ({len(cat_cols)}): {cat_cols}")
print(f"Total Missing Values : {R['n_nulls']} (Nol mutlak)")
print(f"Baris Duplikat       : {R['n_dup_rows']}")
print(f"Keunikan ID Distribusi: {'100% Unik' if R['id_unique'] else 'Terdapat duplikat ID'}")
print("\\nStatistik Deskriptif Seluruh Fitur Numerik:")
display(desc.round(2))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Struktur & Statistik Deskriptif
> - **Struktur Variabel:** Teridentifikasi **17 fitur numerik** dan **7 fitur kategorikal**. Variabel `distribution_id` (100% unik) dan teks narasi `cot_nutrition_logistics_rationale` dikecualikan dari fitur model.
> - **Integritas Awal:** Tidak ditemukan duplikasi baris maupun nilai kosong.
> - **Statistik Kunci:**
>   - **Kapasitas Dapur:** Rata-rata 1.503 porsi/hari (rentang 400 s.d. 3.000 porsi).
>   - **Biaya Bahan Baku:** Rata-rata Rp11.233 per porsi (total biaya per porsi rata-rata Rp13.526).
>   - **Jarak & Waktu Kirim:** Jarak kirim rata-rata 8,76 km (hingga 35 km) dan waktu transit rata-rata 33,5 menit (maksimum mencapai 120 menit).
>   - **Suhu Makanan Tiba:** Rata-rata 62,88°C, namun memiliki sebaran ekor kiri yang turun drastis hingga 28,3°C.
>   - **Target Sisa Piring (`plate_waste_percentage`):** Rata-rata **13,34%** makanan terbuang (ekor tertinggi mencapai 37,7%)."""
    },

    # === TAHAP 3: MISSING VALUES ===
    {
        "intro": """## Sel 3 - Pemeriksaan Nilai Hilang (Missing Values)
Memeriksa missing value pada seluruh kolom dataset dan menyajikannya dalam grafik batang (`figures/fig01_missing.png`).""",
        "code": """# ---------- Missing Values ----------
fig, ax = plt.subplots(figsize=(6, 2.2))
mv = df.isnull().sum()
ax.bar(range(len(mv)), mv.values, color="#c0392b")
ax.set_ylim(0, max(1, mv.max() * 1.2))
ax.set_title("Jumlah missing value per kolom (total = %d)" % mv.sum(), fontsize=10, fontweight="bold")
ax.set_xlabel("Index Kolom (0 - 25)")
ax.set_ylabel("Jumlah Missing")
ax.set_xticks([])
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig01_missing.png"), bbox_inches="tight")
plt.show()

print("Pemeriksaan Missing Values per Kolom:")
print(f"Total missing values: {mv.sum()}")
print("Seluruh 26 kolom terisi 100% lengkap (hasil kurasi data sintetis Kaggle v4).")""",
        "findings": """> ### 💡 Interpretasi & Temuan: Ketiadaan Missing Value
> - **Hasil Inspeksi:** Grafik batang datar menunjukkan kelengkapan mutlak 100% (0 nilai hilang di seluruh 26 kolom).
> - **Catatan Teknis:** Kondisi tanpa missing value ini merupakan hasil kurasi data sekunder Kaggle v4. Pada sistem produksi operasional riil dengan ribuan dapur SPPG, mitigasi missing value (seperti sensor suhu rusak atau form logistik tidak terisi) tetap wajib disiapkan di pipeline ETL."""
    },

    # === TAHAP 4: DISTRIBUSI, SKEWNESS & KURTOSIS ===
    {
        "intro": """## Sel 4 - Analisis Distribusi, Skewness & Kurtosis
Menganalisis bentuk sebaran data numerik melalui koefisien *skewness* dan *excess kurtosis* (Fisher), serta menampilkan histogram + Kurva Densitas Kernel (KDE) untuk 9 variabel kunci (`figures/fig02_hist_kde.png`).""",
        "code": """# ---------- Distribusi, Skewness, Kurtosis ----------
sk = df[num_cols].skew()
ku = df[num_cols].kurtosis()  # excess kurtosis (Fisher)
R["skewness"] = sk.round(3).to_dict()
R["kurtosis_excess"] = ku.round(3).to_dict()

key9 = ["kitchen_daily_capacity_portions", "delivery_distance_km", "transit_time_minutes",
        "food_arrival_temperature_celsius", "plate_waste_percentage",
        "spoilage_risk_index", "total_meal_cost_idr", "estimated_calories_kcal",
        "cost_to_nutrition_ratio"]

fig, axes = plt.subplots(3, 3, figsize=(12, 9))
for ax, c in zip(axes.ravel(), key9):
    sns.histplot(df[c], kde=True, ax=ax, color="#2c7fb8", bins=40)
    ax.set_title(f"{c}\\nskew={sk[c]:.2f} | kurt={ku[c]:.2f}", fontsize=8.5, fontweight="bold")
    ax.set_xlabel("")
fig.suptitle("Histogram + KDE Variabel Numerik Kunci", y=1.02, fontsize=12, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig02_hist_kde.png"), bbox_inches="tight")
plt.show()

skew_kurt_df = pd.DataFrame({
    "Skewness": sk[key9],
    "Excess Kurtosis (Fisher)": ku[key9],
    "Bentuk Distribusi": [
        "Right-Skewed (Ekor Kanan)" if s > 0.5 else ("Left-Skewed (Ekor Kiri)" if s < -0.5 else "Simetris")
        for s in sk[key9]
    ]
})
print("Karakteristik Distribusi 9 Variabel Kunci:")
display(skew_kurt_df.round(2))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Karakteristik Distribusi & Kemencengan
> - **Kemencengan Kanan Ekstrem (*Right-Skewed*):**
>   - `transit_time_minutes` (skew = +2,16; kurtosis = +4,53), `spoilage_risk_index` (skew = +2,05; kurtosis = +3,60), dan `delivery_distance_km` (skew = +1,75; kurtosis = +2,47).
>   - *Makna:* Mayoritas rute distribusi berjarak pendek (< 8 km) dan cepat (< 30 menit), namun ada ekor panjang logistik ke wilayah pelosok yang menempuh waktu hingga 2 jam dengan risiko basi tinggi.
> - **Kemencengan Kiri Tajam (*Left-Skewed*):**
>   - `food_arrival_temperature_celsius` (skew = -2,13; kurtosis = +3,87).
>   - *Makna:* Sebagian besar makanan tiba panas (> 65°C), namun terdapat pengiriman bermasalah di mana suhu anjlok hingga 28°C.
> - **Distribusi Mendekati Simetris / Merata:**
>   - `kitchen_daily_capacity_portions` (skew = -0,01; platikurtik -1,18) menunjukkan sebaran kapasitas SPPG terdistribusi merata antara 500 hingga 2.500 porsi.
>   - Target sisa makanan `plate_waste_percentage` (skew = +0,54) memiliki sebaran mendekati kurva normal."""
    },

    # === TAHAP 5: KATEGORIKAL ===
    {
        "intro": """## Sel 5 - Analisis Frekuensi Variabel Kategorikal
Menampilkan bar chart horizontal frekuensi dan persentase untuk 5 variabel kategorikal (klaster wilayah, penerima, protein, moda transportasi, dan pemicu pemborosan), serta komposisi kelas tier kepatuhan BGN (`figures/fig03_bar_kategorikal.png`).""",
        "code": """# ---------- Variabel Kategorikal ----------
fig, axes = plt.subplots(2, 3, figsize=(14, 8))
order_target = ["Exemplary-Gold-Standard", "Standard-Compliant",
                "Marginal-Quality-At-Risk", "Non-Compliant-Intervention-Required"]
palette_target = {"Exemplary-Gold-Standard": "#27ae60", "Standard-Compliant": "#2c7fb8",
                  "Marginal-Quality-At-Risk": "#f39c12", "Non-Compliant-Intervention-Required": "#c0392b"}

for ax, c in zip(axes.ravel(), ["regional_cluster", "beneficiary_category", "protein_type",
                                "delivery_transport_mode", "primary_food_waste_driver"]):
    vc = df[c].value_counts()
    ax.barh(vc.index[::-1], vc.values[::-1], color="#34495e")
    ax.set_title(c, fontsize=9.5, fontweight="bold")
    for i, v in enumerate(vc.values[::-1]):
        ax.text(v + 60, i, f"{v:,} ({v/len(df)*100:.1f}%)".replace(",", "."), va="center", fontsize=7.5)

ax = axes.ravel()[5]
vc = df["bgn_program_compliance_tier"].value_counts().reindex(order_target)
ax.barh(vc.index[::-1], vc.values[::-1], color=[palette_target[i] for i in vc.index[::-1]])
ax.set_title("bgn_program_compliance_tier (Variabel Konteks)", fontsize=9.5, fontweight="bold")
for i, v in enumerate(vc.values[::-1]):
    ax.text(v + 60, i, f"{v:,} ({v/len(df)*100:.1f}%)".replace(",", "."), va="center", fontsize=7.5)

fig.suptitle("Distribusi Frekuensi Variabel Kategorikal", y=1.01, fontsize=12, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig03_bar_kategorikal.png"), bbox_inches="tight")
plt.show()

R["tier_counts"] = df.bgn_program_compliance_tier.value_counts().to_dict()
R["tier_pct"] = (df.bgn_program_compliance_tier.value_counts(normalize=True) * 100).round(2).to_dict()

tier_summary = pd.DataFrame({
    "Jumlah Distribusi": df.bgn_program_compliance_tier.value_counts().reindex(order_target),
    "Persentase (%)": (df.bgn_program_compliance_tier.value_counts(normalize=True) * 100).reindex(order_target)
})
print("Distribusi Kelas Tier Kepatuhan BGN:")
display(tier_summary.round(2))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Pola Frekuensi Kategorikal
> - **Proporsi Tier Kepatuhan BGN:** Didominasi kelas *Standard-Compliant* (64,7%), diikuti *Marginal-Quality-At-Risk* (13,5%), *Exemplary-Gold-Standard* (11,3%), dan *Non-Compliant* (10,5%). Total distribusi bermasalah mencapai **24,0%**.
> - **Faktor Pemicu Sisa Makanan (`primary_food_waste_driver`):**
>   - *Prior-Snack-Consumption* (63,4%): Menjadi alasan utama piring tidak habis karena siswa sudah kenyang jajan sebelum jadwal makan.
>   - *Sub-Optimal-Arrival-Temperature* (18,5%): Suhu makanan dingin menurunkan nafsu makan siswa.
>   - *Delivery-Transit-Delay* (8,1%): Keterlambatan logistik.
>   - *Excessive-Portion-Size* (6,1%) dan *Low-Palatability-Menu* (3,9%).
> - **Armada Pengiriman:** Motor Roda Tiga Boks Termal (32,9%) dan Mobil Pickup Termal (32,7%) adalah armada utama, disertai perahu ketinting (8,8%) untuk rute kepulauan/sungai."""
    },

    # === TAHAP 6: TRANSFORMASI LOG ===
    {
        "intro": """## Sel 6 - Transformasi Fitur Skewed (log1p)
Menguji transformasi $\\log(1+x)$ pada fitur yang memiliki kemencengan tinggi ($|\\text{skew}| > 1$), disertai visualisasi perbandingan sebelum (merah) dan sesudah (hijau) (`figures/fig04_log_transform.png`).""",
        "code": """# ---------- Transformasi Skew ----------
skewed = sk[sk.abs() > 1].index.tolist()
R["skewed_gt1"] = skewed

fig, axes = plt.subplots(2, len(skewed), figsize=(4 * len(skewed), 6))
if len(skewed) == 1:
    axes = axes.reshape(2, 1)

R["skew_log_after"] = {}
for j, c in enumerate(skewed):
    x = df[c].dropna()
    sk_pre = x.skew()
    axes[0, j].hist(x, bins=30, color="#e74c3c", alpha=0.7)
    axes[0, j].set_title(f"{c}\\nAwal (skew={sk_pre:.2f})", fontsize=8, fontweight="bold")

    x_log = np.log1p(np.maximum(0, x))
    sk_post = x_log.skew()
    R["skew_log_after"][c] = round(float(sk_post), 3)
    axes[1, j].hist(x_log, bins=30, color="#27ae60", alpha=0.7)
    axes[1, j].set_title(f"log1p (skew={sk_post:.2f})", fontsize=8, fontweight="bold")

fig.suptitle("Uji Transformasi log1p pada Variabel Berskew Tinggi (|skew| > 1)", y=1.02, fontsize=11, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig04_log_transform.png"), bbox_inches="tight")
plt.show()

log_eval = pd.DataFrame({
    "Skew Awal": sk[skewed],
    "Skew Pasca log1p": pd.Series(R["skew_log_after"]),
    "Status": [
        "Normalisasi Berhasil" if abs(post) < abs(pre) else "Memperburuk (Perlu Refleksi)"
        for pre, post in zip(sk[skewed], pd.Series(R["skew_log_after"]))
    ]
})
print("Evaluasi Transformasi log1p:")
display(log_eval.round(2))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Efektivitas Transformasi log1p
> - **Normalisasi Berhasil pada Ekor Kanan:**
>   - Jarak kirim: skewness dipangkas dari **+1,75** menjadi **-0,08** (mendekati kurva normal sempurna).
>   - Waktu transit: skewness berkurang dari **+2,16** menjadi **+0,66**.
>   - Indeks risiko pembusukan: skewness turun dari **+2,05** menjadi **+0,81**.
> - **Peringatan Metodologi pada Suhu Tiba (Left-Skewed):**
>   - Transformasi `log1p` justru memperparah kemencengan suhu dari **-2,13** menjadi **-2,77**.
>   - Untuk fitur berskew kiri, pendekatan yang tepat adalah transformasi refleksi: $\log(\max(X) + 1 - X)$, yang sukses menghasilkan skewness **-0,09**."""
    },

    # === TAHAP 7: PENSKALAAN ===
    {
        "intro": """## Sel 7 - Penskalaan Fitur (StandardScaler vs MinMaxScaler)
Mendemonstrasikan komparasi penskalaan fitur numerik berskala beda (jarak tempuh km, total biaya rupiah, dan indeks pembusukan) menggunakan `StandardScaler` (Z-score, $\\mu=0, \\sigma=1$) dan `MinMaxScaler` ($[0, 1]$).""",
        "code": """# ---------- Penskalaan Fitur ----------
demo_cols = ["delivery_distance_km", "total_meal_cost_idr", "spoilage_risk_index"]
X = df[demo_cols].values
std = StandardScaler().fit_transform(X)
mm = MinMaxScaler().fit_transform(X)

R["scaling_demo"] = {
    "raw_mean": X.mean(axis=0).round(2).tolist(),
    "raw_std": X.std(axis=0).round(2).tolist(),
    "standardized_mean": std.mean(axis=0).round(3).tolist(),
    "standardized_std": std.std(axis=0).round(3).tolist(),
    "minmax_min": mm.min(axis=0).round(3).tolist(),
    "minmax_max": mm.max(axis=0).round(3).tolist(),
}

demo_df = pd.DataFrame({
    "Fitur": demo_cols,
    "Raw Mean": R["scaling_demo"]["raw_mean"],
    "Raw Std": R["scaling_demo"]["raw_std"],
    "StdScaler Mean": R["scaling_demo"]["standardized_mean"],
    "StdScaler Std": R["scaling_demo"]["standardized_std"],
    "MinMax Min": R["scaling_demo"]["minmax_min"],
    "MinMax Max": R["scaling_demo"]["minmax_max"]
})
print("Perbandingan Hasil Penskalaan Fitur:")
display(demo_df)""",
        "findings": """> ### 💡 Interpretasi & Temuan: Karakteristik Penskalaan Fitur
> - **StandardScaler ($\mu = 0, \sigma = 1$):** Menghilangkan bias magnitudo (misal biaya belasan ribu rupiah mendominasi jarak yang bernilai belasan km). Pilihan tepat untuk algoritma linier (*Ridge Regression*) dan analisis komponen utama (*PCA*).
> - **MinMaxScaler ($[0, 1]$):** Membatasi seluruh rentang ke skala mutlak 0 sampai 1, sangat berguna untuk algoritma berbasis jarak euclidean (*KNN*, *K-Means*).
> - **Model Pohon (*Ensemble Tree*):** Model utama proyek ini (*HistGradientBoosting*) kebal terhadap skala fitur, namun penskalaan ini penting sebagai pembanding baseline regresi linier."""
    },

    # === TAHAP 8: FEATURE ENGINEERING ===
    {
        "intro": """## Sel 8 - Rekayasa Fitur (Feature Engineering)
Membentuk variabel baru berbasis domain knowledge logistik dan nutrisi: rasio biaya per kalori (`biaya_per_kkal`), kecepatan kirim rata-rata (`kecepatan_rata2_km_jam`), estimasi sisa makanan dalam gram (`sisa_gram_per_porsi_proxy`), dan diskretisasi kuartil jarak kirim (`jarak_kategori`).""",
        "code": """# ---------- Feature Engineering ----------
dfe = df.copy()
dfe["biaya_per_kkal"] = dfe["total_meal_cost_idr"] / dfe["estimated_calories_kcal"]
dfe["kecepatan_rata2_km_jam"] = dfe["delivery_distance_km"] / (dfe["transit_time_minutes"] / 60)
dfe["sisa_gram_per_porsi_proxy"] = dfe["plate_waste_percentage"] / 100 * (dfe["estimated_calories_kcal"] * 0.5)
dfe["jarak_kategori"] = pd.qcut(dfe["delivery_distance_km"], q=4,
                                labels=["Sangat Dekat", "Dekat", "Jauh", "Sangat Jauh"])

R["fe_biaya_per_kkal"] = dfe["biaya_per_kkal"].describe().round(2).to_dict()
R["fe_kecepatan"] = dfe["kecepatan_rata2_km_jam"].describe().round(2).to_dict()
R["fe_jarak_kategori_counts"] = dfe["jarak_kategori"].value_counts().to_dict()

print("Sampel 5 Baris Fitur Baru Hasil Rekayasa:")
display(dfe[["distribution_id", "biaya_per_kkal", "kecepatan_rata2_km_jam", "sisa_gram_per_porsi_proxy", "jarak_kategori"]].head(5))

print("\\nStatistik Deskriptif Fitur Baru:")
display(dfe[["biaya_per_kkal", "kecepatan_rata2_km_jam", "sisa_gram_per_porsi_proxy"]].describe().T.round(2))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Relevansi Fitur Baru
> - **`biaya_per_kkal` (Rata-rata Rp20,01/kkal):** Mengukur efisiensi pengeluaran anggaran terhadap energi riil yang diterima siswa.
> - **`kecepatan_rata2_km_jam` (Rata-rata 16,34 km/jam):** Mengidentifikasi hambatan fisik rute logistik; rute berkecepatan rendah (< 5 km/jam) mengindikasikan kemacetan parah atau akses pedalaman yang memicu penurunan suhu makanan.
> - **`sisa_gram_per_porsi_proxy` (Rata-rata 45,2 gram/porsi):** Mengubah persentase sisa menjadi estimasi berat fisik makanan yang terbuang.
> - **`jarak_kategori`:** Membagi sebaran jarak kirim menjadi 4 zona kuartil untuk penetapan zonasi dapur SPPG."""
    },

    # === TAHAP 9: BIVARIATE ANALYSIS ===
    {
        "intro": """## Sel 9 - Analisis Hubungan Bivariat
Menguji hubungan berpasangan antarvariabel:
1. Multikolinearitas jarak tempuh vs waktu transit dan korelasi sisa piring vs biaya efektif (`figures/fig05_scatter.png`).
2. Sebaran fitur operasional kunci antar tier kepatuhan (`figures/fig06_box_per_tier.png`).""",
        "code": """# ---------- Analisis Bivariat ----------
tier_ord = {t: i for i, t in enumerate(order_target)}
dfe["tier_ordinal"] = dfe["bgn_program_compliance_tier"].map(tier_ord)

fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
axes[0].scatter(df.delivery_distance_km, df.transit_time_minutes, alpha=0.15, color="#2980b9", s=10)
r_jt, p_jt = stats.pearsonr(df.delivery_distance_km, df.transit_time_minutes)
axes[0].set_title(f"Jarak vs Transit (Pearson r = {r_jt:.3f})", fontsize=10, fontweight="bold")
axes[0].set_xlabel("Jarak Kirim (km)")
axes[0].set_ylabel("Waktu Transit (menit)")

axes[1].scatter(df.plate_waste_percentage, df.waste_adjusted_effective_cost_idr,
                alpha=0.15, color="#c0392b", s=10)
r_sb, p_sb = stats.pearsonr(df.plate_waste_percentage, df.waste_adjusted_effective_cost_idr)
axes[1].set_title(f"Sisa Piring vs Biaya Efektif (Pearson r = {r_sb:.3f})", fontsize=10, fontweight="bold")
axes[1].set_xlabel("Sisa Makanan (%)")
axes[1].set_ylabel("Biaya Efektif (Rp/porsi)")

fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig05_scatter.png"), bbox_inches="tight")
plt.show()

R["pearson_jarak_transit"] = {"r": round(float(r_jt), 3), "p": float(p_jt)}
R["pearson_sisa_biayaefektif"] = {"r": round(float(r_sb), 3), "p": float(p_sb)}

fig, axes = plt.subplots(2, 2, figsize=(12, 7.5))
box_cols = ["food_arrival_temperature_celsius", "plate_waste_percentage",
            "spoilage_risk_index", "transit_time_minutes"]
labels_box = ["Suhu Tiba (°C)", "Sisa Piring (%)", "Indeks Risiko Busuk", "Waktu Transit (mnt)"]

for ax, col, lbl in zip(axes.ravel(), box_cols, labels_box):
    sns.boxplot(data=df, x="bgn_program_compliance_tier", y=col, order=order_target,
                palette=palette_target, ax=ax, width=0.5, fliersize=2)
    ax.set_title(lbl, fontsize=10, fontweight="bold")
    ax.set_xlabel("")
    ax.set_xticklabels(["Exemplary", "Standard", "Marginal", "Non-Compliant"], fontsize=8.5)

fig.suptitle("Sebaran Karakteristik Operasional Lintas Tier Kepatuhan BGN", y=1.02, fontsize=12, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig06_box_per_tier.png"), bbox_inches="tight")
plt.show()

means_by_tier = df.groupby("bgn_program_compliance_tier")[
    ["plate_waste_percentage", "spoilage_risk_index", "food_arrival_temperature_celsius",
     "transit_time_minutes", "cost_to_nutrition_ratio", "total_meal_cost_idr"]
].mean().reindex(order_target)
R["tier_means"] = means_by_tier.round(2).to_dict(orient="index")
print("Rata-rata Fitur Operasional Kunci per Tier Kepatuhan:")
display(means_by_tier.round(2))""",
        "findings": """> ### 💡 Interpretasi & Temuan: Hubungan Bivariat & Mutu Operasional
> - **Multikolinearitas Jarak vs Transit ($r = 0,928, p < 0,001$):** Korelasi linear sangat kuat menunjukkan adanya redundansi informasi pengiriman. Diperlukan penanganan seleksi fitur atau regularisasi pada model linear.
> - **Sisa Piring vs Biaya Efektif ($r = 0,622, p < 0,001$):** Membuktikan bahwa semakin banyak sisa makanan di piring siswa, semakin membengkak biaya riil per porsi efektif yang diserap tubuh.
> - **Divergensi Mutu Antar Tier Kepatuhan:**
>   - *Sisa Makanan:* Melonjak konsisten dari **6,7%** (Exemplary) $\rightarrow$ **12,1%** (Standard) $\rightarrow$ **18,9%** (Marginal) $\rightarrow$ **24,3%** (Non-Compliant).
>   - *Suhu Tiba:* Terjun bebas dari **66,6°C** pada Exemplary menjadi hanya **38,1°C** pada Non-Compliant.
>   - *Waktu Transit:* Meningkat tajam dari **18 menit** menjadi **78 menit**."""
    },

    # === TAHAP 10: KORELASI & ASOSIASI ===
    {
        "intro": """## Sel 10 - Analisis Korelasi & Asosiasi
Menyajikan matriks korelasi Pearson seluruh variabel numerik (`figures/fig07_corr_heatmap.png`), korelasi Spearman, serta koefisien Cramér's V untuk menguji keterikatan antarvariabel kategorikal.""",
        "code": """# ---------- Korelasi & Asosiasi ----------
corr_num = num_cols + ["biaya_per_kkal", "kecepatan_rata2_km_jam", "tier_ordinal"]
C = dfe[corr_num].corr()
R["corr_top_with_target"] = (C["tier_ordinal"].drop("tier_ordinal")
                             .sort_values(key=abs, ascending=False).head(12).round(3).to_dict())

fig, ax = plt.subplots(figsize=(11, 9))
sns.heatmap(C, annot=True, fmt=".2f", cmap="coolwarm", center=0, ax=ax,
            cbar_kws={"shrink": 0.8}, annot_kws={"size": 6.8})
ax.set_title("Heatmap Korelasi Pearson Seluruh Fitur Numerik", fontsize=11, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig07_corr_heatmap.png"), bbox_inches="tight")
plt.show()

# Spearman untuk korelasi non-linear
sp_cols = ["plate_waste_percentage", "spoilage_risk_index", "transit_time_minutes",
           "food_arrival_temperature_celsius", "tier_ordinal"]
R["spearman_key"] = dfe[sp_cols].corr(method="spearman").round(3).to_dict()

# Cramer's V asosiasi kategorikal
def cramers_v(x, y):
    tab = pd.crosstab(x, y)
    chi2 = stats.chi2_contingency(tab)[0]
    n = len(x)
    phi2 = chi2 / n
    r, k = tab.shape
    phi2corr = max(0, phi2 - ((k - 1) * (r - 1)) / (n - 1))
    rcorr = r - ((r - 1)**2) / (n - 1)
    kcorr = k - ((k - 1)**2) / (n - 1)
    return np.sqrt(phi2corr / min((kcorr - 1), (rcorr - 1)))

R["cramers_cluster_tier"] = round(float(cramers_v(df.regional_cluster, df.bgn_program_compliance_tier)), 3)
R["cramers_protein_tier"] = round(float(cramers_v(df.protein_type, df.bgn_program_compliance_tier)), 3)
R["cramers_driver_tier"] = round(float(cramers_v(df.primary_food_waste_driver, df.bgn_program_compliance_tier)), 3)

chi2_val, p_val, dof_val, _ = stats.chi2_contingency(pd.crosstab(df.regional_cluster, df.bgn_program_compliance_tier))
R["chi2_cluster_tier"] = {"chi2": round(float(chi2_val), 1), "p": float(p_val), "dof": int(dof_val)}

print("Korelasi Linier Terkuat terhadap Tier Kepatuhan (Ordinal):")
display(pd.Series(R["corr_top_with_target"], name="Pearson r"))

print("\\nAsosiasi Variabel Kategorikal (Cramer's V):")
print(f"  - Klaster Wilayah vs Tier Kepatuhan : {R['cramers_cluster_tier']} (Asosiasi Sedang, Chi2={chi2_val:.1f}, p={p_val:.2e})")
print(f"  - Jenis Protein vs Tier Kepatuhan   : {R['cramers_protein_tier']} (Asosiasi Lemah)")
print(f"  - Faktor Pemicu vs Tier Kepatuhan   : {R['cramers_driver_tier']} (Asosiasi Kuat)")""",
        "findings": """> ### 💡 Interpretasi & Temuan: Kekuatan Asosiasi Fitur
> - **Korelasi Terkuat terhadap Mutu:** Suhu tiba makanan berkorelasi negatif tertinggi ($r = -0,69$), diikuti indeks pembusukan ($r = +0,68$), waktu transit ($r = +0,56$), dan sisa makanan ($r = +0,56$).
> - **Asosiasi Variabel Kategorikal (Cramér's V):**
>   - Faktor pemicu sisa makanan berasosiasi **sangat kuat (V = 0,545)** terhadap status kepatuhan.
>   - Klaster wilayah memiliki asosiasi **sedang signifikan (V = 0,223, $\chi^2 = 1.945,1, p < 0,001$)**, membuktikan bahwa kendala wilayah berpengaruh nyata terhadap kepatuhan.
>   - Jenis protein memiliki asosiasi **paling lemah (V = 0,131)**, menandakan jenis lauk bukan faktor dominan pemborosan."""
    },

    # === TAHAP 11: OUTLIERS ===
    {
        "intro": """## Sel 11 - Identifikasi & Deteksi Pencilan (Outliers)
Mengidentifikasi pencilan (*outliers*) menggunakan metode rentang interkuartil Tukey ($1,5 \\times \\text{IQR}$) dan ambang deviasi baku ($|Z| > 3$), serta memvisualisasikan 4 fitur dengan pencilan terbanyak (`figures/fig08_outlier_box.png`).""",
        "code": """# ---------- Deteksi Outliers ----------
q1 = df[num_cols].quantile(0.25)
q3 = df[num_cols].quantile(0.75)
iqr = q3 - q1
low = q1 - 1.5 * iqr
high = q3 + 1.5 * iqr
out_iqr = ((df[num_cols] < low) | (df[num_cols] > high)).sum()

z = np.abs(stats.zscore(df[num_cols]))
out_z = pd.Series((z > 3).sum(axis=0), index=num_cols)

R["outliers_iqr"] = out_iqr.to_dict()
R["outliers_z3"] = out_z.to_dict()
R["outliers_iqr_pct"] = (out_iqr / len(df) * 100).round(2).to_dict()

top_outliers = ["spoilage_risk_index", "transit_time_minutes",
                "food_arrival_temperature_celsius", "delivery_distance_km"]

fig, axes = plt.subplots(1, 4, figsize=(13, 3.8))
for ax, col in zip(axes, top_outliers):
    sns.boxplot(y=df[col], ax=ax, color="#e67e22", width=0.4, fliersize=3)
    ax.set_title(f"{col}\\n({out_iqr[col]} outliers, {out_iqr[col]/len(df)*100:.1f}%)",
                 fontsize=8.5, fontweight="bold")
    ax.set_ylabel("")

fig.suptitle("Deteksi Outlier pada 4 Variabel dengan Frekuensi Pencilan Tertinggi", y=1.03, fontsize=11, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig08_outlier_box.png"), bbox_inches="tight")
plt.show()

out_summary = pd.DataFrame({
    "Batas Bawah IQR": low[top_outliers],
    "Batas Atas IQR": high[top_outliers],
    "Jumlah Outlier (IQR)": out_iqr[top_outliers],
    "Persentase (%)": (out_iqr[top_outliers] / len(df) * 100).round(2),
    "Jumlah Outlier (|Z| > 3)": out_z[top_outliers]
})
print("Ringkasan Identifikasi Pencilan (Outlier):")
display(out_summary)
print("Keputusan Metodologi: RETENSI PENCILAN (Outlier Retention) karena merupakan data riil logistik wilayah 3T.")""",
        "findings": """> ### 💡 Interpretasi & Temuan: Keputusan Retensi Pencilan
> - **Fitur Berpencilan Terbanyak:** `spoilage_risk_index` (1.459 kasus / 11,2%), `transit_time_minutes` (975 kasus / 7,5%), `food_arrival_temperature_celsius` (927 kasus / 7,1%), dan `delivery_distance_km` (589 kasus / 4,5%).
> - **Justifikasi Retensi:** Seluruh pencilan **dipertahankan (tidak dibuang)** karena mencerminkan rute perintis nyata ke wilayah pulau/pedalaman terpencil (transit 120 menit dan jarak 35 km). Menghapus pencilan akan menghilangkan sinyal risiko paling krusial bagi Badan Gizi Nasional.
> - **Implikasi Model:** Model pembelajaran mesin wajib menggunakan rumpun pohon ensemble (*Gradient Boosting*) yang kebal terhadap keberadaan pencilan."""
    },

    # === TAHAP 12: DISPARITAS WILAYAH & AUDIT TIER ===
    {
        "intro": """## Sel 12 - Disparitas Wilayah & Audit Target Tier Kepatuhan
Menganalisis disparitas geografis persentase distribusi bermasalah per klaster wilayah (`figures/fig09_bermasalah_cluster.png`), profil pemicu sisa makanan per tier (`figures/fig10_driver_tier.png`), serta mendemonstrasikan bahwa tier kepatuhan merupakan label turunan aturan (*rule-derived*) melalui pengujian klasifikasi baseline.""",
        "code": """# ---------- Disparitas Wilayah & Audit Tier ----------
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder

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
ax.set_title("Risiko Kepatuhan per Klaster Wilayah", fontsize=10, fontweight="bold")
ax.tick_params(axis="x", rotation=15, labelsize=8.5)
for i, v in enumerate(by_cluster.values):
    ax.text(i, v + 0.5, "%.1f%%" % v, ha="center", fontsize=8.5, fontweight="bold")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig09_bermasalah_cluster.png"), bbox_inches="tight")
plt.show()

# Pemicu sisa makanan per tier (stacked bar)
ct = pd.crosstab(df.primary_food_waste_driver, df.bgn_program_compliance_tier)[order_target]
ctn = ct.div(ct.sum(axis=1), axis=0) * 100
fig, ax = plt.subplots(figsize=(9, 4))
bottom = np.zeros(len(ctn))
colors = [palette_target[t] for t in ctn.columns]
for t, col in zip(ctn.columns, ctn.T.values):
    ax.barh(ctn.index, col, left=bottom, color=colors[order_target.index(t)], label=t)
    bottom += col
ax.set_xlabel("% dalam tiap pemicu sisa makanan")
ax.set_title("Komposisi Tier Kepatuhan per Pemicu Utama Sisa Makanan", fontsize=10, fontweight="bold")
ax.legend(fontsize=7.5, loc="lower right")
ax.tick_params(axis="y", labelsize=8.5)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig10_driver_tier.png"), bbox_inches="tight")
plt.show()
R["driver_tier_crosstab_pct"] = ctn.round(1).to_dict(orient="index")

# Suhu tiba < 60C vs tier
dfe["suhu_dibawah_60"] = dfe.food_arrival_temperature_celsius < 60
R["pct_suhu_dibawah_60"] = round(float(dfe.suhu_dibawah_60.mean() * 100), 2)
R["bermasalah_by_suhu60"] = (dfe.groupby("suhu_dibawah_60")["bermasalah"].mean() * 100).round(1).to_dict()

# Ringkasan makro program MBG
R["total_biaya_harian_idr"] = float((df.total_meal_cost_idr * df.kitchen_daily_capacity_portions).sum())
R["rataan_biaya_porsi"] = round(float(df.total_meal_cost_idr.mean()), 0)
R["rataan_sisa_piring_pct"] = round(float(df.plate_waste_percentage.mean()), 2)
R["rataan_kkal"] = round(float(df.estimated_calories_kcal.mean()), 1)
R["rataan_protein_g"] = round(float(df.estimated_protein_grams.mean()), 1)
R["rataan_suhu_tiba"] = round(float(df.food_arrival_temperature_celsius.mean()), 1)

# Refleksi untuk skew kiri suhu tiba
t = df.food_arrival_temperature_celsius
refl = np.log(t.max() + 1 - t)
R["skew_reflect_after"] = {"food_arrival_temperature_celsius": round(float(refl.skew()), 3)}
R["temp_max"] = float(t.max())

# Audit Kepatuhan: Bukti bahwa tier adalah label turunan berbasis aturan (bukan fitur asli)
feat_num = [c for c in num_cols if c != "confidence_score"]
cat_feats = ["regional_cluster", "beneficiary_category", "protein_type",
             "delivery_transport_mode", "primary_food_waste_driver"]
Xe = pd.get_dummies(df[feat_num + cat_feats], columns=cat_feats, drop_first=True).astype(float)
y = LabelEncoder().fit_transform(df.bgn_program_compliance_tier)
Xtr, Xte, ytr, yte = train_test_split(Xe, y, test_size=0.2, random_state=42, stratify=y)

dummy = pd.Series(ytr).value_counts(normalize=True).max()
lr = LogisticRegression(max_iter=3000)
lr_acc = cross_val_score(lr, Xtr, ytr, cv=3, scoring="accuracy").mean()
rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
rf_acc = cross_val_score(rf, Xtr, ytr, cv=3, scoring="accuracy").mean()
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

audit_df = pd.DataFrame([
    {"Model": "Majority Class Dummy", "3-Fold CV Accuracy": f"{dummy*100:.1f}%", "Catatan": "Baseline tebakan mayoritas"},
    {"Model": "Logistic Regression", "3-Fold CV Accuracy": f"{lr_acc*100:.1f}%", "Catatan": "Pemisahan linear dasar"},
    {"Model": "Random Forest Classifier", "3-Fold CV Accuracy": f"{rf_acc*100:.1f}%", "Catatan": "Akurasi mendekati 100% (Rule-Derived Label)"},
    {"Model": "HistGradientBoosting", "3-Fold CV Accuracy": f"{hgb_acc*100:.1f}%", "Catatan": "Akurasi mendekati 100% (Rule-Derived Label)"}
])
print("Hasil Audit Klasifikasi Tier Kepatuhan:")
display(audit_df)
print("Kesimpulan: Tier kepatuhan bersifat deterministik dari threshold operasional sehingga DITOLAK menjadi fitur.")""",
        "findings": """> ### 💡 Interpretasi & Temuan: Disparitas Spasial & Audit Deterministik Tier
> - **Disparitas Wilayah yang Tajam:** Wilayah 3T (Perbatasan & Pedalaman) memiliki tingkat distribusi bermasalah sebesar **47,52%**, hampir 4 kali lipat dari Jawa Metropolitan (**13,82%**). Provinsi paling rawan terkonsentrasi di Indonesia Timur (Kaltara, Papua Selatan, Papua Pegunungan, Papua Tengah, dan NTT).
> - **Ambang Kritis Suhu Panas 60°C:** Sebanyak **22,42%** distribusi tiba di bawah batas aman mikrobiologis 60°C. Saat suhu < 60°C, tingkat kejadian bermasalah melonjak drastis menjadi **63,7%** (berbanding hanya 12,5% jika suhu $\ge 60^\circ\text{C}$).
> - **Bukti Deterministik Target Tier (Audit):** Model Random Forest dan HistGradientBoosting mampu menebak tier kepatuhan dengan akurasi **99,7% - 99,8%** (mendekati sempurna). Hal ini membuktikan bahwa tier kepatuhan adalah label turunan berbasis aturan sisa makanan (*rule-derived label*), sehingga **wajib ditolak menjadi fitur masukan** model prediksi sisa makanan."""
    },

    # === TAHAP 13: REGRESI PLATE WASTE & DATA LEAKAGE ===
    {
        "intro": """## Sel 13 - Pemodelan Regresi Prediksi Sisa Makanan & Guardrail Data Leakage
Inti implementasi proyek:
1. Membuktikan kebocoran data aljabar pada kolom `waste_adjusted_effective_cost_idr`.
2. Menganalisis korelasi prediktor pra-distribusi terhadap target `plate_waste_percentage`.
3. Membangun dan mengevaluasi model regresi (*Ridge*, *Random Forest*, *HistGradientBoosting*) via 5-Fold Cross Validation.
4. Mendemonstrasikan komparasi skenario Pra-distribusi, Post-Hoc, dan penolakan data leakage.""",
        "code": """# ---------- Regresi Plate Waste ----------
from sklearn.model_selection import KFold, cross_validate
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.pipeline import make_pipeline

# 1. Bukti Aljabar Data Leakage
calc_eff = df.total_meal_cost_idr / (1 - df.plate_waste_percentage / 100)
diff_max = float((calc_eff - df.waste_adjusted_effective_cost_idr).abs().max())
R["leak_effective_cost_maxdiff"] = round(diff_max, 4)

print("=== 1. AUDIT GUARDRAIL DATA LEAKAGE ===")
print(f"Selisih absolut maksimum perhitungan aljabar vs kolom: Rp {diff_max:.2f}")
print("-> Kolom 'waste_adjusted_effective_cost_idr' TERBUKTI bocor matematis dan WAJIB DI-DROP.\\n")

# 2. Korelasi terhadap Target Sisa Piring
yw = df.plate_waste_percentage.values
R["waste_mean_predictor_mae"] = round(float(np.abs(yw - yw.mean()).mean()), 3)
corr_waste = (df.select_dtypes(include=[np.number]).corr()["plate_waste_percentage"]
              .drop(["plate_waste_percentage", "waste_adjusted_effective_cost_idr"])
              .sort_values(key=abs, ascending=False).round(3))
R["corr_with_waste"] = corr_waste.to_dict()

print("Korelasi Fitur Numerik Sah terhadap Target Sisa Piring (plate_waste_percentage):")
display(corr_waste)

# 3. Setup Dataset Pra-distribusi Bebas Kebocoran
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

print("\\n=== 2. EVALUASI MODEL REGRESI PRA-DISTRIBUSI (5-FOLD CV) ===")
R["reg_ridge"] = cv_run(make_pipeline(StandardScaler(), Ridge(alpha=1.0)))
R["reg_hgb"] = cv_run(HistGradientBoostingRegressor(random_state=42, max_iter=300))
R["reg_rf"] = cv_run(RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))

# Skenario Post-Hoc (+driver pemicu sisa)
Xw2 = pd.concat([Xw, pd.get_dummies(df["primary_food_waste_driver"],
                                    prefix="drv", drop_first=True).astype(float)], axis=1)
_hgb = HistGradientBoostingRegressor(random_state=42, max_iter=300)
_r2 = cross_validate(_hgb, Xw2, yw, cv=cvw, scoring=SCORING)
R["reg_hgb_driver"] = {"r2": round(float(_r2["test_r2"].mean()), 3),
                       "mae": round(float(-_r2["test_neg_mean_absolute_error"].mean()), 3),
                       "rmse": round(float(np.sqrt(-_r2["test_neg_mean_squared_error"].mean())), 3)}

# Skenario Demo Bocor (+tier kepatuhan - DITOLAK)
Xw3 = pd.concat([Xw2, pd.get_dummies(df["bgn_program_compliance_tier"],
                                     prefix="tier", drop_first=True).astype(float)], axis=1)
_r3 = cross_validate(_hgb, Xw3, yw, cv=cvw, scoring=SCORING)
R["reg_hgb_leak_tier_demo"] = {"r2": round(float(_r3["test_r2"].mean()), 3),
                               "mae": round(float(-_r3["test_neg_mean_absolute_error"].mean()), 3),
                               "rmse": round(float(np.sqrt(-_r3["test_neg_mean_squared_error"].mean())), 3)}

# Tabel Ringkasan Komparasi
benchmark_table = pd.DataFrame([
    {"Model Regresi": "Baseline (Mean-Predictor)", "Skenario Data": "Tanpa Fitur", "R²": 0.00, "MAE (pp)": R["waste_mean_predictor_mae"], "RMSE (pp)": "-"},
    {"Model Regresi": "Ridge Regression", "Skenario Data": "Pra-distribusi (Operasional)", "R²": R["reg_ridge"]["r2"], "MAE (pp)": R["reg_ridge"]["mae"], "RMSE (pp)": R["reg_ridge"]["rmse"]},
    {"Model Regresi": "Random Forest Regressor", "Skenario Data": "Pra-distribusi (Operasional)", "R²": R["reg_rf"]["r2"], "MAE (pp)": R["reg_rf"]["mae"], "RMSE (pp)": R["reg_rf"]["rmse"]},
    {"Model Regresi": "HistGradientBoosting (Terpilih)", "Skenario Data": "Pra-distribusi (Operasional)", "R²": R["reg_hgb"]["r2"], "MAE (pp)": R["reg_hgb"]["mae"], "RMSE (pp)": R["reg_hgb"]["rmse"]},
    {"Model Regresi": "HistGradientBoosting + Driver", "Skenario Data": "Post-Hoc (Analisis Akar Masalah)", "R²": R["reg_hgb_driver"]["r2"], "MAE (pp)": R["reg_hgb_driver"]["mae"], "RMSE (pp)": R["reg_hgb_driver"]["rmse"]},
    {"Model Regresi": "HistGradientBoosting + Tier (Ditolak)", "Skenario Data": "Demo Target Leakage (Overfitting Semu)", "R²": R["reg_hgb_leak_tier_demo"]["r2"], "MAE (pp)": R["reg_hgb_leak_tier_demo"]["mae"], "RMSE (pp)": R["reg_hgb_leak_tier_demo"]["rmse"]}
])
print("Komparasi Performa Model Regresi:")
display(benchmark_table)

# Simpan eda_results.json
RESULTS_PATH = os.path.join(BASE, "eda_results.json")
with open(RESULTS_PATH, "w", encoding="utf-8") as f:
    json.dump(R, f, indent=1, ensure_ascii=False, default=str)

print(f"\\nSinkronisasi Sukses: Hasil EDA tersimpan ke '{RESULTS_PATH}'")
print(f"Total figur tersimpan: {len(os.listdir(FIG))} file di '{FIG}'")""",
        "findings": """> ### 💡 Interpretasi & Temuan: Pemodelan Regresi Plate Waste & Integritas Data
> - **Pembuktian Kebocoran Data (Data Leakage):**
>   - Selisih absolut antara rumus aljabar `total_meal_cost / (1 - waste/100)` dengan kolom `waste_adjusted_effective_cost_idr` adalah maksimum **Rp0,50** (pembulatan matematis). Kolom ini terbukti 100% bocor dan wajib dieliminasi.
> - **Prediktor Sah Terkuat terhadap Sisa Piring:**
>   - Kandungan kalori makanan ($r = -0,37$) dan protein ($r = -0,22$): Porsi bernutrisi tinggi lebih dihabiskan oleh penerima.
>   - Rasio biaya terhadap gizi ($r = +0,28$), suhu tiba makanan ($r = -0,25$), dan indeks risiko pembusukan ($r = +0,21$).
> - **Hasil Komparasi 5-Fold Cross Validation:**
>   - *Baseline Mean-Predictor:* MAE = 4,44 pp ($R^2 = 0,00$).
>   - *Ridge Regression:* MAE = 3,65 pp ($R^2 = 0,33$).
>   - *Random Forest Regressor:* MAE = 3,68 pp ($R^2 = 0,32$).
>   - **HistGradientBoosting (Model Terpilih):** Menghasilkan akurasi pra-distribusi terbaik dengan **$R^2 = 0,34$** dan **MAE = 3,63 poin persentase** (RMSE = 4,54 pp).
> - **Perbandingan Skenario Post-Hoc vs Kebocoran:**
>   - *HGB + Driver (Post-Hoc):* Menghasilkan $R^2 = 0,55$ (MAE 2,92 pp), bermanfaat untuk analisis evaluasi akar masalah.
>   - *HGB + Tier (Ditolak):* Menghasilkan $R^2 = 0,68$ semu akibat target leakage, sehingga ditolak dalam pipeline produksi."""
    }
]

INTRO_NOTEBOOK = """# Exploratory Data Analysis (EDA): Telemetri Distribusi MBG 2026
**Mata Kuliah:** Data Science (PSIKS2W002) — Program Magister Ilmu Komputer, Universitas Amikom Purwokerto  
**Project Lead:** Iqbal Ahdagita Elbadra (NIM: 26MA41D022)  
**Dataset:** [Indonesia Free Nutritious Meal MBG 2026](https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry) (13.000 baris x 26 kolom)  
**Target Proyek:** Regresi kontinu persentase sisa piring (`plate_waste_percentage`). Variabel `bgn_program_compliance_tier` dianalisis sebagai variabel konteks operasional.

---
### Panduan Penggunaan
Notebook ini dirancang untuk dijalankan sel per sel atau **"Run All"**. Setiap tahapan analisis tersusun atas:
1. **Pengantar Analisis (Markdown):** Penjelasan tujuan dan metodologi.
2. **Sel Kode (Code):** Eksekusi pemrosesan data, visualisasi inline, dan tabel interaktif.
3. **Interpretasi & Temuan (Markdown):** Rangkuman insight data, angka statistik kunci, dan justifikasi pemodelan tepat di bawah output running."""


def build_notebook():
    cells = [("markdown", INTRO_NOTEBOOK)]
    for s in STEPS:
        cells.append(("markdown", s["intro"]))
        cells.append(("code", s["code"]))
        cells.append(("markdown", s["findings"]))

    nb = {
        "cells": [
            {
                "cell_type": kind,
                "id": f"sel-{i:02d}",
                "metadata": {},
                **({"source": text.splitlines(keepends=True)} if kind == "markdown"
                   else {"source": text.splitlines(keepends=True), "outputs": [],
                         "execution_count": None}),
            }
            for i, (kind, text) in enumerate(cells)
        ],
        "metadata": {
            "kernelspec": {"display_name": "Python 3 (ipykernel)", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.12"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    with open(OUT_NB, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, ensure_ascii=False, indent=1)
    print(f"Struktur notebook tersimpan: {OUT_NB} ({len(cells)} sel)")


def execute_notebook():
    print(f"Memulai eksekusi notebook '{OUT_NB}'...")
    with open(OUT_NB, "r", encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)

    ep = ExecutePreprocessor(timeout=600, kernel_name="python3")
    ep.preprocess(nb, {"metadata": {"path": BASE}})

    with open(OUT_NB, "w", encoding="utf-8") as f:
        nbformat.write(nb, f)
    print(f"SELESAI! Seluruh sel berhasil dieksekusi dan output tersimpan di '{OUT_NB}'.")


if __name__ == "__main__":
    build_notebook()
    if "--execute" in sys.argv or "-e" in sys.argv or len(sys.argv) == 1:
        execute_notebook()
