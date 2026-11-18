"use client";

import { useState } from "react";
import { formatIdr, WhatIfPoint, WhatIfResponse } from "@/lib/api";

interface WhatIfCurveCardProps {
  whatIf: WhatIfResponse | null;
  axis: "temperature" | "calories" | "transit";
  onAxisChange: (nextAxis: "temperature" | "calories" | "transit") => void;
  plainMode?: boolean;
}

export default function WhatIfCurveCard({
  whatIf,
  axis,
  onAxisChange,
  plainMode = true,
}: WhatIfCurveCardProps) {
  const [hovered, setHovered] = useState<WhatIfPoint | null>(null);
  const points = whatIf?.points ?? [];

  if (points.length === 0) return null;

  const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.predicted_waste_pct)) - 1.5));
  const maxY = Math.ceil(Math.max(...points.map((p) => p.predicted_waste_pct)) + 1.5);
  const spanY = Math.max(2, maxY - minY);

  const W = 640;
  const H = 165;
  const PAD = { l: 42, r: 22, t: 18, b: 30 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const xAt = (idx: number) =>
    PAD.l + (idx / Math.max(1, points.length - 1)) * plotW;
  const yAt = (val: number) =>
    PAD.t + (1 - (val - minY) / spanY) * plotH;

  const linePath = points
    .map((pt, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(pt.predicted_waste_pct).toFixed(1)}`)
    .join(" ");

  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const diffFirstLast = Number((lastPt.predicted_waste_pct - firstPt.predicted_waste_pct).toFixed(2));

  // Find closest grid point to user's current slider value
  let closestIdx = 0;
  let bestDist = Infinity;
  points.forEach((pt, idx) => {
    const d = Math.abs(pt.value - (whatIf?.current_value ?? pt.value));
    if (d < bestDist) {
      bestDist = d;
      closestIdx = idx;
    }
  });
  const activePt = hovered ?? points[closestIdx];

  return (
    <div className="hairline-card p-5 space-y-3">
      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-[14.5px] font-bold text-[#141414]">
            {plainMode
              ? "Simulasi Perubahan (Kurva What-If Langsung)"
              : "Kurva Sensitivitas Model (What-If Sweep)"}
          </h3>
          <p className="text-[12px] text-[#3d525c]">
            Lihat seberapa jauh perkiraan sisa berubah apabila salah satu kondisi kiriman diubah.
          </p>
        </div>

        <div className="inline-flex shrink-0 rounded-full border border-white/90 bg-white/60 p-0.5">
          {(
            [
              ["temperature", "Ubah Suhu"],
              ["calories", "Ubah Kalori"],
              ["transit", "Ubah Durasi"],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setHovered(null);
                onAxisChange(id);
              }}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold cursor-pointer ${
                axis === id ? "bg-[#0f5257] text-white" : "text-[#3d525c]"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-field p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
          {[minY, minY + spanY / 2, maxY].map((yv, i) => (
            <g key={i}>
              <line
                x1={PAD.l}
                y1={yAt(yv)}
                x2={W - PAD.r}
                y2={yAt(yv)}
                stroke="rgba(15,82,87,0.12)"
                strokeDasharray="3 3"
              />
              <text x={PAD.l - 7} y={yAt(yv) + 4} textAnchor="end" fontSize="10.5" fill="#3d525c">
                {yv.toFixed(0)}%
              </text>
            </g>
          ))}

          <path d={linePath} fill="none" stroke="#0f5257" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((pt, idx) => {
            const cx = xAt(idx);
            const cy = yAt(pt.predicted_waste_pct);
            const isSelected = idx === closestIdx;
            const isHover = activePt.value === pt.value;
            const isDanger =
              (axis === "temperature" && pt.value < 60) ||
              (axis === "transit" && pt.value > 60);
            return (
              <g
                key={pt.value}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(pt)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHover ? 7 : isSelected ? 5.8 : 4.2}
                  fill={isDanger ? "#b53418" : "#0f5257"}
                  stroke="#ffffff"
                  strokeWidth={isHover ? 2.4 : 1.5}
                />
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={isSelected ? "700" : "500"}
                  fill={isSelected ? "#0f5257" : "#3d525c"}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-[12px]">
          <span className="text-[#141414]">
            Pada titik <strong>{activePt.label}</strong>: perkiraan sisa{" "}
            <strong className="t-mono text-[#0f5257]">
              {activePt.predicted_waste_pct.toFixed(2).replace(".", ",")}%
            </strong>{" "}
            (terbuang <strong>{formatIdr(activePt.loss_per_portion_idr)}</strong>/kotak)
          </span>
          <span className="t-mono font-semibold text-[#3d525c]">
            Rentang {firstPt.label} &rarr; {lastPt.label}:{" "}
            <span className={diffFirstLast <= 0 ? "text-[#137242]" : "text-[#b53418]"}>
              {diffFirstLast > 0 ? "+" : ""}
              {diffFirstLast.toFixed(2).replace(".", ",")} pp
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
