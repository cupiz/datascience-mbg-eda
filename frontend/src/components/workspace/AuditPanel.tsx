"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Download, Search } from "lucide-react";
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

interface AuditPanelProps {
  onLoadToSimulator: (row: HoldoutItem) => void;
}

export default function AuditPanel({ onLoadToSimulator }: AuditPanelProps) {
  const [bench, setBench] = useState<BenchmarkResponse | null>(null);
  const [scenario, setScenario] = useState<"pra" | "posthoc">("pra");

  // Holdout Inspector state
  const [holdout, setHoldout] = useState<HoldoutResponse | null>(null);
  const [cluster, setCluster] = useState<string>("Semua");
  const [province, setProvince] = useState<string>("Semua");
  const [riskTier, setRiskTier] = useState<string>("Semua");
  const [query, setQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("abs_error_desc");
  const [offset, setOffset] = useState<number>(0);
  const [shapType, setShapType] = useState<"beeswarm" | "bar">("beeswarm");
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
    <div className="space-y-8">
      {/* Scenario Switch Header */}
      <div className="hairline-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[19px] font-semibold text-[#0d2429]">
            Benchmark 7 model regresi &amp; matriks 5-Fold Cross-Validation
          </h2>
          <p className="mt-1 text-[13px] text-[#2f737d]">
            Seluruh model dilatih pada 10.400 baris latih dan dievaluasi pada 2.600 baris holdout tetap.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-1">
          <button
            type="button"
            onClick={() => setScenario("pra")}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-medium cursor-pointer transition-colors ${
              scenario === "pra"
                ? "bg-[#06525c] text-[#f7f9f8]"
                : "text-[#2f737d] hover:text-[#0d2429]"
            }`}
          >
            Pra-Distribusi (34 fitur)
          </button>
          <button
            type="button"
            onClick={() => setScenario("posthoc")}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-medium cursor-pointer transition-colors ${
              scenario === "posthoc"
                ? "bg-[#06525c] text-[#f7f9f8]"
                : "text-[#2f737d] hover:text-[#0d2429]"
            }`}
          >
            Post-Hoc (38 fitur)
          </button>
        </div>
      </div>

      {/* Benchmark Bar + Fold Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="hairline-card p-6 lg:col-span-5">
          <h3 className="text-[16px] font-semibold text-[#0d2429]">
            Holdout MAE per algoritma (lebih kecil lebih baik)
          </h3>
          <div className="mt-4 space-y-3">
            {modelRows.map((m) => {
              const isSelected = m.model.includes("Optuna");
              return (
              <div key={m.model} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className={isSelected ? "font-semibold text-[#06525c]" : "text-[#0d2429]"}>
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

        <div className="hairline-card overflow-hidden p-6 lg:col-span-7">
          <h3 className="text-[16px] font-semibold text-[#0d2429]">
            Kestabilan galat MAE lintas Fold 1 hingga Fold 5
          </h3>
          <p className="mt-1 mb-4 text-[13px] text-[#2f737d]">
            Nilai langsung dari <code className="t-mono">models/cv_per_fold_report.csv</code>.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[rgba(6,82,92,0.12)]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#ebf0ee] text-[#2f737d]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Model</th>
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
                    foldRows
                      .filter((r) => r.model === modelName)
                      .map((r) => [r.fold, r.MAE])
                  );
                  const isOptuna = modelName.includes("Optuna");
                  return (
                    <tr
                      key={modelName}
                      className={isOptuna ? "bg-[#ebf0ee]/50 font-semibold" : ""}
                    >
                      <td className="px-4 py-2.5 text-[#0d2429]">{modelName}</td>
                      {[1, 2, 3, 4, 5].map((f) => (
                        <td
                          key={f}
                          className={`t-mono px-3 py-2.5 text-right ${
                            isOptuna ? "text-[#06525c]" : "text-[#2f737d]"
                          }`}
                        >
                          {byFold[f] !== undefined ? byFold[f].toFixed(3).replace(".", ",") : "-"}
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

      {/* Global TreeSHAP Figures */}
      <div className="hairline-card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[18px] font-semibold text-[#0d2429]">
              Interpretabilitas global TreeSHAP ({scenario === "pra" ? "Pra-Distribusi" : "Post-Hoc"})
            </h3>
            <p className="mt-1 text-[13px] text-[#2f737d]">
              Ringkasan fitur paling berpengaruh di model Optuna LightGBM hasil pelatihan Kaggle.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-1">
            <button
              type="button"
              onClick={() => setShapType("beeswarm")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer ${
                shapType === "beeswarm"
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "text-[#2f737d]"
              }`}
            >
              Beeswarm
            </button>
            <button
              type="button"
              onClick={() => setShapType("bar")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer ${
                shapType === "bar"
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "text-[#2f737d]"
              }`}
            >
              Mean |SHAP| Bar
            </button>
          </div>
        </div>

        <div className="sage-frame mt-5 p-3 sm:p-4">
          <div className="overflow-hidden rounded-xl border border-[rgba(6,82,92,0.12)] bg-white p-3 sm:p-4">
            <img
              src={assetUrl(`/figures-fase3/shap_${shapType}_${scenario}.png`)}
              alt={`SHAP ${shapType} skenario ${scenario}`}
              className="mx-auto max-h-[520px] w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Interactive Holdout Audit Table (2.600 Rows) */}
      <div className="hairline-card p-6 space-y-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-[18px] font-semibold text-[#0d2429]">
              Browser audit 2.600 sampel holdout test
            </h3>
            <p className="mt-1 text-[13px] text-[#2f737d]">
              Bandingkan sisa piring aktual terhadap prediksi model Pra dan Post-Hoc, atau muat satu baris langsung ke simulator.
            </p>
          </div>

          <a
            href={exportUrl}
            className="btn-secondary shrink-0"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Unduh CSV terfilter
          </a>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              className="w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] py-2 pr-3 pl-9 text-[13px] text-[#0d2429]"
            />
          </label>

          <select
            value={cluster}
            onChange={(e) => {
              setOffset(0);
              setCluster(e.target.value);
            }}
            className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[13px] text-[#0d2429]"
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
            className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[13px] text-[#0d2429]"
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
            className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[13px] text-[#0d2429]"
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
            className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[13px] text-[#0d2429]"
          >
            <option value="abs_error_desc">Urut: Galat Pra terbesar</option>
            <option value="abs_error_asc">Urut: Prediksi Pra paling akurat</option>
            <option value="actual_desc">Urut: Sisa aktual tertinggi</option>
            <option value="actual_asc">Urut: Sisa aktual terendah</option>
          </select>
        </div>

        {/* Slice Summary */}
        {holdout && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(6,82,92,0.12)] bg-[#f7f9f8] px-4 py-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-5">
              <span>
                Baris cocok:{" "}
                <strong className="t-mono text-[#0d2429]">
                  {holdout.total.toLocaleString("id-ID")}
                </strong>
              </span>
              <span>
                Rataan aktual:{" "}
                <strong className="t-mono text-[#0d2429]">
                  {formatPct(holdout.slice_metrics.mean_actual_waste_pct)}
                </strong>
              </span>
              <span>
                Slice MAE Pra:{" "}
                <strong className="t-mono text-[#06525c]">
                  {holdout.slice_metrics.mae_pra.toFixed(3).replace(".", ",")} pp
                </strong>
              </span>
              <span>
                Slice MAE Post-Hoc:{" "}
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
                className="rounded-md border border-[rgba(6,82,92,0.2)] bg-white px-2.5 py-1 text-[12px] disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="t-mono text-[12px] text-[#2f737d]">
                {holdout.total === 0 ? 0 : offset + 1}-
                {Math.min(offset + limit, holdout.total)} / {holdout.total}
              </span>
              <button
                type="button"
                disabled={offset + limit >= holdout.total}
                onClick={() => setOffset((o) => o + limit)}
                className="rounded-md border border-[rgba(6,82,92,0.2)] bg-white px-2.5 py-1 text-[12px] disabled:opacity-40 cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[rgba(6,82,92,0.12)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#ebf0ee] text-[#2f737d]">
              <tr>
                <th className="px-4 py-3 font-medium">ID &amp; Provinsi</th>
                <th className="px-4 py-3 font-medium">Penerima &amp; Protein</th>
                <th className="px-4 py-3 text-right font-medium">Suhu / Transit</th>
                <th className="px-4 py-3 text-right font-medium">Aktual</th>
                <th className="px-4 py-3 text-right font-medium">Pred Pra</th>
                <th className="px-4 py-3 text-right font-medium">Pred Post</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(6,82,92,0.08)]">
              {(holdout?.items ?? []).map((item) => (
                <tr key={item.distribution_id} className="hover:bg-[#f7f9f8]">
                  <td className="px-4 py-3">
                    <div className="t-mono text-[12px] font-medium text-[#06525c]">
                      {item.distribution_id}
                    </div>
                    <div className="font-medium text-[#0d2429]">{item.province}</div>
                    <div className="text-[12px] text-[#2f737d]">{item.regional_cluster}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#0d2429]">{item.beneficiary_category}</div>
                    <div className="text-[12px] text-[#2f737d]">
                      {item.protein_type} · {formatIdr(item.total_meal_cost_idr)}
                    </div>
                  </td>
                  <td className="t-mono px-4 py-3 text-right">
                    <div
                      className={
                        item.food_arrival_temperature_celsius < 60
                          ? "font-semibold text-[#b93815]"
                          : "text-[#0d2429]"
                      }
                    >
                      {item.food_arrival_temperature_celsius.toFixed(1)}°C
                    </div>
                    <div className="text-[12px] text-[#2f737d]">
                      {item.transit_time_minutes} mnt · {item.delivery_distance_km} km
                    </div>
                  </td>
                  <td
                    className={`t-mono px-4 py-3 text-right font-semibold ${
                      item.actual_waste_pct >= 20 ? "text-[#b93815]" : "text-[#0d2429]"
                    }`}
                  >
                    {formatPct(item.actual_waste_pct)}
                  </td>
                  <td className="t-mono px-4 py-3 text-right text-[#06525c]">
                    {formatPct(item.pred_pra_pct)}
                  </td>
                  <td className="t-mono px-4 py-3 text-right font-medium text-[#06525c]">
                    {formatPct(item.pred_posthoc_pct)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onLoadToSimulator(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#ebf0ee] px-2.5 py-1.5 text-[12px] font-medium text-[#06525c] hover:bg-[#06525c] hover:text-[#f7f9f8] transition-colors cursor-pointer"
                    >
                      Simulator
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
