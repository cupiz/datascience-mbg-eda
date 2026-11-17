"use client";

import { ExplainContribution } from "@/lib/api";

interface ShapWaterfallSvgProps {
  baseValue: number;
  predictedPct: number;
  contributions: ExplainContribution[];
}

export default function ShapWaterfallSvg({
  baseValue,
  predictedPct,
  contributions,
}: ShapWaterfallSvgProps) {
  const topItems = contributions.slice(0, 8);
  const maxAbs = Math.max(
    0.8,
    ...topItems.map((item) => Math.abs(item.shap_pp))
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#2f737d]">
        <span>
          Basis rataan nasional (E[f(x)]):{" "}
          <strong className="t-mono text-[#0d2429]">
            {baseValue.toFixed(2).replace(".", ",")}%
          </strong>
        </span>
        <span>
          Hasil akhir model:{" "}
          <strong className="t-mono text-[#06525c]">
            {predictedPct.toFixed(2).replace(".", ",")}%
          </strong>
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {topItems.map((item) => {
          const isPositive = item.shap_pp >= 0;
          const widthPct = Math.min(100, (Math.abs(item.shap_pp) / maxAbs) * 100);
          return (
            <div key={item.key} className="grid grid-cols-1 gap-1.5 sm:grid-cols-12 sm:items-center sm:gap-3">
              <div className="sm:col-span-5">
                <div className="truncate text-[13px] font-medium text-[#0d2429]">
                  {item.label}
                </div>
                <div className="t-mono truncate text-[12px] text-[#2f737d]">
                  {item.display_value}
                </div>
              </div>

              <div className="sm:col-span-5">
                <div className="relative h-6 w-full rounded bg-[#ebf0ee] overflow-hidden">
                  {/* Center hairline at 50% */}
                  <div
                    className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[rgba(6,82,92,0.28)]"
                    aria-hidden="true"
                  />
                  {isPositive ? (
                    <div
                      className="absolute top-1 bottom-1 left-1/2 rounded-r bg-[#b93815] transition-all duration-300"
                      style={{ width: `${widthPct * 0.48}%` }}
                    />
                  ) : (
                    <div
                      className="absolute top-1 bottom-1 right-1/2 rounded-l bg-[#06525c] transition-all duration-300"
                      style={{ width: `${widthPct * 0.48}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 sm:text-right">
                <span
                  className={`t-mono text-[13px] font-medium ${
                    isPositive ? "text-[#b93815]" : "text-[#06525c]"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {item.shap_pp.toFixed(2).replace(".", ",")} pp
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-5 border-t border-[rgba(6,82,92,0.1)] pt-2.5 text-[12px] text-[#2f737d]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#b93815]" />
          Mendorong sisa piring naik (+ pp)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#06525c]" />
          Menekan sisa piring turun (- pp)
        </span>
      </div>
    </div>
  );
}
