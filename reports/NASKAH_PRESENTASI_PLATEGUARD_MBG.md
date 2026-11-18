# Naskah dan Keterangan Isi Slide Presentasi: PlateGuard MBG v2

**Judul Proyek:** PlateGuard MBG — Prediksi Persentase Sisa Makanan (*Plate Waste*) Distribusi Program Makan Bergizi Gratis (MBG) Berbasis *Gradient Boosting Regression*  
**Mata Kuliah:** Sains Data (`PSIKS2W002`) — Program Studi Magister Ilmu Komputer, Universitas Amikom Purwokerto  
**Penyusun:** Iqbal Ahdagita Elbadra (`26MA41D022`)  
**Dosen Pengampu:** Giat Karyono, M.Kom., Ph.D.  
**Total Slide:** 22 Slide (±12–15 menit presentasi + demo langsung aplikasi web)

---

## Ringkasan Alur Presentasi

| Segmen | Slide | Fokus Pembahasan | Estimasi Durasi |
|---|---|---|---|
| **1. Masalah dan Konteks** | Slide 1–4 | Skala MBG, pemborosan anggaran, celah waktu keputusan | 2,5 menit |
| **2. Data dan Audit Lapangan** | Slide 5–10 | Profil dataset 13.000 baris, guardrail anti-leakage, temuan 3T dan suhu | 3,5 menit |
| **3. Pengolahan dan Pemodelan** | Slide 11–16 | *ReflectionLog*, rekayasa fitur, CV 5-Fold, Optuna, benchmark 7 model | 3,5 menit |
| **4. Keterjelaskan dan Bahasa Awam** | Slide 17–18 | TreeSHAP global/lokal dan modul `humanizer-id` untuk pengguna awam | 1,5 menit |
| **5. Demo Web v2 dan Penutup** | Slide 19–22 | Arsitektur Next.js Desain Spatial Frosted Glass, demo langsung, rekomendasi BGN | 3,0 menit |

---

## Slide 1 — Sampul Presentasi

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Latar biru keperakan cerah bernuansa kaca buram (*Spatial Frosted Glass* khas antarmuka PlateGuard v2), kartu judul utama di kiri dan kartu pratinjau kecil antarmuka web Simulator di kanan.
- **Elemen Teks di Layar:**
  - Judul Utama: **PlateGuard MBG**
  - Subjudul: **Memprediksi Sisa Makanan Sebelum Armada Berangkat untuk Efisiensi Anggaran BGN**
  - Identitas: Iqbal Ahdagita Elbadra (`26MA41D022`) | Sains Data (`PSIKS2W002`) | Universitas Amikom Purwokerto | 2026
  - Lencana Bawah: `13.000 Catatan Nasional` · `38 Provinsi` · `LightGBM + Optuna` · `TreeSHAP + Bahasa Awam`

### Narasi Presenter
"Selamat pagi atau siang Bapak Dosen dan rekan-rekan sekalian. Hari ini kami mempresentasikan **PlateGuard MBG**, proyek sains data ujung-ke-ujung untuk memprediksi persentase sisa makanan di piring penerima Program Makan Bergizi Gratis—sebelum armada pengantar berangkat dari dapur SPPG."

---

## Slide 2 — Skala Program MBG dan Kebocoran Anggaran Tersembunyi

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** 4 kartu angka besar (*KPI Hero Grid*) dengan sorotan warna merah bata pada angka pemborosan, plus ilustrasi sederhana perbandingan biaya produksi dan biaya efektif termakan.
- **Elemen Teks di Layar:**
  - Judul: **Program Besar, Pemborosan Tersembunyi di Piring**
  - **13,34%**: Rata-rata makanan yang tidak habis disantap penerima (ekor kasus mencapai **37,7%**).
  - **Rp13.526 → Rp15.677**: Biaya produksi per porsi membengkak menjadi biaya efektif per porsi yang benar-benar termakan (**+Rp2.151/porsi** atau **+15,9%**).
  - **Rp308,8 Miliar**: Total akumulasi biaya pada 13.000 catatan distribusi nasional.
  - **±Rp135/porsi**: Nilai efisiensi anggaran yang diselamatkan untuk setiap **1 poin persentase (pp)** penurunan sisa makanan.

### Narasi Presenter
"Badan Gizi Nasional menyalurkan jutaan porsi makanan setiap hari melalui dapur SPPG di 38 provinsi. Namun, di balik skala besar tersebut tersimpan kebocoran yang kerap luput: rata-rata **13,34%** makanan tersisa di piring penerima, bahkan bisa menembus **37,7%** pada kasus ekstrem. Akibatnya, biaya rata-rata **Rp13.526** per porsi membengkak menjadi biaya efektif **Rp15.677** karena sebagian makanan berakhir menjadi sampah. Setiap 1 poin persentase sisa piring yang bisa dicegah bernilai sekitar **Rp135** per kotak makan."

---

## Slide 3 — Celah Waktu Keputusan (Mengapa Reaktif Selalu Terlambat)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Diagram garis waktu dua jalur memanjang horizontal: **Alur Lama (Reaktif)** berwarna abu/merah dan **Alur PlateGuard (Preventif)** berwarna teal `#0f5257`.
- **Elemen Teks di Layar:**
  - Judul: **Akar Tata Kelola: Keputusan Dibuat Sebelum Data Sisa Tersedia**
  - **Alur Saat Ini:** Rencana Menu dan Masak → Kirim Armada → Siswa Makan → *Baru Tercatat Sisa Piring* (Terlambat untuk porsi hari itu).
  - **Alur PlateGuard MBG:** Rencana Kirim + Profil Sekolah → **Model Prediksi serta TreeSHAP (< 100 ms)** → Koreksi Porsi / Wadah Termal / Jadwal → Armada Berangkat.

### Narasi Presenter
"Persoalan mendasar di lapangan terletak pada urutan waktu. Selama ini dapur baru mengetahui berapa banyak makanan bersisa **setelah** jam makan siswa usai. Artinya, setiap tindakan perbaikan bersifat reaktif ke belakang. PlateGuard MBG membalik urutan kerja itu: begitu jadwal pengiriman, menu, kalori, dan perkiraan suhu tiba direncanakan, model memprediksi risiko sisa piring sebelum makanan diangkut ke sekolah."

---

## Slide 4 — Rumusan Masalah, Sasaran Charter, dan Pemisahan Tipe Masalah

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Panel kiri memuat *Pertanyaan Bisnis* dan target operasional; panel kanan memuat *Target Teknis Model Regresi*.
- **Elemen Teks di Layar:**
  - Judul: **Rumusan Masalah dan Target Terukur Project Charter**
  - **Pertanyaan Bisnis:** Menekan rata-rata sisa piring nasional dari **13,34%** menuju **di bawah 10%** dalam 6 bulan melalui koreksi menu, porsi, dan logistik pradistribusi.
  - **Tipe Masalah:** **Regresi kontinu** pada target `plate_waste_percentage` (`1,0%–37,7%`, simpangan baku `5,58`).
  - **Bukan Klasifikasi:** Label 4 kelas `bgn_program_compliance_tier` dijadikan konteks analisis mutu program, bukan target prediksi utama.
  - **Sasaran Model:** Mengalahkan pembanding dasar *mean-predictor* (`MAE 4,44 pp`), menyasar `MAE <= 3,0 pp`, `RMSE <= 4,5 pp`, dan `R² >= 0,35` pada validasi silang 5-fold bebas bocoran data.

### Narasi Presenter
"Sesuai dengan Project Charter, masalah ini kami rumuskan sebagai persoalan regresi kontinu terhadap persentase sisa piring. Pembanding dasar yang harus kami kalahkan ialah tebakan rata-rata statis dengan galat MAE 4,44 poin persentase. Sasaran kami jelas: model harus bebas kebocoran data, melampaui regresi linear biasa, dan menyediakan penjelasan faktor pendorong agar bisa dipertanggungjawabkan ke pengambil kebijakan BGN."

---

## Slide 5 — Kerangka TDSP dan Profil Dataset Telemetri MBG 2026

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Bagan 4 fase TDSP di bagian atas (*Pemahaman Bisnis → Data dan ETL → Pemodelan → Penerapan v2*), dan tabel ringkas struktur dataset di bawah.
- **Elemen Teks di Layar:**
  - Judul: **Kerangka Kerja TDSP dan Profil Dataset Nasional**
  - **Sumber Data:** Dataset publik Kaggle *Indonesia Free Nutritious Meal MBG 2026* v4 (**13.000 baris × 26 kolom**, ukuran `18,3 MB`).
  - **Komposisi Kolom:** `17` kolom numerik, `7` kolom kategori, `1` pengenal unik (`distribution_id`), dan `1` narasi dokumentasi (*CoT rationale*).
  - **Kepatuhan Privasi (UU PDP No. 27/2022):** Seluruh baris memakai ID acak anonim (`ID_MBG_*`) tanpa memuat data pribadi siswa.

### Narasi Presenter
"Seluruh siklus kerja mengikuti kerangka *Team Data Science Process*. Kami mengolah **13.000 catatan pengiriman** yang tersebar di **38 provinsi** dengan 26 atribut operasional lengkap mulai dari kapasitas dapur, biaya bahan baku, kalori, jarak, moda angkutan, hingga suhu tiba di sekolah. Seluruh catatan bersifat agregat tanpa identitas pribadi siswa agar selaras dengan prinsip UU Pelindungan Data Pribadi."

---

## Slide 6 — Pemeriksaan Kualitas Data (Kelengkapan 100% dan Catatan Kurasi)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri memuat grafik [`figures/fig01_missing.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig01_missing.png); kanan berisi 3 poin temuan kualitas dan sikap kritis pipeline produksi.
- **Elemen Teks di Layar:**
  - Judul: **Audit Kualitas Data: 0 Nilai Kosong, 0 Baris Ganda**
  - **Kelengkapan:** `0` *missing values* di seluruh 26 kolom dan `0` duplikat penuh.
  - **Konsistensi Domain:** Ejaan 38 provinsi dan seluruh kategori seragam; persentase, suhu (`30–72°C`), serta kapasitas (`500–3.600`) berada pada batas wajar.
  - **Kewaspadaan Produksi:** Kelengkapan 100% mencerminkan hasil kurasi penyedia dataset (`Cohen's Kappa 0,9203`) sehingga pipeline produksi tetap menyiapkan aturan imputasi apabila data lapangan nanti tidak lengkap.

### Narasi Presenter
"Saat memeriksa mutu data pada grafik sebelah kiri, ke-26 kolom mencatat nol nilai hilang dan nol duplikasi. Namun, sebagai praktisi sains data, kami mencatat secara jujur dalam laporan EDA bahwa kondisi bersih mutlak ini merupakan sifat data terkurasi. Oleh karena itu, pipeline produksi tetap dirancang siap menghadapi data kosong di lapangan nyata pada masa depan."

---

## Slide 7 — Audit Guardrail Anti-Leakage (Membuktikan dan Memblokir Data Bocor)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kartu peringatan berbingkai merah-terakota menampilkan 2 kolom terlarang dan perbandingan skor *sebelum vs sesudah* blokir `DROP_LEAK`.
- **Elemen Teks di Layar:**
  - Judul: **Penjaga Kejujuran Model: Dua Kebocoran Data Terbukti Diblokir**
  - **Kebocoran 1 — `waste_adjusted_effective_cost_idr`:** Terbukti merupakan rumus aljabar balik dari target `biaya_total / (1 - sisa/100)` dengan selisih absolut maksimum di seluruh 13.000 baris hanya **Rp0,50**.
  - **Kebocoran 2 — `bgn_program_compliance_tier`:** Diturunkan langsung memakai ambang sisa makanan `20%–30%`. Uji Random Forest menebak tier dengan akurasi **99,7%**, dan memasukkannya ke regresi HGB menaikkan `R²` palsu dari **0,337–0,553** melonjak ke **0,682**.
  - **Dibuang Juga:** Kolom artefak anotasi `confidence_score`, narasi `cot_nutrition_logistics_rationale`, dan `distribution_id`.

### Narasi Presenter
"Ini salah satu temuan paling krusial dalam proyek ini. Jika seorang analis terburu-buru melatih semua kolom, skor model akan tampak sangat tinggi tetapi palsu. Kami membuktikan dua sumber kebocoran data: pertama, kolom biaya efektif yang selisih rumusnya terhadap target sisa piring hanya Rp0,50 di seluruh 13.000 baris. Kedua, kolom tier kepatuhan BGN yang mendongkrak `R²` semu hingga `0,682` karena kelasnya memang dibuat dari batas sisa 20–30%. Kedua kolom tersebut beserta artefak anotasi otomatis kami blokir lewat `DROP_LEAK`."

---

## Slide 8 — Temuan Kunci EDA 1: Jurang Kesenjangan Wilayah 3T dan Suhu Kritis `<60°C`

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri memuat grafik [`figures/fig09_bermasalah_cluster.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig09_bermasalah_cluster.png); kanan menyorot metrik tajam batas suhu HACCP `60°C`.
- **Elemen Teks di Layar:**
  - Judul: **Risiko Melonjak 5 Kali Lipat Saat Makanan Tiba Dingin**
  - **Disparitas Geografis (3,4x):** Kiriman bermasalah di **Wilayah 3T Perbatasan & Pedalaman** mencapai **47,52%**, disusul Pedesaan/Kepulauan **30,60%**, Luar Jawa Urban **15,05%**, sedangkan **Jawa Metropolitan** hanya **13,82%**.
  - **Efek Ambang Suhu `60°C` (5,1x):** Kiriman dengan suhu tiba `< 60°C` (`22,42%` populasi) berujung bermasalah sebesar **63,7%**, berbanding hanya **12,5%** saat makanan tiba hangat `>= 60°C`.

### Narasi Presenter
"Grafik EDA memperlihatkan ketimpangan besar antarwilayah maupun rantai suhu. Di Jawa Metropolitan, sekitar 13,8% pengiriman berstatus bermasalah. Angka itu melonjak hampir tiga setengah kali lipat di wilayah 3T hingga **47,52%**. Lebih tajam lagi pada suhu: begitu suhu makanan jatuh di bawah standar hangat HACCP 60 derajat Celsius saat tiba, peluang kiriman tersebut bermasalah melonjak menjadi **63,7%**, lebih dari lima kali lipat dibandingkan makanan yang tiba hangat."

---

## Slide 9 — Temuan Kunci EDA 2: Pemicu Lapangan dan 8 Provinsi Prioritas BGN

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri menampilkan [`figures/fig10_driver_tier.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig10_driver_tier.png); kanan berisi tabel peringkat atas dan bawah risiko provinsi.
- **Elemen Teks di Layar:**
  - Judul: **63,43% Pemicu Lapangan Berasal dari Kebiasaan Jajan**
  - **Dominasi Perilaku (`Prior-Snack-Consumption`):** Menyumbang **63,43%** kasus, diikuti ukuran porsi berlebih (**22,40%**), suhu tiba dingin (**8,58%** yang **69,3%** kasus gagal beratnya dipicu kondisi ini), keterlambatan transit (**4,04%**), serta rasa menu (**1,55%**).
  - **Provinsi Berisiko Tertinggi:** Kalimantan Utara (**51,3%**), Papua Selatan (**46,8%**), Papua Pegunungan (**44,8%**), Papua Tengah (**44,0%**), dan NTT (**42,8%**).
  - **Provinsi Terkendali:** Banten (**16,3%**) dan Jawa Barat/Jawa Timur (**19,3%**).

### Narasi Presenter
"Jika ditelisik dari catatan pascamakan pada diagram kanan-kiri ini, ternyata pemicu sisa makanan terbanyak bukan berasal dari masalah transportasi semata, melainkan kebiasaan anak jajan sebelum jadwal makan sebesar **63,43%**. Meski demikian, ketika masalahnya berupa suhu tiba sub-optimal, hampir seluruh pengirimannya bermasalah berat. Di peta daerah, Kalimantan Utara serta provinsi-provinsi di tanah Papua menempati urutan prioritas tertinggi di atas 42%."

---

## Slide 10 — Bentuk Distribusi Condong dan Keputusan Mempertahankan Pencilan

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Dua gambar berdampingan: [`figures/fig02_hist_kde.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig02_hist_kde.png) di kiri dan [`figures/fig08_outlier_box.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig08_outlier_box.png) di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Mengapa Pencilan Logistik Sengaja Dipertahankan**
  - **Condong Kanan Kuat:** `transit_time_minutes` (*skew* `+2,16`), `spoilage_risk_index` (`+2,05`), dan `delivery_distance_km` (`+1,75`) berekor panjang akibat rute 3T hingga 120 menit dan 35 km.
  - **Condong Kiri Ekstrem:** `food_arrival_temperature_celsius` (*skew* `-2,13`) karena mayoritas mengumpul hangat di `60–72°C`.
  - **Keputusan Retensi Pencilan:** Sebanyak `1.459` baris pencilan IQR indeks pembusukan dan `975` baris waktu transit **tidak dihapus** karena kasus ekstrem wilayah 3T itulah inti masalah yang justru harus dikenali model.

### Narasi Presenter
"Sebagaimana tampak pada histogram serta diagram kotak di layar, data operasional tidak berdistribusi normal. Lama transit dan indeks pembusukan miring ke kanan kuat, sementara suhu tiba justru miring ekstrem ke kiri. Kami mengambil keputusan metodologis mempertahankan seluruh pencilan tersebut; membuang pengiriman berdurasi 120 menit berarti menghapus kenyataan distribusi di daerah terpencil. Oleh karena itu, model berbasis pohon dipilih karena tangguh menghadapi pencilan."

---

## Slide 11 — Mengatasi Kecondongan Kiri Ekstrem Lewat Modul *ReflectionLog*

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Grafik [`figures/fig04_log_transform.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig04_log_transform.png) mengisi 65% sisi kiri; kotak rumus dan perbandingan angka *skewness* sebelum–sesudah di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Mengatasi Kegagalan `log1p` pada Suhu Tiba via *ReflectionLog***
  - **Masalah:** Fungsi `log(x+1)` memangkas kecondongan jarak (`1,75 → 0,21`) dan waktu transit (`2,16 → 0,38`), **tetapi memperburuk suhu tiba** dari `-2,13` menjadi `-2,77`.
  - **Solusi Modul *ReflectionLog*:** $x'_{\text{suhu}} = \ln(\max_{\text{train}}(X_{\text{suhu}}) + 1 - \min(x, \max_{\text{train}}(X_{\text{suhu}})))$ memakai batas `max_train = 72,0 °C` yang dipelajari hanya dari data latih.
  - **Hasil:** Kemencengan suhu turun drastis ke **`-0,087` (praktis simetris)**.

### Narasi Presenter
"Temuan penting lain di tahap transformasi ialah kegagalan `log1p` pada variabel suhu tiba. Karena ekornya condong ke kiri, penerapan logaritma biasa justru memperparah kemencengan ke angka minus 2,77. Kami menyelesaikannya melalui transformator kustom `ReflectionLog` yang merefleksikan nilai terhadap suhu maksimum data latih sehingga kemencengannya pulih mendekati nol yaitu minus 0,087 tanpa membocorkan distribusi data uji."

---

## Slide 12 — Rekayasa Fitur Domain dan Pemisahan Ketat Dua Skenario

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Dua blok perbandingan skenario (**Pradistribusi 34 Fitur** vs **Post-Hoc Audit 38 Fitur**) dilengkapi kartu daftar 3 fitur rekayasa baru.
- **Elemen Teks di Layar:**
  - Judul: **Fitur Baru Domain Dapur dan Pemisahan Waktu Operasi**
  - **3 Fitur Turunan `FeatureBuilder`:**
    1. `biaya_per_kkal` (`total_meal_cost_idr / estimated_calories_kcal`, rataan Rp20,3/kkal)
    2. `kecepatan_km_jam` (`jarak / (waktu/60)`, rataan 16,5 km/jam)
    3. `interaksi_suhu_transit` dan pengelompokan kuartil jarak (`QuantileBinner`, 4 kelas)
  - **Skenario 1 — Pradistribusi (34 Fitur):** Tanpa kolom pemicu `primary_food_waste_driver` untuk prediksi *sebelum* armada berangkat.
  - **Skenario 2 — Audit Post-Hoc (38 Fitur):** Menyertakan kategori pemicu yang diamati *sesudah* jam makan untuk evaluasi akar masalah.

### Narasi Presenter
"Selain merapikan distribusi, modul `FeatureBuilder` menurunkan indikator ekonomis dan termal baru seperti biaya per kalori, kecepatan armada, serta kombinasi suhu terhadap durasi jalan. Lebih penting lagi, kami memisahkan dua model secara ketat: mode pradistribusi berisi 34 fitur untuk perencanaan pagi sebelum kirim, sedangkan mode post-hoc berisi 38 fitur untuk audit akar masalah sesudah selesai makan."

---

## Slide 13 — Peta Korelasi Multivariat dan Dasar Pemilihan Model Taklinear

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Matriks [`figures/fig07_corr_heatmap.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig07_corr_heatmap.png) di kiri; peringkat korelasi Pearson terhadap target di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Tidak Ada Proksi Tunggal: Sinyal Tersebar dan Multikolinearitas**
  - **Korelasi Sah Terhadap Sisa Piring:**
    - `estimated_calories_kcal` (`r = -0,372`) — kecukupan kalori menekan sisa
    - `cost_to_nutrition_ratio` (`+0,280`) dan `food_arrival_temperature_celsius` (`-0,252`)
    - `estimated_protein_grams` (`-0,221`), `spoilage_risk_index` (`+0,214`), `transit_time_minutes` (`+0,198`)
  - **Multikolinearitas Kuat:** Jarak dan waktu tempuh berkorelasi **`r = 0,928`** (`p < 0,001`), menuntut ketahanan algoritmik pada model berbasis pohon gradien.

### Narasi Presenter
"Heatmap korelasi ini menjelaskan mengapa tebakan sederhana tidak memadai. Tidak ada satu variabel tunggal pun yang memonopoli sisa makanan; sinyalnya tersebar pada energi kalori sebesar minus 0,372, rasio biaya gizi, hingga suhu tiba. Selain itu, jarak dan waktu tempuh bertaut sangat kuat pada korelasi 0,928. Pola multivariabel berinteraksi kuat inilah yang mendorong kami beralih ke algoritma peningkatan gradien berbasis pohon."

---

## Slide 14 — Pipeline ETL, *TargetEncoder* 38 Provinsi, CV 5-Fold, Optuna, dan MLflow

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Diagram blok alur pelatihan reprodusibel dari kiri ke kanan, beserta hasil uji ablasi `TargetEncoder` pada kartu terpisah di bawah.
- **Elemen Teks di Layar:**
  - Judul: **Arsitektur Pelatihan Ketat Tanpa Kebocoran Lintas Lipatan**
  - **Partisi Holdout Terstratifikasi Kuartil Target (80:20):** `10.400` baris latih (`rataan 13,33%`) dan `2.600` baris uji holdout (`rataan 13,35%`).
  - **Pencegahan Bocor Dalam Lipatan (*Fit Per-Fold*):** Seluruh scaler, `ReflectionLog`, dan `TargetEncoder(smooth='auto', cv=5)` untuk **38 provinsi** hanya di-*fit* di dalam lipatan latih 5-Fold.
  - **Uji Ablasi `province TargetEncoder` (XGBoost CV):** Konsisten memperbaiki galat (Pra MAE `3,7115 → 3,7102`; Post-Hoc MAE `2,9893 → 2,9840`, R² `0,5297 → 0,5316`).
  - **Pelacakan dan Optimasi:** Bayesian Optimization via **Optuna (30 uji × 5 fold)** dan pelacakan **14 percobaan di MLflow**.

### Narasi Presenter
"Pada tahap pemodelan di `train.py` maupun notebook Kaggle kami, ke-13.000 baris dibagi mengikuti kuartil target menjadi 10.400 baris latih dan 2.600 uji holdout. Untuk mewakili keragaman 38 provinsi tanpa ledakan kolom dummy, kami memakai `TargetEncoder` yang dihitung murni di dalam tiap lipatan 5-fold agar bebas kebocoran. Kandidat terunggul lalu disetel oleh Optuna sebanyak 30 uji dan seluruh percobaannya terekam dalam 14 run MLflow."

---

## Slide 15 — Hasil Benchmark Pradistribusi (34 Fitur): 7 Model dan Analisis Kritis

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tabel hasil resmi 7 model pradistribusi dari `models/fase3_metrics.json` dengan baris **LightGBM (Optuna)** disorot warna teal.
- **Elemen Teks di Layar:**
  - Judul: **Benchmark Pradistribusi (Sebelum Kirim — 34 Fitur)**
  - **Tabel Ringkas Holdout `N = 2.600`:**
    - `LightGBM (Optuna)`: **CV MAE `3,604±0,042`** · **Holdout MAE `3,658 pp`** · **RMSE `4,586 pp`** · **R² `0,333`** (**Terbaik Pra**)
    - `RandomForest`: Holdout MAE `3,658 pp` · RMSE `4,604 pp` · R² `0,327`
    - `HistGradientBoosting`: Holdout MAE `3,660 pp` · R² `0,331`
    - `LightGBM` default: `3,706 pp` | `XGBoost`: `3,712 pp` | `Ridge`: `3,720 pp`
    - `MeanPredictor` (Baseline): Holdout MAE `4,447 pp` · RMSE `5,613 pp` · R² `0,000`
  - **Capaian Jujur:** Memangkas galat **-17,7%** daripada baseline; selisih `R² 0,333` vs sasaran `0,35` mencerminkan **batas alamiah sinyal sebelum faktor perilaku pascamakan diketahui**.

### Narasi Presenter
"Ini hasil benchmark resmi pada skenario pradistribusi dengan 34 fitur. **LightGBM hasil optimasi Optuna** menempati posisi teratas dengan galat CV `3,604` dan Holdout `MAE 3,658 pp` serta `RMSE 4,586 pp`, memangkas kesalahan **17,7%** daripada pembanding dasar. Kami juga menyajikan kenyataan ilmiah secara jujur: sebelum faktor perilaku anak di sekolah diketahui, batas daya jelas alami berada di `R² 0,333`."

---

## Slide 16 — Hasil Benchmark Audit Post-Hoc (38 Fitur): Melampaui Seluruh Target Charter

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Grafik batang dan tabel perbandingan 7 model pascamakan bersebelahan dengan kotak verifikasi seluruh target Charter (`Centang Hijau`).
- **Elemen Teks di Layar:**
  - Judul: **Benchmark Audit Post-Hoc (38 Fitur) — Target Charter Tercapai Penuh**
  - **Pemenang `LightGBM (Optuna)`:**
    - **CV MAE 5-Fold:** `2,905 ± 0,046 pp` (`R² 0,557 ± 0,006`)
    - **Holdout Test (`N = 2.600`):** **MAE `2,929 pp`** (`<= 3,0`), **RMSE `3,761 pp`** (`<= 4,5`), **R² `0,551`** (`>= 0,35`) — **-34,1%** lebih rendah daripada baseline!
  - **Pembanding Kuat Lainnya:** `HistGradientBoosting` (`2,940 pp`), `RandomForest` (`2,962 pp`), `LightGBM` (`2,977 pp`), `XGBoost` (`2,979 pp`), `Ridge` (`3,018 pp`).
  - **Artefak:** Tersimpan ganda dalam `.joblib` dan `.pkl` bersama laporan 5-fold per lipatan.

### Narasi Presenter
"Begitu variabel pemicu yang diamati di sekolah masuk pada skenario Audit Post-Hoc dengan 38 fitur, kinerja seluruh model pohon melonjak signifikan. **LightGBM Optuna** mencatat rata-rata CV `2,905` dan Holdout **`MAE 2,929 pp`, `RMSE 3,761 pp`, serta `R² 0,551`**. Angka ini melampaui seluruh batas sasaran yang ditetapkan di Project Charter dengan penurunan kesalahan **34,1%** dibandingkan pembanding dasar."

---

## Slide 17 — Keterjelaskan Model (*TreeSHAP*): Penggerak Global di Balik Angka

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Duet gambar [`figures_fase3/shap_beeswarm_pra.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures_fase3/shap_beeswarm_pra.png) dan [`figures_fase3/shap_beeswarm_posthoc.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures_fase3/shap_beeswarm_posthoc.png) bersebelahan.
- **Elemen Teks di Layar:**
  - Judul: **Membuka Kotak Hitam dengan TreeSHAP**
  - **Mode Pradistribusi:** Jenjang sekolah penerima, efisiensi biaya per kalori (`biaya_per_kkal`), kecukupan kalori menu, serta degradasi suhu tiba `<60°C` menjadi pendorong utama naik-turunnya perkiraan sisa piring.
  - **Mode Post-Hoc Audit:** Faktor `Prior-Snack-Consumption` (jajan sebelum jam makan) mendominasi kontribusi positif tertinggi, disusul porsi berlebih dan suhu dingin.
  - **Nilai Kebijakan:** Memberi bukti objektif apakah pemborosan disebabkan kesalahan dapur (suhu/porsi) atau perilaku lingkungan kantin sekolah.

### Narasi Presenter
"Agar model tidak berhenti menjadi kotak hitam, kami mengekstraksi nilai **TreeSHAP** pada ke-2.600 data uji. Di sebelah kiri, sebelum kiriman berangkat, faktor jenjang usia, biaya per kalori, kecukupan energi menu, dan penurunan suhu di bawah 60 derajat terlihat mendorong risiko pemborosan naik tajam. Di sebelah kanan, saat data sekolah masuk, kebiasaan siswa jajan mendominasi lonjakan sisa piring. Informasi ini mencegah dapur dan pihak sekolah saling menyalahkan tanpa data."

---

## Slide 18 — Humanizer AI (`humanizer-id`): Menjembatani Data Teknis ke Bahasa Awam

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri memperlihatkan keluaran mentah TreeSHAP teknis (`temp__refllog +5,67 pp`); kanan menunjukkan kartu terjemahan Bahasa Awam aktif di aplikasi web PlateGuard v2.
- **Elemen Teks di Layar:**
  - Judul: **Mengubah Istilah Pemelajaran Mesin Menjadi Bahasa Dapur Sehari-hari**
  - **Tantangan Adopsi Publik:** Staf dapur SPPG dan masyarakat awam sulit memahami istilah `MAE 3,658 pp`, `ReflectionLog`, atau `+2,07 SHAP`.
  - **Solusi Modul [`humanizer_explainer.py`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/humanizer_explainer.py):** Menerapkan kaidah sunting Bahasa Indonesia lugas (`apissaj/humanizer-id`) untuk menerjemahkan angka nyata model ke kalimat aktif, tanpa klise AI maupun pembesaran angka.
  - **Contoh Keluaran:** *"Untuk pengantaran ke Jawa Tengah, sekitar 15,36% makanan berisiko tersisa, setara Rp2.074 terbuang di setiap kotak makan (Rp3,69 juta/hari)."*
  - **Sakelar Cepat UI (`Awam | Teknis`):** Satu klik di bilah atas aplikasi untuk berganti antara tampilan petugas dapur dan evaluasi akademis.

### Narasi Presenter
"Model yang akurat akan sia-sia apabila kepala dapur SPPG tidak mengerti cara membacanya. Oleh karena itu, kami membangun modul **Humanizer Bahasa Awam** mengikuti pedoman gaya editorial `humanizer-id`. Istilah seperti `cost_to_nutrition_ratio` maupun angka TreeSHAP langsung diterjemahkan menjadi kalimat sebab-akibat berbahasa Indonesia sehari-hari lengkap dengan taksiran rupiah yang terbuang. Dosen penguji tetap dapat menekan sakelar **Teknis** di bilah atas bila ingin memeriksa istilah statis aslinya."

---

## Slide 19 — Arsitektur Full-Stack PlateGuard MBG v2 (Desain 5 *Spatial Frosted Glass*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Diagram arsitektur 3 lapis (*Next.js 16 Static Frontend + FastAPI Single-Origin Backend + Model LightGBM/TreeSHAP + Docker Port 7860*) berpadu palet kaca sky-sage.
- **Elemen Teks di Layar:**
  - Judul: **Dari Notebook Riset Menjadi Aplikasi Web Terpadu v2**
  - **Antarmuka Modern ([`frontend/`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/frontend)):** Next.js 16 + Tailwind v4 berkonsep *Spatial Frosted Glass* (*floating capsule header*, *glass vertical dock*, pencarian `/`, riwayat tersimpan di browser).
  - **Peladen Backend ([`api.py`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/api.py)):** REST API FastAPI terpadu (`/predict/*`, `/api/explain/*`, `/api/what-if-curve`, `/api/overview`, `/api/eda-interactive`, `/api/benchmark`, `/api/holdout-samples`) sekaligus menyajikan aset statis web pada satu origin.
  - **Kesiapan Kontainer (`Dockerfile`):** Bangun multi-tahap Node 20 + Python 3.12-slim siap Hugging Face Spaces (`port 7860`, plus dasbor Streamlit `app.py` tetap terawat).

### Narasi Presenter
"Seluruh pipeline tersebut dikemas ke dalam aplikasi web penuh **PlateGuard MBG v2** bergaya *Spatial Frosted Glass*. Sisi depan dibangun memakai Next.js 16 lalu diekspor statis agar dapat disajikan langsung oleh satu peladen FastAPI sehingga penerapan sistem ke Hugging Face Spaces via Docker cukup berjalan pada satu port tanpa kerumitan CORS antarlayanan."

---

## Slide 20 — Demo Langsung 1: Simulator, *Auto-Update*, Kurva *What-If*, dan Patokan A vs B

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tangkapan layar penuh [`plateguard_interactive_sim.png`](file:///C:/Users/Cupiz/.gemini/antigravity/brain/d25a6a89-d204-4008-8c1d-57314ba330d8/plateguard_interactive_sim.png) di kanan disertai 4 penunjuk fitur utama di kiri.
- **Elemen Teks di Layar:**
  - Judul: **Demo Aplikasi: Simulasi Dapur Interaktif Sebelum Berangkat**
  - **Mode Auto dan Kalkulator Dapur:** Menggeser slider suhu, kalori, atau jarak otomatis memperbarui prediksi (`~74 ms`), rupiah terbuang harian, serta proyeksi 22 hari sekolah.
  - **Kunci Sebagai Patokan (A):** Menguji efek perbaikan—misalnya menaikkan suhu kotak hangat dari `54°C` ke `65°C` langsung menghitung selisih poin persen dan uang yang diselamatkan per bulan.
  - **Kurva *What-If* (`/api/what-if-curve`):** Memvisualkan 9 skenario perubahan suhu, kalori, maupun durasi pengiriman dalam satu garis interaktif.

### Narasi Presenter
*(Pada tahap ini presenter dapat beralih ke aplikasi aktif di browser `http://localhost:8000`)*  
"Di halaman Simulator, ketika skenario Papua Selatan dipilih bersama mode **Auto**, prediksi langsung dihitung beserta ringkasan Bahasa Awam dan kalkulator anggaran 22 hari. Jika rencana ini dikunci sebagai **Patokan A** lalu suhu tiba digeser naik ke atas 60°C atau **Kurva What-If** di tengah layar diperiksa, pengelola dapur langsung melihat berapa persen sisa yang berkurang serta berapa juta rupiah anggaran yang terselamatkan."

---

## Slide 21 — Demo Aplikasi 2: Explorer EDA Interaktif, 38 Provinsi, dan Audit Holdout

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Dua gambar tangkapan layar aplikasi: [`plateguard_interactive_analytics.png`](file:///C:/Users/Cupiz/.gemini/antigravity/brain/d25a6a89-d204-4008-8c1d-57314ba330d8/plateguard_interactive_analytics.png) dan [`plateguard_interactive_audit.png`](file:///C:/Users/Cupiz/.gemini/antigravity/brain/d25a6a89-d204-4008-8c1d-57314ba330d8/plateguard_interactive_audit.png) tersusun berdampingan.
- **Elemen Teks di Layar:**
  - Judul: **Demo Aplikasi: Analisis Interaktif Tanpa Gambar Mati**
  - **Tab Analitik:** Hover batang zona wilayah/pemicu, **Scatter 240 titik nyata** dengan garis batas `60°C` yang bisa diklik *"Uji Titik Ini di Simulator"*, grafik suhu/histogram, peta korelasi interaktif, daftar **38 provinsi**, serta sakelar **10 gambar asli EDA**.
  - **Tab Audit Model:** Hover komparasi 7 model, matriks CV 5-Fold, **Global TreeSHAP interaktif** berbahasa Indonesia, **Scatter Prediksi vs Kenyataan**, penjelajah **2.600 sampel uji**, plus tab **Batch CSV** untuk mengecek hingga 100 jadwal sekolah serentak.

### Narasi Presenter
"Grafik EDA dan evaluasi model tidak kami biarkan sekadar gambar mati. Di tab Analitik, audiens dapat mengarahkan kursor pada sebaran titik nyata, zona suhu dingin, maupun peringkat 38 provinsi, lalu mengeklik satu titik untuk langsung mengujinya di Simulator. Sementara itu di tab Audit, pengguna dapat menginspeksi ketujuh model, melihat scatter tebakan versus kenyataan, hingga mengunggah berkas CSV berisi 100 jadwal kirim di tab Batch."

---

## Slide 22 — Rekomendasi Kebijakan BGN, Keterbatasan Jujur, dan Kesimpulan

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tiga kolom seimbang dengan ikon ringkas: **Aksi Kebijakan BGN**, **Keterbatasan Terukur**, dan **Kesimpulan Utama**.
- **Elemen Teks di Layar:**
  - Judul: **Dari Bukti Data ke Kebijakan Lapangan dan Langkah Lanjutan**
  - **Rekomendasi BGN:**
    1. Penyelarasan jam kantin sekolah (jeda jajan 2 jam sebelum jam makan MBG menyasar pemicu terbesar `63,43%`).
    2. Wajib boks penghangat standar `>= 60 °C` untuk rute `> 30 menit` dengan alokasi khusus wilayah 3T dan Kalimantan Utara/Papua.
  - **Keterbatasan Jujur:** Dataset snapshot tanpa *timestamp* historis dapur; nilai gizi berupa estimasi rencana; uji bangun citra Docker lokal belum dijalankan karena ketiadaan Docker Engine di mesin pengembang (konfigurasi siap build untuk Hugging Face Spaces).
  - **Kesimpulan:** PlateGuard MBG v2 membuktikan sistem prediktif **LightGBM Optuna** bebas kebocoran data (`MAE 3,658 pp` Pra; `2,929 pp` / `R² 0,551` Post-Hoc) terintegrasi penuh dengan TreeSHAP, penjelas Bahasa Awam, serta UI web interaktif siap pakai.

### Narasi Presenter
"Sebagai penutup, ada dua kebijakan berdampak besar bagi Badan Gizi Nasional berdasarkan temuan data: pertama, sinkronisasi pembatasan jajanan di sekolah menjelang jam makan siang MBG; kedua, standardisasi kotak pemanas di atas 60 derajat terutama pada rute terpencil wilayah 3T. Secara jujur kami catat bahwa proyek ini memiliki ruang pengembangan ke depan seperti penambahan stempel waktu musiman, sensor suhu IoT, dan penyebaran publik langsung ke Hugging Face Spaces. Terima kasih atas perhatian Bapak Dosen beserta rekan-rekan; selanjutnya sesi tanya jawab kini dibuka."
