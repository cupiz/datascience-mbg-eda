# Prediksi Plate Waste Distribusi MBG 2026 (Gradient Boosting Regression)

Proyek EDA (Tugas 2 / UTS) mata kuliah **Data Science (PSIKS2W002)** — Magister
Ilmu Komputer, Universitas Amikom Purwokerto. Dosen Pengampu: Giat Karyono.

Disusun oleh: **Iqbal Ahdagita Elbadra** (NIM 26MA41D022)

## Masalah Bisnis

Program Makan Bergizi Gratis (MBG) / Badan Gizi Nasional (BGN) kehilangan
±Rp2.151/porsi (15,9% biaya efektif) akibat sisa makanan di piring penerima
(plate waste rata-rata **13,3%**, ekor hingga 37,7%), dan sisa ini baru terukur
setelah distribusi terjadi. Proyek ini membangun model **regresi** untuk
memprediksi `plate_waste_percentage` dari telemetri operasional dapur SPPG,
agar penyesuaian porsi/menu/jadwal bisa dilakukan SEBELUM distribusi
(target bisnis: rata-rata sisa piring < 10% dalam 6 bulan).

## Dataset

[Indonesia Free Nutritious Meal MBG 2026](https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry)
oleh Luthfi Muthathohirin (Kaggle, versi 4, Oktober 2026).
13.000 baris x 26 kolom; 0 null; 0 duplikat. Target regresi:
`plate_waste_percentage` (tier kepatuhan `bgn_program_compliance_tier`
dipertahankan sebagai variabel konteks). Berkas CSV tidak disertakan di
repositori — unduh dengan:

```bash
python download_data.py
```

## Struktur Repositori

```
data/                  dataset CSV (diunduh lokal, tidak di-commit)
download_data.py       skrip unduh dataset via kagglehub
eda_run.py             pipeline EDA lengkap -> figures/ + eda_results.json
eda_notebook.ipynb     versi notebook dari pipeline EDA
figures/               10 figur hasil EDA (PNG, 150 dpi)
eda_results.json       seluruh angka hasil komputasi (sumber laporan)
```

## Cara Menjalankan

```bash
conda install pandas numpy matplotlib seaborn scipy scikit-learn   # bila belum ada
python download_data.py
python eda_run.py        # menghasilkan figures/ dan eda_results.json
```

## Temuan Kunci

- **Kebocoran fitur terbukti**: `waste_adjusted_effective_cost_idr` =
  `total_meal_cost_idr / (1 - plate_waste/100)` persis (selisih maks Rp0,5 =
  pembulatan) → wajib dibuang. Tier kepatuhan juga bocor (aturannya memakai
  ambang sisa makanan 20-30%) → hanya untuk konteks, bukan fitur.
- Korelasi terkuat dengan plate waste (fitur sah): estimated_calories_kcal
  **r = -0,372**, cost_to_nutrition_ratio **+0,280**, suhu tiba **-0,252**,
  protein **-0,221**, spoilage **+0,214**, waktu transit **+0,198** — sinyal
  tersebar, tidak ada proksi tunggal dominan.
- Baseline regresi (CV 5-fold, tanpa fitur bocor): mean-predictor MAE 4,44 pp;
  Ridge R² 0,33 / MAE 3,65; HGB pra-distribusi R² 0,34 / MAE 3,63;
  HGB + fitur pemicu (post-hoc) R² 0,55 / MAE 2,92; HGB + tier (demo bocor)
  R² 0,68 → ditolak.
- Konteks mutu program: distribusi bersuhu tiba < 60°C (22,4% data) bermasalah
  **63,7%** vs 12,5%; wilayah 3T 47,5% vs Jawa Metropolitan 13,8%;
  jarak vs waktu transit r = 0,928 (multikolinearitas untuk model linear).
- Rekomendasi: tree-based regressor (HGB/XGBoost/LightGBM) dengan dua skenario
  fitur (pra-distribusi vs post-hoc), outlier dipertahankan (sinyal 3T nyata),
  interpretasi SHAP.

## Lisensi & Atribusi

Kode: MIT. Data: mengikuti lisensi dataset sumber di Kaggle — atribusi ke
Luthfi Muthathohirin. Laporan lengkap (Bab 1–9) ada pada dokumen
`Laporan EDA` yang dikumpulkan terpisah via LMS.
