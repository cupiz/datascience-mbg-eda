# -*- coding: utf-8 -*-
"""Bangun eda_notebook.ipynb dari eda_run.py: tiap bagian '# ----------' jadi
satu sel kode, didahului sel markdown penjelasan (peran, output, Bab laporan)."""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(BASE, "eda_run.py"), encoding="utf-8").read()
parts = re.split(r"(?m)^(?=# ----------)", src)

INTRO = (
    "# EDA Telemetri Distribusi MBG 2026\n\n"
    "Tugas 2 / UTS - Data Science (PSIKS2W002), Magister Ilmu Komputer, "
    "Universitas Amikom Purwokerto.\n\n"
    "Dataset: [Indonesia Free Nutritious Meal MBG 2026]"
    "(https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry) "
    "(13.000 baris x 26 kolom). Target regresi proyek: `plate_waste_percentage`; "
    "`bgn_program_compliance_tier` dianalisis sebagai variabel konteks.\n\n"
    "**Cara menjalankan:** `python download_data.py` sekali (butuh `pip install "
    "kagglehub`), lalu Run All. Semua figur tersimpan ke `figures/` dan semua "
    "angka ke `eda_results.json` (sumber tunggal Laporan EDA).\n\n"
    "**Peta sel:** setiap sel kode di notebook ini didahului penjelasan singkat "
    "yang menyebut Bab laporan yang diisinya."
)

# kunci = awalan marker di eda_run.py; nilai = (judul, penjelasan markdown)
EXPLAIN = {
    "# ---------- Bab 2/3": (
        "Sel 2 - Struktur & Kualitas Dasar (Bab 2.2, 3.2-3.4)",
        "Memisahkan kolom numerik (`num_cols`, 17 kolom) dan kategorikal (`cat_cols`), "
        "mengecualikan `distribution_id` dan narasi `cot_nutrition_logistics_rationale` "
        "dari fitur. Menghitung jumlah null total, baris duplikat, duplikat ID, lalu "
        "menyusun tabel `df.describe()` (mean/std/min/kuartil/max seluruh variabel "
        "numerik).\n\n**Output:** `R[\"shape\"]`, `R[\"n_nulls\"]`, `R[\"n_dup_rows\"]`, "
        "`R[\"describe\"]` - angka-angka ini menjadi tabel di Bab 3.4 laporan."),
    "# ---------- Bab 4": (
        "Sel 3 - Missing Value + Visualisasi (Bab 4.1)",
        "Menghitung `df.isnull().sum()` per kolom dan menggambarnya sebagai bar chart "
        "(`figures/fig01_missing.png`). Hasilnya nol mutlak di 26 kolom, jadi bab 4 "
        "laporan berisi dokumentasi pemeriksaan + analisis mekanisme MCAR/MAR/MNAR "
        "mengapa tidak ada penanganan, bukan mengarang imputasi.",
    ),
    "# ---------- Bab 5": (
        "Sel 4 - Distribusi, Skewness & Kurtosis (Bab 5.1-5.2)",
        "Menghitung skewness dan excess kurtosis (Fisher) semua variabel numerik, lalu "
        "menggambar histogram + KDE untuk 9 variabel kunci (`fig02_hist_kde.png`). "
        "Interpretasi di laporan: variabel logistik condong kanan kuat (transit 2,16; "
        "jarak 1,75; spoilage 2,05), suhu tiba condong KIRI (-2,13), kapasitas dapur "
        "platikurtik (hampir merata).",
    ),
    "# ---------- Bab 7.1": (
        "Sel 5 - Frekuensi Variabel Kategorikal (Bab 7.1)",
        "Bar chart horizontal frekuensi + persentase untuk 5 kategori (klaster wilayah, "
        "penerima, protein, moda transport, pemicu sisa) plus panel target tier kepatuhan "
        "dengan warna konsisten (`fig03_bar_kategorikal.png`). Menunjukkan dominasi kelas "
        "Standard-Compliant 64,7% dan pemicu Prior-Snack-Consumption 63,4%.",
    ),
    "# ---------- Bab 6.1": (
        "Sel 6 - Transformasi Skew: log1p (Bab 6.1)",
        "Memilih variabel dengan |skew| > 1, menerapkan `log1p`, dan menggambar "
        "perbandingan sebelum (merah) vs sesudah (hijau) - `fig04_log_transform.png`. "
        "Catatan penting yang dibahas di laporan: untuk suhu tiba yang condong kiri, "
        "log1p justru memperburuk (-2,13 menjadi -2,77); perbaikannya transformasi "
        "refleksi (dihitung di sel regresi, kunci `skew_reflect_after`).",
    ),
    "# ---------- Bab 6.2": (
        "Sel 7 - Scaling: StandardScaler vs MinMaxScaler (Bab 6.2)",
        "Demo pada 3 kolom berbeda skala (jarak km, biaya Rp, spoilage index): "
        "StandardScaler menghasilkan mean 0 std 1 (untuk PCA/regresi), MinMaxScaler "
        "rentang 0-1 (untuk KNN/K-Means). Angka before/after masuk tabel Bab 6.2.",
    ),
    "# ---------- Bab 6.4": (
        "Sel 8 - Feature Engineering (Bab 6.4)",
        "Membuat fitur baru: `biaya_per_kkal` (rasio), `kecepatan_rata2_km_jam` "
        "(jarak/waktu), `sisa_gram_per_porsi_proxy` (agregasi), dan `jarak_kategori` "
        "via `pd.qcut` 4 kuartil (binning). Ekstraksi waktu TIDAK bisa dilakukan - "
        "dataset tanpa kolom tanggal (keterbatasan Bab 9.2).",
    ),
    "# ---------- Bab 7.2": (
        "Sel 9 - Analisis Bivariate (Bab 7.2)",
        "Dua scatter plot kunci (`fig05_scatter.png`): jarak vs waktu transit "
        "(Pearson r = 0,928 - sinyal multikolinearitas) dan sisa piring vs biaya "
        "efektif (r = 0,622). Ditambah 4 box plot per tier kepatuhan "
        "(`fig06_box_per_tier.png`) dan tabel rata-rata variabel kunci per tier "
        "(`tier_means`): sisa piring naik 6,7% -> 18,9%, suhu tiba jatuh 66,6 -> 38,1 C.",
    ),
    "# ---------- Bab 7.3": (
        "Sel 10 - Korelasi & Asosiasi (Bab 7.3)",
        "Matriks korelasi Pearson seluruh variabel numerik + fitur baru + tier ordinal "
        "(heatmap `fig07_corr_heatmap.png`), korelasi Spearman, dan Cramer's V untuk "
        "pasangan kategorikal (driver x tier 0,545 kuat; cluster x tier 0,223 sedang "
        "dengan chi2 1945,1 p < 0,001; protein x tier 0,131 lemah). Tier di-encode "
        "ordinal 0 (Exemplary) sampai 3 (Non-Compliant) hanya untuk keperluan korelasi.",
    ),
    "# ---------- Bab 8": (
        "Sel 11 - Deteksi Pencilan IQR + Z-score (Bab 8.1)",
        "Menghitung batas IQR (Q1-1,5.IQR s.d. Q3+1,5.IQR) dan |Z| > 3 per kolom, "
        "plus box plot 4 variabel berpencilan terbanyak (`fig08_outlier_box.png`). "
        "Terbanyak: spoilage 1.459 baris (11,2%), transit 975 (7,5%), suhu 927 (7,1%). "
        "Keputusan laporan: RETENTION - pencilan adalah sinyal operasional 3T, "
        "bukan kesalahan input.",
    ),
    "# ---------- Bab 9": (
        "Sel 12 - Insight Bisnis + Baseline Klasifikasi Konteks (Bab 9.1)",
        "Menghitung temuan kunci laporan: % distribusi bermasalah (Marginal + "
        "Non-Compliant) per klaster (`fig09`) dan provinsi, efek suhu tiba < 60 C "
        "(bermasalah 63,7% vs 12,5%), komposisi tier per pemicu sisa (`fig10`). "
        "Bagian akhirnya menjalankan baseline klasifikasi tier (dummy 0,647 < LR 0,815 "
        "<< RF 0,997) - BUKAN model proyek, melainkan demonstrasi bahwa tier bersifat "
        "rule-derived sehingga ditolak sebagai target/fitur; target proyek final adalah "
        "regresi plate waste di sel berikutnya.",
    ),
    "# ---------- Proyek regresi": (
        "Sel 13 - PROYEK FINAL: Regresi Plate Waste + Guardrail Leakage (Bab 1.3, 7.3, 9.1, 9.3)",
        "Inti proyek Tugas 1. Urutannya: (1) membuktikan kebocoran "
        "`waste_adjusted_effective_cost_idr` = biaya/(1-waste/100) persis (maks diff "
        "Rp0,5); (2) korelasi semua numerik vs target `plate_waste_percentage`; "
        "(3) transformasi refleksi untuk suhu tiba (skew -2,13 menjadi -0,09); "
        "(4) baseline regresi CV 5-fold tanpa fitur bocor: mean-predictor MAE 4,44 pp, "
        "Ridge R2 0,33, RF 0,32, HGB 0,34 (pra-distribusi), HGB+pemicu 0,55 (post-hoc), "
        "dan DEMO kebocoran label HGB+tier R2 0,68 yang sengaja ditolak.",
    ),
}


def explain_for(part):
    head = part.split("\n", 1)[0]
    for key, (title, body) in EXPLAIN.items():
        if head.startswith(key):
            return f"## {title}\n\n{body}"
    return None


cells = [("markdown", INTRO)]
for part in parts:
    part = part.rstrip()
    if not part:
        continue
    md = explain_for(part)
    if part.startswith("# ----------") and md is None:
        raise SystemExit("marker tanpa penjelasan: " + part.split("\n", 1)[0])
    if md:
        cells.append(("markdown", md))
    cells.append(("code", part))

nb = {
    "cells": [
        {
            "cell_type": kind,
            "metadata": {},
            **({"source": text.splitlines(keepends=True)} if kind == "markdown"
               else {"source": text.splitlines(keepends=True), "outputs": [],
                     "execution_count": None}),
        }
        for kind, text in cells
    ],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}
out = os.path.join(BASE, "eda_notebook.ipynb")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(nb, fh, ensure_ascii=False, indent=1)
n_code = sum(1 for k, _ in cells if k == "code")
n_md = sum(1 for k, _ in cells if k == "markdown")
print(f"OK: {n_md} markdown + {n_code} code = {len(cells)} sel -> {out}")
