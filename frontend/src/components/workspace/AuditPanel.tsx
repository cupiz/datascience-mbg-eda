"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Download, Search, ShieldAlert } from "lucide-react";
import {
  assetUrl,
  BenchmarkResponse,
  fetchBenchmark,
  fetchHoldoutSamples,
  formatIdr,
  formatPct,
  getApiBaseUrl,
  HoldoutItem,
  HoldoutResponse,
} from "@/lib/api";
import { VALID_CLUSTERS, VALID_PROVINCES } from "@/lib/constants";
import PipelineArchitecture from "@/components/PipelineArchitecture";

interface AuditPanelProps {
  onLoadToSimulator: (row: HoldoutItem) => void;
}

type AuditSubTab = "benchmark" | "pipeline" | "holdout";

export default function AuditPanel({ onLoadToSimulator }: AuditPanelProps) {
  const [subTab, setSubTab] = useState<AuditSubTab>("benchmark");
  const [bench, setBench] = useState<BenchmarkResponse | null>(null);
  const [scenario, setScenario] = useState<"pra" | "posthoc">("pra");
  const [shapType, setShapType] = useState<"beeswarm" | "bar">("beeswarm");
  const [leakView, setLeakView] = useState<"valid" | "leaked">("valid");

  // Holdout Inspector state
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

  return (
    <div className="space-y-5">
      {/* Sub-view Bar */}
      <div className="hairline-card flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "benchmark", label: "Benchmark 7 Model & SHAP" },
            { id: "holdout", label: "Browser Holdout 2.600" },
            { id: "pipeline", label: "Arsitektur ETL & Anti-Leakage" },
          ].map((item) => {
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id as AuditSubTab)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-colors ${
                  active
                    ? "bg-[#06525c] text-[#f7f9f8]"
                    : "text-[#2f737d] hover:bg-[#ebf0ee] hover:text-[#0d2429]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {subTab === "benchmark" && (
          <div className="inline-flex rounded-lg border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-0.5">
            <button
              type="button"
              onClick={() => setScenario("pra")}
              className={`rounded-md px-3 py-1 text-[12.5px] font-medium cursor-pointer ${
                scenario === "pra" ? "bg-[#06525c] text-white" : "text-[#2f737d]"
              }`}
            >
              Pra-Distribusi (34F)
            </button>
            <button
              type="button"
              onClick={() => setScenario("posthoc")}
              className={`rounded-md px-3 py-1 text-[12.5px] font-medium cursor-pointer ${
                scenario === "posthoc" ? "bg-[#06525c] text-white" : "text-[#2f737d]"
              }`}
            >
              Post-Hoc (38F)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Benchmark 7 Model, CV & SHAP */}
      {subTab === "benchmark" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="hairline-card p-5 lg:col-span-5">
              <h3 className="text-[15.5px] font-semibold text-[#0d2429]">
                Holdout MAE &amp; R² 7 model
              </h3>
              <div className="mt-4 space-y-3">
                {modelRows.map((m) => {
                  const isSelected = m.model.includes("Optuna");
                  return (
                    <div key={m.model} className="space-y-1">
                      <div className="flex items-center justify-between text-[13px]">
                        <span
                          className={
                            isSelected ? "font-semibold text-[#06525c]" : "text-[#0d2429]"
                          }
                        >
                          {m.model}
                        </span>
                        <span className="t-mono font-medium text-[#0d2429]">
                          {m.holdout_MAE.toFixed(3).replace(".", ",")} pp (R²{" "}
                          {m.holdout_R2.toFixed(3).replace(".", ",")})
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#ebf0ee]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(m.holdout_MAE / maxMae) * 100}%`,
                            backgroundColor: isSelected ? "#06525c" : "#6c8e63",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hairline-card overflow-hidden p-5 lg:col-span-7">
              <h3 className="text-[15.5px] font-semibold text-[#0d2429]">
                Matriks kestabilan 5-Fold Cross-Validation
              </h3>
              <p className="mt-0.5 mb-3.5 text-[12.5px] text-[#2f737d]">
                Nilai MAE per fold langsung dari{" "}
                <code className="t-mono text-[#0d2429]">models/cv_per_fold_report.csv</code>.
              </p>
              <div className="overflow-x-auto rounded-lg border border-[rgba(6,82,92,0.12)]">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="bg-[#ebf0ee] text-[#2f737d]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-medium">Model</th>
                      {[1, 2, 3, 4, 5].map((f) => (
                        <th key={f} className="px-3 py-2.5 text-right font-medium">
                          Fold {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(6,82,92,0.08)]">
                    {modelsInFolds.map((modelName) => {
                      const byFold = Object.fromEntries(
                        foldRows.filter((r) => r.model === modelName).map((r) => [r.fold, r.MAE])
                      );
                      const isOptuna = modelName.includes("Optuna");
                      return (
                        <tr
                          key={modelName}
                          className={isOptuna ? "bg-[#ebf0ee]/50 font-semibold" : ""}
                        >
                          <td className="px-3.5 py-2.5 text-[#0d2429]">{modelName}</td>
                          {[1, 2, 3, 4, 5].map((f) => (
                            <td
                              key={f}
                              className={`t-mono px-3 py-2.5 text-right ${
                                isOptuna ? "text-[#06525c]" : "text-[#2f737d]"
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

          <div className="hairline-card p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-[16px] font-semibold text-[#0d2429]">
                  Global TreeSHAP ({scenario === "pra" ? "Pra-Distribusi" : "Post-Hoc"})
                </h3>
                <p className="text-[12.5px] text-[#2f737d]">
                  Peringkat penggerak fitur dari pelatihan akhir Optuna LightGBM.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-0.5">
                <button
                  type="button"
                  onClick={() => setShapType("beeswarm")}
                  className={`rounded-md px-3 py-1 text-[12.5px] font-medium cursor-pointer ${
                    shapType === "beeswarm" ? "bg-[#06525c] text-white" : "text-[#2f737d]"
                  }`}
                >
                  Beeswarm
                </button>
                <button
                  type="button"
                  onClick={() => setShapType("bar")}
                  className={`rounded-md px-3 py-1 text-[12.5px] font-medium cursor-pointer ${
                    shapType === "bar" ? "bg-[#06525c] text-white" : "text-[#2f737d]"
                  }`}
                >
                  Mean |SHAP| Bar
                </button>
              </div>
            </div>

            <div className="sage-frame mt-4 p-3">
              <div className="overflow-hidden rounded-lg border border-[rgba(6,82,92,0.12)] bg-white p-3">
                <img
                  src={assetUrl(`/figures-fase3/shap_${shapType}_${scenario}.png`)}
                  alt={`SHAP ${shapType} ${scenario}`}
                  className="mx-auto max-h-[460px] w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Holdout 2.600 Audit Browser */}
      {subTab === "holdout" && (
        <div className="hairline-card p-5 space-y-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-[16.5px] font-semibold text-[#0d2429]">
                Inspeksi 2.600 sampel uji holdout
              </h3>
              <p className="text-[12.5px] text-[#2f737d]">
                Klik tombol Simulator pada baris mana pun untuk memuat datanya ke mode interaktif.
              </p>
            </div>
            <a href={exportUrl} className="btn-secondary shrink-0">
              <Download className="h-4 w-4" aria-hidden="true" />
              Unduh CSV terfilter
            </a>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#2f737d]" />
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
              <option value="Semua">Semua klaster wilayah</option>
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
              <option value="Semua">Semua tingkat aktual</option>
              <option value="optimal">Optimal (&lt;10%)</option>
              <option value="waspada">Waspada (10% - 20%)</option>
              <option value="kritis">Bermasalah (&ge;20%)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setOffset(0);
                setSortBy(e.target.value);
              }}
              className="app-control"
            >
              <option value="abs_error_desc">Urut: Galat Pra terbesar</option>
              <option value="abs_error_asc">Urut: Prediksi Pra paling akurat</option>
              <option value="actual_desc">Urut: Sisa aktual tertinggi</option>
              <option value="actual_asc">Urut: Sisa aktual terendah</option>
            </select>
          </div>

          {holdout && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgba(6,82,92,0.12)] bg-[#f7f9f8] px-3.5 py-2.5 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Cocok:{" "}
                  <strong className="t-mono text-[#0d2429]">
                    {holdout.total.toLocaleString("id-ID")}
                  </strong>
                </span>
                <span>
                  Aktual:{" "}
                  <strong className="t-mono text-[#0d2429]">
                    {formatPct(holdout.slice_metrics.mean_actual_waste_pct)}
                  </strong>
                </span>
                <span>
                  MAE Pra:{" "}
                  <strong className="t-mono text-[#06525c]">
                    {holdout.slice_metrics.mae_pra.toFixed(3).replace(".", ",")} pp
                  </strong>
                </span>
                <span>
                  MAE Post:{" "}
                  <strong className="t-mono text-[#06525c]">
                    {holdout.slice_metrics.mae_posthoc.toFixed(3).replace(".", ",")} pp
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  className="rounded border border-[rgba(6,82,92,0.2)] bg-white px-2.5 py-1 text-[12px] disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="t-mono text-[12px] text-[#2f737d]">
                  {holdout.total === 0 ? 0 : offset + 1}-
                  {Math.min(offset + limit, holdout.total)} / {holdout.total}
                </span>
                <button
                  type="button"
                  disabled={offset + limit >= holdout.total}
                  onClick={() => setOffset((o) => o + limit)}
                  className="rounded border border-[rgba(6,82,92,0.2)] bg-white px-2.5 py-1 text-[12px] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-[rgba(6,82,92,0.12)]">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead className="bg-[#ebf0ee] text-[#2f737d]">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">ID &amp; Provinsi</th>
                  <th className="px-3.5 py-2.5 font-medium">Penerima &amp; Protein</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Suhu / Transit</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Aktual</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Pred Pra</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Pred Post</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(6,82,92,0.08)]">
                {(holdout?.items ?? []).map((item) => (
                  <tr key={item.distribution_id} className="hover:bg-[#f7f9f8]">
                    <td className="px-3.5 py-2.5">
                      <div className="t-mono text-[11.5px] font-medium text-[#06525c]">
                        {item.distribution_id}
                      </div>
                      <div className="font-medium text-[#0d2429]">{item.province}</div>
                      <div className="text-[11.5px] text-[#2f737d]">{item.regional_cluster}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="text-[#0d2429]">{item.beneficiary_category}</div>
                      <div className="text-[11.5px] text-[#2f737d]">
                        {item.protein_type} · {formatIdr(item.total_meal_cost_idr)}
                      </div>
                    </td>
                    <td className="t-mono px-3.5 py-2.5 text-right">
                      <div
                        className={
                          item.food_arrival_temperature_celsius < 60
                            ? "font-semibold text-[#b93815]"
                            : "text-[#0d2429]"
                        }
                      >
                        {item.food_arrival_temperature_celsius.toFixed(1)}°C
                      </div>
                      <div className="text-[11.5px] text-[#2f737d]">
                        {item.transit_time_minutes} m · {item.delivery_distance_km} km
                      </div>
                    </td>
                    <td
                      className={`t-mono px-3.5 py-2.5 text-right font-semibold ${
                        item.actual_waste_pct >= 20 ? "text-[#b93815]" : "text-[#0d2429]"
                      }`}
                    >
                      {formatPct(item.actual_waste_pct)}
                    </td>
                    <td className="t-mono px-3.5 py-2.5 text-right text-[#06525c]">
                      {formatPct(item.pred_pra_pct)}
                    </td>
                    <td className="t-mono px-3.5 py-2.5 text-right font-medium text-[#06525c]">
                      {formatPct(item.pred_posthoc_pct)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onLoadToSimulator(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-[rgba(6,82,92,0.2)] bg-[#ebf0ee] px-2.5 py-1 text-[12px] font-medium text-[#06525c] hover:bg-[#06525c] hover:text-white transition-colors cursor-pointer"
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
          <PipelineArchitecture />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="hairline-card p-5 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[15.5px] font-semibold text-[#0d2429]">
                  Audit integritas anti-leakage (<code className="t-mono text-[14px]">DROP_LEAK</code>)
                </h3>
                <div className="inline-flex rounded-lg border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-0.5">
                  <button
                    type="button"
                    onClick={() => setLeakView("valid")}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium cursor-pointer ${
                      leakView === "valid" ? "bg-[#06525c] text-white" : "text-[#2f737d]"
                    }`}
                  >
                    Pipeline sah
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeakView("leaked")}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium cursor-pointer ${
                      leakView === "leaked" ? "bg-[#b93815] text-white" : "text-[#2f737d]"
                    }`}
                  >
                    Dengan fitur bocor
                  </button>
                </div>
              </div>

              {leakView === "valid" ? (
                <div className="mt-4 space-y-2.5 text-[13.5px]">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium text-[#06525c]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Post-Hoc LightGBM Optuna
                    </span>
                    <span className="t-mono font-semibold text-[#0d2429]">
                      R² 0,551 · MAE 2,929
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#2f737d]">
                    Fitur{" "}
                    <code className="t-mono text-[#0d2429]">waste_adjusted_effective_cost_idr</code>{" "}
                    (selisih maks Rp0,5 dari rumus target) dan{" "}
                    <code className="t-mono text-[#0d2429]">bgn_program_compliance_tier</code>{" "}
                    diblokir otomatis.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 text-[13.5px]">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#b93815]/25 bg-[#fbeae5] px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium text-[#b93815]">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Skor semu bila tier kepatuhan lolos
                    </span>
                    <span className="t-mono font-semibold text-[#b93815]">
                      R² 0,682 · MAE 2,363
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#2f737d]">
                    Skor R² 0,682 ditolak oleh pipeline produksi karena kelas compliance tier
                    menggunakan ambang sisa piring 20%-30% pasca-kejadian.
                  </p>
                </div>
              )}
            </div>

            <div className="hairline-card p-5 lg:col-span-6">
              <h3 className="text-[15.5px] font-semibold text-[#0d2429]">
                Ablasi TargetEncoder 38 provinsi (5-Fold CV)
              </h3>
              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {teRows.map((item) => (
                  <div
                    key={item.config}
                    className="rounded-lg border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3"
                  >
                    <div className="t-mono text-[11px] uppercase text-[#2f737d]">
                      {item.scenario}
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-[#0d2429]">
                      {item.config}
                    </div>
                    <div className="t-mono mt-1.5 flex justify-between text-[12.5px] text-[#06525c]">
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
