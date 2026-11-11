# Sistem Peringatan Dini Kepatuhan Mutu Distribusi MBG 2026

Proyek EDA (Tugas 2 / UTS) mata kuliah **Data Science (PSIKS2W002)** — Magister
Ilmu Komputer, Universitas Amikom Purwokerto. Dosen Pengampu: Giat Karyono.

Disusun oleh: **Iqbal Ahdagita Elbadra** (NIM 26MA41D022)

## Masalah Bisnis

Program Makan Bergizi Gratis (MBG) / Badan Gizi Nasional (BGN) mendistribusikan
makanan melalui ribuan dapur SPPG di 38 provinsi. Telemetri 2026 menunjukkan
**24,0%** distribusi bermasalah (18,0% *Marginal-Quality-At-Risk* + 6,0%
*Non-Compliant-Intervention-Required*), dengan disparitas tajam: wilayah 3T
47,5% vs Jawa Metropolitan 13,8%. Proyek ini mengeksplorasi data untuk membangun
model **klasifikasi multikelas (4 tier kepatuhan)** sebagai sistem peringatan
dini agar pengawasan dan intervensi dapat diprioritaskan.

## Dataset

[Indonesia Free Nutritious Meal MBG 2026](https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry)
oleh Luthfi Muthathohirin (Kaggle, versi 4, Oktober 2026).
13.000 baris x 26 kolom; 0 null; 0 duplikat. Target:
`bgn_program_compliance_tier`. Berkas CSV tidak disertakan di repositori —
unduh dengan:

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

- Korelasi terkuat dengan tier (ordinal): suhu tiba makanan **r = -0,686**,
  indeks risiko pembusukan **+0,679**, waktu transit **+0,563**, sisa piring **+0,556**.
- Distribusi bersuhu tiba < 60°C (22,4% data) bermasalah **63,7%** vs 12,5%
  pada suhu ≥ 60°C (faktor risiko 5,1x).
- Cramér's V pemicu sisa makanan x tier = **0,545**; 100% kasus
  *Sub-Optimal-Arrival-Temperature* berujung Marginal/Non-Compliant.
- Jarak vs waktu transit r = **0,928** → multikolinearitas untuk model linear.
- Uji coba model (CV accuracy): dummy 0,647 < Logistic Regression 0,815 <
  Random Forest 0,997 ≈ HistGradientBoosting 0,998 → target hampir
  deterministik (rule-derived); model diposisikan sebagai **otomatisasi
  early-warning**, bukan penemuan kausal. Rekomendasi: tree-based ensemble +
  class_weight/SMOTE + evaluasi macro-F1 dan recall kelas Non-Compliant.

## Lisensi & Atribusi

Kode: MIT. Data: mengikuti lisensi dataset sumber di Kaggle — atribusi ke
Luthfi Muthathohirin. Laporan lengkap (Bab 1–9) ada pada dokumen
`Laporan EDA` yang dikumpulkan terpisah via LMS.
