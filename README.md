---
title: PlateGuard MBG
emoji: 🍱
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Prediksi & Audit Sisa Makanan MBG (LightGBM Optuna + TreeSHAP)
---

# PlateGuard MBG v2

### Prediksi sisa makanan sebelum truk berangkat.

**PlateGuard MBG** mengubah telemetri operasional dapur SPPG menjadi skor prediksi
*plate waste* per rencana distribusi, sehingga Badan Gizi Nasional (BGN) dan mitra
dapur dapat menyesuaikan porsi, menu, dan jadwal kirim SEBELUM makanan terbuang.

[![Next.js](https://img.shields.io/badge/Next.js-16-06525C?logo=nextdotjs)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Status](https://img.shields.io/badge/v2-Frontend%20%2B%20Backend%20Siap-brightgreen)](#arsitektur-v2)
[![Data](https://img.shields.io/badge/Dataset-Kaggle%20MBG%202026%20v4-yellow)](https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry)

---

## Masalah

Program Makan Bergizi Gratis adalah intervensi nutrisi terbesar di Asia Tenggara:
82 juta penerima manfaat, 38 provinsi, ribuan dapur SPPG, jutaan porsi per hari.

Di balik skala itu ada kebocoran yang jarang terlihat:

| Angka | Arti |
|---|---|
| **13,3%** | Rata-rata makanan yang tersisa di piring penerima (ekor hingga 37,7%) |
| **Rp2.151/porsi** | Biaya yang menguap per porsi (Rp13.526 biaya produksi menjadi Rp15.677 biaya efektif, +15,9%) |
| **Pasca-kejadian** | Satu-satunya waktu sisa makanan bisa diukur hari ini; semua intervensi bersifat reaktif |
| **47,5% vs 13,8%** | Distribusi bermasalah di wilayah 3T dibandingkan Jawa Metropolitan |

Setiap satu poin persentase sisa piring yang dicegah bernilai miliaran rupiah
per tahun anggaran. Masalahnya ada pada timing: keputusan porsi dan menu
diambil sebelum data sisa makanan tersedia.

## Solusi

PlateGuard membalik urutannya. Model regresi membaca karakteristik distribusi
yang sudah diketahui di tahap perencanaan (menu/protein, kalori, jarak dan moda
kirim, estimasi waktu transit, profil penerima, kapasitas dapur) lalu
mengeluarkan prediksi persentase sisa makanan beserta penjelasan SHAP-nya.

Dua mode pemakaian:

1. **Pra-distribusi (perencanaan).** Tanpa fitur yang baru diketahui setelah
   makan. Dipakai dapur untuk memutuskan porsi, menu, dan jadwal kirim besok.
2. **Post-hoc (akar masalah).** Dengan fitur pemicu sisa makanan. Dipakai
   pengawas program untuk evaluasi mengapa sebuah distribusi boros.

## Cara Kerja

```
Telemetri SPPG (CSV/API)
        |
  [1] Validasi & guardrail kebocoran fitur
        |
  [2] Feature engineering: biaya/kkal, kecepatan kirim, binning jarak,
      interaksi suhu x transit
        |
  [3] Model: 6 kandidat regresi + province TargetEncoder (5-Fold CV & Optuna)
        |
  [4] Skor plate waste + SHAP per distribusi + logging MLflow
        |
  [5] API (FastAPI) + dasbor analitik & simulator (Streamlit) per provinsi/klaster
```

## Fitur Utama

- **Skor risiko pemborosan per rencana distribusi**, dengan penjelasan SHAP yang
  bisa dibaca pengambil kebijakan non-teknis.
- **Guardrail kebocoran data bawaan.** Pipeline ini membuktikan dan memblokir
  dua fitur bocor: `waste_adjusted_effective_cost_idr` (ternyata persis
  `biaya / (1 - waste/100)`, selisih maksimum Rp0,5) dan
  `bgn_program_compliance_tier` (aturannya memakai ambang sisa makanan 20-30%).
  Menyertakannya menaikkan R² semu dari 0,55 ke 0,68; kami menolaknya.
- **EDA reprodusibel satu perintah** (`python eda_run.py`): 10 figur, seluruh
  statistik, dan baseline model terkumpul di `eda_results.json`.
- **Retensi pencilan yang disengaja.** Transit 120 menit ke wilayah 3T adalah
  sinyal, bukan noise; model dipilih dari keluarga tree-based yang robust.

## Kinerja Awal (jujur, apa adanya)

Validasi silang 5-fold, 13.000 distribusi, tanpa fitur bocor:

| Model | Skenario | R² | MAE (pp) | RMSE (pp) |
|---|---|---|---|---|
| Mean-predictor (baseline) | - | 0,00 | 4,44 | - |
| Ridge | pra-distribusi | 0,33 | 3,65 | 4,58 |
| Random Forest | pra-distribusi | 0,32 | 3,68 | 4,61 |
| **HistGradientBoosting** | **pra-distribusi** | **0,34** | **3,63** | **4,54** |
| HistGradientBoosting + pemicu | post-hoc | 0,55 | 2,92 | 3,73 |
| ~~HGB + tier kepatuhan~~ | ~~ditolak: label bocor~~ | ~~0,68~~ | - | - |

Angka tabel di atas merupakan baseline validasi silang 5-fold (`eda_run.py`) sebelum optimasi Fase 3. Evaluasi final holdout test set (2.600 baris) dapat dilihat pada Roadmap Fase 3 di bawah.

Prediktor terkuat sinyal sisa makanan: kandungan kalori (r = -0,37), rasio
biaya-gizi (+0,28), suhu makanan saat tiba (-0,25), protein (-0,22), indeks
risiko pembusukan (+0,21), waktu transit (+0,20).

## Quickstart

```bash
# 1. Siapkan environment (Anaconda direkomendasikan, NumPy < 2.0)
pip install -r requirements.txt

# 2. Unduh dataset (publik, tanpa kredensial Kaggle)
python download_data.py

# 3. Jalankan pipeline EDA -> figures/ + eda_results.json
python eda_run.py

# 4. Bangun dataset siap latih (Fase 2): transform + split + guardrail leakage
python etl_pipeline.py

# 5. Pelatihan model lengkap (6 kandidat + RandomForest, 5-fold CV per-fold,
#    province TargetEncoder, Optuna 30 trial, SHAP, & logging MLflow)
python train.py --n-trials 30 --cv-folds 5
# Atau jalankan di Kaggle: unggah train_kaggle.ipynb (Internet On -> Run All)
# Opsional buka UI pelacakan eksperimen MLflow:
mlflow ui --backend-store-uri sqlite:///mlruns.db

# 6. Bangun Frontend Next.js & jalankan Unified FastAPI + UI v2
cd frontend && npm install && npm run build && cd ..
# Salin static export ke folder static/ (PowerShell: Copy-Item -Recurse frontend\out static)
uvicorn api:app --host 127.0.0.1 --port 8000
# Akses Web App v2: http://127.0.0.1:8000/ | Swagger Docs: http://127.0.0.1:8000/docs

# 7. Opsional: Jalankan Dasbor Streamlit legacy (v1)
streamlit run app.py --server.port 8501

# 8. Deployment Otomatis Hugging Face Spaces / Docker (port 7860)
docker build -t plateguard-mbg-v2 . && docker run -p 7860:7860 plateguard-mbg-v2
# Atau orkestrasi lokal API + Streamlit:
docker-compose up --build
```

## Arsitektur v2 (Frontend Next.js + Backend FastAPI)

Dirancang siap-deploy untuk **Hugging Face Spaces (`sdk: docker`, port `7860`)**:

1. **Frontend (`frontend/`):** Dibangun dengan **Next.js 16 (App Router, `output: "export"`)**, React 19, dan Tailwind CSS v4 bertema publik-kesehatan *Teal-on-Paper & Botanical Sage*:
   - `/` (**Executive Briefing**): Live Quick-Probe Simulator hero, uji integritas *anti-leakage*, arsitektur pipeline 5 tahap, komparasi 7 model 5-Fold CV & Holdout, serta ablasi `TargetEncoder` 38 provinsi.
   - `/workspace` (**Operational Command Workspace**): Simulator Pra & Post-Hoc lengkap beserta **TreeSHAP lokal SVG**, kalkulator dampak rupiah bulanan, Analitik 38 Provinsi + galeri 10 grafik EDA, Audit Browser 2.600 sampel Holdout dengan fitur muat satu-klik, dan Batch CSV Scorer.
2. **Backend (`api.py`):** Layanan **FastAPI** terintegrasi yang melayani endpoint inferensi (`/predict/*`, `/api/explain/*`, `/api/overview`, `/api/benchmark`, `/api/holdout-samples`), aset grafik (`/figures/`, `/figures-fase3/`), sekaligus static bundle frontend dari `static/` pada origin tunggal.

## Struktur Repositori

```
frontend/                     Antarmuka Next.js 16 + Tailwind v4 (static export ke out/)
data/                         Dataset CSV mentah (unduh lokal, tidak di-commit)
data/processed/               Dataset siap latih + overview_aggregates.json + holdout_audit.csv
figures/                      10 figur EDA (PNG 150 dpi)
figures_fase3/                Figur SHAP beeswarm & bar importance per skenario
models/                       Artefak model (.joblib/.pkl), pipeline, & metrik
reports/                      Salinan Laporan Akhir IEEE UAS (DOCX 2-kolom)
download_data.py              Unduh dataset via kagglehub
eda_run.py                    Pipeline EDA + guardrail leakage + baseline regresi
build_v2_aggregates.py        Generator agregat nasional & audit holdout ringkas (v2)
eda_notebook.ipynb            Notebook EDA tereksekusi penuh + interpretasi per sel
make_notebook.py              Generator & eksekutor eda_notebook.ipynb
etl_pipeline.py               Fase 2: ETL sklearn Pipeline (+ opsional province TE)
train.py                      Training lokal (6 model, 5-fold CV, province TE, Optuna, SHAP, MLflow)
make_train_kaggle_notebook.py Generator train_kaggle.ipynb dari train.py
train_kaggle.ipynb            Notebook Kaggle siap Run All (inline SHAP + zip Output)
train-kaggle-done.ipynb       Arsip output lengkap eksekusi Kaggle (14 run MLflow, 5-Fold CV)
make_fase3_notebook.py        Generator starter fase3_modeling.ipynb
fase3_modeling.ipynb          Starter notebook Fase 3
fase3_modeling_done.ipynb     Notebook Fase 3 tereksekusi penuh + interpretasi
api.py                        Backend FastAPI v2 (/api/*, /predict/*, TreeSHAP lokal, static UI)
app.py                        Streamlit Dashboard v1 (KPI, Simulator, SHAP, Audit)
build_laporan_akhir.py        Generator dokumen Laporan Akhir format IEEE 2-kolom
Dockerfile                    Multi-stage Node 20 + Python 3.12-slim (UID 1000, port 7860 HF Spaces)
docker-compose.yml            Orkestrasi layanan FastAPI (8000) & Streamlit (8501)
requirements.txt              Daftar dependensi Python produksi lengkap
eda_results.json              Seluruh angka statistik EDA terverifikasi
```

## Roadmap

- [x] **Fase 1 (Minggu 2).** Project Charter + Laporan Analisis EDA + notebook [`eda_notebook.ipynb`](eda_notebook.ipynb).
- [x] **Fase 2 (Minggu 7).** [`etl_pipeline.py`](etl_pipeline.py): ColumnTransformer bebas leakage (`Log1p`, `ReflectionLog`, `QuantileBinner`, one-hot, `StandardScaler`, serta dukungan opsional `TargetEncoder` untuk 38 provinsi), split 80:20 terstratifikasi kuartil target (10.400 train / 2.600 test), dan self-test guardrail.
- [x] **Fase 3 & Ekstensi Charter (Selesai Terverifikasi — [`train-kaggle-done.ipynb`](train-kaggle-done.ipynb)).**
      Pipeline lengkap ([`train.py`](train.py) & [`train_kaggle.ipynb`](train_kaggle.ipynb)): **6 algoritma Charter** (`MeanPredictor`, `Ridge`, **`RandomForest`**, `HistGradientBoosting`, `LightGBM`, `XGBoost`), **5-Fold CV per fold** (`models/cv_per_fold_report.csv`), **`TargetEncoder` 38 provinsi** (`34` fitur pra / `38` fitur post-hoc), optimasi Bayesian **Optuna (30 trial × 5-Fold CV)**, plot **TreeSHAP** (`figures_fase3/`), ekspor **`.joblib` + `.pkl`**, serta pelacakan **14 eksperimen MLflow**.
      Hasil evaluasi final (CV 5-Fold & Holdout 2.600 baris):
      - **Pra-distribusi (34 fitur):** **`LightGBM (Optuna)`** (CV MAE `3,604 ± 0,042` pp, Holdout MAE **`3,658 pp`**, RMSE `4,586 pp`, R² `0,333`; `-17,7%` galat dibanding baseline `4,447 pp`; `RandomForest` MAE `3,658 pp` / RMSE `4,604 pp`).
      - **Post-Hoc (38 fitur):** **`LightGBM (Optuna)`** (CV MAE `2,905 ± 0,046` pp, Holdout MAE **`2,929 pp`**, RMSE `3,761 pp`, R² `0,551`; **seluruh target Charter tercapai**: MAE <= 3,0 pp, R² >= 0,35, RMSE <= 4,5 pp).
      - Notebook terdahulu tersimpan di [`fase3_modeling_done.ipynb`](fase3_modeling_done.ipynb).
- [x] **Fase 4 & Platform v2 (Selesai Lokal — Siap Hugging Face Spaces).**
      - **Web App v2 (`frontend/` + `api.py`):** Antarmuka Next.js 16 + Tailwind v4 terpisah (static export) disajikan bersama FastAPI `/api/*` + TreeSHAP lokal real-time, analitik 38 provinsi, audit 2.600 sampel holdout, dan batch CSV scorer.
      - **REST API FastAPI (`api.py`):** Endpoint inferensi `/predict/pra`, `/predict/posthoc`, `/predict/batch`, `/api/explain/pra`, `/api/explain/posthoc`, `/api/overview`, `/api/benchmark`, `/api/holdout-samples`, dan `/health`.
      - **Legacy Dashboard (`app.py`):** Streamlit Dashboard v1 tetap dipertahankan penuh.
      - **Containerization (`Dockerfile`, `docker-compose.yml`):** Multi-stage build Node 20 + Python 3.12-slim siap Hugging Face Spaces (`sdk: docker`, port `7860`, UID 1000).
      - **IEEE Technical Report (`reports/`):** Naskah akademik format IEEE 2-kolom tersinkron ke [`eda_results.json`](eda_results.json) dan [`models/fase3_metrics.json`](models/fase3_metrics.json).

## Dampak yang Dikejar

- Rata-rata sisa piring nasional **13,3% → < 10%** dalam 6 bulan setelah model dipakai.
- Penghematan biaya efektif **±Rp135/porsi per 1 pp** sisa piring yang dicegah.
- Skor risiko tersedia **< 3 detik** per distribusi, menggantikan pengukuran pasca-kejadian.
- Prioritas pengawasan otomatis untuk wilayah dengan risiko tertinggi (3T: 47,5% distribusi bermasalah).

## Tim

Proyek mandiri (satu orang merangkap tiga peran sesuai struktur TDSP):

| Peran | Nama |
|---|---|
| Project Lead & Data Scientist | Iqbal Ahdagita Elbadra (26MA41D022) |
| Data Engineer | Iqbal Ahdagita Elbadra |
| MLOps Engineer | Iqbal Ahdagita Elbadra |

Proyek tugas mata kuliah **Data Science (PSIKS2W002)**, Magister Ilmu Komputer,
Universitas Amikom Purwokerto. Dosen Pengampu: Giat Karyono.

## Data & Atribusi

Dataset: [Indonesia Free Nutritious Meal MBG 2026](https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry)
oleh **Luthfi Muthathohirin** (Kaggle, v4, Oktober 2026), 13.000 distribusi x 26
kolom, 38 provinsi. Data agregat tanpa informasi pribadi, sesuai prinsip
UU PDP No. 27/2022. Lisensi kode: MIT; data mengikuti lisensi sumber.

> Catatan metodologi: `confidence_score` dan `cot_nutrition_logistics_rationale`
> adalah artefak anotasi dataset dan tidak pernah dipakai sebagai fitur.
> Seluruh angka di README ini berasal dari [`eda_results.json`](eda_results.json) (`eda_run.py`)
> dan [`models/fase3_metrics.json`](models/fase3_metrics.json) (`train-kaggle-done.ipynb`) —
> tidak ada angka yang ditulis manual.
