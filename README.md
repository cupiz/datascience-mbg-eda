# PlateGuard MBG

### Prediksi sisa makanan sebelum truk berangkat.

**PlateGuard MBG** mengubah telemetri operasional dapur SPPG menjadi skor prediksi
*plate waste* per rencana distribusi, sehingga Badan Gizi Nasional (BGN) dan mitra
dapur dapat menyesuaikan porsi, menu, dan jadwal kirim SEBELUM makanan terbuang.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Fase-1%20EDA%20selesai-orange)
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
# 1. siapkan environment (Anaconda direkomendasikan)
conda install pandas numpy matplotlib seaborn scipy scikit-learn
pip install kagglehub

# 2. unduh dataset (publik, tanpa kredensial Kaggle)
python download_data.py

# 3. jalankan seluruh pipeline EDA -> figures/ + eda_results.json
python eda_run.py

# atau buka eda_notebook.ipynb untuk versi interaktif
```

## Struktur Repositori

```
data/                  dataset CSV (diunduh lokal, tidak di-commit)
download_data.py       unduh dataset via kagglehub
eda_run.py             pipeline EDA + guardrail leakage + baseline regresi
eda_notebook.ipynb     versi notebook (14 sel)
figures/               10 figur EDA (PNG 150 dpi)
eda_results.json       seluruh angka terverifikasi (sumber laporan)
make_notebook.py       regenerasi notebook dari eda_run.py
```

## Roadmap

- [x] **Fase 1 (Minggu 2).** Project Charter + Laporan EDA Bab 1-9 + repositori ini.
- [ ] **Fase 2 (Minggu 7).** Pipeline ETL bebas leakage: transformasi skew
      (log + refleksi), encoding, feature engineering, split train/test.
- [ ] **Fase 3 (Minggu 13).** XGBoost/LightGBM + Bayesian hyperparameter
      tuning + MLflow + SHAP; target MAE ≤ 3,0 pp, R² ≥ 0,35.
- [ ] **Fase 4 (Minggu 16).** Docker + API FastAPI + dasbor Streamlit +
      Technical Report IEEE 8 halaman.

## Dampak yang Dikejar

- Rata-rata sisa piring nasional **13,3% → < 10%** dalam 6 bulan setelah model dipakai.
- Penghematan biaya efektif **±Rp135/porsi per 1 pp** sisa piring yang dicegah.
- Skor risiko tersedia **< 3 detik** per distribusi, menggantikan pengukuran pasca-kejadian.
- Prioritas pengawasan otomatis untuk wilayah dengan risiko tertinggi (3T: 47,5% distribusi bermasalah).

## Tim

| Peran | Nama |
|---|---|
| Project Lead & Data Scientist | Iqbal Ahdagita Elbadra (26MA41D022) |
| Data Engineer | (bergabung segera) |
| MLOps Engineer | (bergabung segera) |

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
