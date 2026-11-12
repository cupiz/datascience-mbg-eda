# -*- coding: utf-8 -*-
"""PlateGuard MBG - Executive Analytics & Simulation Dashboard (Streamlit)

Fase 4: Antarmuka Interaktif Pengambil Kebijakan Badan Gizi Nasional (BGN) & Mitra SPPG.
Menyediakan ringkasan KPI nasional, simulator rencana distribusi (what-if calculator),
analisis explainability SHAP, dan pembuktian integritas data.

Jalankan lokal:
  streamlit run app.py
"""
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import streamlit as st

# Setup direktori dan modul ETL
BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

import __main__
import etl_pipeline
from etl_pipeline import FeatureBuilder, Log1p, QuantileBinner, ReflectionLog

__main__.FeatureBuilder = FeatureBuilder
__main__.Log1p = Log1p
__main__.QuantileBinner = QuantileBinner
__main__.ReflectionLog = ReflectionLog

# Konfigurasi Halaman Streamlit
st.set_page_config(
    page_title="PlateGuard MBG Dashboard",
    page_icon="🍱",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling CSS
st.markdown("""
<style>
    .metric-card {
        background-color: #f8f9fa;
        border-left: 5px solid #2c7fb8;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 10px;
    }
    .metric-card-danger {
        background-color: #fdf2f2;
        border-left: 5px solid #e74c3c;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 10px;
    }
    .metric-title { font-size: 13px; color: #6c757d; font-weight: 600; text-transform: uppercase; }
    .metric-value { font-size: 26px; font-weight: bold; color: #2c3e50; margin: 4px 0; }
    .metric-sub { font-size: 12px; color: #7f8c8d; }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_all_models():
    """Memuat artefak model serialisasi ke memori cache."""
    pra_model_path = os.path.join(BASE, "models", "best_pra.joblib")
    pra_pipe_path = os.path.join(BASE, "models", "pipeline_pra.joblib")
    post_model_path = os.path.join(BASE, "models", "best_posthoc.joblib")
    post_pipe_path = os.path.join(BASE, "models", "pipeline_posthoc.joblib")
    metrics_path = os.path.join(BASE, "models", "fase3_metrics.json")
    results_path = os.path.join(BASE, "eda_results.json")

    store = {}
    if os.path.exists(pra_pipe_path) and os.path.exists(pra_model_path):
        store["pra_pipe"] = joblib.load(pra_pipe_path)
        store["pra_model"] = joblib.load(pra_model_path)["model"]

    if os.path.exists(post_pipe_path) and os.path.exists(post_model_path):
        store["post_pipe"] = joblib.load(post_pipe_path)
        store["post_model"] = joblib.load(post_model_path)["model"]

    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            store["metrics"] = json.load(f)

    if os.path.exists(results_path):
        with open(results_path, "r", encoding="utf-8") as f:
            store["eda"] = json.load(f)

    return store


STORE = load_all_models()

# ================= SIDEBAR =================
with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/meal.png", width=64)
    st.title("PlateGuard MBG")
    st.caption("AI-Powered Plate Waste Mitigation System")
    st.markdown("---")

    st.markdown("### 📋 Profil Proyek")
    st.markdown("**Program:** Makan Bergizi Gratis (MBG)")
    st.markdown("**Institusi:** Badan Gizi Nasional (BGN)")
    st.markdown("**Akademik:** Magister Ilmu Komputer, Universitas Amikom Purwokerto")
    st.markdown("**Project Lead:** Iqbal Ahdagita Elbadra")
    st.markdown("**Model Engine:** XGBoost + Bayesian Optuna")
    st.markdown("---")

    st.markdown("### ⚙️ Status Pipeline")
    pra_ok = "pra_model" in STORE and "pra_pipe" in STORE
    st.success("🟢 Model Pra-distribusi Aktif" if pra_ok else "🔴 Model Pra Offline")
    post_ok = "post_model" in STORE and "post_pipe" in STORE
    st.success("🟢 Model Post-Hoc Aktif" if post_ok else "🔴 Model Post Offline")

    st.markdown("---")
    st.caption("PlateGuard MBG v1.0 • Deployment Fase 4")

# ================= HEADER UTAMA =================
st.title("🍱 PlateGuard MBG: Sistem Monitoring & Prediksi Sisa Makanan")
st.markdown(
    "Mengubah telemetri operasional dapur SPPG menjadi skor prediksi *plate waste* per rencana distribusi, "
    "memungkinkan penyesuaian porsi, menu, dan logistik **SEBELUM** makanan terbuang."
)
st.markdown("---")

# ================= TABS NAVIGASI =================
tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Ringkasan Eksekutif & KPI Nasional",
    "🎛️ Simulator Rencana Distribusi (What-If)",
    "🔍 Interpretabilitas & Analisis SHAP",
    "🏆 Benchmark Model & Integritas Data",
])

# ================= TAB 1: EXECUTIVE OVERVIEW =================
with tab1:
    st.subheader("Ringkasan Kinerja Operasional & Risiko Nasional")

    # Row Kartu KPI
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-title">Rata-rata Sisa Piring</div>
            <div class="metric-value">13,34%</div>
            <div class="metric-sub">Ekor distribusi mencapai 37,7%</div>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown("""
        <div class="metric-card-danger">
            <div class="metric-title">Biaya Menguap / Porsi</div>
            <div class="metric-value">Rp 2.151</div>
            <div class="metric-sub">Biaya efektif naik +15,9%</div>
        </div>
        """, unsafe_allow_html=True)
    with c3:
        st.markdown("""
        <div class="metric-card-danger">
            <div class="metric-title">Disparitas Wilayah 3T</div>
            <div class="metric-value">47,52%</div>
            <div class="metric-sub">vs 13,82% di Jawa Metropolitan</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-title">Titik Kritis Suhu Tiba</div>
            <div class="metric-value">22,42%</div>
            <div class="metric-sub">Tiba < 60°C (batas aman pangan)</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.markdown("#### 📍 Disparitas Risiko Distribusi per Klaster Wilayah")
        st.caption("Persentase distribusi bermasalah (tier Marginal & Non-Compliant) per zona geografis.")

        cluster_data = pd.DataFrame({
            "Klaster Wilayah": [
                "Wilayah 3T Perbatasan & Pedalaman",
                "Daerah Pedesaan & Kepulauan",
                "Luar Jawa Urban",
                "Jawa Metropolitan",
            ],
            "Distribusi Bermasalah (%)": [47.52, 30.60, 15.05, 13.82]
        })
        st.bar_chart(cluster_data.set_index("Klaster Wilayah"), color="#c0392b")

    with col_right:
        st.markdown("#### ⚠️ Faktor Pemicu Utama Sisa Makanan")
        st.caption("Proporsi faktor pendorong terjadinya pemborosan makanan pada piring penerima.")

        driver_data = pd.DataFrame({
            "Pemicu Pemborosan": [
                "Prior-Snack-Consumption (Jajan Sebelum Makan)",
                "Sub-Optimal-Arrival-Temperature (Suhu Dingin)",
                "Delivery-Transit-Delay (Keterlambatan Kirim)",
                "Excessive-Portion-Size (Porsi Terlalu Banyak)",
                "Low-Palatability-Menu (Rasa Kurang Disukai)",
            ],
            "Proporsi (%)": [63.4, 18.5, 8.1, 6.1, 3.9]
        })
        st.dataframe(
            driver_data,
            use_container_width=True,
            hide_index=True,
        )

    st.markdown("---")
    st.markdown("#### 🗺️ 8 Provinsi dengan Tingkat Risiko Distribusi Tertinggi (Wilayah Prioritas)")
    prov_data = pd.DataFrame({
        "Provinsi": [
            "Kalimantan Utara", "Papua Selatan", "Papua Pegunungan",
            "Papua Tengah", "Nusa Tenggara Timur", "Papua Barat Daya",
            "Papua", "Maluku"
        ],
        "Tingkat Bermasalah (%)": [54.2, 52.8, 51.5, 49.3, 48.7, 47.9, 46.5, 45.1],
        "Zona Kebijakan": [
            "Prioritas Intervensi Khusus (3T)", "Prioritas Intervensi Khusus (3T)",
            "Prioritas Intervensi Khusus (3T)", "Prioritas Intervensi Khusus (3T)",
            "Prioritas Logistik Maritim", "Prioritas Intervensi Khusus (3T)",
            "Prioritas Rantai Dingin", "Prioritas Rantai Dingin"
        ]
    })
    st.dataframe(prov_data, use_container_width=True, hide_index=True)


# ================= TAB 2: SIMULATOR PRA-DISTRIBUSI =================
with tab2:
    st.subheader("Simulator Rencana Distribusi (What-If Calculator)")
    st.markdown(
        "Masukkan parameter rencana pengantaran makanan besok pagi untuk menghitung prediksi "
        "persentase sisa makanan dan menerima rekomendasi mitigasi otomatis sebelum armada diberangkatkan."
    )

    with st.form("form_simulator"):
        c_wil, c_gizi, c_log = st.columns(3)

        with c_wil:
            st.markdown("##### 📍 Wilayah & Penerima")
            cluster = st.selectbox(
                "Klaster Wilayah",
                ["Jawa Metropolitan", "Luar Jawa Urban", "Daerah Pedesaan & Kepulauan", "Wilayah 3T Perbatasan & Pedalaman"],
                index=0
            )
            beneficiary = st.selectbox(
                "Kategori Penerima Manfaat",
                ["Siswa SD / Madrasah Ibtidaiyah", "Siswa SMP / MTs", "Siswa SMA / SMK / MA",
                 "Balita & Ibu Hamil Posyandu", "Santri Pesantren"],
                index=0
            )
            kitchen_cap = st.slider("Kapasitas Dapur SPPG (porsi/hari)", 400, 3000, 1500, step=50)

        with c_gizi:
            st.markdown("##### 🍗 Menu & Kandungan Nutrisi")
            protein = st.selectbox(
                "Komoditas Lauk Protein",
                ["Daging Ayam Broiler", "Telur Ayam Ras", "Daging Sapi / Kerbau",
                 "Ikan Kembung / Tongkol", "Tempe & Tahu Kedelai", "Ikan Bandeng / Lele", "Kacang-kacangan"],
                index=0
            )
            calories = st.slider("Kandungan Energi (kkal)", 400.0, 1000.0, 680.0, step=10.0)
            protein_g = st.slider("Kandungan Protein (gram)", 12.0, 45.0, 24.0, step=1.0)
            cost_raw = st.number_input("Biaya Bahan Baku / Porsi (Rp)", value=12000, step=500)

        with c_log:
            st.markdown("##### 🚚 Logistik & Kondisi Termal")
            transport = st.selectbox(
                "Moda Transportasi Pengiriman",
                ["Mobil Pickup Termal", "Motor Roda Tiga Boks Termal",
                 "Sepeda Motor Keranjang Termal", "Perahu Ketinting Sungai / Laut", "Truk Ringan Termal"],
                index=0
            )
            distance = st.slider("Jarak Pengantaran (km)", 0.5, 35.0, 8.5, step=0.5)
            transit_min = st.slider("Estimasi Waktu Transit (menit)", 5, 120, 30, step=5)
            temperature = st.slider("Estimasi Suhu Tiba di Sekolah (°C)", 30.0, 75.0, 65.0, step=0.5)

        btn_submit = st.form_submit_button("🚀 Hitung Prediksi Sisa Makanan", use_container_width=True)

    if btn_submit:
        cost_total = cost_raw + 2000.0
        gizi_tot = (calories / 100.0) + protein_g
        cost_nutr = float(cost_total / max(1.0, gizi_tot) * 1.5)
        cool_rate = float(max(0.0, 72.0 - temperature) / max(1.0, transit_min))
        spoilage = float(max(1.0, min(10.0, 1.5 + (transit_min * 0.05) + max(0.0, (60.0 - temperature) * 0.1))))

        payload_dict = {
            "kitchen_daily_capacity_portions": kitchen_cap,
            "raw_ingredient_cost_per_portion_idr": float(cost_raw),
            "student_attendance_rate_pct": 92.0,
            "local_farmer_sourcing_pct": 72.0,
            "total_meal_cost_idr": float(cost_total),
            "estimated_calories_kcal": float(calories),
            "estimated_protein_grams": float(protein_g),
            "cost_to_nutrition_ratio": cost_nutr,
            "local_economic_multiplier_score": 7.1,
            "delivery_distance_km": float(distance),
            "transit_time_minutes": float(transit_min),
            "spoilage_risk_index": spoilage,
            "transit_cooling_rate_c_per_min": cool_rate,
            "food_arrival_temperature_celsius": float(temperature),
            "regional_cluster": cluster,
            "beneficiary_category": beneficiary,
            "protein_type": protein,
            "delivery_transport_mode": transport,
        }

        df_in = pd.DataFrame([payload_dict])

        if "pra_pipe" in STORE and "pra_model" in STORE:
            try:
                X_trans = STORE["pra_pipe"].transform(df_in)
                pred_pct = float(STORE["pra_model"].predict(X_trans)[0])
                pred_pct = round(float(np.clip(pred_pct, 0.0, 100.0)), 2)
            except Exception as e:
                st.error(f"Error inferensi: {e}")
                pred_pct = 13.34
        else:
            st.warning("Model belum termuat, menampilkan estimasi baseline.")
            pred_pct = 13.34

        # Metrik kalkulasi
        loss_porsi = round(cost_total * (pred_pct / 100.0), 0)
        loss_harian = round(loss_porsi * kitchen_cap, 0)
        effective_cost = round(cost_total / max(0.01, (1.0 - pred_pct / 100.0)), 0)

        st.markdown("---")
        st.markdown("### 🎯 Hasil Prediksi & Indikator Risiko")

        res1, res2, res3 = st.columns(3)
        with res1:
            if pred_pct < 10.0:
                st.success(f"### {pred_pct:.2f}%\n**Risiko Rendah (Efisien)**")
            elif pred_pct <= 15.0:
                st.warning(f"### {pred_pct:.2f}%\n**Risiko Sedang (Standar)**")
            else:
                st.error(f"### {pred_pct:.2f}%\n**Risiko Tinggi (Kritis)**")
            st.caption("Estimasi persentase sisa makanan di piring")

        with res2:
            st.metric("Biaya Menguap / Porsi", f"Rp {loss_porsi:,.0f}".replace(",", "."))
            st.caption(f"Biaya efektif: Rp {effective_cost:,.0f}/porsi")

        with res3:
            st.metric(f"Potensi Pemborosan Dapur ({kitchen_cap:,} porsi)", f"Rp {loss_harian:,.0f}".replace(",", "."))
            st.caption("Jika seluruh kapasitas harian terdistribusi serupa")

        # Rekomendasi otomatis
        st.markdown("#### 💡 Rekomendasi Tindakan Korektif Sebelum Truk Berangkat:")
        recs = []
        if pred_pct >= 15.0:
            recs.append("⚠️ **Intervensi Mendesak:** Prediksi sisa makanan melampaui batas toleransi 15%. Tinjau ulang kombinasi menu dan logistik.")
        if temperature < 60.0:
            recs.append(f"🌡️ **Peringatan Termal Kritis ({temperature:.1f}°C < 60°C):** Makanan diperkirakan tiba dingin. Gunakan boks termal terinsulasi ganda atau persingkat waktu tunggu.")
        if transit_min > 60:
            recs.append(f"⏱️ **Waktu Transit Terlalu Lama ({transit_min} menit):** Pertimbangkan membagi rute atau memajukan jam keberangkatan dari dapur.")
        if calories > 800:
            recs.append(f"🍱 **Porsi Kalori Berlebih ({calories:.0f} kkal):** Terlalu padat untuk kelompok penerima. Kurangi porsi nasi/karbohidrat sebesar 10-15%.")
        elif calories < 500:
            recs.append(f"🥗 **Kalori Rendah ({calories:.0f} kkal):** Tingkatkan densitas nutrisi lauk pendamping.")
        if "3T" in cluster:
            recs.append("📍 **Zona Geografis 3T:** Wilayah perintis memiliki disparitas logistik ekstrem. Siapkan koordinasi ketat dengan pihak sekolah penerima.")

        if not recs:
            st.success("✅ **Rencana Distribusi Sangat Baik:** Semua parameter logistik dan gizi berada dalam kondisi optimal.")
        else:
            for r in recs:
                st.markdown(f"- {r}")


# ================= TAB 3: EXPLAINABILITY (SHAP) =================
with tab3:
    st.subheader("Interpretabilitas Model & Analisis Nilai SHAP")
    st.markdown(
        "Pendekatan *Explainable AI* (XAI) menggunakan **TreeSHAP** untuk menjamin transparansi keputusan "
        "dan adopsi kebijakan publik di lingkungan Badan Gizi Nasional."
    )

    shap_scenario = st.radio(
        "Pilih Skenario Analisis SHAP:",
        ["Pra-distribusi (Data Perencanaan Operasional)", "Post-Hoc (Audit Retrospektif Akar Masalah)"],
        horizontal=True
    )

    if "Pra-distribusi" in shap_scenario:
        st.markdown("#### 1. Skenario Pra-distribusi (33 Fitur)")
        st.caption("Menunjukkan fitur mana yang paling memengaruhi perkiraan sisa makanan sebelum pengiriman dilakukan.")

        c_shp1, c_shp2 = st.columns(2)
        with c_shp1:
            st.markdown("##### SHAP Beeswarm Plot (Arah Efek Fitur)")
            p_bee = os.path.join(BASE, "figures_fase3", "shap_beeswarm_pra.png")
            if os.path.exists(p_bee):
                st.image(p_bee, use_container_width=True)
            else:
                st.info("Visualisasi SHAP beeswarm pra tersimpan di figures_fase3/shap_beeswarm_pra.png")

        with c_shp2:
            st.markdown("##### SHAP Bar Plot (Tingkat Kepentingan Global)")
            p_bar = os.path.join(BASE, "figures_fase3", "shap_bar_pra.png")
            if os.path.exists(p_bar):
                st.image(p_bar, use_container_width=True)
            else:
                st.info("Visualisasi SHAP bar pra tersimpan di figures_fase3/shap_bar_pra.png")

        st.markdown("""
        **Temuan Kunci SHAP Pra-distribusi:**
        1. **Kandungan Kalori (`estimated_calories_kcal`):** Berada di peringkat puncak pengaruh. Porsi berkalori seimbang dan cukup secara konsisten menurunkan sisa piring.
        2. **Suhu Tiba Ter-refleksi (`refllog_food_arrival_temperature_celsius`):** Suhu makanan yang tiba panas (> 65°C) terbukti menjadi faktor pencegah sisa piring terbesar.
        3. **Rasio Biaya per Gizi:** Menu dengan rasio biaya tidak seimbang dengan gizi cenderung menyumbang sisa makanan lebih banyak.
        """)

    else:
        st.markdown("#### 2. Skenario Post-Hoc (37 Fitur)")
        st.caption("Menyertakan faktor pemicu yang teramati di lapangan untuk evaluasi audit mengapa sebuah distribusi boros.")

        c_post1, c_post2 = st.columns(2)
        with c_post1:
            st.markdown("##### SHAP Beeswarm Plot (Post-Hoc)")
            p_bee_post = os.path.join(BASE, "figures_fase3", "shap_beeswarm_posthoc.png")
            if os.path.exists(p_bee_post):
                st.image(p_bee_post, use_container_width=True)
            else:
                st.info("Visualisasi SHAP beeswarm posthoc tersimpan di figures_fase3/shap_beeswarm_posthoc.png")

        with c_post2:
            st.markdown("##### SHAP Bar Plot (Post-Hoc)")
            p_bar_post = os.path.join(BASE, "figures_fase3", "shap_bar_posthoc.png")
            if os.path.exists(p_bar_post):
                st.image(p_bar_post, use_container_width=True)
            else:
                st.info("Visualisasi SHAP bar posthoc tersimpan di figures_fase3/shap_bar_posthoc.png")

        st.markdown("""
        **Temuan Kunci SHAP Post-Hoc:**
        1. **`Prior-Snack-Consumption` (Siswa Jajan):** Mendominasi kontribusi secara mutlak. Siswa yang sudah jajan sebelum jam makan siang menjadi pemicu sisa piring terbesar.
        2. **`Sub-Optimal-Arrival-Temperature` (Suhu Dingin):** Pemicu kedua paling signifikan yang membuat makanan tidak dihabiskan siswa.
        3. *Implikasi Kebijakan:* Mengonfirmasi bahwa intervensi manajerial sekolah (larangan jajan 2 jam sebelum makan) adalah kunci paling efektif.
        """)


# ================= TAB 4: BENCHMARK & DATA INTEGRITY =================
with tab4:
    st.subheader("Benchmark Model & Guardrail Integritas Data")

    st.markdown("#### 🏆 Komparasi Kinerja Seluruh Model (Holdout Test 2.600 Sampel)")
    eval_table = pd.DataFrame([
        {"Algoritma": "Baseline (Mean-Predictor)", "Skenario": "Tanpa Fitur", "MAE (pp)": 4.45, "RMSE (pp)": 5.61, "R²": 0.00, "Status Target": "Baseline Acuan"},
        {"Algoritma": "Ridge Regression", "Skenario": "Pra-distribusi", "MAE (pp)": 3.72, "RMSE (pp)": 4.67, "R²": 0.31, "Status Target": "Model Linear"},
        {"Algoritma": "LightGBM (Default)", "Skenario": "Pra-distribusi", "MAE (pp)": 3.72, "RMSE (pp)": 4.69, "R²": 0.30, "Status Target": "Gradient Boosting"},
        {"Algoritma": "HistGradientBoosting", "Skenario": "Pra-distribusi", "MAE (pp)": 3.66, "RMSE (pp)": 4.60, "R²": 0.33, "Status Target": "Gradient Boosting"},
        {"Algoritma": "XGBoost (Optuna Tuned)", "Skenario": "Pra-distribusi", "MAE (pp)": 3.65, "RMSE (pp)": 4.58, "R²": 0.33, "Status Target": "⭐ Model Terpilih (Pra)"},
        {"Algoritma": "XGBoost (Optuna Tuned)", "Skenario": "Post-Hoc (+Driver)", "MAE (pp)": 2.92, "RMSE (pp)": 3.75, "R²": 0.55, "Status Target": "✅ Lolos Semua Target (Post-Hoc)"},
        {"Algoritma": "HGB + Tier Kepatuhan", "Skenario": "Demo Bocor Data", "MAE (pp)": 2.10, "RMSE (pp)": 2.80, "R²": 0.68, "Status Target": "❌ DITOLAK (Target Leakage)"},
    ])
    st.dataframe(eval_table, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("#### 🛡️ Audit Guardrail Anti-Kebocoran Data (Data Leakage)")
    st.markdown("""
    Dalam pengembangan sistem sains data publik berskala enterprise, integritas metodologi di atas segalanya.
    Proyek ini secara tegas membuktikan dan menolak dua jenis kebocoran data:

    1. **Kebocoran Aljabar (`waste_adjusted_effective_cost_idr`):**
       - Terbukti secara matematis bahwa kolom ini dihasilkan dari formula:
         $$\\text{Biaya Efektif} = \\frac{\\text{Total Meal Cost}}{1 - (\\text{Plate Waste \\%} / 100)}$$
       - Selisih antara perhitungan aljabar dan data riil terbukti maksimal hanya **Rp 0,50** (pembulatan). Menyertakannya akan membuat model mengingat rumus target secara instan, bukan memprediksi pola lapangan.
    2. **Kebocoran Label Turunan Aturan (`bgn_program_compliance_tier`):**
       - Tier kepatuhan BGN terbukti diklasifikasikan menggunakan ambang sisa makanan 20% dan 30%.
       - Pengujian baseline membuktikan Random Forest mampu menebak tier dengan akurasi **99,7%**.
       - Menyertakan tier kepatuhan menaikkan $R^2$ semu dari 0,33 menjadi 0,68. Kami menolak variabel ini sebagai fitur masukan model prediksi.
    """)
