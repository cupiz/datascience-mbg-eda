# Naskah dan Keterangan Isi Slide Presentasi: PlateGuard MBG v2 (32 Slide)

Panduan resmi materi presentasi akademik dan demonstrasi aplikasi **PlateGuard MBG v2** (total **32 slide**, estimasi durasi **15–20 menit**). Setiap slide memuat keterangan tata letak visual, butir teks layar, tautan aset grafik/tangkapan layar terverifikasi, serta naskah narasi presenter berbahasa Indonesia baku dan lugas.

---

## Slide 1 — COVER

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Halaman sampul formal berlatar kaca terang cerah (*Spatial Frosted Glass* khas palet PlateGuard `#c3d7e5` dan `#0f5257`), dilengkapi logo **Universitas Amikom Purwokerto** di bagian atas tengah serta garis aksen teal tipis di sisi bawah.
- **Elemen Teks di Layar:**
  - Header Institusi: **UNIVERSITAS AMIKOM PURWOKERTO · FAKULTAS ILMU KOMPUTER · PROGRAM STUDI MAGISTER ILMU KOMPUTER**
  - Konteks Mata Kuliah: **PROYEK AKHIR SAINS DATA (`PSIKS2W002`)**
  - Judul Utama: **PLATEGUARD MBG: PREDIKSI SISA MAKANAN DISTRIBUSI PROGRAM MAKAN BERGIZI GRATIS BERBASIS *GRADIENT BOOSTING REGRESSION* UNTUK EFISIENSI ANGGARAN BGN**
  - Subjudul: *Integrasi Audit Kebocoran Data, Transformasi ReflectionLog, TreeSHAP, dan Antarmuka Web Interaktif Penjelas Bahasa Awam*
  - Identitas Penyusun: **Iqbal Ahdagita Elbadra** (`NIM. 26MA41D022`)
  - Dosen Pengampu: **Giat Karyono, M.Kom., Ph.D.**
  - Kaki Halaman: **Purwokerto · 2026**

### Narasi Presenter
"Selamat pagi atau siang kepada Bapak Dosen Pengampu beserta rekan-rekan sekalian. Pada kesempatan ini kami mempresentasikan proyek akhir mata kuliah Sains Data berjudul **PlateGuard MBG**, yaitu sistem prediksi sisa makanan pada distribusi Program Makan Bergizi Gratis berbasis *Gradient Boosting Regression* untuk mendukung efisiensi anggaran Badan Gizi Nasional."

---

## Slide 2 — Agenda dan Alur Pembahasan

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Garis alur bernomor **1 sampai 5** tersusun horizontal berbentuk kapsul kaca (*Spatial Glass*) beserta estimasi waktu tiap segmen.
- **Elemen Teks di Layar:**
  - Judul: **Peta Jalan Presentasi (32 Slide)**
  - **1. Masalah dan Charter (Slide 3–6):** Skala MBG, pembengkakan biaya efektif, serta target regresi.
  - **2. Data dan Temuan EDA (Slide 7–15):** Profil `13.000` baris, *guardrail anti-leakage*, risiko wilayah 3T dan suhu `<60°C`, serta retensi pencilan.
  - **3. Rekayasa Fitur dan Pemodelan (Slide 16–21):** *ReflectionLog*, `TargetEncoder` 38 provinsi, CV 5-Fold, Optuna, dan benchmark 7 model.
  - **4. Keterjelaskan dan Bahasa Awam (Slide 22–24):** *TreeSHAP* global dan lokal serta modul `humanizer-id`.
  - **5. Demo Web v2 dan Kebijakan (Slide 25–32):** Arsitektur Next.js + FastAPI, demo fitur interaktif, serta rekomendasi untuk BGN.

### Narasi Presenter
"Presentasi dibagi menjadi lima alur utama: mulai dari konteks pemborosan anggaran pada Program MBG, temuan kritis selama eksplorasi data termasuk pembuktian kebocoran data, metode pemodelan tanpa bocoran lintas lipatan, keterjelaskan *TreeSHAP* bersama terjemahan bahasa awam, hingga demonstrasi aplikasi web PlateGuard MBG v2 dan rekomendasi kebijakan."

---

## Slide 3 — Konteks Kebijakan dan Skala Operasional MBG 2026

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Peta ringkas sebaran nasional 38 provinsi di kiri dan tiga kartu skala operasi di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Intervensi Nutrisi Berskala Nasional Melalui Dapur SPPG**
  - **38 Provinsi:** Cakupan telemetri pengantaran makanan bergizi gratis dari Aceh hingga Papua.
  - **Ribuan Dapur SPPG:** Satuan Pelayanan Pemenuhan Gizi terdesentralisasi dengan kapasitas harian `500` sampai `3.600` porsi.
  - **Rp308,8 Miliar:** Total nilai biaya harian teramati pada `13.000` catatan distribusi nasional (`rata-rata biaya porsi Rp13.526`).

### Narasi Presenter
"Program Makan Bergizi Gratis di bawah Badan Gizi Nasional menyalurkan jutaan porsi harian melalui dapur SPPG yang tersebar di 38 provinsi. Pada skala pembiayaan sebesar itu, keberhasilan program bukan hanya diukur dari jumlah kotak makan yang terkirim dari dapur, melainkan seberapa banyak makanan yang benar-benar masuk menjadi asupan gizi penerima."

---

## Slide 4 — Persoalan Bisnis: Sisa Makanan Menggerus Efisiensi Anggaran

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Perbandingan dua batang biaya vertikal yang kontras (**Pagu Produksi Rp13.526** melawan **Biaya Efektif Nyata Rp15.677**) beserta kartu penghematan.
- **Elemen Teks di Layar:**
  - Judul: **Dampak Finansial Nyata dari Sisa Piring (*Plate Waste*)**
  - **Rata-rata Sisa Piring `13,34%`:** Sebanyak `1,0%` sampai `37,7%` porsi makanan tidak habis disantap siswa.
  - **Pembengkakan Biaya `+15,9%`:** Biaya efektif per porsi yang habis termakan melonjak dari **`Rp13.526`** menjadi **`Rp15.677`** (pemborosan **`Rp2.151/porsi`**).
  - **Nilai 1 Poin Persentase:** Setiap penurunan **1 pp** sisa makanan menghemat sekitar **`Rp135`** biaya efektif pada tiap porsi.

### Narasi Presenter
"Data operasional mengungkap rata-rata sisa makanan di piring mencapai **13,34%**, dengan kasus paling ekstrem hingga **37,7%**. Apabila makanan tersisa, anggaran yang dikeluarkan per kalori yang benar-benar dimakan ikut melambung. Biaya produksi rata-rata **Rp13.526** per porsi membengkak menjadi **Rp15.677**, atau terbuang sekitar **Rp2.151** setiap kotak makan. Setiap satu poin persentase sisa yang berhasil ditekan berpotensi menghemat sekitar **Rp135** per porsi."

---

## Slide 5 — Celah Waktu Keputusan (*Reaktif vs Preventif*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Diagram perbandingan dua alur panah horizontal: baris atas alur lama berwarna merah bata, baris bawah alur **PlateGuard MBG** berwarna teal.
- **Elemen Teks di Layar:**
  - Judul: **Menggeser Tata Kelola dari Reaktif Pascamakan ke Preventif Pradistribusi**
  - **Kondisi Lama (Reaktif):** Masak di SPPG → Kirim Armada → Siswa Makan → *Sisa Piring Baru Tercatat* → Tidak sempat mencegah pemborosan hari itu.
  - **Solusi PlateGuard (Preventif):** Input Rencana Kirim → **Prediksi Risiko dan Penyebab (< 100 ms)** → Koreksi Porsi / Wadah Termal / Jadwal → Pengiriman Lebih Tepat Sasaran.

### Narasi Presenter
"Kelemahan tata kelola selama ini terletak pada urutan waktu pengambilan keputusan. Dapur baru mengetahui tingkat sisa makanan sesudah jam istirahat makan berakhir, yakni saat makanan sudah terlanjur dibuang. PlateGuard MBG membalik urutan tersebut agar pengelola dapur mampu mengukur risiko pemborosan *sebelum* armada berangkat dari dapur."

---

## Slide 6 — Rumusan Masalah, Tipe Tugas Regresi, dan Target Project Charter

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Dua kotak terstruktur berdampingan: sisi kiri memuat sasaran bisnis; sisi kanan menampilkan ambang metrik evaluasi teknis Project Charter.
- **Elemen Teks di Layar:**
  - Judul: **Rumusan Masalah dan Sasaran Keberhasilan Terukur**
  - **Tujuan Bisnis:** Menekan rata-rata sisa piring nasional dari `13,34%` menjadi **`< 10%`** dalam 6 bulan melalui intervensi menu, ukuran porsi, dan kemasan sebelum kirim.
  - **Tipe Masalah:** **Regresi kontinu** atas `plate_waste_percentage` (`mean 13,34%`, `std 5,58`), **bukan** klasifikasi tier kepatuhan.
  - **Baseline Pembanding:** Mengalahkan tebakan rata-rata statis *MeanPredictor* (`MAE 4,443 pp`).
  - **Target Charter (CV 5-Fold Bebas Bocoran):** `MAE <= 3,0 pp`, `RMSE <= 4,5 pp`, dan `R² >= 0,35`, serta melampaui Ridge dan bersaing dengan Random Forest.

### Narasi Presenter
"Sesuai dokumen Project Charter, proyek ini ditetapkan sebagai pemodelan **regresi kontinu** terhadap persentase sisa piring. Kolom tier kepatuhan empat kelas tetap dicatat hanya sebagai konteks analisis mutu program. Secara teknis, model wajib mengalahkan *mean-predictor* ber-MAE `4,443` poin persentase dengan target sasaran `MAE <= 3,0`, `RMSE <= 4,5`, dan `R² >= 0,35` secara jujur."

---

## Slide 7 — Metodologi TDSP dan Profil Dataset Telemetri MBG 2026

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Bagan siklus *Team Data Science Process* (TDSP) pada setengah atas dan tabel ringkas struktur 26 kolom dataset di setengah bawah.
- **Elemen Teks di Layar:**
  - Judul: **Alur Kerja TDSP dan Anatomi Dataset Nasional**
  - **Sumber Data:** Dataset publik Kaggle *Indonesia Free Nutritious Meal MBG 2026* versi 4 (`luthfimuthathohirin`).
  - **Dimensi Berkas:** **`13.000` baris × `26` kolom** (`18,3 MB`), diunduh terprogram lewat `download_data.py`.
  - **Rincian Atribut:** `17` kolom numerik, `7` kolom kategori (*provinsi, klaster, penerima, lauk protein, kendaraan, pemicu, tier*), `1` pengenal unik, serta `1` kolom teks narasi dokumentasi (*CoT*).
  - **Kepatuhan UU PDP No. 27/2022:** Seluruh entitas memakai pengenal hash anonim `ID_MBG_*` tanpa data pribadi siswa.

### Narasi Presenter
"Pengerjaan proyek mengikuti tahapan standar TDSP dari Microsoft dengan satu penyusun merangkap peran Data Scientist, Data Engineer, dan MLOps. Kami memakai dataset telemetri nasional 2026 berisi **13.000 baris dan 26 kolom**. Kolom teks dokumentasi berantai tidak dimasukkan sebagai prediktor, dan seluruh identitas siswa terlindungi karena data hanya memuat kode pengiriman anonim."

---

## Slide 8 — Pemeriksaan Kualitas Data: 0 Nilai Kosong dan Catatan Kurasi

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Sisi kiri menampilkan gambar penuh [`figures/fig01_missing.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig01_missing.png); sisi kanan merangkum hasil audit kelengkapan beserta catatan kehati-hatian produksi.
- **Elemen Teks di Layar:**
  - Judul: **Kelengkapan 100%: Properti Kurasi vs Kesiapan Produksi**
  - **Pemeriksaan Kuantitatif:** `0` nilai hilang (*null*) di ke-26 kolom, `0` baris duplikat penuh, dan `100%` `distribution_id` unik.
  - **Konsistensi Domain:** Penulisan 38 nama provinsi serta seluruh kelas kategori seragam tanpa nilai negatif atau di luar rentang (`suhu 30–72°C`).
  - **Transparansi Ilmiah:** Kelengkapan sempurna tersebut merupakan efek kurasi penyedia dataset (`Cohen's Kappa 0,9203` dan *denoising Cleanlab*) sehingga pipeline produksi tetap menyiapkan strategi imputasi median/modus dan KNN/MICE pada masa depan.

### Narasi Presenter
"Sebagaimana tampak pada Gambar 4.1 di kiri, seluruh 26 kolom tercatat nol nilai hilang dan nol duplikat. Meskipun demikian, kami menegaskan sikap kritis dalam laporan EDA: nol *missing value* ini berasal dari proses kurasi penyedia data. Oleh sebab itu, arsitektur pipeline tetap menyiapkan mekanisme imputasi apabila sistem menerima formulir tidak lengkap di lapangan nyata."

---

## Slide 9 — Audit Guardrail Kebocoran Data (*DROP_LEAK*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Dua kartu bukti kebocoran beraksen merah bata di atas dan satu kartu hasil pemblokiran (`R²` turun dari `0,682` palsu menjadi valid) di bawah.
- **Elemen Teks di Layar:**
  - Judul: **Membuktikan dan Memblokir Dua Sumber Kebocoran Target**
  - **1) `waste_adjusted_effective_cost_idr` (Kebocoran Aljabar):** Kolom ini persis mengikuti persamaan `total_meal_cost_idr / (1 - plate_waste_percentage / 100)`. Pengujian pada `13.000` baris mencatat selisih absolut maksimum hanya **`Rp0,50`**.
  - **2) `bgn_program_compliance_tier` (Kebocoran Aturan Label):** Dibentuk langsung memakai ambang sisa piring `20%` dan `30%`. Uji Random Forest menebak tier berakurasi **`99,7%`**, dan memasukkannya ke regresi HGB menaikkan `R²` palsu ke **`0,682`** (`MAE 2,363 pp`).
  - **Aturan Keras `etl_pipeline.py`:** Kedua kolom bocor bersama `confidence_score`, narasi CoT, dan `distribution_id` wajib diblokir sebelum pemisahan data uji.

### Narasi Presenter
"Temuan kebocoran data menjadi pilar integritas terpenting proyek ini. Pertama, kolom biaya efektif ternyata turunan aljabar langsung dari target sisa piring dengan selisih maksimal di seluruh 13.000 baris hanya Rp0,50 akibat pembulatan. Kedua, kolom tier kepatuhan BGN disusun memakai batas sisa 20–30% yang mendongkrak `R²` semu ke `0,682`. Pipeline kami menolak skor palsu tersebut dengan memblokir kedua fitur lewat aturan `DROP_LEAK`."

---

## Slide 10 — Profil Kategori Program dan Ketimpangan Kelas Kepatuhan

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Grafik penuh [`figures/fig03_bar_kategorikal.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig03_bar_kategorikal.png) di tengah dengan 4 poin sorotan proporsi di bagian bawah.
- **Elemen Teks di Layar:**
  - Judul: **Komposisi Sasaran, Lauk Protein, Moda Kirim, dan Mutu**
  - **Konteks Kepatuhan (4 Kelas):** `64,75%` *Standard-Compliant*, `11,26%` *Exemplary*, `18,02%` *Marginal-At-Risk*, dan `5,98%` *Non-Compliant* (**`24,0%` total distribusi bermasalah**).
  - **Sasaran Terbesar:** Siswa SD/MI sebanyak `5.428` distribusi (`41,8%`), dengan rataan sisa tertinggi dibandingkan jenjang santri atau SMA.
  - **Lauk dan Armada Utama:** Daging Ayam Broiler (`35,6%`) mendominasi protein; Motor Listrik/Roda Tiga Box (`4.527` perjalanan) mendominasi armada.

### Narasi Presenter
"Sebelum masuk ke pemodelan, grafik enam panel ini merangkum komposisi seluruh atribut kategori pada 13.000 pengiriman. Hampir seperempat atau **24,0%** distribusi masuk kategori bermasalah mutu. Kelompok penerima terbesar ialah siswa SD sebesar 41,8% porsi nasional, sementara protein terbanyak berupa daging ayam broiler dan pengantaran paling lazim memakai motor box."

---

## Slide 11 — Temuan EDA 1: Jurang Ketimpangan Geografis Wilayah 3T

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Grafik [`figures/fig09_bermasalah_cluster.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig09_bermasalah_cluster.png) di kiri; tabel peringkat 8 provinsi teratas dan pembanding terendah di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Wilayah 3T Bermasalah 3,4 Kali Lebih Tinggi Dibanding Jawa Metro**
  - **Risiko per Klaster Geografis:**
    - Wilayah 3T Perbatasan dan Pedalaman: **`47,52%`** bermasalah
    - Daerah Pedesaan dan Kepulauan: **`30,60%`**
    - Luar Jawa Urban: **`15,05%`**
    - Jawa Metropolitan: **`13,82%`**
  - **Provinsi Prioritas Tertinggi:** Kalimantan Utara (**51,3%**), Papua Selatan (**46,8%**), Papua Pegunungan (**44,8%**), Papua Tengah (**44,0%**), dan NTT (**42,8%**).
  - **Pembanding Paling Terkendali:** Banten (**16,3%**) dan Maluku Utara (**18,9%**).

### Narasi Presenter
"Kesenjangan infrastruktur antardaerah terlihat tajam pada grafik di sebelah kiri. Di Jawa Metropolitan, tingkat pengiriman bermasalah berada di angka 13,82%. Namun, di wilayah 3T angkanya melompat menjadi **47,52%**, atau hampir tiga setengah kali lipat lebih tinggi. Pada tingkat provinsi, Kalimantan Utara mencapai 51,3% bermasalah dan diikuti empat provinsi di Papua serta Nusa Tenggara Timur di atas 42%."

---

## Slide 12 — Temuan EDA 2: Efek Ambang Aman Suhu Tiba `60 °C`

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Diagram kotak [`figures/fig06_box_per_tier.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig06_box_per_tier.png) di kiri dan kartu kontras rasio risiko `5,1x` pada batas HACCP `60 °C` di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Batas Kritis HACCP `60 °C`: Risiko Melonjak 5,1 Kali Saat Dingin**
  - **Pemisahan Ekstrem pada Suhu `60 °C`:**
    - Suhu tiba **`< 60 °C`** (`22,42%` dari total kiriman): **`63,7%`** berujung bermasalah.
    - Suhu tiba **`>= 60 °C`**: hanya **`12,5%`** bermasalah (**selisih 5,1 kali lipat**).
  - **Profil Tiap Tier (`fig06`):** Dari *Exemplary* ke *Non-Compliant*, rata-rata suhu tiba anjlok dari **`66,6 °C`** menjadi **`38,1 °C`**, sementara indeks pembusukan melonjak dari **`1,61`** ke **`9,33`** dan waktu jalan naik dari `18,4` ke `78,2` menit.

### Narasi Presenter
"Jika ditanya satu indikator lapangan paling tajam penentu kualitas distribusi, jawabannya ialah suhu makanan saat tiba di sekolah. Menurut standar keamanan pangan HACCP, makanan hangat siap santap harus terjaga minimal 60 derajat Celsius. Data membuktikan kiriman yang tiba dingin di bawah 60 derajat mencatat tingkat bermasalah **63,7%**, lebih dari lima kali lipat dibandingkan makanan hangat sebesar **12,5%**. Pada diagram kotak, pemisahan kelas menurut suhu dan indeks pembusukan tampak sangat tegas."

---

## Slide 13 — Temuan EDA 3: Pemicu Lapangan (*Driver*) dan Perilaku Siswa

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Grafik penuh [`figures/fig10_driver_tier.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig10_driver_tier.png) di kiri dan rincian pangsa lima pemicu sisa makanan di kanan.
- **Elemen Teks di Layar:**
  - Judul: **63,43% Masalah Lapangan Terjadi Karena Jajanan Sebelum Jam Makan**
  - **Asosiasi Pemicu terhadap Tier Mutu:** *Cramér's V* = **`0,545`** (hubungan kategorikal kuat).
  - **Lima Pemicu Lapangan:**
    1. `Prior-Snack-Consumption` (jajan sebelum makan): **`63,43%`** (`8.246` kasus)
    2. `Excessive-Portion-Size` (porsi berlebih): **`22,40%`**
    3. `Sub-Optimal-Arrival-Temperature` (suhu dingin): **`8,58%`** — tetapi **`69,3%`** kasus *Non-Compliant* berat berasal dari kelompok ini (`100%` bermasalah)
    4. `Delivery-Transit-Delay`: **`4,04%`** | 5. `Low-Palatability-Menu`: **`1,55%`**

### Narasi Presenter
"Diagram ini mengungkap sisi perilaku penerima yang jarang terukur secara logistik murni. Ternyata pemicu paling sering muncul ialah siswa sudah kenyang jajan sebelum makan sebesar **63,43%**, disusul takaran porsi terlalu besar sebesar **22,40%**. Meskipun masalah suhu tiba yang dingin hanya terjadi pada 8,58% catatan, seluruh kasus pada kategori suhu dingin itu berujung bermasalah dan menyumbang 69,3% kegagalan mutu terparah."

---

## Slide 14 — Eksplorasi Distribusi Numerik (*Skewness* dan *Kurtosis*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Grafik 9 histogram [`figures/fig02_hist_kde.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig02_hist_kde.png) mengisi area utama; tabel nilai kecondongan lima fitur `|skew| > 1` di sisi kanan.
- **Elemen Teks di Layar:**
  - Judul: **Asimetri Distribusi Operasional: Ekor Panjang Logistik vs Suhu Tiba**
  - **Condong Kanan Kuat (`|skew| > 1`):** `transit_time_minutes` (`+2,156`), `spoilage_risk_index` (`+2,046`), `delivery_distance_km` (`+1,752`), dan `transit_cooling_rate` (`+1,327`) akibat rute panjang di luar Jawa.
  - **Condong Kiri Ekstrem:** `food_arrival_temperature_celsius` (`-2,129`, kurtosis `+4,99`) karena mayoritas makanan mengumpul di zona hangat `60–72°C`.
  - **Implikasi Statistik:** Uji normalitas tidak terpenuhi pada fitur logistik, memandu pemilihan uji korelasi peringkat Spearman dan model berbasis pohon.

### Narasi Presenter
"Kesembilan histogram KDE ini memperlihatkan bentuk sebaran variabel numerik kami. Tiga atribut logistik miring tajam ke kanan karena sebagian besar rute Jawa berjarak dekat, sedangkan rute 3T membentuk ekor panjang. Sebaliknya, suhu makanan tiba miring tajam ke kiri. Kondisi tidak normal ini menuntut perlakuan transformasi berbeda serta menegaskan perlunya model nonparametrik berbasis pohon keputusan."

---

## Slide 15 — Analisis dan Keputusan Retensi Pencilan (*Outliers*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Gambar [`figures/fig08_outlier_box.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig08_outlier_box.png) di kiri dan panel justifikasi domain (*Mengapa Dipertahankan?*) di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Retensi Pencilan: Rute Terpencil Bukan Kesalahan Input**
  - **Temuan Deteksi IQR (`Q1 - 1,5·IQR` s.d. `Q3 + 1,5·IQR`) dan `|Z| > 3`:**
    - `spoilage_risk_index`: `1.459` titik IQR (`11,22%` data)
    - `transit_time_minutes`: `975` titik IQR (`7,50%`)
    - `food_arrival_temperature_celsius`: `927` titik IQR (`7,13%`)
    - `delivery_distance_km`: `731` titik IQR (`5,62%`)
  - **Keputusan Rekayasa:** **Seluruh pencilan dipertahankan** karena konsisten antarvariabel (jarak 35 km + transit 120 menit + suhu rendah muncul bersamaan di wilayah 3T). Menghapusnya sama dengan membutakan model terhadap kasus paling penting dideteksi.

### Narasi Presenter
"Banyak alur data pemula langsung membuang titik pencilan secara mekanis. Pada dataset ini, pemeriksaan IQR memang menandai lebih dari sebelas persen baris indeks pembusukan sebagai pencilan. Namun, setelah dicek silang antarkolom, titik ekstrem tersebut saling konsisten sebagai pengiriman nyata berdurasi hingga dua jam di daerah perbatasan. Oleh karena itu, seluruh pencilan dipertahankan utuh supaya model tetap peka mendeteksi risiko tinggi di wilayah 3T."

---

## Slide 16 — Penanganan Kecondongan via Modul *ReflectionLog*

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Gambar perbandingan [`figures/fig04_log_transform.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig04_log_transform.png) di bagian atas/kiri disertai tabel perbandingan angka kecondongan sebelum, sesudah `log1p`, dan sesudah *ReflectionLog*.
- **Elemen Teks di Layar:**
  - Judul: **Solusi *ReflectionLog* Saat `log1p` Gagal Memperbaiki Suhu**
  - **Efek `log1p` pada Fitur Condong Kanan:** Jarak membaik (`1,752 → 0,211`), waktu transit membaik (`2,156 → 0,380`), indeks pembusukan membaik (`2,046 → 1,104`).
  - **Kegagalan `log1p` pada Suhu Tiba:** Karena condong kiri (`-2,129`), `log1p` memperparah kecondongan menjadi **`-2,771`**.
  - **Transformator Kustom `ReflectionLog` (`etl_pipeline.py`):** Menerapkan $\ln(\max_{\text{train}}(X_{\text{suhu}}) + 1 - \min(x, \max_{\text{train}}(X_{\text{suhu}})))$ memakai $\max_{\text{train}} = 72,0^\circ\text{C}$, menurunkan kemencengan suhu ke **`-0,087`**.

### Narasi Presenter
"Hasil eksperimen transformasi di Gambar 6.1 memberikan pembelajaran teknis berharga. Penerapan `log1p` menormalkan variabel jarak dan durasi transit, tetapi malah merusak distribusi suhu tiba menjadi minus 2,771 karena ekornya berada di sisi kiri. Melalui transformator `ReflectionLog` yang mempelajari batas maksimum suhu hanya dari himpunan latih, kemencengan suhu berhasil dinormalkan menjadi minus 0,087."

---

## Slide 17 — Penskalaan, Pengkodean Kategori, dan Rekayasa Fitur Domain

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Bagan alur `ColumnTransformer` di sisi kiri yang memetakan 6 cabang transformasi (`num`, `log`, `temp`, `bin`, `cat`, `prov_te`) dan 3 fitur baru di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Arsitektur Prapemrosesan `etl_pipeline.py` (`ColumnTransformer`)**
  - **Penskalaan Numerik:** `StandardScaler` menyeragamkan besaran biaya belasan ribu rupiah dengan satuan derajat suhu; jarak turut dikelompokkan lewat `QuantileBinner` (4 kelas sama besar).
  - **Pengkodean Wilayah `38 Provinsi`:** Memakai `TargetEncoder(smooth='auto', cv=5)` murni di dalam lipatan latih agar heterogenitas 38 provinsi tertangkap tanpa 38 kolom dummy tambahan.
  - **3 Fitur Rekayasa (`FeatureBuilder`):** `biaya_per_kkal` (`rataan Rp20,3/kkal`), `kecepatan_km_jam` (`rataan 16,5 km/jam`), serta `interaksi_suhu_transit`.

### Narasi Presenter
"Seluruh transformasi tersebut kami bungkus ke dalam `ColumnTransformer` yang reprodusibel pada `etl_pipeline.py`. Selain penskalaan standar dan pembagian kuartil jarak, `FeatureBuilder` menurunkan fitur domain seperti biaya per kilokalori dan laju kecepatan armada. Khusus atribut 38 provinsi, kami memakai `TargetEncoder` lima lipatan agar model mengenali ciri daerah tanpa membebani dimensi matriks."

---

## Slide 18 — Korelasi Multivariat dan Dasar Pemilihan Model Taklinear

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Duet gambar [`figures/fig05_scatter.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig05_scatter.png) (kiri) dan [`figures/fig07_corr_heatmap.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures/fig07_corr_heatmap.png) (kanan).
- **Elemen Teks di Layar:**
  - Judul: **Hubungan Bivariat, Kolineritas `0,928`, dan Sinyal Terpencar**
  - **Multikolinearitas Kuat:** Jarak dan waktu transit berkorelasi **`r = 0,928`** (`p < 0,001`); sisa makanan mendorong biaya efektif dengan **`r = 0,622`**.
  - **Korelasi Sah Terkuat ke Target:** `estimated_calories_kcal` (**`-0,372`**), `cost_to_nutrition_ratio` (**`+0,280`**), suhu tiba (**`-0,252`**), protein (**`-0,221`**), `spoilage_risk_index` (**`+0,214`**), dan transit (**`+0,198`**).
  - **Kesimpulan Algoritmik:** Tidak ada satu prediktor dominan tunggal dan interaksi antarfitur bersifat taklinear, mengunggulkan *Gradient Boosted Decision Trees*.

### Narasi Presenter
"Diagram pencar dan matriks korelasi ini menegaskan dua hal penting. Pertama, jarak dan waktu transit berkorelasi `0,928`, yang berisiko menggoyahkan bobot model linear apabila tidak ditangani. Kedua, sinyal penentu sisa piring tersebar di berbagai aspek gizi dan logistik mulai dari kalori sebesar minus `0,372` hingga suhu tiba minus `0,252`. Inilah alasan algoritma pohon peningkatan gradien menjadi pilihan paling tepat."

---

## Slide 19 — Desain Eksperimen Tanpa Kebocoran dan Dua Skenario Uji

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Bagan partisi `13.000` baris → `10.400 latih (5-Fold CV)` + `2.600 holdout`, dilengkapi kotak hasil uji ablasi `TargetEncoder` di kanan bawah.
- **Elemen Teks di Layar:**
  - Judul: **Protokol Evaluasi Ketat (`train.py` & `train-kaggle-done.ipynb`)**
  - **Partisi Kuartil Terstratifikasi (80:20):** `10.400` baris latih (`rataan target 13,33%`) dan `2.600` uji holdout tersegel (`rataan target 13,35%`).
  - **Pemisahan Skenario Operasional:** **Mode Pra-Distribusi (`34` fitur)** tanpa `primary_food_waste_driver`, terpisah tegas dari **Mode Post-Hoc (`38` fitur)**.
  - **Uji Ablasi `province TargetEncoder` (XGBoost CV):** Memberi peningkatan konsisten di Post-Hoc (MAE `2,9893 → 2,9840 pp`; R² `0,5297 → 0,5316`) maupun Pra (`3,7115 → 3,7102 pp`).
  - **Pelacakan:** **6 model Charter + Optuna TPE (30 trial × 5 fold)**, tercatat **14 percobaan** pada MLflow.

### Narasi Presenter
"Dalam protokol eksperimen di `train.py`, data dibagi mengikuti kuartil target sehingga rataan sisa piring antara gugus latih dan uji identik di angka 13,3%. Seluruh transformer termasuk `TargetEncoder` 38 provinsi di-*fit* secara ketat di dalam setiap lipatan 5-fold agar nol kebocoran dari data validasi. Kami membandingkan enam algoritma Charter bersama model hasil optimasi Bayesian Optuna 30 trial dan merekam semua percobaannya di MLflow."

---

## Slide 20 — Hasil Benchmark Skenario Pradistribusi (34 Fitur — Sebelum Kirim)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tabel lengkap 7 model skenario **Pra (34 fitur)** dari `models/fase3_metrics.json` di kiri dan penjelasan batas alamiah pradistribusi di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Benchmark Pradistribusi: Pengurangan Galat `-17,7%` Sebelum Truk Jalan**
  - | Model | CV MAE 5F | Holdout MAE | RMSE | R² |
    |---|---|---|---|---|
    | **`LightGBM (Optuna)`** | **`3,604±0,042`** | **`3,658`** | **`4,586`** | **`0,333`** |
    | `RandomForest` | `3,636±0,040` | `3,658` | `4,604` | `0,327` |
    | `HistGradientBoosting` | `3,792±0,036` | `3,660` | `4,592` | `0,331` |
    | `LightGBM` / `XGBoost` / `Ridge` | `3,683–3,710` | `3,706–3,720` | `4,647–4,672` | `0,307–0,315` |
    | `MeanPredictor` (Baseline) | `4,443±0,043` | `4,447` | `5,613` | `-0,000` |
  - **Analisis Jujur:** Memangkas galat `-17,7%` daripada baseline; selisih `R² 0,333` terhadap `0,35` mencerminkan **batas alamiah** karena perilaku jajan siswa (`63,43%` kasus) belum terjadi saat pagi hari sebelum pengiriman.

### Narasi Presenter
"Pada skenario Pradistribusi yang hanya memakai 34 fitur awal sebelum armada berangkat, **LightGBM Optuna** unggul secara konsisten di validasi silang 5-fold (`CV MAE 3,604`) dan meraih Holdout `MAE 3,658 pp`, `RMSE 4,586 pp`, serta `R² 0,333`—mengungguli `RandomForest` di RMSE dan R², sekaligus menekan kesalahan 17,7% dari baseline. Selisih tipis menuju R² 0,35 terjadi secara alami karena faktor perilaku jajan anak di sekolah baru muncul setelah makan berlangsung."

---

## Slide 21 — Hasil Benchmark Audit Post-Hoc (38 Fitur) dan Kestabilan 5-Fold

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tabel 7 model skenario **Post-Hoc (38 fitur)** di kiri dan matriks kestabilan **Fold 1–5** + verifikasi lencana lulus semua target di kanan.
- **Elemen Teks di Layar:**
  - Judul: **Audit Post-Hoc: `LightGBM (Optuna)` Melampaui Seluruh Target Charter**
  - | Model | CV MAE 5F | Holdout MAE | RMSE | R² |
    |---|---|---|---|---|
    | **`LightGBM (Optuna)`** | **`2,905±0,046`** | **`2,929`** | **`3,761`** | **`0,551`** |
    | `HistGradientBoosting` | `3,046±0,026` | `2,940` | `3,773` | `0,548` |
    | `RandomForest` | `2,943±0,038` | `2,962` | `3,797` | `0,542` |
    | `LightGBM` / `XGBoost` | `2,964–2,984` | `2,977–2,979` | `3,806–3,819` | `0,537–0,540` |
    | `Ridge` (Linear Pembanding) | `2,997±0,033` | `3,018` | `3,892` | `0,519` |
  - **Capaian Charter:** **`MAE 2,929 <= 3,0`** (`-34,1%` vs baseline), **`RMSE 3,761 <= 4,5`**, **`R² 0,551 >= 0,35`**. Kinerja 5 lipatan CV sangat stabil di rentang **`2,848–2,959 pp`**.

### Narasi Presenter
"Ketika faktor pengamatan pascamakan disertakan pada skenario Audit Post-Hoc dengan 38 fitur, seluruh target teknis Project Charter terlampaui dengan meyakinkan. **LightGBM Optuna** mencatat Holdout **`MAE 2,929`**, **`RMSE 3,761`**, dan **`R² 0,551`**, atau 34,1% lebih akurat daripada baseline. Kami mencatat pula temuan teknis unik pada HistGradientBoosting bahwa parameter bawaan `early_stopping='auto'` hanya aktif pada gugus latih penuh 10.400 baris, bukan lipatan CV 8.320 baris."

---

## Slide 22 — Interpretabilitas *TreeSHAP*: Skenario Pradistribusi

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri memuat [`figures_fase3/shap_beeswarm_pra.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures_fase3/shap_beeswarm_pra.png); kanan memuat [`figures_fase3/shap_bar_pra.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures_fase3/shap_bar_pra.png).
- **Elemen Teks di Layar:**
  - Judul: **TreeSHAP Pradistribusi: Apa yang Mendorong Sisa Sebelum Kirim?**
  - **Pendorong Terbesar:** Jenjang penerima (SD cenderung menyisakan lebih banyak dibandingkan santri/SMA), efisiensi `biaya_per_kkal`, dan **suhu tiba dingin (`< 60 °C`)**.
  - **Faktor Gizi Penahan Sisa:** Porsi dengan kecukupan kalori seimbang (`~680–760 kkal`) bergeser ke nilai SHAP negatif (lebih habis dimakan).
  - **Nilai Kalibrasi Provinsi:** `TargetEncoder` provinsi menangkap keragaman lokal di seluruh 38 provinsi selain efek zona 3T.

### Narasi Presenter
"Untuk membuka kotak hitam model sebelum pengantaran berangkat, grafik *TreeSHAP* menunjukkan peran besar jenjang usia penerima, rasio biaya terhadap energi, kecukupan kalori menu, serta penurunan suhu makanan tiba. Titik merah pada suhu rendah bergeser tajam ke sisi kanan sumbu SHAP, memberi sinyal dini bagi dapur untuk memperbaiki kemasan kotak hangat sebelum makanan dikirim."

---

## Slide 23 — Interpretabilitas *TreeSHAP*: Skenario Audit Post-Hoc

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri memuat [`figures_fase3/shap_beeswarm_posthoc.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures_fase3/shap_beeswarm_posthoc.png); kanan memuat [`figures_fase3/shap_bar_posthoc.png`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/figures_fase3/shap_bar_posthoc.png).
- **Elemen Teks di Layar:**
  - Judul: **TreeSHAP Post-Hoc: Memisahkan Tanggung Jawab Dapur dan Sekolah**
  - **Dominasi Mutlak Faktor Perilaku:** Kehadiran `Prior-Snack-Consumption` mendorong kontribusi SHAP positif terlebar dibanding variabel lain, menjelaskan lonjakan `R²` dari `0,333` ke `0,551`.
  - **Disusul Porsi dan Rantai Dingin:** `Excessive-Portion-Size` dan `Sub-Optimal-Arrival-Temperature` memberi dorongan kuat pada kasus boros di piring.
  - **Keuntungan Auditor:** BGN bisa membedakan distribusi boros karena makanan dingin (tanggung jawab logistik SPPG) vs anak kenyang jajan (koordinasi kantin sekolah).

### Narasi Presenter
"Pada skenario Post-Hoc di slide ini, begitu catatan pemicu sekolah ikut dievaluasi, pengaruh kebiasaan siswa jajan mendominasi posisi teratas dalam memengaruhi persentase sisa piring. Temuan SHAP ini bernilai strategis bagi auditor BGN karena dapat membedakan apakah sisa makanan berasal dari suhu makanan yang dingin di perjalanan atau kebijakan jam buka kantin di sekolah."

---

## Slide 24 — Modul *Humanizer AI* (`humanizer-id`): Menerjemahkan ML ke Bahasa Awam

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kiri menunjukkan potongan JSON mentah (`SHAP +2,07 pp`, `base 13,33%`); kanan menunjukkan tampilan kartu **Ringkasan Bahasa Sederhana (Mudah Dipahami Awam)** di PlateGuard v2.
- **Elemen Teks di Layar:**
  - Judul: **Humanizer Bahasa Awam: Data Sains yang Bisa Dibaca Kepala Dapur**
  - **Implementasi [`humanizer_explainer.py`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/humanizer_explainer.py):** Menerjemahkan output LightGBM dan `TreeSHAP` ke kalimat Bahasa Indonesia sehari-hari berpedoman **kaidah `apissaj/humanizer-id`** (verba aktif, bebas klise, seluruh angka presisi terjaga).
  - **Contoh Keluaran Langsung:** *"Untuk pengantaran Rp13.500 per porsi ke Jawa Tengah (Siswa SD), sekitar 15,36% makanan diperkirakan tidak termakan. Artinya, sekitar Rp2.074 terbuang pada setiap kotak makan (Rp3,69 juta per hari)."*
  - **Sakelar Ganda UI (`Awam | Teknis`):** Satu klik di bilah atas aplikasi bagi masyarakat umum maupun penelaah akademis.

### Narasi Presenter
"Tantangan utama penerapan sains data di sektor publik ialah jembatan bahasa. Kepala dapur SPPG tidak terbiasa membaca `MAE`, `cost_to_nutrition_ratio`, maupun nilai Shapley. Karena itu kami membangun modul `humanizer_explainer.py` berdasarkan prinsip editorial `humanizer-id` untuk menerjemahkan setiap hasil prediksi dan faktor SHAP menjadi kalimat aktif sehari-hari beserta taksiran rupiah yang terbuang. Bagi keperluan audit akademik, pengguna tinggal menekan sakelar `Teknis` di bilah atas."

---

## Slide 25 — Arsitektur Full-Stack PlateGuard MBG v2 (Desain *Spatial Frosted Glass*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Diagram blok 3 lapis (*Next.js 16 Frontend* → *FastAPI Single Origin Engine* → *Model `.joblib` + `Docker Port 7860`*) di tengah layar.
- **Elemen Teks di Layar:**
  - Judul: **Arsitektur v2 Terpadu: Next.js 16 + FastAPI + Docker Port 7860**
  - **Frontend Statis Modern ([`frontend/`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/frontend)):** Next.js 16 + Tailwind v4 berkonsep **Desain 5 *Spatial Frosted Glass*** (bilah kapsul mengambang, dok kaca kiri, pencarian cepat `/`, riwayat tersimpan via `localStorage`).
  - **Peladen API Tunggal ([`api.py`](file:///D:/S2%20Amikom/Data%20Science/Proyek_MBG/api.py)):** Menyajikan 10+ endpoint JSON/CSV (`/predict/*`, `/api/explain/*`, `/api/what-if-curve`, `/api/overview`, `/api/eda-interactive`, `/api/benchmark`, `/api/holdout-samples`) dan aset UI sekaligus.
  - **Kontainerisasi Siap Cloud (`Dockerfile`):** Bangun multi-tahap Node 20 + Python 3.12-slim siap Hugging Face Spaces (`port 7860`), sambil menjaga dasbor Streamlit `app.py` v1 tetap kompatibel.

### Narasi Presenter
"Agar model siap dipakai sebagai perangkat lunak sesungguhnya, kami meningkatkan antarmuka dari dasbor warisan menjadi arsitektur full-stack **PlateGuard MBG v2**. Sisi antarmuka dirancang berkonsep kaca buram cerah berkejelasan tinggi dengan Next.js 16 lalu digabungkan bersama peladen FastAPI pada satu origin. Konfigurasi Docker multi-tahap di repositori turut disiapkan untuk port 7860 milik Hugging Face Spaces."

---

## Slide 26 — Demo Aplikasi 1: Simulator, *Auto-Update*, Kurva *What-If*, dan Patokan A vs B

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tangkapan layar aplikasi nyata [`plateguard_interactive_sim.png`](file:///C:/Users/Cupiz/.gemini/antigravity/brain/d25a6a89-d204-4008-8c1d-57314ba330d8/plateguard_interactive_sim.png) di kanan; 4 anotasi keunggulan interaktif di kiri.
- **Elemen Teks di Layar:**
  - Judul: **Simulasi Real-Time: Dari Slider ke Hitungan Penghematan Bulanan**
  - **Mode `Auto` (*Debounced 260 ms*):** Perubahan suhu, kalori, jarak, atau provinsi otomatis memanggil inferensi FastAPI + TreeSHAP lokal (`~74 ms`).
  - **Kunci Sebagai Patokan (A):** Mengunci rencana lama lalu menguji perbaikan (misalnya menaikkan suhu tiba di atas `60 °C`) dan langsung menghitung selisih rupiah per bulan.
  - **Kurva *What-If* (`/api/what-if-curve`):** Memplot 9 skenario sensitivitas perubahan suhu, kalori, dan durasi perjalanan dalam satu grafik interaktif.

### Narasi Presenter
*(Demonstrasi langsung pada `http://localhost:8000`)*  
"Pada tampilan Simulator di layar, pengguna cukup menggeser parameter dapur atau memilih skenario cepat wilayah 3T. Dengan mode **Auto**, sistem menghitung prediksi bersama **Kurva What-If** 9 titik secara langsung. Pengelola dapur bisa mengunci skenario awal sebagai **Patokan A**, lalu mencoba memperbaiki suhu wadah di atas 60 derajat untuk melihat secara instan penurunan persen sisa maupun uang yang berhasil diselamatkan dalam 22 hari sekolah."

---

## Slide 27 — Demo Aplikasi 2: Explorer EDA Interaktif dan Peta 38 Provinsi

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tangkapan layar [`plateguard_interactive_analytics.png`](file:///C:/Users/Cupiz/.gemini/antigravity/brain/d25a6a89-d204-4008-8c1d-57314ba330d8/plateguard_interactive_analytics.png) mendominasi layar dengan 3 panggilan penjelasan fitur interaktif.
- **Elemen Teks di Layar:**
  - Judul: **Mengubah Grafik EDA Menjadi Eksplorasi Data Hidup**
  - **Kartu Klaster dan Alasan Sisa Interaktif:** Arahkan kursor pada batang wilayah/pemicu untuk membaca suhu tiba, transit rata-rata, dan biaya efektifnya.
  - **Explorer EDA (`/api/eda-interactive`):** Scatter **240 titik nyata** dengan garis batas `60 °C` dan klik-langsung **"Uji Titik Ini di Simulator"**, zona suhu vs histogram target, serta peta korelasi `r` Pearson berbahasa awam.
  - **Tetap Reprodusibel:** Sakelar `[Grafik Interaktif | Gambar Asli EDA (10 PNG)]` menjaga seluruh grafik asli `eda_run.py` tetap dapat diperiksa.
  - **Tabel 38 Provinsi:** Pencarian, pengurutan, serta tombol **`Uji`** satu klik menuju Simulator.

### Narasi Presenter
"Kami tidak membiarkan analitik EDA berakhir sebagai gambar mati. Pada halaman Analitik, setiap grafik klaster dan pemicu dapat di-*hover* guna melihat rincian telemetri. Di bagian tengah, scatter 240 titik nyata memungkinkan pengguna menginspeksi pengiriman dingin bermasalah lalu langsung mengeklik satu tombol untuk membawanya ke Simulator, sekaligus tetap menyediakan gambar PNG asli dari `eda_run.py` di tab pendamping."

---

## Slide 28 — Demo Aplikasi 3 dan 4: Audit Kalibrasi, 2.600 Holdout, dan Batch CSV

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tangkapan layar [`plateguard_interactive_audit.png`](file:///C:/Users/Cupiz/.gemini/antigravity/brain/d25a6a89-d204-4008-8c1d-57314ba330d8/plateguard_interactive_audit.png) di kanan dan ringkasan fitur tab Audit + Batch CSV di kiri.
- **Elemen Teks di Layar:**
  - Judul: **Audit Transparansi Model, 2.600 Uji Nyata, dan Skoring Batch CSV**
  - **Perbandingan 7 Model dan CV 5-Fold:** Hover tiap batang model menampilkan rincian mean/std 5-fold serta RMSE holdout.
  - **Global TreeSHAP Interaktif dan Scatter Kalibrasi:** Membandingkan `240` prediksi melawan kenyataan di sekitar garis diagonal ideal, lengkap plot Matplotlib cadangan.
  - **Browser Holdout `2.600` Baris dan Pipeline `DROP_LEAK`:** Filter multi-atribut, ekspor CSV terfilter, dan muat langsung ke Simulator.
  - **Tab Batch CSV dan Swagger `/docs`:** Mengevaluasi hingga **`100` jadwal kiriman sekaligus** serta contoh integrasi skrip Python internal BGN.

### Narasi Presenter
"Di halaman Audit, penelaah dapat menguji kejujuran sistem secara terbuka: mulai dari perbandingan tujuh model pada lima lipatan CV, grafik pengaruh fitur global berbahasa Indonesia, hingga scatter kalibrasi antara tebakan dan kenyataan. Tersedia juga penjelajah 2.600 sampel uji serta fitur **Batch CSV** yang dapat memproses hingga seratus rencana pengantaran sekolah dalam sekali unggah."

---

## Slide 29 — Rekap Realisasi Target Project Charter (*Charter vs Realisasi*)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Tabel matriks komparasi resmi (sinkron dengan Tabel V pada Laporan Akhir IEEE) disertai tanda status tiap butir.
- **Elemen Teks di Layar:**
  - Judul: **Audit Pencapaian Akhir Terhadap Seluruh Janji Project Charter**
  - | Kriteria Charter | Target Charter | Realisasi Terverifikasi | Status |
    |---|---|---|---|
    | Pembanding Dasar | `MAE < 4,44 pp` | Pra `3,658 pp` / Post `2,929 pp` | **Tercapai (`-17,7%` s.d. `-34,1%`)** |
    | Metrik Post-Hoc | `MAE<=3,0`, `R²>=0,35` | `MAE 2,929` · `RMSE 3,761` · `R² 0,551` | **Tercapai Penuh** |
    | Metrik Pradistribusi | `MAE<=3,0`, `R²>=0,35` | `MAE 3,658` · `RMSE 4,586` · `R² 0,333` | **Batas Alamiah Pradistribusi** |
    | Algoritma dan 5F CV | 6 Model + RF + 5F | 6 Kandidat + per-fold + Optuna | **Tercapai Penuh** |
    | Pelacakan dan Artefak | MLflow + `.pkl/.joblib` | 14 runs MLflow + `.pkl` + `.joblib` | **Tercapai Penuh** |
    | Guardrail dan XAI | 0 leak + SHAP + Web | TE fit-fold + 4 SHAP + Web v2 Awam | **Tercapai Penuh** |

### Narasi Presenter
"Tabel ini merupakan audit jujur pencapaian kami terhadap kontrak awal di Project Charter. Seluruh sasaran rekayasa mulai dari enam pembanding algoritma termasuk Random Forest, pelacakan 14 percobaan MLflow, zero data leakage, hingga web v2 selesai seratus persen. Metrik Post-Hoc melampaui semua ambang (`MAE 2,929 pp`, `R² 0,551`), sedangkan Pra-Distribusi mencatat batas wajar `R² 0,333` tanpa informasi perilaku pascamakan."

---

## Slide 30 — Rekomendasi Kebijakan Operasional untuk Badan Gizi Nasional

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Empat kartu aksi berprioritas dengan angka bukti pendukung dari analisis EDA dan TreeSHAP.
- **Elemen Teks di Layar:**
  - Judul: **Empat Intervensi Nyata Berbasis Temuan Data**
  - **1. Sinkronisasi Jam Kantin Sekolah:** Aturan pembatasan jajanan berat `2 jam` sebelum jam makan MBG untuk meredam pemicu terbesar nasional (**`63,43%`** kasus).
  - **2. Standardisasi Wadah Termal `>= 60 °C`:** Mewajibkan boks berinsulasi hangat pada seluruh pengiriman di atas `30 menit` guna memangkas risiko suhu dingin (**`63,7%`** bermasalah).
  - **3. Asimetri Alokasi Wilayah 3T:** Prioritaskan audit armada dan dapur satelit di **Kalimantan Utara (`51,3%`)** dan provinsi-provinsi Papua (**`42,5%–46,8%`**).
  - **4. Kalibrasi Gramasi per Jenjang:** Penyesuaian porsi karbohidrat khusus siswa SD/MI (`rataan sisa tertinggi`) agar menu padat gizi tanpa berlebih.

### Narasi Presenter
"Dari bukti empiris ini, kami merumuskan empat langkah praktis untuk Badan Gizi Nasional. Pertama, berkoordinasi dengan sekolah membatasi jajanan sebelum jadwal makan MBG. Kedua, mewajibkan kotak penghangat terstandar di rute melebihi tiga puluh menit agar suhu tiba bertahan di atas 60 derajat. Ketiga, memprioritaskan investasi dapur satelit di wilayah 3T Kalimantan Utara dan Papua. Keempat, menyesuaikan ukuran porsi mengikuti jenjang sekolah."

---

## Slide 31 — Keterbatasan Jujur dan Peta Pengembangan Lanjutan

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Dua kolom seimbang: sisi kiri memuat **Keterbatasan Teridentifikasi** saat ini; sisi kanan menampilkan **Peta Pengembangan Fase Berikutnya**.
- **Elemen Teks di Layar:**
  - Judul: **Keterbatasan Saat Ini dan Arah Pengembangan Berikutnya**
  - **Keterbatasan Saat Ini:**
    1. Dataset *snapshot* tanpa dimensi stempel waktu (*timestamp*) dan ID dapur untuk fitur riwayat musiman (*lag features*).
    2. Nilai kalori/protein merupakan estimasi rencana menu, belum hasil uji laboratorium sampel acak.
    3. Pengujian bangun citra Docker secara lokal belum dijalankan karena ketiadaan Docker Engine di mesin pengembang serta belum ditayangkan pada URL awan publik aktif.
  - **Pengembangan Berikutnya:** Integrasi sensor suhu IoT pada boks armada, pencatatan *time-series* harian tiap SPPG, dan publikasi kontainer langsung ke Hugging Face Spaces.

### Narasi Presenter
"Sebagai pertanggungjawaban ilmiah, kami menyampaikan keterbatasan sistem secara terbuka. Pertama, dataset saat ini belum menyertakan penanda waktu pengantaran untuk memodelkan pola musiman maupun riwayat kinerja dapur tertentu. Kedua, meski konfigurasi Dockerfile port 7860 sudah rampung dan aplikasi berjalan mulus secara lokal, uji bangun citra Docker langsung dan publikasi awan Hugging Face Spaces menjadi tahap lanjutan berikutnya bersamaan dengan integrasi sensor suhu IoT."

---

## Slide 32 — Kesimpulan dan Penutup (Tanya Jawab)

### Keterangan Isi dan Tata Letak Slide
- **Tata Letak:** Kartu ringkas kesimpulan utama berlatar kaca beraksen teal, dilengkapi tautan repositori GitHub dan ucapan terima kasih di bagian bawah.
- **Elemen Teks di Layar:**
  - Judul: **Kesimpulan Utama PlateGuard MBG v2**
  - **Mengubah Paradigma:** Dari pencatatan sisa reaktif pascamakan menjadi peringatan risiko preventif **sebelum armada berangkat**.
  - **Akurat dan Bebas Kebocoran:** Guardrail `DROP_LEAK` memblokir R² semu; `LightGBM (Optuna)` meraih **`MAE 3,658 pp`** (Pra) serta **`MAE 2,929 pp` / `R² 0,551`** (Post-Hoc).
  - **Transparan dan Mudah Dipahami Awam:** Dipadukan dengan `TreeSHAP`, penerjemah Bahasa Awam `humanizer-id`, serta aplikasi web interaktif **Next.js 16 + FastAPI** siap pakai.
  - **Repositori dan Artefak:** `https://github.com/cupiz/datascience-mbg-eda` · **Terima Kasih — Sesi Tanya Jawab**

### Narasi Presenter
"Sebagai penutup, PlateGuard MBG membuktikan bahwa pendekatan sains data berbasis *Gradient Boosting*, audit kebocoran yang ketat, serta antarmuka yang mudah dipahami awam mampu memberi solusi konkret untuk menekan pemborosan pangan Program Makan Bergizi Gratis. Seluruh kode, eksperimen terverifikasi, serta aplikasi web v2 sudah tersimpan rapi di repositori GitHub kami. Terima kasih atas perhatian Bapak Dosen beserta rekan-rekan sekalian; sesi diskusi dan tanya jawab kini kami buka."
