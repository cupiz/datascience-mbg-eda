"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Search, ThermometerSnowflake } from "lucide-react";
import {
  assetUrl,
  fetchOverview,
  formatIdr,
  formatPct,
  GroupStat,
  OverviewResponse,
} from "@/lib/api";
import { EDA_FIGURES_CATALOG } from "@/lib/constants";

const DRIVER_LABELS_PLAIN: Record<string, string> = {
  "Prior-Snack-Consumption": "Jajan sebelum jam makan",
  "Excessive-Portion-Size": "Takaran porsi terlalu besar",
  "Sub-Optimal-Arrival-Temperature": "Suhu makanan dingin (<60°C)",
  "Delivery-Transit-Delay": "Pengiriman terlambat tiba",
  "Low-Palatability-Menu": "Rasa menu kurang disukai",
};

function SimpleBarList({
  items,
  metric,
  unit = "%",
  highlightAbove,
  plainMode = true,
}: {
  items: GroupStat[];
  metric: "bermasalah_pct" | "mean_waste_pct" | "share_pct";
  unit?: string;
  highlightAbove?: number;
  plainMode?: boolean;
}) {
  const maxVal = Math.max(1, ...items.map((x) => x[metric]));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const val = item[metric];
        const widthPct = Math.max(2, (val / maxVal) * 100);
        const isWarn = highlightAbove !== undefined && val >= highlightAbove;
        const displayName =
          plainMode && DRIVER_LABELS_PLAIN[item.name]
            ? DRIVER_LABELS_PLAIN[item.name]
            : item.name;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate font-semibold text-[#141414]">
                {displayName}
              </span>
              <div className="t-mono shrink-0 flex items-center gap-3 text-[12px]">
                <span className="text-[#3d525c]">n={item.count.toLocaleString("id-ID")}</span>
                <span
                  className={`font-bold ${
                    isWarn ? "text-[#b53418]" : "text-[#0f5257]"
                  }`}
                >
                  {val.toFixed(2).replace(".", ",")}
                  {unit}
                </span>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border border-white/85 bg-white/55">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: isWarn ? "#b53418" : "#0f5257",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPanel({
  plainMode = true,
}: {
  plainMode?: boolean;
}) {
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
      <div className="hairline-card p-10 text-center text-[14.5px] font-medium text-[#3d525c]">
        Memuat ringkasan analitik 13.000 pengiriman dari FastAPI...
      </div>
    );
  }

  const s = agg.summary;

  return (
    <div className="space-y-5">
      {/* Plain-Language Overview Banner */}
      {plainMode && (
        <div className="sage-frame p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f5257] text-white">
              <BookOpenText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-[#141414]">
                Gambaran Mudah Kondisi Lapangan di 38 Provinsi
              </h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#3d525c]">
                Dari <strong className="text-[#141414]">13.000 pengiriman makan bergizi</strong>, rata-rata{" "}
                <strong className="text-[#141414]">{formatPct(s.mean_waste_pct)}</strong> makanan masih tersisa sehingga{" "}
                <strong className="text-[#141414]">{formatIdr(s.mean_loss_per_portion_idr)}</strong> per kotak terbuang. Masalah terbesar muncul saat makanan tiba dingin di bawah 60°C (risiko bermasalah melonjak jadi{" "}
                <strong className="text-[#b53418]">{formatPct(s.cold_arrival_bermasalah_pct, 1)}</strong>, hampir lima kali lebih buruk dibanding makanan hangat) serta wilayah perintis 3T.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* National Telemetry Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="hairline-card p-5">
          <div className="text-[12.5px] font-semibold text-[#3d525c]">
            {plainMode ? "Total Pengiriman Dicatat" : "Populasi audit MBG"}
          </div>
          <div className="t-mono mt-1.5 text-[28px] font-bold text-[#141414]">
            {agg.n_total.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 text-[12.5px] text-[#3d525c]">
            {agg.n_provinces} provinsi · median sisa {formatPct(s.median_waste_pct)}
          </div>
        </div>

        <div className="hairline-card p-5">
          <div className="text-[12.5px] font-semibold text-[#3d525c]">
            {plainMode ? "Biaya Nyata Termakan/Porsi" : "Biaya efektif teradjust sisa"}
          </div>
          <div className="t-mono mt-1.5 text-[28px] font-bold text-[#141414]">
            {formatIdr(s.mean_effective_cost_idr)}
          </div>
          <div className="mt-1 text-[12.5px] text-[#3d525c]">
            Pagu awal {formatIdr(s.mean_cost_idr)} (rugi {formatIdr(s.mean_loss_per_portion_idr)})
          </div>
        </div>

        <div className="hairline-card p-5">
          <div className="text-[12.5px] font-semibold text-[#3d525c]">
            Bermasalah saat suhu &lt; 60°C
          </div>
          <div className="t-mono mt-1.5 text-[28px] font-bold text-[#b53418]">
            {formatPct(s.cold_arrival_bermasalah_pct, 1)}
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-[#3d525c]">
            <ThermometerSnowflake className="h-3.5 w-3.5 shrink-0 text-[#b53418]" />
            <span>vs {formatPct(s.warm_arrival_bermasalah_pct, 1)} saat hangat &ge; 60°C</span>
          </div>
        </div>

        <div className="hairline-card p-5">
          <div className="text-[12.5px] font-semibold text-[#3d525c]">
            {plainMode ? "Kiriman Bermasalah Nasional" : "Distribusi bermasalah (tier BGN)"}
          </div>
          <div className="t-mono mt-1.5 text-[28px] font-bold text-[#0f5257]">
            {formatPct(s.bermasalah_pct)}
          </div>
          <div className="mt-1 text-[12.5px] text-[#3d525c]">
            {plainMode ? "Terkendali baik (<10%): " : "Optimal (<10%): "}
            {formatPct(s.optimal_pct)}
          </div>
        </div>
      </div>

      {/* Cluster & Root Cause Drivers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="hairline-card p-6 lg:col-span-6">
          <h3 className="text-[17px] font-bold text-[#141414]">
            {plainMode ? "Wilayah Mana yang Paling Rawan?" : "Kerentanan per klaster geografis"}
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-[#3d525c]">
            {plainMode
              ? "Persentase pengiriman yang butuh perbaikan (wilayah 3T jauh lebih rentan dibanding kota besar di Jawa)."
              : "Persentase layanan bermasalah (Marginal-Quality & Non-Compliant) per zona nasional."}
          </p>
          <SimpleBarList
            items={agg.clusters}
            metric="bermasalah_pct"
            highlightAbove={25}
            plainMode={plainMode}
          />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[rgba(15,82,87,0.1)] pt-4 text-[12.5px]">
            {agg.clusters.slice(0, 2).map((c) => (
              <div key={c.name} className="glass-field p-3">
                <div className="truncate font-semibold text-[#141414]">{c.name}</div>
                <div className="t-mono mt-1 text-[11.5px] text-[#3d525c]">
                  Jalan {String(c.mean_transit_min).replace(".", ",")} mnt · Suhu{" "}
                  {String(c.mean_temp_c).replace(".", ",")}°C
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hairline-card p-6 lg:col-span-6">
          <h3 className="text-[17px] font-bold text-[#141414]">
            {plainMode ? "Mengapa Anak Tidak Menghabiskan Makanan?" : "Proporsi akar masalah utama (Post-Hoc)"}
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-[#3d525c]">
            {plainMode
              ? "Lima alasan tersering makanan tersisa di lapangan selama distribusi 2026."
              : "Pangsa kejadian lima pemicu sisa makanan di seluruh layanan 2026."}
          </p>
          <SimpleBarList items={agg.drivers} metric="share_pct" plainMode={plainMode} />
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[rgba(15,82,87,0.1)] pt-4 sm:grid-cols-2">
            <div className="glass-field p-3">
              <div className="mb-2 text-[12px] font-bold text-[#0f5257]">
                Rataan sisa per lauk protein
              </div>
              <div className="space-y-1.5 text-[12.5px]">
                {agg.proteins.map((p) => (
                  <div key={p.name} className="flex justify-between">
                    <span className="truncate pr-2 font-medium text-[#141414]">{p.name}</span>
                    <span className="t-mono font-bold text-[#0f5257]">
                      {formatPct(p.mean_waste_pct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-field p-3">
              <div className="mb-2 text-[12px] font-bold text-[#0f5257]">
                Rataan sisa per jenjang sekolah
              </div>
              <div className="space-y-1.5 text-[12.5px]">
                {agg.beneficiaries.map((b) => (
                  <div key={b.name} className="flex justify-between">
                    <span className="truncate pr-2 font-medium text-[#141414]">{b.name}</span>
                    <span className="t-mono font-bold text-[#0f5257]">
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
            <h3 className="text-[17px] font-bold text-[#141414]">
              Peringkat 38 Provinsi di Indonesia
            </h3>
            <p className="mt-1 text-[13px] text-[#3d525c]">
              Urutkan provinsi berdasarkan tingkat masalah, rata-rata sisa makanan, atau kiriman yang tiba dingin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#0f5257]" />
              <input
                type="text"
                placeholder="Cari provinsi..."
                value={provQuery}
                onChange={(e) => setProvQuery(e.target.value)}
                className="rounded-full border border-white/90 bg-white/80 py-2 pr-3 pl-9 text-[13px] font-medium text-[#141414] focus:outline-none"
              />
            </label>
            <select
              value={provSort}
              onChange={(e) => setProvSort(e.target.value as typeof provSort)}
              className="rounded-full border border-white/90 bg-white/80 px-3.5 py-2 text-[13px] font-semibold text-[#141414]"
            >
              <option value="bermasalah_pct">Urutkan: % Bermasalah</option>
              <option value="mean_waste_pct">Urutkan: Rataan Sisa (%)</option>
              <option value="below_60c_pct">Urutkan: Suhu &lt;60°C (%)</option>
            </select>
          </div>
        </div>

        <div className="mt-5 max-h-[380px] overflow-x-auto overflow-y-auto rounded-[18px] border border-white/85 bg-white/60">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#eef4f7] text-[#3d525c]">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Provinsi</th>
                <th className="px-4 py-3 text-right font-semibold">Jumlah SPPG</th>
                <th className="px-4 py-3 text-right font-semibold">Rataan Sisa</th>
                <th className="px-4 py-3 text-right font-semibold">Bermasalah</th>
                <th className="px-4 py-3 text-right font-semibold">Tiba &lt;60°C</th>
                <th className="px-4 py-3 text-right font-semibold">Transit (mnt)</th>
                <th className="px-4 py-3 text-right font-semibold">Biaya Efektif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,82,87,0.08)]">
              {filteredProvinces.map((p, idx) => (
                <tr key={p.name} className="hover:bg-white/75">
                  <td className="t-mono px-4 py-2.5 text-[#3d525c]">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-[#141414]">{p.name}</td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#3d525c]">
                    {p.count.toLocaleString("id-ID")}
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right font-semibold text-[#141414]">
                    {formatPct(p.mean_waste_pct)}
                  </td>
                  <td
                    className={`t-mono px-4 py-2.5 text-right font-bold ${
                      p.bermasalah_pct >= 30 ? "text-[#b53418]" : "text-[#0f5257]"
                    }`}
                  >
                    {formatPct(p.bermasalah_pct, 1)}
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#3d525c]">
                    {formatPct(p.below_60c_pct, 1)}
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right text-[#3d525c]">
                    {p.mean_transit_min.toFixed(1).replace(".", ",")} m
                  </td>
                  <td className="t-mono px-4 py-2.5 text-right font-medium text-[#141414]">
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
            <h3 className="text-[17px] font-bold text-[#141414]">
              Galeri 10 Grafik Statistik (<code className="t-mono text-[15px]">eda_run.py</code>)
            </h3>
            <p className="mt-1 text-[13px] text-[#3d525c]">
              Pilih grafik dari daftar untuk melihat pola distribusi suhu, jarak, dan korelasi data.
            </p>
          </div>
          <select
            value={selectedFigure.file}
            onChange={(e) => {
              const found = EDA_FIGURES_CATALOG.find((x) => x.file === e.target.value);
              if (found) setSelectedFigure(found);
            }}
            className="rounded-full border border-white/90 bg-white/85 px-4 py-2 text-[13px] font-semibold text-[#141414]"
          >
            {EDA_FIGURES_CATALOG.map((fig) => (
              <option key={fig.file} value={fig.file}>
                {fig.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sage-frame mt-5 p-3 sm:p-4">
          <div className="overflow-hidden rounded-[18px] border border-white bg-white p-3 sm:p-4">
            <img
              src={assetUrl(`/figures/${selectedFigure.file}`)}
              alt={selectedFigure.title}
              className="mx-auto h-auto max-h-[540px] w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
