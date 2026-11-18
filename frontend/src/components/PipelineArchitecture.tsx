"use client";

import { useState } from "react";
import { Check, Cpu, Database, Layers, ShieldCheck, Sparkles } from "lucide-react";

const STAGES = [
  {
    id: "guardrail",
    step: "01",
    name: "Blokir Data Bocor",
    techName: "Guardrail anti-leakage",
    module: "etl_pipeline.py",
    badge: "3 tahap filter",
    icon: ShieldCheck,
    summaryPlain:
      "Menyaring kolom yang menyembunyikan jawaban akhir supaya model tidak menipu diri sendiri dengan menebak nilai yang sudah ketahuan.",
    summaryTech:
      "Menolak fitur yang mengandung informasi sisa makanan secara matematis maupun aturan ambang evaluasi.",
    details: [
      "Memblokir biaya efektif pasca-sisa karena nilainya dihitung langsung dari target sisa piring (selisih maks Rp0,5).",
      "Memblokir label kelas kepatuhan karena kategorinya memakai batas sisa piring 20%-30%.",
      "Memisahkan 2.600 data uji sebelum proses penskalaan berjalan agar evaluasi tetap jujur.",
    ],
    metricLabel: "Integritas fitur",
    metricValue: "R² turun 0,682 -> 0,551 (jujur)",
  },
  {
    id: "engineering",
    step: "02",
    name: "Olah Ciri Pengantaran",
    techName: "Rekayasa fitur logistik",
    module: "FeatureBuilder",
    badge: "34 Pra / 38 Post",
    icon: Layers,
    summaryPlain:
      "Menghitung indikator tambahan yang mudah dimaknai di dapur, misalnya ongkos per kalori dan kecepatan rata-rata kurir.",
    summaryTech:
      "Mengubah metrik mentah dapur menjadi indikator ekonomi gizi, kecepatan kirim, dan penyusutan termal.",
    details: [
      "biaya_per_kkal mengukur seberapa efisien uang menu membeli tenaga makanan.",
      "kecepatan_km_jam serta gabungan suhu x lama perjalanan menangkap rute yang terhambat.",
      "Melakukan refleksi logaritma pada suhu tiba karena sebagian besar kiriman berada di zona aman >=60°C.",
    ],
    metricLabel: "Fitur turunan inti",
    metricValue: "3 interaksi + refleksi log",
  },
  {
    id: "encoding",
    step: "03",
    name: "Kalibrasi 38 Provinsi",
    techName: "Province TargetEncoder",
    module: "5-Fold Out-of-Fold",
    badge: "38 provinsi",
    icon: Database,
    summaryPlain:
      "Memberi bobot ciri khas tiap provinsi di Indonesia dari Aceh hingga Papua tanpa membuat tabel data terlalu lebar.",
    summaryTech:
      "Mengenkode heterogenitas 38 provinsi menjadi bobot numerik kontinu tanpa ledakan dimensi one-hot.",
    details: [
      "Menggunakan TargetEncoder (cv=5) murni di dalam data latih supaya data uji tetap steril.",
      "Uji perbandingan membuktikan kestabilan kesalahan pada skenario evaluasi akhir (CV MAE 2,9893 -> 2,9840).",
      "Melengkapi ciri wilayah 3T khususnya di Papua Pegunungan, Papua Selatan, dan Kalimantan Utara.",
    ],
    metricLabel: "Cakupan spasial",
    metricValue: "38 provinsi terkalibrasi",
  },
  {
    id: "tuning",
    step: "04",
    name: "Penyetelan Model Terbaik",
    techName: "Optuna 5-Fold LightGBM",
    module: "train.py",
    badge: "30 uji x 5 lipatan",
    icon: Cpu,
    summaryPlain:
      "Menguji 6 jenis algoritma dan mencari setelan terbaik secara otomatis hingga tingkat kesalahan paling rendah.",
    summaryTech:
      "Pencarian hiperparameter terpandu Tree-structured Parzen Estimator meminimalkan CV MAE rata-rata.",
    details: [
      "Menyeimbangkan kedalaman pohon keputusan agar akurat baik di Jawa maupun rute kepulauan.",
      "Mode Pra-Distribusi terbaik mencapai CV MAE 3,6044 +- 0,0417 (Holdout MAE 3,658 pp).",
      "Mode Post-Hoc terbaik mencapai CV MAE 2,9051 +- 0,0464 (Holdout MAE 2,929 · R² 0,551).",
    ],
    metricLabel: "Holdout terbaik",
    metricValue: "MAE 3,658 (Pra) · 2,929 (Post)",
  },
  {
    id: "shap",
    step: "05",
    name: "Penjelas Awam & Aksi",
    techName: "TreeSHAP & Humanizer",
    module: "api.py · humanizer_explainer.py",
    badge: "Bahasa Sederhana",
    icon: Sparkles,
    summaryPlain:
      "Menerjemahkan hitungan rumit TreeSHAP menjadi kalimat Indonesia sehari-hari agar mudah langsung ditindaklanjuti pengelola dapur.",
    summaryTech:
      "Menjelaskan atribusi faktor penyumbang pada setiap prediksi individual sekaligus menyusun langkah korektif.",
    details: [
      "Menjumlahkan nilai Shapley fitur pecahan ke faktor asli seperti suhu, protein, dan provinsi.",
      "Menyusun ringkasan Bahasa Awam memakai kaidah active-voice lugas tanpa jargon statis.",
      "Memicu peringatan suhu <60°C, keterlambatan >60 menit, dan kebiasaan jajan siswa.",
    ],
    metricLabel: "Keluaran aksi",
    metricValue: "SHAP + Ringkasan Awam + Rp",
  },
] as const;

export default function PipelineArchitecture({
  plainMode = true,
}: {
  plainMode?: boolean;
}) {
  const [activeId, setActiveId] = useState<string>(STAGES[0].id);
  const current = STAGES.find((s) => s.id === activeId) ?? STAGES[0];

  return (
    <div className="hairline-card overflow-hidden">
      {/* Top Pipeline Rail */}
      <div className="grid grid-cols-1 divide-y divide-[rgba(15,82,87,0.1)] border-b border-[rgba(15,82,87,0.12)] bg-white/45 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
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
                  ? "bg-[#0f5257] text-white"
                  : "bg-transparent text-[#141414] hover:bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`t-mono text-[12px] font-semibold ${
                    active ? "text-[#cdd6c6]" : "text-[#3d525c]"
                  }`}
                >
                  {stage.step}
                </span>
                <Icon
                  className={`h-4 w-4 ${
                    active ? "text-[#cdd6c6]" : "text-[#0f5257]"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4">
                <div className="text-[13.5px] font-bold leading-snug">
                  {plainMode ? stage.name : stage.techName}
                </div>
                <div
                  className={`t-mono mt-1 text-[11px] ${
                    active ? "text-[#d0e0eb]" : "text-[#3d525c]"
                  }`}
                >
                  {stage.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stage Detail Panel */}
      <div className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="t-mono text-[11.5px] font-semibold text-[#3d525c]">
            MODUL: {current.module}
          </div>
          <h3 className="mt-2 text-[21px] font-bold tracking-[-0.02em] text-[#141414]">
            {plainMode ? current.name : current.techName}
          </h3>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#3d525c]">
            {plainMode ? current.summaryPlain : current.summaryTech}
          </p>
          <div className="glass-field mt-5 p-4">
            <div className="text-[12px] font-medium text-[#3d525c]">{current.metricLabel}</div>
            <div className="t-mono mt-1 text-[15px] font-bold text-[#0f5257]">
              {current.metricValue}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="text-[13px] font-semibold text-[#3d525c]">
            Ketentuan yang dijalankan pada tahap ini:
          </div>
          <ul className="mt-3 space-y-2.5">
            {current.details.map((line, i) => (
              <li
                key={i}
                className="glass-field flex items-start gap-3 p-3.5 text-[13.5px] leading-relaxed text-[#141414]"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f5257] text-white">
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
