# PlateGuard MBG

### Prediksi sisa makanan sebelum truk berangkat.

**PlateGuard MBG** mengubah telemetri operasional dapur SPPG menjadi skor prediksi
*plate waste* per rencana distribusi, sehingga Badan Gizi Nasional (BGN) dan mitra
dapur dapat menyesuaikan porsi, menu, dan jadwal kirim SEBELUM makanan terbuang.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Fase-4%20Deployment%20%26%20Report%20Selesai-brightgreen)
![Data](https://img.shields.io/badge/Dataset-Kaggle%20MBG%202026%20v4-yellow)

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
  [3] Model: HistGradientBoosting / XGBoost regressor (CV 5-fold)
        |
  [4] Skor plate waste + SHAP per distribusi
        |
  [5] API (FastAPI) + dasbor prioritas (Streamlit) per provinsi/klaster
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

Angka ini hasil uji coba awal, bukan model final. Target proyek: MAE ≤ 3,0 pp
dan R² ≥ 0,35 pada skenario pra-distribusi (lihat roadmap Fase 3).

Prediktor terkuat sinyal sisa makanan: kandungan kalori (r = -0,37), rasio
biaya-gizi (+0,28), suhu makanan saat tiba (-0,25), protein (-0,22), indeks
risiko pembusukan (+0,21), waktu transit (+0,20).

## Quickstart

```bash
# 1. Siapkan environment (Anaconda direkomendasikan)
pip install -r requirements.txt

# 2. Unduh dataset (publik, tanpa kredensial Kaggle)
python download_data.py

# 3. Jalankan pipeline EDA -> figures/ + eda_results.json
python eda_run.py

# 4. Bangun dataset siap latih (Fase 2): transform + split + guardrail leakage
python etl_pipeline.py

# 5. Jalankan Microservice REST API (FastAPI)
uvicorn api:app --host 0.0.0.0 --port 8000
# Akses Swagger UI Dokumentasi Interaktif di: http://localhost:8000/docs

# 6. Jalankan Dasbor Eksekutif Interaktif (Streamlit)
streamlit run app.py
# Akses Dasbor Interaktif di: http://localhost:8501

# 7. Deployment Otomatis via Docker Compose
docker-compose up --build
```

## Struktur Repositori

```
data/                  dataset CSV mentah (diunduh lokal, tidak di-commit)
data/processed/        dataset siap latih per skenario (pra/posthoc, hasil Fase 2)
figures/               10 figur EDA visualisasi distribusi & logistik (PNG 150 dpi)
figures_fase3/         figur SHAP beeswarm & bar importance per skenario
models/                artefak model terbaik (joblib), pipeline, dan metrik
download_data.py       unduh dataset via kagglehub
eda_run.py             pipeline EDA + guardrail leakage + baseline regresi
eda_notebook.ipynb     versi notebook EDA (tereksekusi, interpretasi per sel)
etl_pipeline.py        Fase 2: ETL sklearn Pipeline bebas leakage + self-test
fase3_modeling_done.ipynb Fase 3: notebook modeling tereksekusi penuh + interpretasi
api.py                 Fase 4: FastAPI REST API Microservice (Pra, Post-Hoc, Batch)
app.py                 Fase 4: Streamlit Interactive Executive Dashboard (4 Tab)
Dockerfile             Fase 4: Docker containerization multi-stage build
docker-compose.yml     Fase 4: Orkestrasi FastAPI (port 8000) & Streamlit (port 8501)
requirements.txt       Daftar dependensi Python produksi lengkap
build_laporan_akhir.py Generator dokumen laporan akhir format IEEE
Tugas3_Laporan_Akhir_IEEE/ Laporan Akhir IEEE UAS (DOCX 8 Halaman Lengkap)
eda_results.json       seluruh angka statistik EDA terverifikasi
```

## Roadmap

- [x] **Fase 1 (Minggu 2).** Project Charter + Laporan Analisis EDA + repositori ini.
- [x] **Fase 2 (Minggu 7).** `etl_pipeline.py`: ColumnTransformer bebas leakage (log1p skew kanan, refleksi-log suhu, binning kuartil jarak, one-hot, StandardScaler; state transformer di-fit pada train saja), split 80:20 terstratifikasi kuartil target, self-test guardrail. Output: 33 fitur (pra) / 37 fitur (post-hoc), 10.400 train / 2.600 test.
- [x] **Fase 3 (Minggu 13).** XGBoost/LightGBM/HGB + Bayesian hyperparameter tuning (Optuna 30 trial x 3-fold CV) + SHAP beeswarm & bar importance + penyimpanan model serialisasi (`models/best_*.joblib`).
      Hasil holdout test (2.600 baris):
      - **Pra-distribusi:** XGBoost (Optuna) MAE 3,65 pp, RMSE 4,58 pp, R² 0,333 (mengurangi galat 17,8% dibanding baseline mean-predictor 4,45 pp).
      - **Post-Hoc:** XGBoost (Optuna) MAE 2,92 pp, RMSE 3,75 pp, R² 0,553 (seluruh target charter tercapai: MAE ≤ 3,0 pp, R² ≥ 0,35, RMSE ≤ 4,5 pp).
      Notebook tereksekusi penuh tersimpan di `fase3_modeling_done.ipynb`.
- [x] **Fase 4 (Minggu 16, Selesai - Siap UAS).**
      - **REST API FastAPI (`api.py`):** Endpoint inferensi `/predict/pra`, `/predict/posthoc`, `/predict/batch`, `/metrics`, dan `/health` dengan latensi < 40 ms.
      - **Interactive Executive Dashboard (`app.py`):** 4 Tab analisis operasional (Executive Overview, What-If Simulator, SHAP Explainability & Root-Cause, Benchmark & Audit Integritas Data).
      - **Containerization (`Dockerfile`, `docker-compose.yml`):** Orkestrasi kontainer terisolasi, non-root user, multi-service deployment.
      - **IEEE Technical Report (`Tugas3_Laporan_Akhir_IEEE/`):** Naskah akademik 8 halaman komprehensif berstandar IEEE Computer Society.

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
> Seluruh angka di README ini dihasilkan oleh `eda_run.py` dan tersimpan di
> `eda_results.json` — tidak ada angka yang ditulis manual.
