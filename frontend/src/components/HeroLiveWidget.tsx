"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Loader2, ThermometerSnowflake } from "lucide-react";
import {
  explainPrediction,
  ExplainResponse,
  formatIdr,
  formatPct,
} from "@/lib/api";
import { SIMULATOR_PRESETS } from "@/lib/constants";

const INITIAL_SNAPSHOT: Record<string, ExplainResponse> = {
  "papua-3t": {
    scenario: "pra-distribusi",
    predicted_plate_waste_percentage: 17.85,
    risk_level: "Tinggi",
    waste_category: "Pemborosan Tinggi (> 15%, Intervensi Diperlukan)",
    estimated_loss_per_portion_idr: 2677.5,
    effective_cost_per_portion_idr: 18259.28,
    recommendations: [
      "RISIKO TINGGI: Estimasi sisa makanan >= 15%. Perlu penyesuaian menu, porsi, atau jadwal kirim sebelum berangkat.",
      "KRITIS SUHU (54.0°C < 60°C): Di bawah batas aman HACCP.",
    ],
    model_version: "[pra] LightGBM (Optuna)",
    latency_ms: 8.4,
    base_value_pct: 13.33,
    raw_predicted_pct: 17.85,
    contributions: [
      { key: "temp__refllog_food_arrival_temperature_celsius", label: "Suhu Makanan Tiba", display_value: "54.0°C", shap_pp: 1.92 },
      { key: "num__estimated_calories_kcal", label: "Kandungan Energi", display_value: "540 kkal", shap_pp: 1.38 },
      { key: "grp_beneficiary_category", label: "Jenjang Penerima", display_value: "Siswa SD / Madrasah Ibtidaiyah", shap_pp: 1.15 },
    ],
    derived_telemetry: {
      total_meal_cost_idr: 15000,
      cost_to_nutrition_ratio: 769.23,
      spoilage_risk_index: 5.06,
      transit_cooling_rate_c_per_min: 0.28,
      local_economic_multiplier_score: 6.45,
      biaya_per_kkal: 27.78,
      kecepatan_km_jam: 21.2,
    },
    alert_flags: ["COLD_ARRIVAL_BELOW_60C", "INTERVENTION_THRESHOLD_15PCT", "EXTREME_TRANSIT_OVER_60M", "CLUSTER_3T_VULNERABLE"],
  },
};

export default function HeroLiveWidget() {
  const [selectedId, setSelectedId] = useState<string>(SIMULATOR_PRESETS[0].id);
  const [result, setResult] = useState<ExplainResponse>(INITIAL_SNAPSHOT["papua-3t"]);
  const [loading, setLoading] = useState<boolean>(false);
  const [liveSynced, setLiveSynced] = useState<boolean>(false);

  const runProbe = async (presetId: string) => {
    const preset = SIMULATOR_PRESETS.find((p) => p.id === presetId) ?? SIMULATOR_PRESETS[0];
    setSelectedId(preset.id);
    setLoading(true);
    try {
      const { primary_food_waste_driver: _drop, ...praPayload } = preset.payload;
      const res = await explainPrediction("pra", praPayload);
      setResult(res);
      setLiveSynced(true);
    } catch {
      // Tetap tampilkan snapshot terkalibrasi bila API belum hidup saat statis dev
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runProbe(SIMULATOR_PRESETS[0].id);
  }, []);

  const currentPreset =
    SIMULATOR_PRESETS.find((p) => p.id === selectedId) ?? SIMULATOR_PRESETS[0];
  const isHighRisk = result.predicted_plate_waste_percentage >= 15;
  const isCold = currentPreset.payload.food_arrival_temperature_celsius < 60;

  return (
    <div className="sage-frame p-4 sm:p-5" data-ui="hero-live-probe">
      <div className="overflow-hidden rounded-[14px] border border-[rgba(6,82,92,0.14)] bg-[#ffffff] shadow-[0_18px_40px_-18px_rgba(6,82,92,0.22)]">
        {/* Window Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="t-mono text-[12px] font-medium text-[#06525c]">
              SIMULASI PRA-KIRIM
            </span>
            <span className="text-[12px] text-[#2f737d]">
              · {liveSynced ? "Inferensi live FastAPI" : "Snapshot model"}
            </span>
          </div>
          <span className="t-mono rounded bg-[#ebf0ee] px-2 py-0.5 text-[11px] text-[#06525c]">
            {loading ? "Menghitung..." : `${result.latency_ms} ms`}
          </span>
        </div>

        {/* Preset Switcher */}
        <div className="border-b border-[rgba(6,82,92,0.08)] bg-[#ffffff] px-4 py-3">
          <div className="mb-2 text-[12px] font-medium text-[#2f737d]">
            Pilih skenario distribusi SPPG:
          </div>
          <div className="flex flex-wrap gap-2">
            {SIMULATOR_PRESETS.map((preset) => {
              const active = preset.id === selectedId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => runProbe(preset.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                    active
                      ? "border-[#06525c] bg-[#06525c] text-[#f7f9f8]"
                      : "border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] text-[#0d2429] hover:border-[#06525c]/50"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prediction Readout */}
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[13px] text-[#2f737d]">
                {currentPreset.payload.province} · {currentPreset.payload.beneficiary_category}
              </div>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="t-mono text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#0d2429]">
                  {formatPct(result.predicted_plate_waste_percentage)}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium ${
                    isHighRisk
                      ? "bg-[#fbeae5] text-[#b93815]"
                      : "bg-[#e7f4ec] text-[#0f7d45]"
                  }`}
                >
                  {result.risk_level}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[12px] text-[#2f737d]">Estimasi terbuang / porsi</div>
              <div className="t-mono mt-0.5 text-[18px] font-semibold text-[#0d2429]">
                {formatIdr(result.estimated_loss_per_portion_idr)}
              </div>
              <div className="t-mono text-[12px] text-[#2f737d]">
                Efektif: {formatIdr(result.effective_cost_per_portion_idr)}
              </div>
            </div>
          </div>

          {/* Cold Chain & Operational Row */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3">
            <div>
              <div className="text-[11px] text-[#2f737d]">Suhu tiba</div>
              <div
                className={`t-mono mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold ${
                  isCold ? "text-[#b93815]" : "text-[#06525c]"
                }`}
              >
                {isCold ? (
                  <ThermometerSnowflake className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {currentPreset.payload.food_arrival_temperature_celsius.toFixed(1)}°C
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#2f737d]">Waktu transit</div>
              <div className="t-mono mt-0.5 text-[13px] font-semibold text-[#0d2429]">
                {currentPreset.payload.transit_time_minutes} mnt
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#2f737d]">Energi menu</div>
              <div className="t-mono mt-0.5 text-[13px] font-semibold text-[#0d2429]">
                {currentPreset.payload.estimated_calories_kcal} kkal
              </div>
            </div>
          </div>

          {/* Top 3 SHAP Contributors */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#2f737d]">
              <span>Atribusi TreeSHAP teratas</span>
              <span className="t-mono">Basis {formatPct(result.base_value_pct)}</span>
            </div>
            <div className="space-y-1.5">
              {result.contributions.slice(0, 3).map((item) => {
                const pos = item.shap_pp >= 0;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-[rgba(6,82,92,0.08)] bg-[#f7f9f8] px-3 py-2 text-[13px]"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-medium text-[#0d2429]">{item.label}</span>
                      <span className="t-mono ml-2 text-[12px] text-[#2f737d]">
                        {item.display_value}
                      </span>
                    </div>
                    <span
                      className={`t-mono shrink-0 font-medium ${
                        pos ? "text-[#b93815]" : "text-[#06525c]"
                      }`}
                    >
                      {pos ? "+" : ""}
                      {item.shap_pp.toFixed(2).replace(".", ",")} pp
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(6,82,92,0.1)] pt-3">
            <span className="text-[12px] text-[#2f737d]">
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memperbarui SHAP...
                </span>
              ) : (
                result.model_version
              )}
            </span>
            <Link
              href={`/workspace?preset=${selectedId}`}
              className="link-draw text-[13px]"
            >
              Ubah parameter lengkap
              <ArrowRight className="m-arrow h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
