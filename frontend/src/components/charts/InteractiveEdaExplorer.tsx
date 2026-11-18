"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  assetUrl,
  EdaInteractiveCorrelation,
  EdaInteractiveResponse,
  EdaTempBin,
  EdaWasteBin,
  formatIdr,
  formatPct,
  HoldoutItem,
} from "@/lib/api";
import { EDA_FIGURES_CATALOG } from "@/lib/constants";

interface InteractiveEdaExplorerProps {
  interactive: EdaInteractiveResponse | null;
  plainMode?: boolean;
  onInspectSample?: (item: HoldoutItem) => void;
}

type EdaTab = "scatter" | "temp_hist" | "corr";
type ScatterXAxis = "temp" | "transit" | "calories";

export default function InteractiveEdaExplorer({
  interactive,
  plainMode = true,
  onInspectSample,
}: InteractiveEdaExplorerProps) {
  const [viewMode, setViewMode] = useState<"dynamic" | "static">("dynamic");
  const [edaTab, setEdaTab] = useState<EdaTab>("scatter");
  const [xAxis, setXAxis] = useState<ScatterXAxis>("temp");
  const [hoveredPoint, setHoveredPoint] = useState<HoldoutItem | null>(null);
  const [hoveredBin, setHoveredBin] = useState<EdaTempBin | null>(null);
  const [hoveredHist, setHoveredHist] = useState<EdaWasteBin | null>(null);
  const [hoveredCorr, setHoveredCorr] = useState<EdaInteractiveCorrelation | null>(null);
  const [selectedFigure, setSelectedFigure] = useState(EDA_FIGURES_CATALOG[1]);

  const scatterMeta = useMemo(() => {
    if (xAxis === "temp") {
      return {
        label: "Suhu Makanan Saat Tiba (°C)",
        min: 30,
        max: 74,
        ticks: [30, 40, 50, 60, 70],
        getVal: (p: HoldoutItem) => p.food_arrival_temperature_celsius,
        safeLine: 60,
        safeLabel: "Batas hangat 60°C",
      };
    }
    if (xAxis === "transit") {
      return {
        label: "Lama Perjalanan Kirim (Menit)",
        min: 0,
        max: 125,
        ticks: [0, 30, 60, 90, 120],
        getVal: (p: HoldoutItem) => p.transit_time_minutes,
        safeLine: 60,
        safeLabel: "Batas telat 60 mnt",
      };
    }
    return {
      label: "Kandungan Kalori Menu (kkal)",
      min: 500,
      max: 860,
      ticks: [500, 600, 700, 800, 850],
      getVal: (p: HoldoutItem) => p.estimated_calories_kcal,
      safeLine: 680,
      safeLabel: "Rataan 678 kkal",
    };
  }, [xAxis]);

  const pts = interactive?.scatter_points ?? [];
  const activePoint = hoveredPoint ?? pts[pts.length - 1] ?? null;
  const maxTempWaste = Math.max(25, ...(interactive?.temp_bins.map((b) => b.mean_waste_pct) ?? [20]));
  const maxHistShare = Math.max(10, ...(interactive?.waste_histogram.map((b) => b.share_pct) ?? [30]));

  // SVG coordinate helpers for Scatter
  const W = 740;
  const H = 290;
  const PAD = { l: 48, r: 22, t: 18, b: 36 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const xPos = (v: number) =>
    PAD.l + ((Math.min(scatterMeta.max, Math.max(scatterMeta.min, v)) - scatterMeta.min) / (scatterMeta.max - scatterMeta.min)) * plotW;
  const yPos = (w: number) =>
    PAD.t + (1 - Math.min(40, Math.max(0, w)) / 40) * plotH;

  return (
    <div className="hairline-card p-6 space-y-5">
      {/* Header + Dynamic vs Original PNG Switcher */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h3 className="text-[17px] font-bold text-[#141414]">
            {plainMode
              ? "Eksplorasi Pola Data Interaktif (Hover & Klik Data)"
              : "Galeri EDA Interaktif & Artefak eda_run.py"}
          </h3>
          <p className="mt-1 text-[13px] text-[#3d525c]">
            {viewMode === "dynamic"
              ? "Arahkan kursor pada grafik untuk melihat detail angka, atau klik titik pengiriman untuk mengujinya di Simulator."
              : "Menampilkan gambar statistik resolusi tinggi asli yang dihasilkan skrip eda_run.py untuk laporan."}
          </p>
        </div>

        <div className="inline-flex shrink-0 rounded-full border border-white/90 bg-white/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode("dynamic")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold cursor-pointer ${
              viewMode === "dynamic"
                ? "bg-[#0f5257] text-white shadow-sm"
                : "text-[#3d525c] hover:text-[#141414]"
            }`}
          >
            Grafik Interaktif
          </button>
          <button
            type="button"
            onClick={() => setViewMode("static")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold cursor-pointer ${
              viewMode === "static"
                ? "bg-[#0f5257] text-white shadow-sm"
                : "text-[#3d525c] hover:text-[#141414]"
            }`}
          >
            Gambar Asli EDA (10 PNG)
          </button>
        </div>
      </div>

      {viewMode === "dynamic" && interactive && (
        <div className="space-y-4">
          {/* Interactive Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap gap-1.5">
              {[
                { id: "scatter", label: plainMode ? "Sebaran Titik Nyata (240 Uji)" : "Scatter Hubungan Bivariat" },
                { id: "temp_hist", label: plainMode ? "Suhu Dingin vs Sebaran Sisa" : "Zona Suhu & Histogram Target" },
                { id: "corr", label: plainMode ? "Faktor Paling Berhubungan" : "Peta Korelasi Pearson (r)" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEdaTab(t.id as EdaTab)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-colors ${
                    edaTab === t.id
                      ? "bg-[#0f5257] text-white"
                      : "bg-white/65 text-[#3d525c] hover:bg-white hover:text-[#141414]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {edaTab === "scatter" && (
              <div className="inline-flex rounded-full border border-white/90 bg-white/60 p-0.5">
                {(
                  [
                    ["temp", "Suhu Tiba"],
                    ["transit", "Lama Jalan"],
                    ["calories", "Kalori"],
                  ] as const
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setXAxis(id)}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer ${
                      xAxis === id ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* VIEW A: SCATTER */}
          {edaTab === "scatter" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="glass-field p-3 lg:col-span-8">
                <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
                  {/* Horizontal Grid Lines (0..40%) */}
                  {[0, 10, 20, 30, 40].map((yVal) => {
                    const yy = yPos(yVal);
                    return (
                      <g key={yVal}>
                        <line
                          x1={PAD.l}
                          y1={yy}
                          x2={W - PAD.r}
                          y2={yy}
                          stroke="rgba(15,82,87,0.12)"
                          strokeDasharray={yVal === 0 ? undefined : "3 3"}
                        />
                        <text x={PAD.l - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="#3d525c">
                          {yVal}%
                        </text>
                      </g>
                    );
                  })}

                  {/* X ticks */}
                  {scatterMeta.ticks.map((xv) => {
                    const xx = xPos(xv);
                    return (
                      <g key={xv}>
                        <line
                          x1={xx}
                          y1={PAD.t}
                          x2={xx}
                          y2={H - PAD.b}
                          stroke="rgba(15,82,87,0.08)"
                        />
                        <text x={xx} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="#3d525c">
                          {xv}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Threshold Line */}
                  <line
                    x1={xPos(scatterMeta.safeLine)}
                    y1={PAD.t}
                    x2={xPos(scatterMeta.safeLine)}
                    y2={H - PAD.b}
                    stroke="#b53418"
                    strokeWidth="1.4"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={xPos(scatterMeta.safeLine) + 5}
                    y={PAD.t + 12}
                    fontSize="10.5"
                    fontWeight="600"
                    fill="#b53418"
                  >
                    {scatterMeta.safeLabel}
                  </text>

                  {/* National Mean Line 13.34% */}
                  <line
                    x1={PAD.l}
                    y1={yPos(13.34)}
                    x2={W - PAD.r}
                    y2={yPos(13.34)}
                    stroke="#0f5257"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />

                  {/* Scatter Circles */}
                  {pts.map((pt) => {
                    const cx = xPos(scatterMeta.getVal(pt));
                    const cy = yPos(pt.actual_waste_pct);
                    const isActive = activePoint?.distribution_id === pt.distribution_id;
                    const color =
                      pt.actual_waste_pct >= 20
                        ? "#b53418"
                        : pt.actual_waste_pct >= 10
                        ? "#b4532a"
                        : "#0f5257";
                    return (
                      <circle
                        key={pt.distribution_id}
                        cx={cx}
                        cy={cy}
                        r={isActive ? 7 : 4.3}
                        fill={color}
                        fillOpacity={isActive ? 1 : 0.72}
                        stroke={isActive ? "#141414" : "#ffffff"}
                        strokeWidth={isActive ? 2 : 0.9}
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onClick={() => onInspectSample?.(pt)}
                      />
                    );
                  })}

                  <text
                    x={W / 2}
                    y={H - 4}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="600"
                    fill="#141414"
                  >
                    {scatterMeta.label} vs Sisa Makanan Nyata (%)
                  </text>
                </svg>
              </div>

              {/* Hover Inspector Card */}
              <div className="glass-field flex flex-col justify-between p-4 lg:col-span-4">
                {activePoint ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-mono rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#0f5257]">
                        {activePoint.distribution_id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          activePoint.actual_waste_pct >= 20
                            ? "bg-[rgba(181,52,24,0.14)] text-[#b53418]"
                            : "bg-[rgba(15,82,87,0.12)] text-[#0f5257]"
                        }`}
                      >
                        Sisa {formatPct(activePoint.actual_waste_pct)}
                      </span>
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[#141414]">
                        {activePoint.province}
                      </div>
                      <div className="text-[12px] text-[#3d525c]">
                        {activePoint.regional_cluster}
                      </div>
                    </div>
                    <div className="space-y-1.5 border-t border-[rgba(15,82,87,0.1)] pt-2.5 text-[12.5px]">
                      <div className="flex justify-between">
                        <span className="text-[#3d525c]">Suhu tiba:</span>
                        <strong className="t-mono text-[#141414]">
                          {activePoint.food_arrival_temperature_celsius.toFixed(1).replace(".", ",")}°C
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#3d525c]">Lama perjalanan:</span>
                        <strong className="t-mono text-[#141414]">
                          {activePoint.transit_time_minutes} mnt ({String(activePoint.delivery_distance_km).replace(".", ",")} km)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#3d525c]">Gizi &amp; Lauk:</span>
                        <strong className="t-mono text-[#141414]">
                          {activePoint.estimated_calories_kcal} kkal
                        </strong>
                      </div>
                      <div className="truncate text-[12px] text-[#3d525c]">
                        {activePoint.protein_type} · {activePoint.beneficiary_category}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#3d525c]">Biaya porsi:</span>
                        <strong className="t-mono text-[#141414]">
                          {formatIdr(activePoint.total_meal_cost_idr)}
                        </strong>
                      </div>
                    </div>
                    {onInspectSample && (
                      <button
                        type="button"
                        onClick={() => onInspectSample(activePoint)}
                        className="btn-primary mt-2 w-full"
                      >
                        Uji Titik Ini di Simulator
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-[13px] text-[#3d525c]">
                    Arahkan kursor pada titik grafik untuk melihat detail.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: TEMP ZONES & WASTE HISTOGRAM */}
          {edaTab === "temp_hist" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="glass-field p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-bold text-[#141414]">
                      Rata-rata Sisa per Rentang Suhu Tiba
                    </div>
                    <div className="text-[12px] text-[#3d525c]">
                      Makanan dingin (&lt;60°C) jauh lebih sering bersisa.
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5 pt-1">
                  {interactive.temp_bins.map((b) => (
                    <div
                      key={b.label}
                      onMouseEnter={() => setHoveredBin(b)}
                      className="rounded-xl bg-white/60 p-2 hover:bg-white transition-colors cursor-default"
                    >
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="font-semibold text-[#141414]">
                          {b.label}{" "}
                          <span className="text-[11px] font-normal text-[#3d525c]">
                            ({b.count} kiriman)
                          </span>
                        </span>
                        <span
                          className={`t-mono font-bold ${
                            b.is_cold ? "text-[#b53418]" : "text-[#0f5257]"
                          }`}
                        >
                          {b.mean_waste_pct.toFixed(2).replace(".", ",")}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(b.mean_waste_pct / maxTempWaste) * 100}%`,
                            backgroundColor: b.is_cold ? "#b53418" : "#0f5257",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {hoveredBin && (
                  <div className="rounded-xl bg-[#eef4f7] px-3 py-2 text-[12px] text-[#141414]">
                    Rentang suhu <strong>{hoveredBin.label}</strong>: rata-rata perjalanan{" "}
                    <strong>{String(hoveredBin.mean_transit_min).replace(".", ",")} menit</strong>{" "}
                    dengan sisa <strong>{hoveredBin.mean_waste_pct.toFixed(2).replace(".", ",")}%</strong>{" "}
                    ({hoveredBin.is_cold ? "zona dingin berisiko tinggi" : "zona hangat aman"}).
                  </div>
                )}
              </div>

              <div className="glass-field p-4 space-y-3">
                <div>
                  <div className="text-[14px] font-bold text-[#141414]">
                    Sebaran Persentase Sisa di Piring (2.600 Data Uji)
                  </div>
                  <div className="text-[12px] text-[#3d525c]">
                    Porsi terbanyak mengumpul di kisaran 10–15%, namun ekor kanan mencapai &ge;30%.
                  </div>
                </div>
                <div className="space-y-2.5 pt-1">
                  {interactive.waste_histogram.map((h) => {
                    const isHigh = h.label.startsWith("20") || h.label.startsWith("25") || h.label.startsWith(">=");
                    return (
                      <div
                        key={h.label}
                        onMouseEnter={() => setHoveredHist(h)}
                        className="rounded-xl bg-white/60 p-2 hover:bg-white transition-colors cursor-default"
                      >
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-[#141414]">
                            Sisa {h.label}{" "}
                            <span className="text-[11px] font-normal text-[#3d525c]">
                              ({h.count} kiriman)
                            </span>
                          </span>
                          <span
                            className={`t-mono font-bold ${
                              isHigh ? "text-[#b53418]" : "text-[#0f5257]"
                            }`}
                          >
                            {h.share_pct.toFixed(1).replace(".", ",")}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(h.share_pct / maxHistShare) * 100}%`,
                              backgroundColor: isHigh ? "#b53418" : "#0f5257",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hoveredHist && (
                  <div className="rounded-xl bg-[#eef4f7] px-3 py-2 text-[12px] text-[#141414]">
                    Kelompok <strong>{hoveredHist.label}</strong> mencakup{" "}
                    <strong>{hoveredHist.count} pengiriman</strong> ({hoveredHist.share_pct.toFixed(1).replace(".", ",")}% dari data uji).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW C: INTERACTIVE CORRELATIONS */}
          {edaTab === "corr" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {interactive.correlations.map((c) => {
                  const isNeg = c.r < 0;
                  const widthPct = Math.min(100, (Math.abs(c.r) / 0.4) * 100);
                  return (
                    <div
                      key={c.key}
                      onMouseEnter={() => setHoveredCorr(c)}
                      className="glass-field p-3 hover:bg-white transition-colors cursor-default"
                    >
                      <div className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="font-semibold text-[#141414]">{c.label}</span>
                        <span
                          className={`t-mono font-bold ${
                            isNeg ? "text-[#0f5257]" : "text-[#b53418]"
                          }`}
                        >
                          r = {c.r > 0 ? "+" : ""}
                          {c.r.toFixed(3).replace(".", ",")}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/75">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: isNeg ? "#0f5257" : "#b53418",
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[11.5px] text-[#3d525c]">{c.plain_note}</div>
                    </div>
                  );
                })}
              </div>
              {hoveredCorr && (
                <div className="rounded-2xl bg-[#eef4f7] px-4 py-2.5 text-[12.5px] text-[#141414]">
                  <strong>{hoveredCorr.label}</strong> (<code>r = {hoveredCorr.r.toFixed(3).replace(".", ",")}</code>): {hoveredCorr.plain_note}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FALLBACK STATIC ORIGINAL PNG GALLERY */}
      {(viewMode === "static" || !interactive) && (
        <div className="space-y-4">
          <div className="flex justify-end">
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
          <div className="sage-frame p-3 sm:p-4">
            <div className="overflow-hidden rounded-[18px] border border-white bg-white p-3 sm:p-4">
              <img
                src={assetUrl(`/figures/${selectedFigure.file}`)}
                alt={selectedFigure.title}
                className="mx-auto h-auto max-h-[540px] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
