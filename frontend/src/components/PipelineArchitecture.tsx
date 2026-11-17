"use client";

import { useState } from "react";
import { Check, Cpu, Database, Layers, ShieldCheck, Sparkles } from "lucide-react";

const STAGES = [
  {
    id: "guardrail",
    step: "01",
    name: "Guardrail anti-leakage",
    module: "etl_pipeline.py",
    badge: "3 tahap filter",
    icon: ShieldCheck,
    summary:
      "Menolak fitur yang mengandung informasi sisa makanan secara matematis maupun aturan ambang evaluasi.",
    details: [
      "Blokir waste_adjusted_effective_cost_idr karena selisih terhadap biaya/(1 - waste/100) maks hanya Rp0,5.",
      "Blokir bgn_program_compliance_tier karena kelasnya memakai ambang sisa piring 20%-30%.",
      "Split kuartil terstratifikasi (80:20) memastikan fit scaler dan encoder tidak menyentuh 2.600 data uji.",
    ],
    metricLabel: "Integritas fitur",
    metricValue: "R² turun 0,682 → 0,551 (valid)",
  },
  {
    id: "engineering",
    step: "02",
    name: "Rekayasa fitur logistik",
    module: "FeatureBuilder",
    badge: "34 Pra / 38 Post",
    icon: Layers,
    summary:
      "Mengubah metrik mentah dapur menjadi indikator ekonomi gizi, kecepatan kirim, dan penyusutan termal.",
    details: [
      "biaya_per_kkal = total_meal_cost_idr / estimated_calories_kcal mengukur efisiensi anggaran energi.",
      "kecepatan_km_jam & interaksi suhu x waktu transit menangkap kerentanan rute terpencil.",
      "Transformasi refleksi-log pada arrival temperature karena sebaran miring kiri di zona aman >=60°C.",
    ],
    metricLabel: "Fitur turunan inti",
    metricValue: "3 interaksi + refleksi log",
  },
  {
    id: "encoding",
    step: "03",
    name: "Province TargetEncoder",
    module: "5-Fold Out-of-Fold",
    badge: "38 provinsi",
    icon: Database,
    summary:
      "Mengenkode heterogenitas 38 provinsi menjadi bobot numerik kontinu tanpa ledakan dimensi one-hot.",
    details: [
      "Dikalibrasi memakai scikit-learn TargetEncoder (smooth='auto', cv=5) murni di dalam lipatan latih.",
      "Ablasi CV menunjukkan peningkatan stabilitas pada Post-Hoc (CV MAE turun 2,9893 → 2,9840).",
      "Melengkapi sinyal klaster 3T khususnya untuk wilayah Papua Pegunungan, Papua Selatan, & Kalimantan Utara.",
    ],
    metricLabel: "Cakupan spasial",
    metricValue: "38 provinsi terkalibrasi",
  },
  {
    id: "tuning",
    step: "04",
    name: "Optuna 5-Fold LightGBM",
    module: "train.py",
    badge: "30 trial x 5 fold",
    icon: Cpu,
    summary:
      "Pencarian hiperparameter terpandu Tree-structured Parzen Estimator meminimalkan CV MAE rata-rata.",
    details: [
      "Menyeimbangkan kapasitas daun (num_leaves) dan regularisasi L1/L2 agar tidak overfit pada data holdout.",
      "Model Pra-Distribusi terbaik mencapai CV MAE 3,6044 ± 0,0417 (Holdout R² 0,333).",
      "Model Post-Hoc terbaik mencapai CV MAE 2,9051 ± 0,0464 (Holdout MAE 2,929 · R² 0,551).",
    ],
    metricLabel: "Holdout terbaik",
    metricValue: "MAE 3,658 (Pra) · 2,929 (Post)",
  },
  {
    id: "shap",
    step: "05",
    name: "TreeSHAP & rekomendasi",
    module: "api.py · FastAPI",
    badge: "< 20 ms/req",
    icon: Sparkles,
    summary:
      "Menjelaskan atribusi faktor penyumbang pada setiap prediksi individual sekaligus menyusun langkah korektif.",
    details: [
      "Menjumlahkan nilai Shapley fitur one-hot ke faktor operasional asli agar tetap terbaca staf SPPG.",
      "Menampilkan selisih langsung (dalam poin persentase) relatif terhadap rataan nasional 13,33%.",
      "Memicu peringatan suhu HACCP <60°C, keterlambatan transit >60 menit, dan audit kebiasaan jajan.",
    ],
    metricLabel: "Keluaran aksi",
    metricValue: "SHAP + biaya terbuang (Rp)",
  },
] as const;

export default function PipelineArchitecture() {
  const [activeId, setActiveId] = useState<string>(STAGES[0].id);
  const current = STAGES.find((s) => s.id === activeId) ?? STAGES[0];

  return (
    <div className="hairline-card overflow-hidden">
      {/* Top Pipeline Rail */}
      <div className="grid grid-cols-1 divide-y divide-[rgba(6,82,92,0.1)] border-b border-[rgba(6,82,92,0.12)] bg-[#ebf0ee]/60 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const active = stage.id === activeId;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveId(stage.id)}
              className={`group flex flex-col justify-between p-4 text-left transition-colors cursor-pointer ${
                active
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "bg-transparent text-[#0d2429] hover:bg-[#ebf0ee]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`t-mono text-[12px] ${
                    active ? "text-[#cdd6c6]" : "text-[#2f737d]"
                  }`}
                >
                  {stage.step}
                </span>
                <Icon
                  className={`h-4 w-4 ${
                    active ? "text-[#cdd6c6]" : "text-[#06525c]"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4">
                <div className="text-[14px] font-semibold leading-snug">
                  {stage.name}
                </div>
                <div
                  className={`t-mono mt-1 text-[11px] ${
                    active ? "text-[#c1d0d2]" : "text-[#2f737d]"
                  }`}
                >
                  {stage.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stage Detail Inspection Panel */}
      <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="t-mono text-[12px] text-[#2f737d]">
            MODUL: {current.module}
          </div>
          <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-[#0d2429]">
            {current.name}
          </h3>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[#2f737d]">
            {current.summary}
          </p>
          <div className="mt-5 rounded-xl border border-[rgba(6,82,92,0.12)] bg-[#f7f9f8] p-4">
            <div className="text-[12px] text-[#2f737d]">{current.metricLabel}</div>
            <div className="t-mono mt-1 text-[15px] font-semibold text-[#06525c]">
              {current.metricValue}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="text-[13px] font-medium text-[#2f737d]">
            Ketentuan teknis yang dijalankan pada tahap ini:
          </div>
          <ul className="mt-3 space-y-3">
            {current.details.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3.5 text-[14px] leading-relaxed text-[#0d2429]"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ebf0ee] text-[#06525c]">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
