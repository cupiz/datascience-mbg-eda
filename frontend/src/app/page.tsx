"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroLiveWidget from "@/components/HeroLiveWidget";
import CounterRoll from "@/components/CounterRoll";
import PipelineArchitecture from "@/components/PipelineArchitecture";
import Footer from "@/components/Footer";
import {
  BenchmarkResponse,
  fetchBenchmark,
  fetchOverview,
  formatIdr,
  formatPct,
  OverviewResponse,
} from "@/lib/api";

const FALLBACK_MODELS = {
  pra: [
    { model: "LightGBM (Optuna)", cv_mae_mean: 3.6044, cv_mae_std: 0.0417, holdout_MAE: 3.6583, holdout_RMSE: 4.5856, holdout_R2: 0.3325 },
    { model: "RandomForest", cv_mae_mean: 3.6361, cv_mae_std: 0.0396, holdout_MAE: 3.6575, holdout_RMSE: 4.6036, holdout_R2: 0.3272 },
    { model: "HistGradientBoosting", cv_mae_mean: 3.792, cv_mae_std: 0.0362, holdout_MAE: 3.6604, holdout_RMSE: 4.5923, holdout_R2: 0.3305 },
    { model: "LightGBM", cv_mae_mean: 3.6874, cv_mae_std: 0.0336, holdout_MAE: 3.7056, holdout_RMSE: 4.647, holdout_R2: 0.3145 },
    { model: "XGBoost", cv_mae_mean: 3.7102, cv_mae_std: 0.0342, holdout_MAE: 3.7118, holdout_RMSE: 4.6648, holdout_R2: 0.3092 },
    { model: "Ridge", cv_mae_mean: 3.6833, cv_mae_std: 0.037, holdout_MAE: 3.7204, holdout_RMSE: 4.6722, holdout_R2: 0.307 },
    { model: "MeanPredictor", cv_mae_mean: 4.4426, cv_mae_std: 0.0431, holdout_MAE: 4.4465, holdout_RMSE: 5.6126, holdout_R2: -0.0001 },
  ],
  posthoc: [
    { model: "LightGBM (Optuna)", cv_mae_mean: 2.9051, cv_mae_std: 0.0464, holdout_MAE: 2.9287, holdout_RMSE: 3.7606, holdout_R2: 0.5511 },
    { model: "HistGradientBoosting", cv_mae_mean: 3.0456, cv_mae_std: 0.0257, holdout_MAE: 2.9403, holdout_RMSE: 3.7734, holdout_R2: 0.548 },
    { model: "RandomForest", cv_mae_mean: 2.943, cv_mae_std: 0.0377, holdout_MAE: 2.9616, holdout_RMSE: 3.7971, holdout_R2: 0.5423 },
    { model: "LightGBM", cv_mae_mean: 2.9642, cv_mae_std: 0.0318, holdout_MAE: 2.9766, holdout_RMSE: 3.8195, holdout_R2: 0.5369 },
    { model: "XGBoost", cv_mae_mean: 2.984, cv_mae_std: 0.0374, holdout_MAE: 2.9794, holdout_RMSE: 3.8065, holdout_R2: 0.5401 },
    { model: "Ridge", cv_mae_mean: 2.9968, cv_mae_std: 0.0332, holdout_MAE: 3.0176, holdout_RMSE: 3.8924, holdout_R2: 0.5191 },
    { model: "MeanPredictor", cv_mae_mean: 4.4426, cv_mae_std: 0.0431, holdout_MAE: 4.4465, holdout_RMSE: 5.6126, holdout_R2: -0.0001 },
  ],
};

export default function HomePage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | null>(null);
  const [leakView, setLeakView] = useState<"valid" | "leaked">("valid");
  const [benchMode, setBenchMode] = useState<"pra" | "posthoc">("pra");

  useEffect(() => {
    fetchOverview().then(setOverview).catch(() => {});
    fetchBenchmark().then(setBenchmark).catch(() => {});
  }, []);

  const summary = overview?.aggregates?.summary;
  const meanWaste = summary?.mean_waste_pct ?? 13.34;
  const meanLoss = summary?.mean_loss_per_portion_idr ?? 2151;
  const meanCost = summary?.mean_cost_idr ?? 13526;
  const meanEffCost = summary?.mean_effective_cost_idr ?? 15677;
  const coldBad = summary?.cold_arrival_bermasalah_pct ?? 63.7;
  const warmBad = summary?.warm_arrival_bermasalah_pct ?? 12.5;
  const clusters = overview?.aggregates?.clusters ?? [
    { name: "Wilayah 3T Perbatasan & Pedalaman", bermasalah_pct: 47.52, mean_waste_pct: 19.65 },
    { name: "Daerah Pedesaan & Kepulauan", bermasalah_pct: 30.6, mean_waste_pct: 16.41 },
    { name: "Luar Jawa Urban", bermasalah_pct: 15.05, mean_waste_pct: 12.69 },
    { name: "Jawa Metropolitan", bermasalah_pct: 13.82, mean_waste_pct: 12.16 },
  ];

  const modelRows =
    benchMode === "pra"
      ? benchmark?.metrics?.pra?.holdout_all_models ?? FALLBACK_MODELS.pra
      : benchmark?.metrics?.posthoc?.holdout_all_models ?? FALLBACK_MODELS.posthoc;

  const teRows = benchmark?.te_ablation ?? [
    { scenario: "pra", config: "Tanpa Province TE (33 fitur)", cv_mae: 3.7115, cv_rmse: 4.6377, cv_r2: 0.3074 },
    { scenario: "pra", config: "Dengan Province TE (34 fitur)", cv_mae: 3.7102, cv_rmse: 4.6376, cv_r2: 0.3075 },
    { scenario: "posthoc", config: "Tanpa Province TE (37 fitur)", cv_mae: 2.9893, cv_rmse: 3.8217, cv_r2: 0.5297 },
    { scenario: "posthoc", config: "Dengan Province TE (38 fitur)", cv_mae: 2.984, cv_rmse: 3.8139, cv_r2: 0.5316 },
  ];

  return (
    <div id="top" className="min-h-screen bg-[#f7f9f8] text-[#0d2429]">
      <Navbar />

      <main>
        {/* SCREEN 1: Split Hero */}
        <section className="border-b border-[rgba(6,82,92,0.1)] py-10 sm:py-14 lg:min-h-[calc(100svh-70px)] lg:flex lg:items-center">
          <div className="wrap">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <div className="hero-enter inline-flex items-center gap-2 text-[14px] font-medium text-[#2f737d]">
                  <span className="h-2 w-2 rounded-full bg-[#06525c]" aria-hidden="true" />
                  13.000 distribusi · 38 provinsi · LightGBM Optuna
                </div>

                <h1 className="hero-enter mt-4 text-[38px] font-medium leading-[1.03] tracking-[-0.04em] text-[#0d2429] sm:text-[52px] lg:text-[60px]">
                  Prediksi sisa makanan MBG sebelum truk berangkat.
                </h1>

                <p className="hero-enter-delay-1 mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-[#2f737d]">
                  PlateGuard membaca rencana menu, kapasitas dapur SPPG, suhu tiba, dan estimasi transit menjadi skor risiko sisa piring serta penjelasan TreeSHAP lokal sebelum makanan didistribusikan.
                </p>

                <div className="hero-enter-delay-2 mt-8 flex flex-wrap items-center gap-3.5">
                  <Link href="/workspace" className="btn-primary">
                    Buka simulator
                    <ArrowRight className="m-arrow h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href="/#benchmark" className="btn-secondary">
                    Lihat hasil benchmark
                  </Link>
                </div>

                <div className="hero-enter-delay-2 mt-10 grid grid-cols-3 gap-4 border-t border-[rgba(6,82,92,0.12)] pt-6">
                  <div>
                    <div className="text-[12px] text-[#2f737d]">Rataan sisa piring</div>
                    <div className="t-mono mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#0d2429]">
                      <CounterRoll target={meanWaste} decimals={2} suffix="%" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-[#2f737d]">Menguap / porsi</div>
                    <div className="t-mono mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#0d2429]">
                      Rp<CounterRoll target={meanLoss} decimals={0} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-[#2f737d]">Holdout Post-Hoc</div>
                    <div className="t-mono mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#06525c]">
                      MAE <CounterRoll target={2.93} decimals={2} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-enter-delay-1 lg:col-span-7">
                <HeroLiveWidget />
              </div>
            </div>
          </div>
        </section>

        {/* SCREEN 2: Temuan Empiris & Guardrail Kebocoran */}
        <section id="ringkasan" className="border-b border-[rgba(6,82,92,0.1)] bg-[#ffffff] py-20 sm:py-24">
          <div className="wrap">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 className="text-[32px] font-medium leading-[1.08] tracking-[-0.03em] text-[#0d2429] sm:text-[42px]">
                  Masalah rantai dingin dan ketimpangan 3T.{" "}
                  <span className="text-[#2f737d]">Diukur tanpa fitur bocor.</span>
                </h2>
                <p className="mt-4 text-[16px] leading-[1.65] text-[#2f737d]">
                  Audit terhadap 13.000 layanan SPPG memperlihatkan pemborosan bukan sekadar soal selera, melainkan keterlambatan termal di bawah 60°C dan jajan sebelum jam makan.
                </p>

                {/* Interactive Anti-Leakage Card */}
                <div className="mt-8 rounded-2xl border border-[rgba(6,82,92,0.14)] bg-[#f7f9f8] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[#0d2429]">
                      Uji integritas anti-leakage
                    </span>
                    <div className="inline-flex rounded-lg border border-[rgba(6,82,92,0.16)] bg-[#ffffff] p-0.5">
                      <button
                        type="button"
                        onClick={() => setLeakView("valid")}
                        className={`rounded-md px-2.5 py-1 text-[12px] font-medium cursor-pointer transition-colors ${
                          leakView === "valid"
                            ? "bg-[#06525c] text-[#f7f9f8]"
                            : "text-[#2f737d] hover:text-[#0d2429]"
                        }`}
                      >
                        Pipeline sah
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeakView("leaked")}
                        className={`rounded-md px-2.5 py-1 text-[12px] font-medium cursor-pointer transition-colors ${
                          leakView === "leaked"
                            ? "bg-[#b93815] text-white"
                            : "text-[#2f737d] hover:text-[#0d2429]"
                        }`}
                      >
                        Dengan fitur bocor
                      </button>
                    </div>
                  </div>

                  {leakView === "valid" ? (
                    <div className="mt-4 space-y-2.5 text-[14px]">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#ffffff] px-3.5 py-2.5 border border-[rgba(6,82,92,0.1)]">
                        <span className="inline-flex items-center gap-2 font-medium text-[#06525c]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Post-Hoc LightGBM Optuna
                        </span>
                        <span className="t-mono font-semibold text-[#0d2429]">
                          R² 0,551 · MAE 2,929
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-[#2f737d]">
                        Kolom <code className="t-mono text-[#0d2429]">waste_adjusted_effective_cost_idr</code> (selisih maks Rp0,5 dari rumus eksak target) dan{" "}
                        <code className="t-mono text-[#0d2429]">bgn_program_compliance_tier</code> dibuang oleh{" "}
                        <code className="t-mono text-[#0d2429]">DROP_LEAK</code>.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5 text-[14px]">
                      <div className="flex items-center justify-between rounded-xl bg-[#fbeae5] px-3.5 py-2.5 border border-[#b93815]/25">
                        <span className="inline-flex items-center gap-2 font-medium text-[#b93815]">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          Skor semu jika tier lolos
                        </span>
                        <span className="t-mono font-semibold text-[#b93815]">
                          R² 0,682 · MAE 2,363
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-[#2f737d]">
                        Angka R² 0,682 ditolak pada model produksi karena label compliance tier memakai ambang sisa makanan 20%-30% yang baru diketahui pasca-makan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7">
                <ul className="divide-y divide-[rgba(6,82,92,0.12)] border-y border-[rgba(6,82,92,0.12)]">
                  <li className="flex flex-col justify-between gap-2 py-6 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-[17px] font-medium text-[#0d2429]">
                        Biaya efektif membengkak per porsi
                      </div>
                      <div className="mt-1 text-[14px] text-[#2f737d]">
                        Dari produksi {formatIdr(meanCost)} menjadi {formatIdr(meanEffCost)} setelah memperhitungkan makanan tersisa.
                      </div>
                    </div>
                    <div className="t-mono text-[26px] font-semibold tracking-[-0.02em] text-[#0d2429]">
                      +{formatIdr(meanLoss)}
                    </div>
                  </li>

                  <li className="flex flex-col justify-between gap-2 py-6 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-[17px] font-medium text-[#0d2429]">
                        Lonjakan risiko di bawah suhu aman 60°C
                      </div>
                      <div className="mt-1 text-[14px] text-[#2f737d]">
                        22,42% pengiriman tiba di bawah 60°C; proporsi bermasalah naik lima kali lipat dari {formatPct(warmBad, 1)}.
                      </div>
                    </div>
                    <div className="t-mono text-[26px] font-semibold tracking-[-0.02em] text-[#b93815]">
                      {formatPct(coldBad, 1)}
                    </div>
                  </li>

                  <li className="flex flex-col justify-between gap-2 py-6 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-[17px] font-medium text-[#0d2429]">
                        Kesenjangan distribusi wilayah 3T
                      </div>
                      <div className="mt-1 text-[14px] text-[#2f737d]">
                        Tingkat layanan bermasalah (Marginal &amp; Non-Compliant) pada Wilayah 3T dibandingkan Jawa Metropolitan (13,82%).
                      </div>
                    </div>
                    <div className="t-mono text-[26px] font-semibold tracking-[-0.02em] text-[#06525c]">
                      {formatPct(clusters[0]?.bermasalah_pct ?? 47.52, 2)}
                    </div>
                  </li>

                  <li className="flex flex-col justify-between gap-2 py-6 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-[17px] font-medium text-[#0d2429]">
                        Pemicu perilaku paling dominan
                      </div>
                      <div className="mt-1 text-[14px] text-[#2f737d]">
                        Kebiasaan siswa membeli jajanan sebelum makan siang, diikuti porsi berlebih sebesar 22,40%.
                      </div>
                    </div>
                    <div className="t-mono text-[26px] font-semibold tracking-[-0.02em] text-[#0d2429]">
                      63,43%
                    </div>
                  </li>
                </ul>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[14px] text-[#2f737d]">
                    Eksplorasi rincian 38 provinsi, protein, dan grafik EDA tersedia di workspace.
                  </span>
                  <Link href="/workspace?tab=analytics" className="link-draw text-[14px] shrink-0 ml-4">
                    Buka analitik provinsi
                    <ArrowRight className="m-arrow h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCREEN 3: Arsitektur Pipeline & Fitur */}
        <section id="alur" className="border-b border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] py-20 sm:py-24">
          <div className="wrap">
            <div className="max-w-[680px]">
              <h2 className="text-[32px] font-medium leading-[1.08] tracking-[-0.03em] text-[#0d2429] sm:text-[42px]">
                Lima tahap dari telemetri SPPG ke keputusan korektif.
              </h2>
              <p className="mt-3 text-[16px] leading-[1.6] text-[#2f737d]">
                Klik setiap modul untuk melihat cara pipeline menjaga batas pra-distribusi, menghitung fitur interaksi logistik, dan menjaga generalisasi antarkluster.
              </p>
            </div>

            <div className="mt-10">
              <PipelineArchitecture />
            </div>
          </div>
        </section>

        {/* SCREEN 4: Benchmark 7 Model & Province TE */}
        <section id="benchmark" className="bg-[#ffffff] py-20 sm:py-24">
          <div className="wrap">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-[640px]">
                <h2 className="text-[32px] font-medium leading-[1.08] tracking-[-0.03em] text-[#0d2429] sm:text-[42px]">
                  Komparasi 7 kandidat pada 5-Fold CV dan 2.600 baris holdout.
                </h2>
                <p className="mt-3 text-[16px] leading-[1.6] text-[#2f737d]">
                  Tuning Optuna selama 30 trial menurunkan CV MAE LightGBM secara konsisten pada kedua skenario dibanding baseline Ridge maupun rataan konstan.
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-1">
                <button
                  type="button"
                  onClick={() => setBenchMode("pra")}
                  className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors cursor-pointer ${
                    benchMode === "pra"
                      ? "bg-[#06525c] text-[#f7f9f8]"
                      : "text-[#2f737d] hover:text-[#0d2429]"
                  }`}
                >
                  Pra-Distribusi (34 fitur)
                </button>
                <button
                  type="button"
                  onClick={() => setBenchMode("posthoc")}
                  className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors cursor-pointer ${
                    benchMode === "posthoc"
                      ? "bg-[#06525c] text-[#f7f9f8]"
                      : "text-[#2f737d] hover:text-[#0d2429]"
                  }`}
                >
                  Post-Hoc (38 fitur)
                </button>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8 hairline-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[13px] sm:text-[14px]">
                    <thead>
                      <tr className="border-b border-[rgba(6,82,92,0.12)] bg-[#ebf0ee]/70 text-[12px] sm:text-[13px] font-medium text-[#2f737d]">
                        <th className="px-4 py-3.5 whitespace-nowrap">Algoritma</th>
                        <th className="px-3 py-3.5 text-right whitespace-nowrap">CV MAE (5-Fold)</th>
                        <th className="px-3 py-3.5 text-right whitespace-nowrap">Holdout MAE</th>
                        <th className="px-3 py-3.5 text-right whitespace-nowrap">Holdout RMSE</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">Holdout R²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(6,82,92,0.08)]">
                      {modelRows.map((row) => {
                        const isBest = row.model.includes("Optuna");
                        return (
                          <tr
                            key={row.model}
                            className={isBest ? "bg-[#ebf0ee]/45 font-medium" : "hover:bg-[#f7f9f8]"}
                          >
                            <td className="px-4 py-3.5 text-[#0d2429] whitespace-nowrap">
                              {row.model}
                              {isBest && (
                                <span className="ml-2 inline-block rounded bg-[#06525c] px-2 py-0.5 text-[11px] font-medium text-[#f7f9f8]">
                                  Terpilih
                                </span>
                              )}
                            </td>
                            <td className="t-mono px-3 py-3.5 text-right text-[#0d2429] whitespace-nowrap">
                              {row.cv_mae_mean.toFixed(4).replace(".", ",")} ±{" "}
                              {row.cv_mae_std.toFixed(4).replace(".", ",")}
                            </td>
                            <td className="t-mono px-3 py-3.5 text-right text-[#06525c] font-semibold whitespace-nowrap">
                              {row.holdout_MAE.toFixed(3).replace(".", ",")}
                            </td>
                            <td className="t-mono px-3 py-3.5 text-right text-[#2f737d] whitespace-nowrap">
                              {row.holdout_RMSE.toFixed(3).replace(".", ",")}
                            </td>
                            <td className="t-mono px-4 py-3.5 text-right text-[#0d2429] whitespace-nowrap">
                              {row.holdout_R2.toFixed(3).replace(".", ",")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-5">
                <div className="hairline-card p-6">
                  <div className="text-[15px] font-semibold text-[#0d2429]">
                    Ablasi Province TargetEncoder
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#2f737d]">
                    Menambah sinyal historis 38 provinsi menurunkan galat CV di kedua skenario tanpa perlu 38 kolom dummy.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {teRows
                      .filter((r) => r.scenario === benchMode)
                      .map((item) => (
                        <div
                          key={item.config}
                          className="rounded-xl border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3"
                        >
                          <div className="text-[13px] font-medium text-[#0d2429]">
                            {item.config}
                          </div>
                          <div className="t-mono mt-1 flex items-center justify-between text-[13px] text-[#06525c]">
                            <span>MAE {item.cv_mae.toFixed(4).replace(".", ",")}</span>
                            <span>R² {item.cv_r2.toFixed(4).replace(".", ",")}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="hairline-card p-6 bg-[#f7f9f8]">
                  <div className="text-[15px] font-semibold text-[#0d2429]">
                    Inspeksi baris uji holdout
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#2f737d]">
                    Telusuri seluruh 2.600 prediksi uji terhadap nilai aktual lapangan dan muat ke simulator dengan satu klik.
                  </p>
                  <Link href="/workspace?tab=audit" className="link-draw mt-4 text-[14px]">
                    Buka browser audit holdout
                    <ArrowRight className="m-arrow h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer showClosingCta />
    </div>
  );
}
