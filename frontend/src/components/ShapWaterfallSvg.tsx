"use client";

import { ExplainContribution } from "@/lib/api";

interface ShapWaterfallSvgProps {
  baseValue: number;
  predictedPct: number;
  contributions: ExplainContribution[];
  plainMode?: boolean;
}

export default function ShapWaterfallSvg({
  baseValue,
  predictedPct,
  contributions,
  plainMode = true,
}: ShapWaterfallSvgProps) {
  const topItems = contributions.slice(0, 7);
  const maxAbs = Math.max(
    0.8,
    ...topItems.map((item) => Math.abs(item.shap_pp))
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#3d525c]">
        <span>
          {plainMode ? "Rata-rata dasar nasional:" : "Basis rataan (E[f(x)]):"}{" "}
          <strong className="t-mono text-[#141414]">
            {baseValue.toFixed(2).replace(".", ",")}%
          </strong>
        </span>
        <span>
          {plainMode ? "Prediksi akhir rencana:" : "Hasil akhir model:"}{" "}
          <strong className="t-mono text-[#0f5257]">
            {predictedPct.toFixed(2).replace(".", ",")}%
          </strong>
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {topItems.map((item) => {
          const isPositive = item.shap_pp >= 0;
          const widthPct = Math.min(100, (Math.abs(item.shap_pp) / maxAbs) * 100);
          return (
            <div key={item.key} className="space-y-1">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-12 sm:items-center sm:gap-2.5">
                <div className="sm:col-span-5">
                  <div className="truncate text-[13px] font-semibold text-[#141414]">
                    {item.label}
                  </div>
                  <div className="t-mono truncate text-[11.5px] text-[#3d525c]">
                    {item.display_value.replace(".", ",")}
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/85 bg-white/55">
                    <div
                      className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[rgba(20,20,20,0.2)]"
                      aria-hidden="true"
                    />
                    {isPositive ? (
                      <div
                        className="absolute top-0.5 bottom-0.5 left-1/2 rounded-r-full bg-[#b53418] transition-all duration-300"
                        style={{ width: `${widthPct * 0.48}%` }}
                      />
                    ) : (
                      <div
                        className="absolute top-0.5 bottom-0.5 right-1/2 rounded-l-full bg-[#0f5257] transition-all duration-300"
                        style={{ width: `${widthPct * 0.48}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3 sm:text-right">
                  <span
                    className={`t-mono whitespace-nowrap text-[12px] font-semibold ${
                      isPositive ? "text-[#b53418]" : "text-[#0f5257]"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {item.shap_pp.toFixed(2).replace(".", ",")} pp
                  </span>
                </div>
              </div>

              {plainMode && item.plain_note && (
                <div className="rounded-lg bg-white/45 px-2.5 py-1 text-[11.5px] leading-snug text-[#3d525c]">
                  {item.plain_note}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-5 border-t border-[rgba(15,82,87,0.12)] pt-2.5 text-[11.5px] text-[#3d525c]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#b53418]" />
          {plainMode
            ? "Membuat makanan lebih banyak bersisa"
            : "Mendorong sisa piring naik (+ pp)"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0f5257]" />
          {plainMode
            ? "Membantu makanan lebih habis dimakan"
            : "Menekan sisa piring turun (- pp)"}
        </span>
      </div>
    </div>
  );
}
