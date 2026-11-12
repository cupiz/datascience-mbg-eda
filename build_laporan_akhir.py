# -*- coding: utf-8 -*-
"""Generator Laporan Akhir Proyek Sains Data (Technical Report Format IEEE).

Membangun dokumen Word komprehensif 8+ halaman format makalah ilmiah teknis IEEE
mencakup seluruh perjalanan proyek: Fase 1 (Charter & EDA), Fase 2 (ETL Pipeline),
Fase 3 (XGBoost + Optuna + SHAP), dan Fase 4 (FastAPI + Streamlit + Docker).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docx.shared import Cm, Inches, Pt, RGBColor
from tugas_docx_lib import bullet, code_block, cover, figure, heading, new_doc, p, table

BASE = os.path.dirname(os.path.abspath(__file__))
FIG_EDA = os.path.join(BASE, "figures")
FIG_F3 = os.path.join(BASE, "figures_fase3")

OUT_DIR = r"D:\S2 Amikom\Data Science\Tugas3_Laporan_Akhir_IEEE"
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "PSIKS2W002-26MA41D022-IQBAL AHDAGITA ELBADRA-Laporan-Akhir-IEEE.docx")

doc = new_doc()

# Cover Laporan Akhir
cover(doc, "LAPORAN AKHIR PROYEK SAINS DATA (UAS)",
      "DATA SCIENCE (PSIKS2W002)",
      "PLATEGUARD MBG: PREDIKSI SISA MAKANAN DISTRIBUSI PROGRAM\n"
      "MAKAN BERGIZI GRATIS BERBASIS GRADIENT BOOSTING REGRESSION\n"
      "UNTUK EFISIENSI ANGGARAN BADAN GIZI NASIONAL")

# ================= JUDUL MAKALAH ILMIAH IEEE =================
p(doc, "PlateGuard MBG: Model Prediksi Sisa Makanan Distribusi Program Makan Bergizi Gratis Berbasis Gradient Boosting Regression untuk Efisiensi Fiskal Badan Gizi Nasional",
  bold=True, align="center", size=14, space_after=4)
p(doc, "Machine Learning-Based Predictive Modeling for Plate Waste Mitigation in Indonesia's Free Nutritious Meal Program",
  italic=True, align="center", size=11, space_after=12)

# Identitas Penulis
p(doc, "Iqbal Ahdagita Elbadra\n"
       "NIM: 26MA41D022 • Program Studi Magister Ilmu Komputer\n"
       "Universitas Amikom Purwokerto • Email: iqbal.elbadra@mhs.unsoed.ac.id\n"
       "Dosen Pengampu: Giat Karyono, M.Kom., Ph.D.",
  align="center", size=10, space_after=14)

# ================= ABSTRAK =================
p(doc, "Abstrak", bold=True, size=11, space_after=3)
p(doc, "Program Makan Bergizi Gratis (MBG) di bawah Badan Gizi Nasional (BGN) merupakan intervensi "
       "nutrisi publik terbesar di Asia Tenggara yang menargetkan 82 juta penerima manfaat di 38 provinsi "
       "melalui ribuan Satuan Pelayanan Pemenuhan Gizi (SPPG). Di balik skala masif tersebut, terjadi kebocoran "
       "anggaran akibat sisa makanan di piring penerima (plate waste) yang mencapai rata-rata 13,34% (ekor hingga 37,7%), "
       "mengakibatkan pemborosan biaya efektif sebesar Rp2.151 per porsi (+15,9%) dan disparitas risiko di Wilayah 3T "
       "mencapai 47,52% berbanding 13,82% di Jawa. Tantangan utama saat ini adalah pengukuran sisa makanan yang bersifat "
       "post-hoc (reaktif pasca-konsumsi). Penelitian ini mengembangkan PlateGuard MBG, sistem end-to-end berbasis machine "
       "learning yang membalik paradigma menjadi prediktif pra-distribusi. Melalui audit ketat, penelitian ini membuktikan "
       "dan memblokir dua kebocoran data kritis: fitur biaya efektif yang deterministik aljabar (selisih maks Rp0,50) dan "
       "label tier kepatuhan yang berbasis aturan. Pipeline ETL ColumnTransformer memadukan transformasi logaritmik dan "
       "refleksi suhu tiba yang memangkas skewness dari -2,13 menjadi -0,09. Eksperimen pemodelan menggunakan XGBoost "
       "yang dioptimasi secara Bayesian (Optuna 30 trial) pada 10.400 sampel latih dan dievaluasi pada 2.600 sampel holdout. "
       "Pada skenario pra-distribusi, model mencapai MAE 3,654 pp dan R² 0,333 (mereduksi galat 17,8% dibanding baseline). "
       "Pada skenario post-hoc, seluruh target tercapai penuh dengan MAE 2,921 pp (<= 3,0), RMSE 3,752 pp, dan R² 0,553. "
       "Analisis TreeSHAP mengungkap bahwa kalori seimbang dan suhu tiba >= 60°C adalah penentu utama pencegah sisa makanan, "
       "sementara konsumsi jajan sebelum makan siang mendominasi pemborosan di lapangan. Sistem dideploy menggunakan REST API "
       "FastAPI dengan latensi < 500 ms dan dasbor analitik interaktif Streamlit siap pakai.",
  align="justify", size=10, italic=False, space_after=6)

p(doc, "Kata Kunci: Plate Waste, Makan Bergizi Gratis, Logistik Pangan, XGBoost, Optuna, Explainable AI, TreeSHAP, FastAPI, Streamlit, Kebijakan Publik.",
  bold=True, size=10, space_after=14)

# ================= I. PENDAHULUAN =================
heading(doc, "I. PENDAHULUAN", level=1)
p(doc, "Program Makan Bergizi Gratis (MBG) yang diinisiasi oleh Pemerintah Republik Indonesia di bawah naungan "
       "Badan Gizi Nasional (BGN) merupakan program perlindungan sosial dan intervensi gizi anak terluas dalam sejarah "
       "modern Indonesia. Dengan alokasi anggaran awal puluhan triliun rupiah dan target menjangkau lebih dari 82 juta siswa, "
       "santri, serta balita di 38 provinsi, keberhasilan program ini bertumpu pada keandalan rantai pasok ribuan Satuan "
       "Pelayanan Pemenuhan Gizi (SPPG) yang beroperasi secara terdesentralisasi.")
p(doc, "Namun demikian, efektivitas intervensi nutrisi ini menghadapi ancaman struktural berupa sisa makanan di piring "
       "penerima manfaat (plate waste). Berdasarkan analisis data telemetri nasional, rata-rata sisa piring mencapai 13,34% "
       "per pengiriman, dengan sebaran ekstrem mencapai 37,7%. Sisa makanan ini tidak hanya mengakibatkan hilangnya asupan "
       "makronutrien yang seharusnya diserap tubuh anak, tetapi juga menciptakan kebocoran fiskal yang signifikan: biaya riil "
       "produksi rata-rata Rp13.526 per porsi membengkak menjadi biaya efektif Rp15.677 per porsi makanan yang benar-benar "
       "habis dikonsumsi—terjadi pemborosan anggaran sebesar ±Rp2.151 per porsi (+15,9%).")
p(doc, "Kelemahan paling mendasar pada tata kelola operasional hari ini terletak pada aspek temporal pengukuran. Sisa piring "
       "selama ini hanya dapat diukur SETELAH makanan disajikan dan dikonsumsi di sekolah (post-hoc). Akibatnya, seluruh bentuk "
       "intervensi yang dilakukan SPPG bersifat reaktif dan terlambat. Di sisi lain, kondisi geografis kepulauan Indonesia "
       "menciptakan disparitas logistik ekstrem: wilayah Terdepan, Terluar, dan Tertinggal (3T) mencatatkan 47,52% distribusi "
       "bermasalah, berbanding hanya 13,82% di Jawa Metropolitan.")
p(doc, "Tujuan utama penelitian ini adalah membangun PlateGuard MBG, sebuah sistem kecerdasan artifisial terintegrasi "
       "yang membalik paradigma pemantauan menjadi PREVENTIF. Model regresi berbasis Gradient Boosting dirancang untuk "
       "memprediksi persentase sisa piring sebelum armada pengantaran diberangkatkan dari dapur SPPG, murni memanfaatkan "
       "parameter perencanaan yang sudah diketahui (komposisi gizi, porsi kalori, jenis protein, jarak rute, moda transportasi, "
       "dan estimasi kondisi termal). Dengan demikian, penyesuaian operasional porsi dan logistik dapat dieksekusi sebelum "
       "makanan terbuang sia-sia.")

# ================= II. KAJIAN PUSTAKA =================
heading(doc, "II. TINJAUAN PUSTAKA DAN LANDASAN TEORI", level=1)
p(doc, "Penelitian mengenai sisa makanan pada program makan siang sekolah (National School Lunch Program) di berbagai negara "
       "menunjukkan bahwa faktor palatabilitas, temperatur penyajian, dan waktu istirahat makan merupakan determinan kunci "
       "penentu sisa piring. Standar keamanan pangan Hazard Analysis Critical Control Point (HACCP) menetapkan batas aman termal "
       "makanan siap santap panas minimal berada pada temperatur 60°C untuk mencegah proliferasi bakteri patogen. Penurunan suhu "
       "selama transit logistik terbukti berkorelasi kuat dengan penurunan selera makan anak.")
p(doc, "Dalam konteks pemodelan data tabular dengan fitur heterogen dan keberadaan nilai pencilan (outliers) geografis, "
       "rumpun algoritma pohon ensemble—khususnya Extreme Gradient Boosting (XGBoost), Light Gradient Boosting Machine (LightGBM), "
       "dan Histogram-based Gradient Boosting (HGB)—telah terbukti secara empiris lebih unggul dan stabil dibandingkan model linier "
       "maupun jaringan saraf tiruan dalam. XGBoost mengoptimalkan fungsi objektif reguler kedua (second-order Taylor expansion) "
       "dengan regularisasi L1/L2 yang efektif mengendalikan variansi model.")
p(doc, "Di sektor publik, model prediktif machine learning tidak dapat diadopsi sebagai 'kotak hitam' (black box). Pengambil "
       "kebijakan di BGN memerlukan eksplanasi yang dapat dipertanggungjawabkan mengapa sebuah sekolah diprediksi berisiko tinggi. "
       "Kerangka Explainable AI (XAI) berbasis Shapley Additive Explanations (TreeSHAP) menawarkan landasan teori permainan kooperatif "
       "yang solid untuk menghitung atribusi kontribusi setiap fitur secara lokal maupun global.")

# ================= III. DATA UNDERSTANDING & ETL =================
heading(doc, "III. DATA UNDERSTANDING, AUDIT DATA LEAKAGE, DAN REKAYASA FITUR", level=1)
p(doc, "Dataset yang digunakan dalam penelitian ini adalah Indonesia Free Nutritious Meal MBG 2026 Telemetry (Kaggle v4, "
       "Luthfi Muthathohirin), mencakup 13.000 catatan distribusi unik melintasi 38 provinsi di Indonesia dengan 26 kolom atribut "
       "awal tanpa missing value.")

p(doc, "A. Audit Kritis Guardrail Data Leakage", bold=True, size=11)
p(doc, "Salah satu kontribusi metodologis terpenting dalam penelitian ini adalah identifikasi dan isolasi kebocoran data "
       "(target data leakage) yang kerap menjebak praktisi sains data:")
bullet(doc, "Fitur waste_adjusted_effective_cost_idr: Penelitian ini membuktikan secara aljabar bahwa kolom ini merupakan "
            "formula matematis langsung dari total_meal_cost / (1 - plate_waste_percentage / 100). Selisih nilai terhitung "
            "dengan data kolom terbukti maksimal hanya Rp0,50 (akibat pembulatan). Memasukkan fitur ini akan menghasilkan "
            "model yang menghafal rumus target secara semu, bukan memprediksi fenomena riil.")
bullet(doc, "Fitur bgn_program_compliance_tier: Analisis aturan membuktikan label 4 kelas kepatuhan ini diturunkan langsung "
            "dari batas sisa makanan (waste 20% dan 30%). Pengujian baseline klasifikasi Random Forest menghasilkan akurasi 99,7%, "
            "membuktikan statusnya sebagai label deterministik. Menyertakan tier ini ke dalam model regresi mendongkrak R² semu "
            "dari 0,33 menjadi 0,68. Fitur ini secara tegas dieliminasi dari skenario pra-distribusi.")

p(doc, "B. Pipeline Rekayasa Fitur dan Transformasi Skewness", bold=True, size=11)
p(doc, "Analisis eksplorasi univariat mengungkap bahwa jarak pengiriman (skew = +1,75), waktu transit (skew = +2,16), dan indeks "
       "pembusukan (skew = +2,05) menceng kanan ekstrem, sementara suhu tiba makanan menceng kiri tajam (skew = -2,13). "
       "Penerapan transformasi log1p standar terbukti berhasil menormalkan fitur menceng kanan (jarak menjadi -0,08; transit menjadi +0,66), "
       "namun justru memperburuk suhu tiba menjadi -2,77. Oleh karena itu, dirancang modul khusus ReflectionLog: log(max(X) + 1 - X) "
       "yang sukses menurunkan kemencengan suhu tiba menjadi -0,09.")
p(doc, "Tiga fitur rekayasa baru dibentuk berdasarkan domain logistik pangan: rasio biaya per energi (biaya_per_kkal), kecepatan rata-rata "
       "pengantaran (kecepatan_km_jam), dan interaksi termal-temporal (suhu_tiba x waktu_transit). Seluruh transformasi dibungkus dalam "
       "scikit-learn ColumnTransformer terpadu, di mana parameter kalkulasi hanya di-fit pada data latih untuk mencegah leakage.")

p(doc, "C. Partisi Data Holdout Terstratifikasi", bold=True, size=11)
p(doc, "Sebanyak 13.000 data dipartisi menjadi 80% data latih (10.400 sampel) dan 20% data uji holdout (2.600 sampel) menggunakan "
       "stratifikasi berbasis kuartil target sisa makanan. Target pada data latih dan uji terbukti identik (mean 13,33%, std 5,58%). "
       "Data dibagi menjadi dua skenario pengujian: Skenario Pra-distribusi (33 fitur, tanpa pemicu sisa makanan) dan Skenario Post-Hoc "
       "(37 fitur, menyertakan pemicu sisa makanan untuk audit).")

# Tabel Statistik Deskriptif
table(doc,
      ["Fitur Kunci", "Tipe", "Mean / Proporsi", "Rentang / Modus", "Transformasi ETL"],
      [
          ["kitchen_daily_capacity_portions", "Numerik", "1.503 porsi", "400 - 3.000", "StandardScaler"],
          ["raw_ingredient_cost_per_portion_idr", "Numerik", "Rp 11.233", "Rp 7.000 - 15.000", "StandardScaler"],
          ["delivery_distance_km", "Numerik", "8,76 km", "0,5 - 35,0 km", "Log1p + Binning"],
          ["transit_time_minutes", "Numerik", "33,5 mnt", "5 - 120 mnt", "Log1p + Interaksi"],
          ["food_arrival_temperature_celsius", "Numerik", "62,88 °C", "28,3 - 72,0 °C", "ReflectionLog"],
          ["plate_waste_percentage (TARGET)", "Numerik", "13,34 %", "1,0 - 37,7 %", "Target Kontinu"],
          ["regional_cluster", "Kategori", "Jawa Metro (45%)", "4 Kategori", "One-Hot Encoding"],
          ["primary_food_waste_driver", "Kategori", "Jajan (63,4%)", "5 Kategori", "One-Hot (Post-Hoc)"],
      ],
      size=9, widths=[4.5, 2.0, 3.2, 3.2, 3.5])

if os.path.exists(os.path.join(FIG_EDA, "fig07_corr_heatmap.png")):
    figure(doc, os.path.join(FIG_EDA, "fig07_corr_heatmap.png"),
           "Gambar 1 - Matriks Korelasi Multivariat Antar-Fitur Operasional, Finansial, dan Logistik SPPG terhadap Target Sisa Makanan.", width_cm=13.5)

# ================= IV. METODOLOGI =================
heading(doc, "IV. METODOLOGI PEMODELAN DAN OPTIMASI BAYESIAN", level=1)
p(doc, "Penelitian ini mengevaluasi empat keluarga algoritma: Mean-Predictor (baseline pembanding), Ridge Regression (model linier "
       "teratur), HistGradientBoosting (baseline pohon), LightGBM, dan XGBoost. Mengingat pencilan geografis pada waktu transit dan "
       "jarak 35 km merupakan representasi riil rute perintis 3T, keputusan metodologi yang diambil adalah mempertahankan pencilan "
       "(outlier retention) dan mengandalkan ketahanan pohon keputusan ensemble.")
p(doc, "Untuk memaksimalkan performa XGBoost, dilakukan optimasi hiperparameter berbasis Bayesian menggunakan Optuna dengan 30 trial "
       "dan skema 3-Fold Cross Validation yang dieksekusi secara ketat hanya pada data latih. Ruang pencarian hiperparameter mencakup: "
       "n_estimators (100 - 450), learning_rate (0,01 - 0,10), max_depth (3 - 6), subsample (0,7 - 1,0), colsample_bytree (0,6 - 1,0), "
       "reg_alpha (1e-3 - 1,0), dan reg_lambda (1e-3 - 1,0).")

# ================= V. HASIL DAN PEMBAHASAN =================
heading(doc, "V. HASIL EKSPERIMEN DAN EVALUASI BENCHMARK", level=1)
p(doc, "Seluruh model dievaluasi secara independen pada 2.600 sampel data uji holdout yang belum pernah dilihat selama proses pelatihan "
       "maupun tuning hiperparameter. Tiga metrik performa utama diukur: Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), "
       "dan Koefisien Determinasi (R²).")

# Tabel Hasil Evaluasi Benchmark
table(doc,
      ["Model Algoritma", "Skenario Fitur", "MAE (pp)", "RMSE (pp)", "R²", "Evaluasi Target Charter"],
      [
          ["Baseline Mean-Predictor", "Tanpa Fitur", "4,447", "5,613", "0,000", "Batas Bawah Acuan"],
          ["Ridge Regression (alpha=1)", "Pra-distribusi", "3,720", "4,672", "0,307", "Model Linier Teratur"],
          ["LightGBM (Default)", "Pra-distribusi", "3,722", "4,688", "0,302", "Tree Ensemble"],
          ["HistGradientBoosting", "Pra-distribusi", "3,662", "4,595", "0,330", "Tree Ensemble"],
          ["XGBoost (Optuna Tuned)", "Pra-distribusi", "3,654", "4,583", "0,333", "Model Terpilih (Pra-Kirim)"],
          ["XGBoost (Optuna Tuned)", "Post-Hoc (+Driver)", "2,921", "3,752", "0,553", "Lolos Seluruh Target Charter"],
          ["HGB + Tier Kepatuhan", "Demo Bocor Data", "2,102", "2,801", "0,681", "Ditolak (Target Leakage)"],
      ],
      size=9, widths=[4.5, 3.2, 2.0, 2.0, 1.8, 3.5])

p(doc, "Berdasarkan tabel hasil di atas, pada skenario Pra-distribusi, model XGBoost teroptimasi Optuna memimpin sebagai model terbaik "
       "dengan MAE 3,654 poin persentase, mereduksi galat sebesar 17,8% dibandingkan baseline tebakan rata-rata. Meskipun target ambisius "
       "MAE <= 3,0 pp belum tertembus pada data pra-distribusi, nilai ini mencerminkan batas akurasi realistis dari parameter yang murni "
       "tersedia sebelum pengiriman, karena dinamika perilaku anak di sekolah baru termanifestasi saat makanan disajikan.")
p(doc, "Sebaliknya, pada skenario Post-Hoc (menyertakan faktor pemicu sisa makanan untuk audit), XGBoost sukses melampaui seluruh target "
       "charter proyek secara meyakinkan: MAE mencapai 2,921 pp (target <= 3,0 pp: TERCAPAI), RMSE 3,752 pp (target <= 4,5 pp: TERCAPAI), "
       "dan R² mencapai 0,553 (target >= 0,35: TERCAPAI). Lonjakan R² sebesar +0,220 membuktikan bahwa faktor penyebab sisa makanan "
       "mengandung daya jelas variansi yang sangat substansial.")

# ================= VI. EXPLAINABLE AI =================
heading(doc, "VI. INTERPRETABILITAS FITUR DAN ANALISIS TREESHAP", level=1)
p(doc, "Untuk memberikan transparansi kepada pengambil kebijakan BGN, dihitung nilai Shapley lokal dan global menggunakan TreeExplainer "
       "pada model XGBoost terbaik.")

if os.path.exists(os.path.join(FIG_F3, "shap_beeswarm_pra.png")):
    figure(doc, os.path.join(FIG_F3, "shap_beeswarm_pra.png"),
           "Gambar 2 - SHAP Beeswarm Plot Skenario Pra-distribusi: Arah pengaruh fitur operasional terhadap prediksi persentase sisa piring.", width_cm=14)

if os.path.exists(os.path.join(FIG_F3, "shap_bar_pra.png")):
    figure(doc, os.path.join(FIG_F3, "shap_bar_pra.png"),
           "Gambar 3 - Peringkat Kepentingan Global Fitur (Mean |SHAP|) pada Skenario Pra-distribusi.", width_cm=13)

p(doc, "Temuan Kunci Atribusi Fitur SHAP:", bold=True, size=11)
bullet(doc, "Kandungan Energi (estimated_calories_kcal): Menempati posisi teratas pengaruh pada skenario pra-distribusi. Titik-titik "
            "merah (kalori tinggi seimbang ~680-750 kkal) bergeser kuat ke arah nilai SHAP negatif, membuktikan porsi yang mencukupi kebutuhan "
            "energi anak efektif menurunkan persentase sisa piring.")
bullet(doc, "Suhu Tiba Ter-refleksi (refllog_temperature): Menjadi determinan termal paling signifikan. Makanan yang tiba panas (> 65°C) "
            "memiliki nilai refleksi rendah yang mendorong prediksi sisa piring ke bawah, sedangkan makanan yang tiba dingin (< 60°C) "
            "secara tajam mendongkrak estimasi sisa makanan.")
bullet(doc, "Faktor Jajanan Sebelum Makan (Prior-Snack-Consumption): Pada skenario post-hoc, fitur ini mendominasi nilai SHAP secara "
            "mutlak dengan kontribusi positif masif terhadap plate waste. Hal ini membuktikan bahwa siswa yang telah jajan sebelum makan siang "
            "adalah faktor pemborosan nomor satu di lapangan.")

# ================= VII. ARSITEKTUR DEPLOYMENT =================
heading(doc, "VII. ARSITEKTUR MLOPS DAN DEPLOYMENT SISTEM", level=1)
p(doc, "Fase 4 melengkapi siklus hidup sains data enterprise dengan membangun infrastruktur deployment produksi yang modular, "
       "terdiri atas dua komponen utama:")

p(doc, "A. REST API Inferensi Real-Time (FastAPI)", bold=True, size=11)
p(doc, "Layanan backend api.py dibangun menggunakan FastAPI. Endpoint POST /predict/pra menerima payload JSON karakteristik rencana "
       "pengiriman SPPG, memuat pipeline_pra.joblib dan model best_pra.joblib ke memori, dan menghasilkan prediksi persentase sisa piring, "
       "kategori risiko, estimasi kerugian finansial per porsi, serta rekomendasi mitigasi otomatis dengan latensi pengujian < 500 ms "
       "(jauh melampaui target toleransi sistem < 3 detik).")

p(doc, "B. Dasbor Analitik dan Simulator What-If (Streamlit)", bold=True, size=11)
p(doc, "Antarmuka berbasis web app.py dibangun menggunakan Streamlit, dirancang khusus untuk administrator BGN dan kepala dapur SPPG:")
bullet(doc, "Tab Ringkasan Eksekutif: Menampilkan KPI nasional, potensi biaya menguap, disparitas 3T, dan pemetaan 8 provinsi rawan.")
bullet(doc, "Tab Simulator Rencana Distribusi: Antarmuka kalkulator interaktif di mana pengguna dapat menggeser porsi kalori, mengubah moda "
            "armada boks termal, atau memperpendek rute transit, dan melihat pergeseran prediksi sisa piring secara langsung.")
bullet(doc, "Tab Explainability SHAP: Menyajikan diagram visual beeswarm dan bar chart untuk transparansi adopsi kebijakan.")
bullet(doc, "Tab Benchmark Model: Menyajikan dokumentasi pembuktian data leakage dan perbandingan seluruh algoritma.")

p(doc, "C. Kontainerisasi Multi-Layanan (Docker)", bold=True, size=11)
p(doc, "Sistem dipaketkan dalam kontainer Dockerfile berbasis python:3.12-slim dan docker-compose.yml yang mengorkestrasi layanan API "
       "(port 8000) dan dasbor Streamlit (port 8501) secara terisolasi, siap di-deploy pada arsitektur cloud server pemerintah.")

# ================= VIII. IMPLIKASI KEBIJAKAN =================
heading(doc, "VIII. IMPLIKASI KEBIJAKAN PUBLIK, KETERBATASAN, DAN ARAH MASA DEPAN", level=1)
p(doc, "A. Rekomendasi Manajerial untuk Badan Gizi Nasional", bold=True, size=11)
bullet(doc, "Regulasi Kantin Sekolah: BGN bersama Kementerian Pendidikan disarankan menerbitkan surat edaran bersama terkait pembatasan "
            "operasional kantin/penjual makanan ringan minimal 2 jam sebelum jadwal makan siang bergizi dibagikan.")
bullet(doc, "Standarisasi Insulasi Armada: Penggunaan motor roda tiga atau pickup tanpa boks termal terinsulasi pada rute transit > 30 menit "
            "harus dihentikan karena memicu penurunan suhu di bawah 60°C yang melipatgandakan risiko distribusi bermasalah dari 12,5% menjadi 63,7%.")
bullet(doc, "Kebijakan Anggaran Asimetris Wilayah 3T: Mengingat 47,52% pengiriman di wilayah 3T bermasalah akibat hambatan geografis ekstrem, "
            "perlu dialokasikan plafon biaya logistik per porsi yang lebih tinggi untuk dapur SPPG di perbatasan dan pulau terluar.")

p(doc, "B. Keterbatasan Penelitian dan Riset Lanjutan", bold=True, size=11)
p(doc, "Penelitian ini memiliki keterbatasan pada ketiadaan fitur temporal deret waktu (seperti variasi menu mingguan dan efek musiman hujan) "
       "serta validasi lapangan fisik sensor IoT. Arah riset masa depan mencakup integrasi telemetri sensor suhu IoT GPS secara streaming "
       "dan penerapan active learning untuk memperbarui model secara berkesinambungan saat SPPG beroperasi penuh.")

# ================= IX. KESIMPULAN =================
heading(doc, "IX. KESIMPULAN", level=1)
p(doc, "Penelitian ini telah berhasil mengembangkan sistem PlateGuard MBG dari tahap pemahaman masalah bisnis, audit data leakage, "
       "rekayasa fitur termal logistik, optimasi model ensemble regresi XGBoost berbasis Bayesian (Optuna), analisis transparansi SHAP, "
       "hingga deployment produksi berupa FastAPI, Streamlit, dan Docker. Pada pengujian holdout 2.600 sampel, model pra-distribusi "
       "meraih MAE 3,654 pp (reduksi galat 17,8% dari baseline) dan model post-hoc melampaui seluruh target charter dengan MAE 2,921 pp "
       "dan R² 0,553. Sistem ini siap memberikan nilai tambah strategis bagi efisiensi anggaran Badan Gizi Nasional dalam menyukseskan "
       "Program Makan Bergizi Gratis di seluruh pelosok Indonesia.")

# ================= DAFTAR PUSTAKA =================
heading(doc, "DAFTAR PUSTAKA", level=1)
refs = [
    "[1] Badan Gizi Nasional (BGN), 'Pedoman Penyelenggaraan Program Makan Bergizi Gratis Nasional', Sekretariat Negara Republik Indonesia, Jakarta, 2026.",
    "[2] L. Muthathohirin, 'Indonesia Free Nutritious Meal (MBG) Operational Telemetry Dataset v4', Kaggle Datasets, Okt. 2026.",
    "[3] J. Chen and C. Guestrin, 'XGBoost: A Scalable Tree Boosting System', in Proc. 22nd ACM SIGKDD Int. Conf. Knowledge Discovery and Data Mining (KDD '16), San Francisco, CA, USA, 2016, pp. 785-794.",
    "[4] T. Akiba, S. Sano, T. Yanase, T. Ohta, and M. Koyama, 'Optuna: A Next-generation Hyperparameter Optimization Framework', in Proc. 25th ACM SIGKDD Int. Conf. Knowledge Discovery and Data Mining, Anchorage, AK, USA, 2019, pp. 2623-2631.",
    "[5] S. M. Lundberg and S.-I. Lee, 'A Unified Approach to Interpreting Model Predictions', in Advances in Neural Information Processing Systems (NeurIPS 30), Long Beach, CA, USA, 2017, pp. 4765-4774.",
    "[6] G. Ke et al., 'LightGBM: A Highly Efficient Gradient Boosting Decision Tree', in Advances in Neural Information Processing Systems (NeurIPS 30), Long Beach, CA, USA, 2017, pp. 3146-3154.",
    "[7] F. Pedregosa et al., 'Scikit-learn: Machine Learning in Python', Journal of Machine Learning Research, vol. 12, pp. 2825-2830, 2011.",
    "[8] World Health Organization (WHO), 'Hazard Analysis and Critical Control Point (HACCP) System and Guidelines for its Application', Codex Alimentarius Commission, Rome, 2023.",
    "[9] S. Byker Shanks et al., 'The Visual Plate Waste Method: An Efficient and Accurate Measure of Food Waste in School Cafeterias', Journal of the Academy of Nutrition and Dietetics, vol. 118, no. 1, pp. 102-108, 2018.",
    "[10] S. Ramirez et al., 'Food Temperature Control and Pathogen Risk in Decentralized School Feeding Supply Chains', Journal of Food Protection, vol. 85, no. 4, pp. 612-620, 2022.",
    "[11] S. Tiwary, 'FastAPI: Modern, High-Performance Web Framework for Building APIs with Python 3.8+', Packt Publishing, 2023.",
    "[12] D. Sculley et al., 'Hidden Technical Debt in Machine Learning Systems', in Advances in Neural Information Processing Systems (NeurIPS 28), Montreal, Canada, 2015, pp. 2503-2511."
]
for ref in refs:
    p(doc, ref, size=9, space_after=3)

# Simpan Dokumen Word
doc.save(OUT_PATH)
print(f"✅ LAPORAN AKHIR IEEE BERHASIL DIBUAT: {OUT_PATH}")
print(f"Ukuran Berkas: {os.path.getsize(OUT_PATH):,} bytes")
