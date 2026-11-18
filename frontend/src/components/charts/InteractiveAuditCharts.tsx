"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  assetUrl,
  formatPct,
  GlobalShapItem,
  HoldoutItem,
} from "@/lib/api";

interface InteractiveAuditChartsProps {
  scenario: "pra" | "posthoc";
  globalShap: GlobalShapItem[];
  scatterPoints: HoldoutItem[];
  plainMode?: boolean;
  onInspectSample?: (row: HoldoutItem) => void;
}

export default function InteractiveAuditCharts({
  scenario,
  globalShap,
  scatterPoints,
  plainMode = true,
  onInspectSample,
}: InteractiveAuditChartsProps) {
  const [shapMode, setShapMode] = useState<"dynamic" | "static">("dynamic");
  const [shapImgType, setShapImgType] = useState<"beeswarm" | "bar">("beeswarm");
  const [hoveredShap, setHoveredShap] = useState<GlobalShapItem | null>(null);
  const [hoveredPt, setHoveredPt] = useState<HoldoutItem | null>(null);

  const activeShap = hoveredShap ?? globalShap[0] ?? null;
  const activePt = hoveredPt ?? scatterPoints[Math.floor(scatterPoints.length / 2)] ?? null;

  const maxShap = Math.max(0.2, ...globalShap.map((g) => g.mean_abs_shap_pp));
  const getPred = (p: HoldoutItem) =>
    scenario === "pra" ? p.pred_pra_pct : p.pred_posthoc_pct;

  // Scatter SVG geometry
  const W = 540;
  const H = 290;
  const PAD = { l: 44, r: 18, t: 16, b: 36 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const coordX = (v: number) => PAD.l + (Math.min(40, Math.max(0, v)) / 40) * plotW;
  const coordY = (v: number) => PAD.t + (1 - Math.min(40, Math.max(0, v)) / 40) * plotH;

  return (
    <div className="space-y-5">
      {/* Row 1: Global TreeSHAP Interactive + Original PNG Toggle */}
      <div className="hairline-card p-5 space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[16px] font-bold text-[#141414]">
              {plainMode
                ? `Faktor Paling Berpengaruh (${scenario === "pra" ? "Sebelum Kirim" : "Setelah Makan"})`
                : `Global TreeSHAP (${scenario === "pra" ? "Pra-Distribusi" : "Post-Hoc"})`}
            </h3>
            <p className="text-[12.5px] text-[#3d525c]">
              {shapMode === "dynamic"
                ? "Arahkan kursor pada faktor di bawah untuk melihat pengaruh rata-rata (poin persen) beserta artinya."
                : "Menampilkan grafik asli Matplotlib dari train.py (figures_fase3/)."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-white/90 bg-white/60 p-0.5">
              <button
                type="button"
                onClick={() => setShapMode("dynamic")}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer ${
                  shapMode === "dynamic" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
                }`}
              >
                Grafik Interaktif
              </button>
              <button
                type="button"
                onClick={() => setShapMode("static")}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer ${
                  shapMode === "static" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
                }`}
              >
                Plot Asli Matplotlib
              </button>
            </div>

            {shapMode === "static" && (
              <div className="inline-flex rounded-full border border-white/90 bg-white/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setShapImgType("beeswarm")}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer ${
                    shapImgType === "beeswarm" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
                  }`}
                >
                  Beeswarm
                </button>
                <button
                  type="button"
                  onClick={() => setShapImgType("bar")}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer ${
                    shapImgType === "bar" ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
                  }`}
                >
                  Bar Mean
                </button>
              </div>
            )}
          </div>
        </div>

        {shapMode === "dynamic" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-8">
              {globalShap.map((item, idx) => {
                const isActive = activeShap?.key === item.key;
                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredShap(item)}
                    className={`rounded-xl px-3 py-2 transition-colors cursor-default ${
                      isActive ? "bg-white shadow-xs" : "bg-white/55 hover:bg-white/85"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="font-semibold text-[#141414]">
                        {idx + 1}. {item.label}
                      </span>
                      <span className="t-mono font-bold text-[#0f5257]">
                        ±{item.mean_abs_shap_pp.toFixed(3).replace(".", ",")} pp
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#eef4f7]">
                      <div
                        className="h-full rounded-full bg-[#0f5257]"
                        style={{ width: `${(item.mean_abs_shap_pp / maxShap) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass-field flex flex-col justify-between p-4 lg:col-span-4">
              {activeShap ? (
                <div className="space-y-2.5">
                  <div className="t-mono text-[11px] font-semibold uppercase text-[#0f5257]">
                    Penjelasan Faktor
                  </div>
                  <div className="text-[16px] font-bold text-[#141414]">
                    {activeShap.label}
                  </div>
                  <div className="t-mono text-[22px] font-bold text-[#0f5257]">
                    ±{activeShap.mean_abs_shap_pp.toFixed(3).replace(".", ",")} pp
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3d525c]">
                    {activeShap.plain_note}
                  </p>
                  <div className="rounded-xl bg-[#eef4f7] p-2.5 text-[11.5px] text-[#3d525c]">
                    Rata-rata besar pergeseran tebakan model akibat perubahan faktor ini di seluruh Indonesia.
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-[#3d525c]">
                  Pilih salah satu batang untuk membaca penjelasannya.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="sage-frame p-3">
            <div className="overflow-hidden rounded-[18px] border border-white bg-white p-3">
              <img
                src={assetUrl(`/figures-fase3/shap_${shapImgType}_${scenario}.png`)}
                alt={`SHAP ${shapImgType} ${scenario}`}
                className="mx-auto max-h-[460px] w-full object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Interactive Predicted vs Actual Holdout Calibration Scatter */}
      {scatterPoints.length > 0 && (
        <div className="hairline-card p-5 space-y-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#141414]">
              {plainMode
                ? `Seberapa Dekat Tebakan Model dengan Kenyataan (${scenario === "pra" ? "Sebelum Kirim" : "Setelah Makan"})`
                : `Kalibrasi Prediksi vs Aktual 240 Sampel Holdout (${scenario === "pra" ? "Pra-Distribusi" : "Post-Hoc"})`}
            </h3>
            <p className="mt-0.5 text-[12.5px] text-[#3d525c]">
              Makin dekat titik ke garis putus-putus diagonal, makin jitu tebakan model. Klik titik mana pun untuk menguji di Simulator.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass-field p-3 lg:col-span-8">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
                {[0, 10, 20, 30, 40].map((v) => (
                  <g key={v}>
                    <line
                      x1={PAD.l}
                      y1={coordY(v)}
                      x2={W - PAD.r}
                      y2={coordY(v)}
                      stroke="rgba(15,82,87,0.1)"
                      strokeDasharray={v === 0 ? undefined : "3 3"}
                    />
                    <text x={PAD.l - 7} y={coordY(v) + 4} textAnchor="end" fontSize="10.5" fill="#3d525c">
                      {v}%
                    </text>
                    <line
                      x1={coordX(v)}
                      y1={PAD.t}
                      x2={coordX(v)}
                      y2={H - PAD.b}
                      stroke="rgba(15,82,87,0.08)"
                    />
                    <text x={coordX(v)} y={H - PAD.b + 15} textAnchor="middle" fontSize="10.5" fill="#3d525c">
                      {v}%
                    </text>
                  </g>
                ))}

                {/* Ideal Diagonal y = x */}
                <line
                  x1={coordX(0)}
                  y1={coordY(0)}
                  x2={coordX(38)}
                  y2={coordY(38)}
                  stroke="#0f5257"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <text x={coordX(30)} y={coordY(33)} fontSize="10.5" fontWeight="600" fill="#0f5257">
                  Garis Tebakan Tepat
                </text>

                {scatterPoints.map((pt) => {
                  const pred = getPred(pt);
                  const err = Math.abs(pt.actual_waste_pct - pred);
                  const isActive = activePt?.distribution_id === pt.distribution_id;
                  const fill = err >= 6 ? "#b53418" : "#0f5257";
                  return (
                    <circle
                      key={pt.distribution_id}
                      cx={coordX(pt.actual_waste_pct)}
                      cy={coordY(pred)}
                      r={isActive ? 6.8 : 4.1}
                      fill={fill}
                      fillOpacity={isActive ? 1 : 0.68}
                      stroke={isActive ? "#141414" : "#ffffff"}
                      strokeWidth={isActive ? 1.8 : 0.8}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPt(pt)}
                      onClick={() => onInspectSample?.(pt)}
                    />
                  );
                })}

                <text x={W / 2} y={H - 3} textAnchor="middle" fontSize="11" fontWeight="600" fill="#141414">
                  Kenyataan Sisa Piring (%) vs Prediksi Model (%)
                </text>
              </svg>
            </div>

            <div className="glass-field flex flex-col justify-between p-4 lg:col-span-4">
              {activePt ? (
                <div className="space-y-2.5">
                  <div className="t-mono text-[11px] font-semibold text-[#0f5257]">
                    {activePt.distribution_id}
                  </div>
                  <div className="text-[15px] font-bold text-[#141414]">
                    {activePt.province}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-white/80 p-2.5">
                      <div className="text-[11px] text-[#3d525c]">Nyata</div>
                      <div className="t-mono text-[16px] font-bold text-[#141414]">
                        {formatPct(activePt.actual_waste_pct)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 p-2.5">
                      <div className="text-[11px] text-[#3d525c]">Tebakan</div>
                      <div className="t-mono text-[16px] font-bold text-[#0f5257]">
                        {formatPct(getPred(activePt))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[12.5px] text-[#3d525c]">
                    Selisih:{" "}
                    <strong className="t-mono text-[#141414]">
                      {Math.abs(activePt.actual_waste_pct - getPred(activePt)).toFixed(2).replace(".", ",")} pp
                    </strong>{" "}
                    · Suhu {activePt.food_arrival_temperature_celsius.toFixed(1).replace(".", ",")}°C
                  </div>
                  {onInspectSample && (
                    <button
                      type="button"
                      onClick={() => onInspectSample(activePt)}
                      className="btn-primary w-full"
                    >
                      Buka di Simulator
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[13px] text-[#3d525c]">Arahkan kursor pada titik.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
