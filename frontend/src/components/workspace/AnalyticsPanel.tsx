"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpenText, Search, ThermometerSnowflake } from "lucide-react";
import {
  EdaInteractiveResponse,
  fetchEdaInteractive,
  fetchOverview,
  formatIdr,
  formatPct,
  GroupStat,
  HoldoutItem,
  OverviewResponse,
} from "@/lib/api";
import InteractiveEdaExplorer from "@/components/charts/InteractiveEdaExplorer";

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
  selectedName,
  onSelect,
  onHover,
}: {
  items: GroupStat[];
  metric: "bermasalah_pct" | "mean_waste_pct" | "share_pct";
  unit?: string;
  highlightAbove?: number;
  plainMode?: boolean;
  selectedName?: string | null;
  onSelect?: (item: GroupStat) => void;
  onHover?: (item: GroupStat) => void;
}) {
  const maxVal = Math.max(1, ...items.map((x) => x[metric]));
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const val = item[metric];
        const widthPct = Math.max(2, (val / maxVal) * 100);
        const isWarn = highlightAbove !== undefined && val >= highlightAbove;
        const isSel = selectedName === item.name;
        const displayName =
          plainMode && DRIVER_LABELS_PLAIN[item.name]
            ? DRIVER_LABELS_PLAIN[item.name]
            : item.name;
        return (
          <div
            key={item.name}
            onMouseEnter={() => onHover?.(item)}
            onClick={() => onSelect?.(item)}
            className={`space-y-1 rounded-xl px-2.5 py-1.5 transition-colors ${
              onSelect ? "cursor-pointer" : "cursor-default"
            } ${
              isSel
                ? "bg-[#0f5257]/12 ring-1 ring-[#0f5257]/30"
                : "hover:bg-white/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate font-semibold text-[#141414]">
                {displayName}
              </span>
              <div className="t-mono shrink-0 flex items-center gap-3 text-[12px]">
                <span className="text-[#3d525c]">n={item.count.toLocaleString("id-ID")}</span>
                <span
                  className={`font-bold ${isWarn ? "text-[#b53418]" : "text-[#0f5257]"
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
  onLoadToSimulator,
  onSelectProvince,
}: {
  plainMode?: boolean;
  onLoadToSimulator?: (item: HoldoutItem) => void;
  onSelectProvince?: (province: string) => void;
}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [interactive, setInteractive] = useState<EdaInteractiveResponse | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<GroupStat | null>(null);
  const [hoveredDriver, setHoveredDriver] = useState<GroupStat | null>(null);
  const [provQuery, setProvQuery] = useState<string>("");
  const [provSort, setProvSort] = useState<"bermasalah_pct" | "mean_waste_pct" | "below_60c_pct">(
    "bermasalah_pct"
  );

  useEffect(() => {
    fetchOverview().then(setData).catch(() => { });
    fetchEdaInteractive().then(setInteractive).catch(() => {});
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
  const activeCluster = hoveredCluster ?? agg.clusters[0];
  const activeDriver = hoveredDriver ?? agg.drivers[0];

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

      {/* Interactive Cluster & Root Cause Drivers (Hover Tooltip Cards) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="hairline-card p-6 lg:col-span-6">
          <h3 className="text-[17px] font-bold text-[#141414]">
            {plainMode ? "Wilayah Mana yang Paling Rawan?" : "Kerentanan per klaster geografis"}
          </h3>
          <p className="mt-1 mb-4 text-[13px] text-[#3d525c]">
            Arahkan kursor pada zona untuk melihat lama perjalanan, suhu rata-rata, dan persentase sisa.
          </p>
          <SimpleBarList
            items={agg.clusters}
            metric="bermasalah_pct"
            highlightAbove={25}
            plainMode={plainMode}
            selectedName={activeCluster?.name}
            onHover={setHoveredCluster}
            onSelect={setHoveredCluster}
          />
          {activeCluster && (
            <div className="glass-field mt-4 p-3.5 text-[12.5px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[#141414]">{activeCluster.name}</strong>
                <span className="t-mono font-bold text-[#0f5257]">
                  Sisa rata-rata {formatPct(activeCluster.mean_waste_pct)}
                </span>
              </div>
              <div className="t-mono mt-1 text-[11.5px] text-[#3d525c]">
                {activeCluster.count.toLocaleString("id-ID")} kiriman · Waktu jalan{" "}
                {String(activeCluster.mean_transit_min).replace(".", ",")} mnt · Suhu{" "}
                {String(activeCluster.mean_temp_c).replace(".", ",")}°C · Kiriman dingin{" "}
                {formatPct(activeCluster.below_60c_pct, 1)}
              </div>
            </div>
          )}
        </div>

        <div className="hairline-card p-6 lg:col-span-6">
          <h3 className="text-[17px] font-bold text-[#141414]">
            {plainMode ? "Mengapa Anak Tidak Menghabiskan Makanan?" : "Proporsi akar masalah utama (Post-Hoc)"}
          </h3>
          <p className="mt-1 mb-4 text-[13px] text-[#3d525c]">
            Arahkan kursor pada tiap alasan untuk membandingkan rata-rata sisa piring &amp; suhu tiba.
          </p>
          <SimpleBarList
            items={agg.drivers}
            metric="share_pct"
            plainMode={plainMode}
            selectedName={activeDriver?.name}
            onHover={setHoveredDriver}
            onSelect={setHoveredDriver}
          />
          {activeDriver && (
            <div className="glass-field mt-4 p-3.5 text-[12.5px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[#141414]">
                  {plainMode && DRIVER_LABELS_PLAIN[activeDriver.name]
                    ? DRIVER_LABELS_PLAIN[activeDriver.name]
                    : activeDriver.name}
                </strong>
                <span className="t-mono font-bold text-[#b53418]">
                  Bermasalah {formatPct(activeDriver.bermasalah_pct, 1)}
                </span>
              </div>
              <div className="t-mono mt-1 text-[11.5px] text-[#3d525c]">
                Rataan sisa {formatPct(activeDriver.mean_waste_pct)} · Suhu tiba{" "}
                {String(activeDriver.mean_temp_c).replace(".", ",")}°C · Biaya efektif{" "}
                {formatIdr(activeDriver.mean_effective_cost_idr)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INTERACTIVE EDA EXPLORER (Scatter, Temp Bins, Correlations + Fallback Original 10 PNGs) */}
      <InteractiveEdaExplorer
        interactive={interactive}
        plainMode={plainMode}
        onInspectSample={onLoadToSimulator}
      />

      {/* 38 Provinces Explorer with Instant Test in Simulator Button */}
      <div className="hairline-card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[17px] font-bold text-[#141414]">
              Peringkat 38 Provinsi di Indonesia
            </h3>
            <p className="mt-1 text-[13px] text-[#3d525c]">
              Klik tombol <strong>Uji</strong> pada provinsi mana pun untuk mencoba kondisi daerah tersebut.
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
                <th className="px-4 py-3 text-right font-semibold">SPPG</th>
                <th className="px-4 py-3 text-right font-semibold">Rataan Sisa</th>
                <th className="px-4 py-3 text-right font-semibold">Bermasalah</th>
                <th className="px-4 py-3 text-right font-semibold">Tiba &lt;60°C</th>
                <th className="px-4 py-3 text-right font-semibold">Transit</th>
                <th className="px-4 py-3 text-right font-semibold">Biaya Efektif</th>
                {onSelectProvince && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
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
                    className={`t-mono px-4 py-2.5 text-right font-bold ${p.bermasalah_pct >= 30 ? "text-[#b53418]" : "text-[#0f5257]"
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
                  {onSelectProvince && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectProvince(p.name)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/90 bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold text-[#0f5257] hover:bg-[#0f5257] hover:text-white transition-colors cursor-pointer"
                      >
                        Uji <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
