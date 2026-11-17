"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ThermometerSnowflake } from "lucide-react";
import {
  assetUrl,
  fetchOverview,
  formatIdr,
  formatPct,
  GroupStat,
  OverviewResponse,
} from "@/lib/api";
import { EDA_FIGURES_CATALOG } from "@/lib/constants";

function SimpleBarList({
  items,
  metric,
  unit = "%",
  highlightAbove,
}: {
  items: GroupStat[];
  metric: "bermasalah_pct" | "mean_waste_pct" | "share_pct";
  unit?: string;
  highlightAbove?: number;
}) {
  const maxVal = Math.max(1, ...items.map((x) => x[metric]));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const val = item[metric];
        const widthPct = Math.max(2, (val / maxVal) * 100);
        const isWarn = highlightAbove !== undefined && val >= highlightAbove;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate font-medium text-[#0d2429]">{item.name}</span>
              <div className="t-mono shrink-0 flex items-center gap-3 text-[12px]">
                <span className="text-[#2f737d]">n={item.count.toLocaleString("id-ID")}</span>
                <span
                  className={`font-semibold ${
                    isWarn ? "text-[#b93815]" : "text-[#06525c]"
                  }`}
                >
                  {val.toFixed(2).replace(".", ",")}
                  {unit}
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#ebf0ee]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: isWarn ? "#b93815" : "#06525c",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [provQuery, setProvQuery] = useState<string>("");
  const [provSort, setProvSort] = useState<"bermasalah_pct" | "mean_waste_pct" | "below_60c_pct">(
    "bermasalah_pct"
  );
  const [selectedFigure, setSelectedFigure] = useState(EDA_FIGURES_CATALOG[1]);

  useEffect(() => {
    fetchOverview().then(setData).catch(() => {});
  }, []);

  const agg = data?.aggregates;
  const filteredProvinces = useMemo(() => {
    if (!agg?.provinces) return [];
    const ql = provQuery.trim().toLowerCase();
    const base = ql
      ? agg.provinces.filter((p) => p.name.toLowerCase().includes(ql))
      : agg.provinces;
    return [...base].sort((a, b) => b[provSort] - a[provSort]);
  }, [agg, provQuery, provSort]);

  if (!agg) {
    return (
      <div className="hairline-card p-10 text-center text-[15px] text-[#2f737d]">
        Memuat agregat analitik 13.000 distribusi dari FastAPI...
      </div>
    );
  }

  const s = agg.summary;

  return (
    <div className="space-y-8">
      {/* National Telemetry Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="hairline-card p-5">
          <div className="text-[13px] text-[#2f737d]">Populasi audit MBG</div>
          <div className="t-mono mt-1.5 text-[28px] font-semibold text-[#0d2429]">
            {agg.n_total.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 text-[13px] text-[#2f737d]">
            {agg.n_provinces} provinsi · median {formatPct(s.median_waste_pct)}
          </div>
        </div>

        <div className="hairline-card p-5">
          <div className="text-[13px] text-[#2f737d]">Biaya efektif teradjust sisa</div>
          <div className="t-mono mt-1.5 text-[28px] font-semibold text-[#0d2429]">
            {formatIdr(s.mean_effective_cost_idr)}
          </div>
          <div className="mt-1 text-[13px] text-[#2f737d]">
            Pagu awal {formatIdr(s.mean_cost_idr)} (+{formatIdr(s.mean_loss_per_portion_idr)})
          </div>
        </div>

        <div className="hairline-card p-5">
          <div className="text-[13px] text-[#2f737d]">Bermasalah saat suhu &lt; 60°C</div>
          <div className="t-mono mt-1.5 text-[28px] font-semibold text-[#b93815]">
            {formatPct(s.cold_arrival_bermasalah_pct, 1)}
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-[#2f737d]">
            <ThermometerSnowflake className="h-3.5 w-3.5 shrink-0 text-[#b93815]" />
            <span>vs {formatPct(s.warm_arrival_bermasalah_pct, 1)} saat suhu &ge; 60°C</span>
          </div>
        </div>

        <div className="hairline-card p-5">
          <div className="text-[13px] text-[#2f737d]">Distribusi bermasalah (tier BGN)</div>
          <div className="t-mono mt-1.5 text-[28px] font-semibold text-[#06525c]">
            {formatPct(s.bermasalah_pct)}
          </div>
          <div className="mt-1 text-[13px] text-[#2f737d]">
            Optimal (&lt;10%): {formatPct(s.optimal_pct)}
          </div>
        </div>
      </div>

      {/* Cluster & Root Cause Drivers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="hairline-card p-6 lg:col-span-6">
          <h3 className="text-[18px] font-semibold text-[#0d2429]">
            Kerentanan per klaster geografis
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-[#2f737d]">
            Persentase layanan bermasalah (Marginal-Quality &amp; Non-Compliant) per zona nasional.
          </p>
          <SimpleBarList
            items={agg.clusters}
            metric="bermasalah_pct"
            highlightAbove={25}
          />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[rgba(6,82,92,0.1)] pt-4 text-[13px]">
            {agg.clusters.slice(0, 2).map((c) => (
              <div key={c.name} className="rounded-lg bg-[#f7f9f8] p-3">
                <div className="truncate font-medium text-[#0d2429]">{c.name}</div>
                <div className="t-mono mt-1 text-[12px] text-[#2f737d]">
                  Transit {c.mean_transit_min} mnt · Suhu {c.mean_temp_c}°C
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hairline-card p-6 lg:col-span-6">
          <h3 className="text-[18px] font-semibold text-[#0d2429]">
            Proporsi akar masalah utama (Post-Hoc)
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-[#2f737d]">
            Pangsa kejadian lima pemicu sisa makanan di seluruh layanan 2026.
          </p>
          <SimpleBarList items={agg.drivers} metric="share_pct" />
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[rgba(6,82,92,0.1)] pt-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] font-semibold text-[#06525c]">
                Rataan sisa per komoditas protein
              </div>
              <div className="space-y-1.5 text-[13px]">
                {agg.proteins.map((p) => (
                  <div key={p.name} className="flex justify-between">
                    <span className="truncate pr-2 text-[#0d2429]">{p.name}</span>
                    <span className="t-mono font-medium text-[#06525c]">
                      {formatPct(p.mean_waste_pct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-semibold text-[#06525c]">
                Rataan sisa per jenjang penerima
              </div>
              <div className="space-y-1.5 text-[13px]">
                {agg.beneficiaries.map((b) => (
                  <div key={b.name} className="flex justify-between">
                    <span className="truncate pr-2 text-[#0d2429]">{b.name}</span>
                    <span className="t-mono font-medium text-[#06525c]">
                      {formatPct(b.mean_waste_pct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 38 Provinces Explorer */}
      <div className="hairline-card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[18px] font-semibold text-[#0d2429]">
              Peringkat &amp; pemetaan 38 provinsi Indonesia
            </h3>
            <p className="mt-1 text-[13px] text-[#2f737d]">
              Urutkan provinsi berdasarkan proporsi distribusi bermasalah, rataan sisa piring, atau keterlambatan suhu &lt;60°C.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#2f737d]" />
              <input
                type="text"
                placeholder="Cari provinsi..."
                value={provQuery}
                onChange={(e) => setProvQuery(e.target.value)}
                className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] py-2 pr-3 pl-9 text-[13px] text-[#0d2429]"
              />
            </label>
            <select
              value={provSort}
              onChange={(e) => setProvSort(e.target.value as typeof provSort)}
              className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[13px] text-[#0d2429]"
            >
              <option value="bermasalah_pct">Urutkan: % Bermasalah</option>
              <option value="mean_waste_pct">Urutkan: Rataan Sisa (%)</option>
              <option value="below_60c_pct">Urutkan: Suhu &lt;60°C (%)</option>
            </select>
          </div>
        </div>

        <div className="mt-5 max-h-[380px] overflow-x-auto overflow-y-auto rounded-xl border border-[rgba(6,82,92,0.12)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#ebf0ee] text-[#2f737d]">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Provinsi</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah SPPG</th>
                <th className="px-4 py-3 text-right font-medium">Rataan Sisa</th>
                <th className="px-4 py-3 text-right font-medium">Bermasalah (Tier BGN)</th>
                <th className="px-4 py-3 text-right font-medium">Suhu &lt;60°C</th>
                <th className="px-4 py-3 text-right font-medium">Transit (mnt)</th>
                <th className="px-4 py-3 text-right font-medium">Biaya Efektif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(6,82,92,0.08)]">
              {filteredProvinces.map((p, idx) => (
                <tr key={p.name} className="hover:bg-[#f7f9f8]">
                  <td className="t-mono px-4 py-2.5 text-[#2f737d]">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-[#0d2429]">{p.name}</td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#2f737d]">
                    {p.count.toLocaleString("id-ID")}
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right font-medium text-[#0d2429]">
                    {formatPct(p.mean_waste_pct)}
                  </td>
                  <td
                    className={`t-mono px-4 py-2.5 text-right font-semibold ${
                      p.bermasalah_pct >= 30 ? "text-[#b93815]" : "text-[#06525c]"
                    }`}
                  >
                    {formatPct(p.bermasalah_pct, 1)}
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#2f737d]">
                    {formatPct(p.below_60c_pct, 1)}
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#2f737d]">
                    {p.mean_transit_min.toFixed(1).replace(".", ",")} m
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#0d2429]">
                    {formatIdr(p.mean_effective_cost_idr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDA High-Res Figures Inspector */}
      <div className="hairline-card p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-[18px] font-semibold text-[#0d2429]">
              Galeri visualisasi statistik EDA (<code className="t-mono text-[16px]">eda_run.py</code>)
            </h3>
            <p className="mt-1 text-[13px] text-[#2f737d]">
              Sepuluh grafik terverifikasi yang dihasilkan pipeline analisis eksploratori.
            </p>
          </div>
          <select
            value={selectedFigure.file}
            onChange={(e) => {
              const found = EDA_FIGURES_CATALOG.find((x) => x.file === e.target.value);
              if (found) setSelectedFigure(found);
            }}
            className="rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[13px] text-[#0d2429]"
          >
            {EDA_FIGURES_CATALOG.map((fig) => (
              <option key={fig.file} value={fig.file}>
                {fig.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sage-frame mt-5 p-3 sm:p-4">
          <div className="overflow-hidden rounded-xl border border-[rgba(6,82,92,0.12)] bg-white p-3 sm:p-4">
            <img
              src={assetUrl(`/figures/${selectedFigure.file}`)}
              alt={selectedFigure.title}
              className="w-full h-auto object-contain max-h-[540px] mx-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
