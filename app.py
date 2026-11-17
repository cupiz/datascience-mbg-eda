# -*- coding: utf-8 -*-
"""PlateGuard MBG - Executive Analytics, Simulator & Prediction Dashboard (Streamlit).

Fase 4: Antarmuka Interaktif Pengambil Kebijakan Badan Gizi Nasional (BGN) & Mitra SPPG.
Memuat angka terverifikasi langsung dari eda_results.json, fase3_metrics.json, serta model
tersimpan (pipeline_*.joblib & best_*.joblib), dengan dukungan opsional koneksi ke REST API FastAPI.

Jalankan lokal:
  streamlit run app.py
"""
import inspect
import json
import os
import sys
import urllib.error
import urllib.request
import warnings

import joblib
import numpy as np
import pandas as pd
import streamlit as st

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

st.set_page_config(
    page_title="PlateGuard MBG Dashboard",
    page_icon="🍱",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .metric-card {
        background-color: #f8f9fa;
        border-left: 5px solid #2c7fb8;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        margin-bottom: 10px;
    }
    .metric-card-danger {
        background-color: #fdf2f2;
        border-left: 5px solid #e74c3c;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        margin-bottom: 10px;
    }
    .metric-title { font-size: 13px; color: #5c6670; font-weight: 600; text-transform: uppercase; }
    .metric-value { font-size: 26px; font-weight: bold; color: #1f2d3d; margin: 4px 0; }
    .metric-sub { font-size: 12px; color: #6c757d; }
</style>
""", unsafe_allow_html=True)

# Kategori persis sesuai skema dataset indonesia_mbg_nationwide_enriched_2026.csv
CLUSTERS = [
    "Jawa Metropolitan",
    "Luar Jawa Urban",
    "Daerah Pedesaan & Kepulauan",
    "Wilayah 3T Perbatasan & Pedalaman",
]
BENEFICIARIES = [
    "Siswa SD / Madrasah Ibtidaiyah",
    "Siswa SMP / MTs",
    "Siswa SMA / SMK / MA",
    "Santri Pondok Pesantren",
    "Balita & Ibu Hamil Posyandu",
]
PROTEINS = [
    "Daging Ayam Broiler",
    "Telur Ayam Boiler",
    "Ikan Kembung / Lele / Bandeng",
    "Daging Sapi / Kerbau",
    "Susu Pasteurisasi Segar",
]
TRANSPORTS = [
    "Mobil Pickup Termal",
    "Motor Listrik / Roda Tiga Box",
    "Mobil Van Tertutup",
    "Perahu Ketinting Sungai / Laut",
    "Jalan Kaki / Gerobak",
]
DRIVERS = [
    "Prior-Snack-Consumption",
    "Excessive-Portion-Size",
    "Sub-Optimal-Arrival-Temperature",
    "Delivery-Transit-Delay",
    "Low-Palatability-Menu",
]
PROVINCES = [
    "Aceh", "Bali", "Bangka Belitung", "Banten", "Bengkulu", "DI Yogyakarta",
    "DKI Jakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur",
    "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur",
    "Kalimantan Utara", "Kepulauan Riau", "Lampung", "Maluku", "Maluku Utara",
    "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat",
    "Papua Barat Daya", "Papua Pegunungan", "Papua Selatan", "Papua Tengah", "Riau",
    "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara",
    "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara",
]
DRIVER_LABELS = {
    "Prior-Snack-Consumption": "Prior-Snack-Consumption (Jajan Sebelum Makan — 63,43%)",
    "Excessive-Portion-Size": "Excessive-Portion-Size (Porsi Terlalu Besar — 22,40%)",
    "Sub-Optimal-Arrival-Temperature": "Sub-Optimal-Arrival-Temperature (Suhu Tiba Rendah — 8,58%)",
    "Delivery-Transit-Delay": "Delivery-Transit-Delay (Keterlambatan Kirim — 4,04%)",
    "Low-Palatability-Menu": "Low-Palatability-Menu (Penerimaan Rasa Menu — 1,55%)",
}


def render_image(path: str) -> None:
    """Tampilkan gambar responsif kompatibel untuk Streamlit <=1.39 dan >=1.40."""
    params = inspect.signature(st.image).parameters
    if "use_container_width" in params:
        st.image(path, use_container_width=True)
    else:
        st.image(path, use_column_width=True)


@st.cache_resource
def load_all_artifacts():
    """Memuat artefak model serialisasi, metrik Fase 3, dan statistik terverifikasi EDA."""
    store = {}
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        pra_m = os.path.join(BASE, "models", "best_pra.joblib")
        pra_p = os.path.join(BASE, "models", "pipeline_pra.joblib")
        post_m = os.path.join(BASE, "models", "best_posthoc.joblib")
        post_p = os.path.join(BASE, "models", "pipeline_posthoc.joblib")

        if os.path.exists(pra_p) and os.path.exists(pra_m):
            store["pra_pipe"] = joblib.load(pra_p)
            b_pra = joblib.load(pra_m)
            store["pra_model"] = b_pra["model"]
            store["pra_name"] = b_pra.get("name") or b_pra.get("algoritma") or type(b_pra["model"]).__name__
        if os.path.exists(post_p) and os.path.exists(post_m):
            store["post_pipe"] = joblib.load(post_p)
            b_post = joblib.load(post_m)
            store["post_model"] = b_post["model"]
            store["post_name"] = b_post.get("name") or b_post.get("algoritma") or type(b_post["model"]).__name__

    metrics_path = os.path.join(BASE, "models", "fase3_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            store["metrics"] = json.load(f)

    eda_path = os.path.join(BASE, "eda_results.json")
    if os.path.exists(eda_path):
        with open(eda_path, "r", encoding="utf-8") as f:
            store["eda"] = json.load(f)

    return store


def check_api_health(api_url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{api_url.rstrip('/')}/health", timeout=1.2) as r:
            return r.status == 200
    except Exception:
        return False


def call_predict_api(api_url: str, endpoint: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{api_url.rstrip('/')}{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=3.0) as r:
        return json.loads(r.read().decode("utf-8"))


def compute_derived_features(raw_cost: float, calories: float, protein_g: float, temp_c: float, transit_min: float, dist_km: float, sourcing_pct: float = 73.7) -> dict:
    """Menghitung fitur turunan sesuai hubungan matematis terverifikasi pada dataset MBG."""
    cost_total = round(min(15000.0, float(raw_cost) * 1.20), 0)
    cost_nutr = round(float(cost_total / max(1.0, protein_g)), 2)
    cool_rate = round(max(0.106, float(max(0.5, 75.0 - temp_c) / max(1.0, transit_min))), 3)
    spoilage = float(
        np.clip(
            0.5645
            + 0.0505 * transit_min
            + 0.1611 * max(0.0, 70.0 - temp_c)
            + 0.0620 * max(0.0, 60.0 - temp_c)
            - 0.0926 * dist_km,
            0.43,
            10.0,
        )
    )
    multiplier = round(float(np.clip(1.20 + 0.082 * sourcing_pct, 3.37, 9.70)), 2)
    return {
        "total_meal_cost_idr": cost_total,
        "cost_to_nutrition_ratio": cost_nutr,
        "transit_cooling_rate_c_per_min": cool_rate,
        "spoilage_risk_index": round(spoilage, 2),
        "local_economic_multiplier_score": multiplier,
    }


STORE = load_all_artifacts()
EDA = STORE.get("eda", {})
METRICS = STORE.get("metrics", {})
DEFAULT_API_URL = os.environ.get("PLATEGUARD_API_URL", "http://127.0.0.1:8000")

# ================= SIDEBAR =================
with st.sidebar:
    st.title("🍱 PlateGuard MBG")
    st.caption("Prediksi Sisa Makanan Program Makan Bergizi Gratis")
    st.markdown("---")

    st.markdown("### 📋 Profil Proyek")
    st.markdown("**Program:** Makan Bergizi Gratis (BGN)")
    st.markdown("**Akademik:** S2 Ilmu Komputer, Universitas Amikom Purwokerto")
    st.markdown("**Penyusun:** Iqbal Ahdagita Elbadra (26MA41D022)")
    engine_lbl = STORE.get("pra_name", "Gradient Boosting (Optuna)")
    st.markdown(f"**Engine:** `{engine_lbl}` + TreeSHAP")
    st.markdown("---")

    st.markdown("### ⚙️ Status Sistem")
    pra_ok = "pra_model" in STORE and "pra_pipe" in STORE
    post_ok = "post_model" in STORE and "post_pipe" in STORE
    api_live = check_api_health(DEFAULT_API_URL)

    st.success("🟢 Model Pra-distribusi Aktif" if pra_ok else "🔴 Model Pra Offline")
    st.success("🟢 Model Post-Hoc Aktif" if post_ok else "🔴 Model Post Offline")
    if api_live:
        st.info(f"🌐 FastAPI Online (`{DEFAULT_API_URL}`)")
        use_api = st.checkbox("Gunakan Backend FastAPI Live", value=True)
    else:
        st.caption("🔌 Mode Standalone (Model Lokal Tersemat)")
        use_api = False

    st.markdown("---")
    st.caption("PlateGuard MBG v1.1 • Fase 4 Deployment")

# ================= HEADER UTAMA =================
st.title("🍱 PlateGuard MBG: Sistem Prediksi & Monitoring Sisa Makanan")
st.markdown(
    "Mengubah telemetri dapur SPPG menjadi prediksi persentase *plate waste* per rencana distribusi, "
    "sehingga penyesuaian porsi, menu, dan rantai termal dapat dilakukan **SEBELUM** makanan terbuang."
)
st.markdown("---")

tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Ringkasan Eksekutif (EDA Nasional)",
    "🎛️ Prediksi & Simulator (What-If + Batch)",
    "🔍 Explainability (TreeSHAP)",
    "🏆 Benchmark Model & Audit Leakage",
])

# ================= TAB 1: EXECUTIVE OVERVIEW =================
with tab1:
    st.subheader("Ringkasan Kinerja Operasional & Risiko Nasional (13.000 Distribusi, 38 Provinsi)")

    desc = EDA.get("describe", {})
    avg_waste = EDA.get("rataan_sisa_piring_pct", 13.34)
    waste_max = desc.get("plate_waste_percentage", {}).get("max", 37.7)
    avg_cost = EDA.get("rataan_biaya_porsi", 13526.0)
    eff_cost = desc.get("waste_adjusted_effective_cost_idr", {}).get("mean", 15677.08)
    loss_portion = round(eff_cost - avg_cost)
    loss_pct = (loss_portion / avg_cost) * 100.0 if avg_cost else 15.9
    cluster_risk = EDA.get("bermasalah_pct_per_cluster", {
        "Wilayah 3T Perbatasan & Pedalaman": 47.52,
        "Daerah Pedesaan & Kepulauan": 30.60,
        "Luar Jawa Urban": 15.05,
        "Jawa Metropolitan": 13.82,
    })
    pct_cold = EDA.get("pct_suhu_dibawah_60", 22.42)
    suhu_risk = EDA.get("bermasalah_by_suhu60", {"false": 12.5, "true": 63.7})

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-title">Rata-rata Sisa Piring</div>
            <div class="metric-value">{avg_waste:.2f}%</div>
            <div class="metric-sub">Rentang 1,0% s.d. {waste_max:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="metric-card-danger">
            <div class="metric-title">Biaya Menguap / Porsi</div>
            <div class="metric-value">Rp {loss_portion:,}</div>
            <div class="metric-sub">Efektif Rp {eff_cost:,.0f} vs Rp {avg_cost:,.0f} (+{loss_pct:.1f}%)</div>
        </div>
        """.replace(",", "."), unsafe_allow_html=True)
    with c3:
        st.markdown(f"""
        <div class="metric-card-danger">
            <div class="metric-title">Bermasalah Wilayah 3T</div>
            <div class="metric-value">{cluster_risk.get('Wilayah 3T Perbatasan & Pedalaman', 47.52):.2f}%</div>
            <div class="metric-sub">vs {cluster_risk.get('Jawa Metropolitan', 13.82):.2f}% di Jawa Metropolitan</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-title">Suhu Tiba &lt; 60°C</div>
            <div class="metric-value">{pct_cold:.2f}%</div>
            <div class="metric-sub">Risiko bermasalah {suhu_risk.get('true', 63.7):.1f}% vs {suhu_risk.get('false', 12.5):.1f}%</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.markdown("#### 📍 Disparitas Distribusi Bermasalah per Klaster")
        st.caption("Persentase tier Marginal & Non-Compliant berdasarkan `eda_results.json`.")
        cluster_df = pd.DataFrame({
            "Klaster Wilayah": list(cluster_risk.keys()),
            "Distribusi Bermasalah (%)": list(cluster_risk.values()),
        })
        st.bar_chart(cluster_df.set_index("Klaster Wilayah"), color="#c0392b")

    with col_right:
        st.markdown("#### ⚠️ Proporsi Faktor Pemicu Utama & Risiko Tier")
        st.caption("Proporsi aktual 13.000 baris dan persentase kategori bermasalah per pemicu.")
        crosstab = EDA.get("driver_tier_crosstab_pct", {})
        driver_rows = [
            ("Prior-Snack-Consumption (Jajan Sebelum Makan)", 63.43,
             crosstab.get("Prior-Snack-Consumption", {}).get("Marginal-Quality-At-Risk", 6.9)
             + crosstab.get("Prior-Snack-Consumption", {}).get("Non-Compliant-Intervention-Required", 0.0)),
            ("Excessive-Portion-Size (Porsi Terlalu Besar)", 22.40,
             crosstab.get("Excessive-Portion-Size", {}).get("Marginal-Quality-At-Risk", 36.1)
             + crosstab.get("Excessive-Portion-Size", {}).get("Non-Compliant-Intervention-Required", 0.1)),
            ("Sub-Optimal-Arrival-Temperature (Suhu < 60°C)", 8.58,
             crosstab.get("Sub-Optimal-Arrival-Temperature", {}).get("Marginal-Quality-At-Risk", 30.7)
             + crosstab.get("Sub-Optimal-Arrival-Temperature", {}).get("Non-Compliant-Intervention-Required", 69.3)),
            ("Delivery-Transit-Delay (Keterlambatan Kirim)", 4.04,
             crosstab.get("Delivery-Transit-Delay", {}).get("Marginal-Quality-At-Risk", 54.9)
             + crosstab.get("Delivery-Transit-Delay", {}).get("Non-Compliant-Intervention-Required", 0.2)),
            ("Low-Palatability-Menu (Rasa Kurang Disukai)", 1.55,
             crosstab.get("Low-Palatability-Menu", {}).get("Marginal-Quality-At-Risk", 47.0)
             + crosstab.get("Low-Palatability-Menu", {}).get("Non-Compliant-Intervention-Required", 0.0)),
        ]
        driver_df = pd.DataFrame(driver_rows, columns=[
            "Faktor Pemicu Utama", "Proporsi Kasus (%)", "Tingkat Bermasalah (%)"
        ])
        driver_df["Tingkat Bermasalah (%)"] = driver_df["Tingkat Bermasalah (%)"].round(1)
        st.dataframe(driver_df, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("#### 🗺️ 8 Provinsi dengan Tingkat Risiko Distribusi Tertinggi (Data Terverifikasi)")
    prov_map = EDA.get("bermasalah_pct_provinsi_teratas", {
        "Kalimantan Utara": 51.3,
        "Papua Selatan": 46.8,
        "Papua Pegunungan": 44.8,
        "Papua Tengah": 44.0,
        "Nusa Tenggara Timur": 42.8,
        "Papua Barat Daya": 42.8,
        "Papua": 42.5,
        "Maluku": 42.2,
    })
    prov_df = pd.DataFrame([
        {
            "Provinsi": prov,
            "Distribusi Bermasalah (%)": val,
            "Prioritas Pengawasan": "Intervensi Khusus (3T & Rantai Dingin)" if val >= 44.0 else "Prioritas Logistik Kepulauan",
        }
        for prov, val in prov_map.items()
    ])
    st.dataframe(prov_df, use_container_width=True, hide_index=True)


# ================= TAB 2: PREDIKSI & SIMULATOR =================
with tab2:
    st.subheader("Simulator Rencana Distribusi & Pusat Prediksi")
    mode_pred = st.radio(
        "Pilih Mode Model Prediksi:",
        [
            "Pra-distribusi (33 Fitur — Perencanaan Sebelum Kirim)",
            "Post-Hoc Audit (37 Fitur — Evaluasi Akar Masalah Lapangan)",
        ],
        horizontal=True,
    )
    is_posthoc = "Post-Hoc" in mode_pred

    with st.form("form_simulator"):
        c_wil, c_gizi, c_log = st.columns(3)

        with c_wil:
            st.markdown("##### 📍 Wilayah & Penerima")
            cluster = st.selectbox("Klaster Wilayah", CLUSTERS, index=0)
            province = st.selectbox("Provinsi Tujuan", PROVINCES, index=PROVINCES.index("Jawa Tengah"))
            beneficiary = st.selectbox("Kategori Penerima Manfaat", BENEFICIARIES, index=0)
            kitchen_cap = st.slider("Kapasitas Dapur SPPG (porsi/hari)", 500, 3600, 1780, step=50)
            sourcing_pct = st.slider("Pasokan Petani Lokal (%)", 35.0, 100.0, 73.7, step=1.0)

        with c_gizi:
            st.markdown("##### 🍗 Menu & Kandungan Nutrisi")
            protein = st.selectbox("Komoditas Lauk Protein", PROTEINS, index=0)
            calories = st.slider("Kandungan Energi (kkal)", 510.0, 850.0, 680.0, step=10.0)
            protein_g = st.slider("Kandungan Protein (gram)", 15.0, 35.0, 22.7, step=0.5)
            cost_raw = st.number_input("Biaya Bahan Baku / Porsi (Rp)", min_value=5000, max_value=20000, value=11300, step=200)

        with c_log:
            st.markdown("##### 🚚 Logistik & Kondisi Termal")
            transport = st.selectbox("Moda Transportasi Pengiriman", TRANSPORTS, index=0)
            distance = st.slider("Jarak Pengantaran (km)", 0.5, 35.0, 6.8, step=0.5)
            transit_min = st.slider("Estimasi Waktu Transit (menit)", 5, 120, 25, step=5)
            temperature = st.slider("Estimasi Suhu Tiba di Sekolah (°C)", 30.0, 72.0, 65.0, step=0.5)

        if is_posthoc:
            st.markdown("##### 🔎 Faktor Pemicu Lapangan (Khusus Mode Post-Hoc)")
            waste_driver = st.selectbox(
                "Pemicu Utama Sisa Makanan Teramati",
                DRIVERS,
                format_func=lambda d: DRIVER_LABELS.get(d, d),
            )
        else:
            waste_driver = None

        btn_submit = st.form_submit_button("🚀 Hitung Prediksi Sisa Makanan", use_container_width=True)

    if btn_submit:
        derived = compute_derived_features(cost_raw, calories, protein_g, temperature, transit_min, distance, sourcing_pct)
        payload = {
            "kitchen_daily_capacity_portions": kitchen_cap,
            "raw_ingredient_cost_per_portion_idr": float(cost_raw),
            "student_attendance_rate_pct": 94.4,
            "local_farmer_sourcing_pct": float(sourcing_pct),
            "total_meal_cost_idr": derived["total_meal_cost_idr"],
            "estimated_calories_kcal": float(calories),
            "estimated_protein_grams": float(protein_g),
            "cost_to_nutrition_ratio": derived["cost_to_nutrition_ratio"],
            "local_economic_multiplier_score": derived["local_economic_multiplier_score"],
            "delivery_distance_km": float(distance),
            "transit_time_minutes": float(transit_min),
            "spoilage_risk_index": derived["spoilage_risk_index"],
            "transit_cooling_rate_c_per_min": derived["transit_cooling_rate_c_per_min"],
            "food_arrival_temperature_celsius": float(temperature),
            "regional_cluster": cluster,
            "province": province,
            "beneficiary_category": beneficiary,
            "protein_type": protein,
            "delivery_transport_mode": transport,
        }
        if is_posthoc:
            payload["primary_food_waste_driver"] = waste_driver

        used_source = "Model Lokal (.joblib)"
        api_recs = None
        if use_api:
            try:
                ep = "/predict/posthoc" if is_posthoc else "/predict/pra"
                resp = call_predict_api(DEFAULT_API_URL, ep, payload)
                pred_pct = resp["predicted_plate_waste_percentage"]
                cost_total = derived["total_meal_cost_idr"]
                loss_porsi = round(resp["estimated_loss_per_portion_idr"], 0)
                effective_cost = round(resp["effective_cost_per_portion_idr"], 0)
                api_recs = resp["recommendations"]
                used_source = f"FastAPI Endpoint (`{ep}`, {resp['latency_ms']} ms)"
            except Exception as exc:
                st.warning(f"API gagal dihubungi ({exc}); beralih ke model lokal.")
                use_api_local = True
            else:
                use_api_local = False
        else:
            use_api_local = True

        if use_api_local:
            pipe_key = "post_pipe" if is_posthoc else "pra_pipe"
            model_key = "post_model" if is_posthoc else "pra_model"
            df_in = pd.DataFrame([payload])
            X_trans = STORE[pipe_key].transform(df_in)
            pred_pct = round(float(np.clip(STORE[model_key].predict(X_trans)[0], 0.0, 100.0)), 2)
            cost_total = derived["total_meal_cost_idr"]
            loss_porsi = round(cost_total * (pred_pct / 100.0), 0)
            effective_cost = round(cost_total / max(0.01, (1.0 - pred_pct / 100.0)), 0)

        loss_harian = round(loss_porsi * kitchen_cap, 0)

        st.markdown("---")
        st.markdown(f"### 🎯 Hasil Prediksi ({used_source})")
        res1, res2, res3 = st.columns(3)
        with res1:
            if pred_pct < 10.0:
                st.success(f"### {pred_pct:.2f}%\n**Risiko Rendah (Efisien)**")
            elif pred_pct <= 15.0:
                st.warning(f"### {pred_pct:.2f}%\n**Risiko Sedang (Terkendali)**")
            else:
                st.error(f"### {pred_pct:.2f}%\n**Risiko Tinggi (Intervensi)**")
            st.caption(f"Rasio biaya/protein: Rp {derived['cost_to_nutrition_ratio']:.1f}/g | Spoilage proxy: {derived['spoilage_risk_index']:.2f}")

        with res2:
            st.metric("Biaya Menguap / Porsi", f"Rp {loss_porsi:,.0f}".replace(",", "."))
            st.caption(f"Biaya produksi Rp {cost_total:,.0f} → Efektif Rp {effective_cost:,.0f}".replace(",", "."))

        with res3:
            st.metric(f"Potensi Pemborosan ({kitchen_cap:,} porsi/hari)".replace(",", "."), f"Rp {loss_harian:,.0f}".replace(",", "."))
            st.caption("Estimasi kerugian harian satu dapur SPPG")

        st.markdown("#### 💡 Rekomendasi Aksi Mitigasi:")
        if api_recs is not None:
            for r in api_recs:
                st.markdown(f"- {r}")
        else:
            recs = []
            if pred_pct >= 15.0:
                recs.append("⚠️ **RISIKO TINGGI:** Prediksi sisa makanan >= 15%. Perlu penyesuaian porsi, menu, atau waktu kirim.")
            if temperature < 60.0:
                recs.append(f"🌡️ **KRITIS SUHU ({temperature:.1f}°C < 60°C):** Di bawah batas aman HACCP. Gunakan boks termal terinsulasi ganda.")
            if transit_min > 60:
                recs.append(f"⏱️ **TRANSIT EKSTREM ({transit_min} menit):** Pertimbangkan dapur satelit terdekat atau percepat jadwal kirim.")
            if calories > 800:
                recs.append(f"🍱 **PORSI PADAT ({calories:.0f} kkal):** Evaluasi porsi karbohidrat sesuai jenjang sekolah penerima.")
            elif calories < 550:
                recs.append(f"🥗 **ENERGI RENDAH ({calories:.0f} kkal):** Tingkatkan densitas kalori dan protein lauk.")
            if "3T" in cluster:
                recs.append("📍 **ZONA 3T:** Wilayah dengan risiko bermasalah 47,52%. Prioritaskan pengemasan termal dan monitoring.")
            if is_posthoc and waste_driver == "Prior-Snack-Consumption":
                recs.append("🔍 **AKAR MASALAH (Jajanan, 63,43%):** Koordinasi pembatasan jam buka kantin 2 jam sebelum makan siang.")
            if not recs:
                st.success("✅ **Rencana Distribusi Optimal:** Parameter gizi, suhu, dan logistik berada di zona aman.")
            else:
                for r in recs:
                    st.markdown(f"- {r}")

    # Bagian Inspeksi Hasil Prediksi Holdout Test & Prediksi Batch CSV
    st.markdown("---")
    with st.expander("📂 Lihat Sampel Hasil Prediksi Holdout Test (2.600 Data Uji) & Download CSV", expanded=False):
        x_pra_p = os.path.join(BASE, "data", "processed", "pra", "X_test.csv")
        y_pra_p = os.path.join(BASE, "data", "processed", "pra", "y_test.csv")
        x_post_p = os.path.join(BASE, "data", "processed", "posthoc", "X_test.csv")
        if os.path.exists(x_pra_p) and os.path.exists(y_pra_p) and pra_ok:
            X_te_pra = pd.read_csv(x_pra_p)
            y_te = pd.read_csv(y_pra_p).iloc[:, 0]
            pred_te_pra = np.clip(STORE["pra_model"].predict(X_te_pra), 0.0, 100.0)
            df_eval = pd.DataFrame({
                "Baris Uji": np.arange(1, len(y_te) + 1),
                "Aktual Plate Waste (%)": y_te.round(2),
                "Prediksi Pra-Distribusi (%)": np.round(pred_te_pra, 2),
                "Selisih Absolut Pra (pp)": np.round(np.abs(y_te - pred_te_pra), 2),
            })
            if os.path.exists(x_post_p) and post_ok:
                X_te_post = pd.read_csv(x_post_p)
                pred_te_post = np.clip(STORE["post_model"].predict(X_te_post), 0.0, 100.0)
                df_eval["Prediksi Post-Hoc (%)"] = np.round(pred_te_post, 2)
                df_eval["Selisih Absolut Post-Hoc (pp)"] = np.round(np.abs(y_te - pred_te_post), 2)

            st.caption(
                f"Menampilkan 25 baris pertama dari **{len(df_eval):,}** data uji holdout Fase 3 "
                f"(MAE Pra = {df_eval['Selisih Absolut Pra (pp)'].mean():.3f} pp)."
            )
            st.dataframe(df_eval.head(25), use_container_width=True, hide_index=True)
            st.download_button(
                "⬇️ Unduh Seluruh 2.600 Prediksi Holdout (.csv)",
                data=df_eval.to_csv(index=False).encode("utf-8"),
                file_name="plateguard_holdout_predictions.csv",
                mime="text/csv",
            )
        else:
            st.info("Dataset uji terproses (`data/processed/*/X_test.csv`) tidak ditemukan.")


# ================= TAB 3: EXPLAINABILITY (SHAP) =================
with tab3:
    st.subheader("Interpretabilitas Model & Analisis Nilai TreeSHAP")
    st.markdown(
        "Pendekatan *Explainable AI* (**TreeSHAP**) memastikan pengambil kebijakan BGN memahami "
        "fitur mana yang mendorong kenaikan atau penurunan *plate waste*."
    )

    shap_scenario = st.radio(
        "Pilih Skenario Analisis SHAP:",
        ["Pra-distribusi (33 Fitur)", "Post-Hoc Audit (37 Fitur)"],
        horizontal=True,
    )

    if "Pra-distribusi" in shap_scenario:
        c_shp1, c_shp2 = st.columns(2)
        with c_shp1:
            st.markdown("##### SHAP Beeswarm Plot (Pra-distribusi)")
            p_bee = os.path.join(BASE, "figures_fase3", "shap_beeswarm_pra.png")
            if os.path.exists(p_bee):
                render_image(p_bee)
        with c_shp2:
            st.markdown("##### SHAP Bar Importance (Pra-distribusi)")
            p_bar = os.path.join(BASE, "figures_fase3", "shap_bar_pra.png")
            if os.path.exists(p_bar):
                render_image(p_bar)
        st.markdown("""
        **Temuan Kunci SHAP Pra-distribusi:**
        1. **Kandungan Kalori (`estimated_calories_kcal`):** Fitur paling dominan; titik merah (kalori cukup ~680–760 kkal) bergeser ke SHAP negatif (menurunkan sisa piring).
        2. **Suhu Tiba Ter-refleksi (`refllog_food_arrival_temperature_celsius`):** Suhu dingin (nilai refleksi tinggi, titik merah) mendorong prediksi sisa piring naik tajam.
        3. **Rasio Biaya-Gizi & Klaster Wilayah:** Biaya per gram protein tinggi dan pengiriman di daerah 3T/pedesaan berkontribusi menaikkan prediksi pemborosan.
        """)
    else:
        c_post1, c_post2 = st.columns(2)
        with c_post1:
            st.markdown("##### SHAP Beeswarm Plot (Post-Hoc)")
            p_bee_post = os.path.join(BASE, "figures_fase3", "shap_beeswarm_posthoc.png")
            if os.path.exists(p_bee_post):
                render_image(p_bee_post)
        with c_post2:
            st.markdown("##### SHAP Bar Importance (Post-Hoc)")
            p_bar_post = os.path.join(BASE, "figures_fase3", "shap_bar_posthoc.png")
            if os.path.exists(p_bar_post):
                render_image(p_bar_post)
        st.markdown("""
        **Temuan Kunci SHAP Post-Hoc:**
        1. **`Prior-Snack-Consumption`:** Pemicu tunggal terkuat (terjadi pada 63,43% kasus); siswa yang sudah jajan sebelum jam makan menghasilkan lonjakan *plate waste* signifikan.
        2. **`Sub-Optimal-Arrival-Temperature`:** Makanan tiba dingin (< 60°C) mendorong hampir seluruh distribusi tersebut masuk tier bermasalah (30,7% Marginal + 69,3% Non-Compliant).
        """)


# ================= TAB 4: BENCHMARK & DATA INTEGRITY =================
with tab4:
    st.subheader("Benchmark Model & Guardrail Integritas Data")
    pra_m = METRICS.get("pra", {"MAE": 3.654, "RMSE": 4.583, "R2": 0.333})
    post_m = METRICS.get("posthoc", {"MAE": 2.921, "RMSE": 3.752, "R2": 0.553})
    leak_demo = EDA.get("reg_hgb_leak_tier_demo", {"mae": 2.363, "rmse": 3.146, "r2": 0.682})

    n_feat_pra = pra_m.get("n_features", 33)
    n_feat_post = post_m.get("n_features", 37)
    te_tag = " + Province TE" if pra_m.get("use_province_te") else ""

    st.markdown(f"#### 🏆 Komparasi Kinerja Holdout Test Set (2.600 Sampel{te_tag})")
    dyn_rows = []
    if "holdout_all_models" in pra_m and "holdout_all_models" in post_m:
        for r in pra_m["holdout_all_models"]:
            dyn_rows.append({
                "Algoritma": r["model"],
                "Skenario": f"Pra-distribusi ({n_feat_pra} Fitur)",
                "CV MAE 5-Fold": f"{r['cv_mae_mean']:.3f} ± {r['cv_mae_std']:.3f}",
                "Holdout MAE (pp)": round(r["holdout_MAE"], 3),
                "Holdout RMSE (pp)": round(r["holdout_RMSE"], 3),
                "Holdout R²": round(r["holdout_R2"], 3),
                "Catatan": "⭐ Terbaik Pra-Kirim" if "Optuna" in r["model"] else "Benchmark Charter",
            })
        for r in post_m["holdout_all_models"]:
            if r["model"] == "MeanPredictor":
                continue
            dyn_rows.append({
                "Algoritma": r["model"],
                "Skenario": f"Post-Hoc ({n_feat_post} Fitur)",
                "CV MAE 5-Fold": f"{r['cv_mae_mean']:.3f} ± {r['cv_mae_std']:.3f}",
                "Holdout MAE (pp)": round(r["holdout_MAE"], 3),
                "Holdout RMSE (pp)": round(r["holdout_RMSE"], 3),
                "Holdout R²": round(r["holdout_R2"], 3),
                "Catatan": "✅ Lolos Semua Target" if r["holdout_MAE"] <= 3.0 else "Benchmark Charter",
            })
        dyn_rows.append({
            "Algoritma": "HGB + Tier Kepatuhan (CV EDA)",
            "Skenario": "Demo Kebocoran Data",
            "CV MAE 5-Fold": f"{leak_demo['mae']:.3f}",
            "Holdout MAE (pp)": leak_demo["mae"],
            "Holdout RMSE (pp)": leak_demo["rmse"],
            "Holdout R²": leak_demo["r2"],
            "Catatan": "❌ DITOLAK (Target Leakage)",
        })
        eval_table = pd.DataFrame(dyn_rows)
    else:
        eval_table = pd.DataFrame([
            {"Algoritma": "Baseline (Mean-Predictor)", "Skenario": "Tanpa Fitur", "MAE (pp)": 4.447, "RMSE (pp)": 5.613, "R²": 0.000, "Status Charter": "Batas Bawah Acuan"},
            {"Algoritma": "LightGBM (Default)", "Skenario": "Pra-distribusi", "MAE (pp)": 3.722, "RMSE (pp)": 4.688, "R²": 0.302, "Status Charter": "Tree Ensemble"},
            {"Algoritma": "Ridge Regression (alpha=1)", "Skenario": "Pra-distribusi", "MAE (pp)": 3.720, "RMSE (pp)": 4.672, "R²": 0.307, "Status Charter": "Model Linear"},
            {"Algoritma": "XGBoost (Default)", "Skenario": "Pra-distribusi", "MAE (pp)": 3.715, "RMSE (pp)": 4.681, "R²": 0.305, "Status Charter": "Tree Ensemble"},
            {"Algoritma": "HistGradientBoosting", "Skenario": "Pra-distribusi", "MAE (pp)": 3.662, "RMSE (pp)": 4.595, "R²": 0.330, "Status Charter": "Tree Ensemble"},
            {"Algoritma": pra_m["best_model"], "Skenario": f"Pra-distribusi ({n_feat_pra} Fitur)", "MAE (pp)": pra_m["MAE"], "RMSE (pp)": pra_m["RMSE"], "R²": pra_m["R2"], "Status Charter": "⭐ Terbaik Pra-Kirim"},
            {"Algoritma": post_m["best_model"], "Skenario": f"Post-Hoc ({n_feat_post} Fitur)", "MAE (pp)": post_m["MAE"], "RMSE (pp)": post_m["RMSE"], "R²": post_m["R2"], "Status Charter": "✅ Lolos Semua Target"},
            {"Algoritma": "HGB + Tier Kepatuhan (CV EDA)", "Skenario": "Demo Kebocoran Data", "MAE (pp)": leak_demo["mae"], "RMSE (pp)": leak_demo["rmse"], "R²": leak_demo["r2"], "Status Charter": "❌ DITOLAK (Target Leakage)"},
        ])
    st.dataframe(eval_table, use_container_width=True, hide_index=True)

    cv_csv = os.path.join(BASE, "models", "cv_per_fold_report.csv")
    if os.path.exists(cv_csv):
        with st.expander("📊 Detail Evaluasi 5-Fold Cross Validation Per-Fold (models/cv_per_fold_report.csv)"):
            df_cv = pd.read_csv(cv_csv)
            st.dataframe(df_cv, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("#### 🛡️ Audit Guardrail Anti-Kebocoran Data (Data Leakage)")
    max_diff = EDA.get("leak_effective_cost_maxdiff", 0.5)
    rf_leak = EDA.get("rf_cv_acc", 0.997) * 100
    st.markdown(f"""
    Proyek ini membuktikan secara empiris dan memblokir dua sumber kebocoran data pada [`etl_pipeline.py`](etl_pipeline.py):
    1. **Kebocoran Aljabar (`waste_adjusted_effective_cost_idr`):**
       - Rumus deterministik: $\\text{{Biaya Efektif}} = \\frac{{\\text{{Total Meal Cost}}}}{{1 - (\\text{{Plate Waste \\%}} / 100)}}$.
       - Selisih maksimum terhadap data kolom asli hanyalah **Rp {max_diff:.2f}** akibat pembulatan.
    2. **Kebocoran Label Turunan Aturan (`bgn_program_compliance_tier`):**
       - Tier kepatuhan diturunkan dari ambang sisa makanan 20% & 30% (Random Forest memprediksinya dengan akurasi **{rf_leak:.1f}%**).
       - Menyertakannya mengangkat $R^2$ semu ke **{leak_demo['r2']:.3f}** dan oleh karena itu diblokir dari pipeline pelatihan.
    """)
