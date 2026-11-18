"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  CheckCircle2,
  Download,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  BenchmarkResponse,
  EdaInteractiveResponse,
  fetchBenchmark,
  fetchEdaInteractive,
  fetchHoldoutSamples,
  formatIdr,
  formatPct,
  getApiBaseUrl,
  HoldoutItem,
  HoldoutResponse,
  ModelMetricRow,
} from "@/lib/api";
import { VALID_CLUSTERS, VALID_PROVINCES } from "@/lib/constants";
import PipelineArchitecture from "@/components/PipelineArchitecture";
import InteractiveAuditCharts from "@/components/charts/InteractiveAuditCharts";

interface AuditPanelProps {
  plainMode?: boolean;
  onLoadToSimulator: (row: HoldoutItem) => void;
}

type AuditSubTab = "benchmark" | "pipeline" | "holdout";

export default function AuditPanel({
  plainMode = true,
  onLoadToSimulator,
}: AuditPanelProps) {
  const [subTab, setSubTab] = useState<AuditSubTab>("benchmark");
  const [bench, setBench] = useState<BenchmarkResponse | null>(null);
  const [interactive, setInteractive] = useState<EdaInteractiveResponse | null>(null);
  const [scenario, setScenario] = useState<"pra" | "posthoc">("pra");
  const [hoveredModel, setHoveredModel] = useState<ModelMetricRow | null>(null);
  const [leakView, setLeakView] = useState<"valid" | "leaked">("valid");

  const [holdout, setHoldout] = useState<HoldoutResponse | null>(null);
  const [cluster, setCluster] = useState<string>("Semua");
  const [province, setProvince] = useState<string>("Semua");
  const [riskTier, setRiskTier] = useState<string>("Semua");
  const [query, setQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("abs_error_desc");
  const [offset, setOffset] = useState<number>(0);
  const limit = 20;

  useEffect(() => {
    fetchBenchmark().then(setBench).catch(() => {});
    fetchEdaInteractive().then(setInteractive).catch(() => {});
  }, []);

  useEffect(() => {
    fetchHoldoutSamples({
      cluster,
      province,
      risk_tier: riskTier === "Semua" ? undefined : riskTier,
      q: query,
      sort_by: sortBy,
      limit,
      offset,
    })
      .then(setHoldout)
      .catch(() => {});
  }, [cluster, province, riskTier, query, sortBy, offset]);

  const modelRows =
    scenario === "pra"
      ? bench?.metrics?.pra?.holdout_all_models ?? []
      : bench?.metrics?.posthoc?.holdout_all_models ?? [];

  const foldRows = (bench?.cv_folds ?? []).filter((r) => r.scenario === scenario);
  const modelsInFolds = Array.from(new Set(foldRows.map((r) => r.model)));
  const teRows = bench?.te_ablation ?? [
    { scenario: "pra", config: "Tanpa Province TE (33 fitur)", cv_mae: 3.7115, cv_rmse: 4.6377, cv_r2: 0.3074 },
    { scenario: "pra", config: "Dengan Province TE (34 fitur)", cv_mae: 3.7102, cv_rmse: 4.6376, cv_r2: 0.3075 },
    { scenario: "posthoc", config: "Tanpa Province TE (37 fitur)", cv_mae: 2.9893, cv_rmse: 3.8217, cv_r2: 0.5297 },
    { scenario: "posthoc", config: "Dengan Province TE (38 fitur)", cv_mae: 2.984, cv_rmse: 3.8139, cv_r2: 0.5316 },
  ];

  const exportUrl = (() => {
    const sp = new URLSearchParams();
    if (cluster !== "Semua") sp.set("cluster", cluster);
    if (province !== "Semua") sp.set("province", province);
    if (riskTier !== "Semua") sp.set("risk_tier", riskTier);
    if (query.trim()) sp.set("q", query.trim());
    return `${getApiBaseUrl()}/api/holdout-export?${sp.toString()}`;
  })();

  const maxMae = Math.max(4.5, ...modelRows.map((m) => m.holdout_MAE));
  const activeModel =
    hoveredModel ??
    modelRows.find((m) => m.model.includes("Optuna")) ??
    modelRows[0] ??
    null;

  return (
    <div className="space-y-5">
      {plainMode && (
        <div className="sage-frame p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f5257] text-white">
              <BookOpenText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[14.5px] font-bold text-[#141414]">
                Membaca Hasil Uji Kejujuran Model dengan Bahasa Sederhana
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#3d525c]">
                Sistem ini diuji pada <strong className="text-[#141414]">2.600 kiriman nyata</strong> yang sebelumnya disembunyikan saat latihan. Angka{" "}
                <strong className="text-[#141414]">MAE</strong> menunjukkan rata-rata selisih tebakan (makin kecil makin jitu: model terbaik hanya meleset sekitar{" "}
                <strong className="text-[#0f5257]">2,9 sampai 3,7 poin persen</strong>). Kolom yang mengandung bocoran angka akhir sengaja diblokir agar akurasi tetap jujur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view Floating Glass Capsule */}
      <div className="hairline-card flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            {
              id: "benchmark",
              label: plainMode ? "Perbandingan 7 Model & Faktor" : "Benchmark 7 Model & SHAP",
            },
            {
              id: "holdout",
              label: plainMode ? "2.600 Data Uji Nyata" : "Browser Holdout 2.600",
            },
            {
              id: "pipeline",
              label: plainMode ? "Alur Kerja & Blokir Bocoran" : "Arsitektur ETL & Anti-Leakage",
            },
          ].map((item) => {
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id as AuditSubTab)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors ${
                  active
                    ? "bg-[#0f5257] text-white shadow-sm"
                    : "bg-white/55 text-[#3d525c] hover:bg-white hover:text-[#141414]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {subTab === "benchmark" && (
          <div className="inline-flex rounded-full border border-white/90 bg-white/60 p-0.5">
            <button
              type="button"
              onClick={() => {
                setHoveredModel(null);
                setScenario("pra");
              }}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer ${
                scenario === "pra" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
              }`}
            >
              {plainMode ? "Sebelum Kirim (34F)" : "Pra-Distribusi (34F)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setHoveredModel(null);
                setScenario("posthoc");
              }}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer ${
                scenario === "posthoc" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
              }`}
            >
              {plainMode ? "Setelah Makan (38F)" : "Post-Hoc (38F)"}
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Benchmark 7 Model, CV, Interactive SHAP & Calibration Scatter */}
      {subTab === "benchmark" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="hairline-card p-5 lg:col-span-5">
              <h3 className="text-[15.5px] font-bold text-[#141414]">
                {plainMode
                  ? "Ketepatan 7 Model Uji (makin pendek makin jitu)"
                  : "Holdout MAE & R² 7 model"}
              </h3>
              <p className="mt-0.5 text-[12px] text-[#3d525c]">
                Arahkan kursor pada batang model untuk melihat detail CV &amp; RMSE.
              </p>
              <div className="mt-3 space-y-2">
                {modelRows.map((m) => {
                  const isSelected = m.model.includes("Optuna");
                  const isActive = activeModel?.model === m.model;
                  return (
                    <div
                      key={m.model}
                      onMouseEnter={() => setHoveredModel(m)}
                      className={`space-y-1 rounded-xl px-2.5 py-1.5 transition-colors cursor-default ${
                        isActive ? "bg-white/80" : "hover:bg-white/55"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[13px]">
                        <span
                          className={
                            isSelected ? "font-bold text-[#0f5257]" : "font-medium text-[#141414]"
                          }
                        >
                          {m.model}
                        </span>
                        <span className="t-mono font-semibold text-[#141414]">
                          {m.holdout_MAE.toFixed(3).replace(".", ",")} pp (R²{" "}
                          {m.holdout_R2.toFixed(3).replace(".", ",")})
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full border border-white/85 bg-white/55">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(m.holdout_MAE / maxMae) * 100}%`,
                            backgroundColor: isSelected ? "#0f5257" : "#6c8e63",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeModel && (
                <div className="glass-field mt-3 p-3 text-[12px]">
                  <div className="flex justify-between font-bold text-[#141414]">
                    <span>{activeModel.model}</span>
                    <span className="t-mono text-[#0f5257]">
                      R² {activeModel.holdout_R2.toFixed(3).replace(".", ",")}
                    </span>
                  </div>
                  <div className="t-mono mt-1 text-[#3d525c]">
                    CV 5-Fold: {activeModel.cv_mae_mean.toFixed(3).replace(".", ",")} &plusmn;{" "}
                    {activeModel.cv_mae_std.toFixed(3).replace(".", ",")} pp · Holdout RMSE:{" "}
                    {activeModel.holdout_RMSE.toFixed(3).replace(".", ",")} pp
                  </div>
                </div>
              )}
            </div>

            <div className="hairline-card overflow-hidden p-5 lg:col-span-7">
              <h3 className="text-[15.5px] font-bold text-[#141414]">
                {plainMode
                  ? "Uji Kestabilan di 5 Kelompok Acak (5-Fold CV)"
                  : "Matriks kestabilan 5-Fold Cross-Validation"}
              </h3>
              <p className="mt-0.5 mb-3.5 text-[12.5px] text-[#3d525c]">
                Rata-rata selisih per bagian uji dari{" "}
                <code className="t-mono text-[#141414]">models/cv_per_fold_report.csv</code>.
              </p>
              <div className="overflow-x-auto rounded-[16px] border border-white/85 bg-white/60">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="bg-[#eef4f7] text-[#3d525c]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Model</th>
                      {[1, 2, 3, 4, 5].map((f) => (
                        <th key={f} className="px-3 py-2.5 text-right font-semibold">
                          Bagian {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(15,82,87,0.08)]">
                    {modelsInFolds.map((modelName) => {
                      const byFold = Object.fromEntries(
                        foldRows.filter((r) => r.model === modelName).map((r) => [r.fold, r.MAE])
                      );
                      const isOptuna = modelName.includes("Optuna");
                      return (
                        <tr
                          key={modelName}
                          className={isOptuna ? "bg-[#0f5257]/10 font-bold" : ""}
                        >
                          <td className="px-3.5 py-2.5 text-[#141414]">{modelName}</td>
                          {[1, 2, 3, 4, 5].map((f) => (
                            <td
                              key={f}
                              className={`t-mono px-3 py-2.5 text-right ${
                                isOptuna ? "text-[#0f5257]" : "text-[#3d525c]"
                              }`}
                            >
                              {byFold[f] !== undefined
                                ? byFold[f].toFixed(3).replace(".", ",")
                                : "-"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <InteractiveAuditCharts
            scenario={scenario}
            globalShap={interactive?.global_shap[scenario] ?? []}
            scatterPoints={interactive?.scatter_points ?? []}
            plainMode={plainMode}
            onInspectSample={onLoadToSimulator}
          />
        </div>
      )}

      {/* VIEW 2: Holdout 2.600 Audit Browser */}
      {subTab === "holdout" && (
        <div className="hairline-card space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-[16.5px] font-bold text-[#141414]">
                Telusuri 2.600 Pengiriman Uji Nyata
              </h3>
              <p className="text-[12.5px] text-[#3d525c]">
                Tekan tombol <strong className="text-[#141414]">Uji</strong> pada baris mana pun untuk langsung mencoba angkanya di Simulator.
              </p>
            </div>
            <a href={exportUrl} className="btn-secondary shrink-0">
              <Download className="h-4 w-4" aria-hidden="true" />
              Unduh CSV Terfilter
            </a>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#0f5257]" />
              <input
                type="text"
                placeholder="Cari ID, provinsi, lauk..."
                value={query}
                onChange={(e) => {
                  setOffset(0);
                  setQuery(e.target.value);
                }}
                className="app-control pl-9"
              />
            </label>

            <select
              value={cluster}
              onChange={(e) => {
                setOffset(0);
                setCluster(e.target.value);
              }}
              className="app-control"
            >
              <option value="Semua">Semua zona wilayah</option>
              {VALID_CLUSTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={province}
              onChange={(e) => {
                setOffset(0);
                setProvince(e.target.value);
              }}
              className="app-control"
            >
              <option value="Semua">Semua 38 provinsi</option>
              {VALID_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={riskTier}
              onChange={(e) => {
                setOffset(0);
                setRiskTier(e.target.value);
              }}
              className="app-control"
            >
              <option value="Semua">Semua tingkat sisa nyata</option>
              <option value="optimal">Bagus (&lt;10%)</option>
              <option value="waspada">Sedang (10% - 20%)</option>
              <option value="kritis">Tinggi (&ge;20%)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setOffset(0);
                setSortBy(e.target.value);
              }}
              className="app-control"
            >
              <option value="abs_error_desc">Urut: Selisih terbesar</option>
              <option value="abs_error_asc">Urut: Tebakan paling pas</option>
              <option value="actual_desc">Urut: Sisa paling banyak</option>
              <option value="actual_asc">Urut: Sisa paling sedikit</option>
            </select>
          </div>

          {holdout && (
            <div className="glass-field flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Cocok:{" "}
                  <strong className="t-mono text-[#141414]">
                    {holdout.total.toLocaleString("id-ID")}
                  </strong>
                </span>
                <span>
                  Sisa nyata:{" "}
                  <strong className="t-mono text-[#141414]">
                    {formatPct(holdout.slice_metrics.mean_actual_waste_pct)}
                  </strong>
                </span>
                <span>
                  MAE Pra:{" "}
                  <strong className="t-mono text-[#0f5257]">
                    {holdout.slice_metrics.mae_pra.toFixed(3).replace(".", ",")} pp
                  </strong>
                </span>
                <span>
                  MAE Post:{" "}
                  <strong className="t-mono text-[#0f5257]">
                    {holdout.slice_metrics.mae_posthoc.toFixed(3).replace(".", ",")} pp
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  className="rounded-full border border-white/90 bg-white/80 px-3 py-1 text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="t-mono text-[12px] text-[#3d525c]">
                  {holdout.total === 0 ? 0 : offset + 1}-
                  {Math.min(offset + limit, holdout.total)} / {holdout.total}
                </span>
                <button
                  type="button"
                  disabled={offset + limit >= holdout.total}
                  onClick={() => setOffset((o) => o + limit)}
                  className="rounded-full border border-white/90 bg-white/80 px-3 py-1 text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-[18px] border border-white/85 bg-white/60">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead className="bg-[#eef4f7] text-[#3d525c]">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">ID &amp; Provinsi</th>
                  <th className="px-3.5 py-2.5 font-semibold">Penerima &amp; Lauk</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">Suhu / Jalan</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">Nyata</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">Tebak Pra</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">Tebak Post</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">Coba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(15,82,87,0.08)]">
                {(holdout?.items ?? []).map((item) => (
                  <tr key={item.distribution_id} className="hover:bg-white/75">
                    <td className="px-3.5 py-2.5">
                      <div className="t-mono text-[11.5px] font-semibold text-[#0f5257]">
                        {item.distribution_id}
                      </div>
                      <div className="font-semibold text-[#141414]">{item.province}</div>
                      <div className="text-[11.5px] text-[#3d525c]">{item.regional_cluster}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="text-[#141414]">{item.beneficiary_category}</div>
                      <div className="text-[11.5px] text-[#3d525c]">
                        {item.protein_type} · {formatIdr(item.total_meal_cost_idr)}
                      </div>
                    </td>
                    <td className="t-mono px-3.5 py-2.5 text-right">
                      <div
                        className={
                          item.food_arrival_temperature_celsius < 60
                            ? "font-bold text-[#b53418]"
                            : "text-[#141414]"
                        }
                      >
                        {item.food_arrival_temperature_celsius.toFixed(1).replace(".", ",")}°C
                      </div>
                      <div className="text-[11.5px] text-[#3d525c]">
                        {item.transit_time_minutes} m · {String(item.delivery_distance_km).replace(".", ",")} km
                      </div>
                    </td>
                    <td
                      className={`t-mono px-3.5 py-2.5 text-right font-bold ${
                        item.actual_waste_pct >= 20 ? "text-[#b53418]" : "text-[#141414]"
                      }`}
                    >
                      {formatPct(item.actual_waste_pct)}
                    </td>
                    <td className="t-mono px-3.5 py-2.5 text-right text-[#0f5257]">
                      {formatPct(item.pred_pra_pct)}
                    </td>
                    <td className="t-mono px-3.5 py-2.5 text-right font-semibold text-[#0f5257]">
                      {formatPct(item.pred_posthoc_pct)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onLoadToSimulator(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/90 bg-white/80 px-3 py-1 text-[12px] font-semibold text-[#0f5257] hover:bg-[#0f5257] hover:text-white transition-colors cursor-pointer"
                      >
                        Uji <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: ETL Pipeline & Anti-Leakage Audit */}
      {subTab === "pipeline" && (
        <div className="space-y-5">
          <PipelineArchitecture plainMode={plainMode} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="hairline-card p-5 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[15.5px] font-bold text-[#141414]">
                  {plainMode
                    ? "Pencegahan Kolom Bocor Agar Akurasi Jujur"
                    : "Audit integritas anti-leakage (DROP_LEAK)"}
                </h3>
                <div className="inline-flex rounded-full border border-white/90 bg-white/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setLeakView("valid")}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer ${
                      leakView === "valid" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
                    }`}
                  >
                    Alur Jujur
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeakView("leaked")}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer ${
                      leakView === "leaked" ? "bg-[#b53418] text-white" : "text-[#3d525c]"
                    }`}
                  >
                    Bila Bocor Lolos
                  </button>
                </div>
              </div>

              {leakView === "valid" ? (
                <div className="mt-4 space-y-2.5 text-[13.5px]">
                  <div className="glass-field flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#0f5257]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Post-Hoc LightGBM Optuna
                    </span>
                    <span className="t-mono font-bold text-[#141414]">
                      R² 0,551 · MAE 2,929
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3d525c]">
                    Kolom{" "}
                    <code className="t-mono text-[#141414]">waste_adjusted_effective_cost_idr</code>{" "}
                    (yang dihitung balik dari persentase sisa) dan{" "}
                    <code className="t-mono text-[#141414]">bgn_program_compliance_tier</code>{" "}
                    otomatis dikeluarkan sebelum latihan dimulai.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 text-[13.5px]">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[rgba(181,52,24,0.28)] bg-[rgba(255,240,236,0.9)] px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#b53418]">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Skor palsu bila kolom label ikut terbaca
                    </span>
                    <span className="t-mono font-bold text-[#b53418]">
                      R² 0,682 · MAE 2,363
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3d525c]">
                    Angka tinggi 0,682 ditolak sistem karena kelas kepatuhan memakai batas sisa 20%-30% yang baru diketahui sesudah makan selesai.
                  </p>
                </div>
              )}
            </div>

            <div className="hairline-card p-5 lg:col-span-6">
              <h3 className="text-[15.5px] font-bold text-[#141414]">
                Uji Pengaruh Ciri 38 Provinsi (5-Fold CV)
              </h3>
              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {teRows.map((item) => (
                  <div key={item.config} className="glass-field p-3">
                    <div className="t-mono text-[11px] font-semibold uppercase text-[#3d525c]">
                      {item.scenario}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-[#141414]">
                      {item.config}
                    </div>
                    <div className="t-mono mt-1.5 flex justify-between text-[12px] font-semibold text-[#0f5257]">
                      <span>MAE {item.cv_mae.toFixed(4).replace(".", ",")}</span>
                      <span>R² {item.cv_r2.toFixed(4).replace(".", ",")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
