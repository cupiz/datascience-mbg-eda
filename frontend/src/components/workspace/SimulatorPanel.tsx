"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Loader2,
  RotateCcw,
  ThermometerSnowflake,
} from "lucide-react";
import {
  explainPrediction,
  ExplainResponse,
  formatIdr,
  formatPct,
  HoldoutItem,
} from "@/lib/api";
import {
  SIMULATOR_PRESETS,
  VALID_BENEFICIARIES,
  VALID_CLUSTERS,
  VALID_DRIVERS,
  VALID_PROTEINS,
  VALID_PROVINCES,
  VALID_TRANSPORTS,
} from "@/lib/constants";
import ShapWaterfallSvg from "@/components/ShapWaterfallSvg";

interface SimulatorPanelProps {
  initialPresetId?: string | null;
  loadedHoldoutRow?: HoldoutItem | null;
  onClearLoadedRow?: () => void;
}

const DEFAULT_FORM = {
  kitchen_daily_capacity_portions: 1780,
  raw_ingredient_cost_per_portion_idr: 11300,
  total_meal_cost_idr: 13500,
  delivery_distance_km: 6.8,
  transit_time_minutes: 25,
  food_arrival_temperature_celsius: 65.0,
  estimated_calories_kcal: 680,
  estimated_protein_grams: 22.7,
  regional_cluster: "Jawa Metropolitan" as string,
  province: "Jawa Tengah" as string,
  beneficiary_category: "Siswa SD / Madrasah Ibtidaiyah" as string,
  protein_type: "Daging Ayam Broiler" as string,
  delivery_transport_mode: "Mobil Pickup Termal" as string,
  student_attendance_rate_pct: 94.4,
  local_farmer_sourcing_pct: 73.7,
  primary_food_waste_driver: "Prior-Snack-Consumption",
};

export default function SimulatorPanel({
  initialPresetId,
  loadedHoldoutRow,
  onClearLoadedRow,
}: SimulatorPanelProps) {
  const [mode, setMode] = useState<"pra" | "posthoc">("pra");
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [portionsToEvaluate, setPortionsToEvaluate] = useState<number>(1780);
  const [schoolDays, setSchoolDays] = useState<number>(22);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runPredict = async (targetMode: "pra" | "posthoc", targetForm = form) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload =
        targetMode === "pra"
          ? (() => {
              const { primary_food_waste_driver: _omit, ...rest } = targetForm;
              return rest;
            })()
          : targetForm;
      const res = await explainPrediction(targetMode, payload);
      setResult(res);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal menghubungi layanan inferensi FastAPI."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedHoldoutRow) {
      const next = {
        kitchen_daily_capacity_portions: loadedHoldoutRow.kitchen_daily_capacity_portions,
        raw_ingredient_cost_per_portion_idr: loadedHoldoutRow.raw_ingredient_cost_per_portion_idr,
        total_meal_cost_idr: loadedHoldoutRow.total_meal_cost_idr,
        delivery_distance_km: loadedHoldoutRow.delivery_distance_km,
        transit_time_minutes: loadedHoldoutRow.transit_time_minutes,
        food_arrival_temperature_celsius: loadedHoldoutRow.food_arrival_temperature_celsius,
        estimated_calories_kcal: loadedHoldoutRow.estimated_calories_kcal,
        estimated_protein_grams: loadedHoldoutRow.estimated_protein_grams,
        regional_cluster: loadedHoldoutRow.regional_cluster,
        province: loadedHoldoutRow.province,
        beneficiary_category: loadedHoldoutRow.beneficiary_category,
        protein_type: loadedHoldoutRow.protein_type,
        delivery_transport_mode: loadedHoldoutRow.delivery_transport_mode,
        student_attendance_rate_pct: loadedHoldoutRow.student_attendance_rate_pct,
        local_farmer_sourcing_pct: loadedHoldoutRow.local_farmer_sourcing_pct,
        primary_food_waste_driver: loadedHoldoutRow.primary_food_waste_driver,
      };
      setForm(next);
      setPortionsToEvaluate(loadedHoldoutRow.kitchen_daily_capacity_portions);
      runPredict(mode, next);
      return;
    }

    if (initialPresetId) {
      const preset = SIMULATOR_PRESETS.find((p) => p.id === initialPresetId);
      if (preset) {
        const next = {
          ...DEFAULT_FORM,
          ...preset.payload,
          total_meal_cost_idr: preset.payload.total_meal_cost_idr ?? 14500,
        };
        setForm(next);
        setPortionsToEvaluate(next.kitchen_daily_capacity_portions);
        runPredict(mode, next);
        return;
      }
    }

    runPredict(mode, form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPresetId, loadedHoldoutRow]);

  const applyPreset = (id: string) => {
    if (onClearLoadedRow) onClearLoadedRow();
    const preset = SIMULATOR_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = {
      ...DEFAULT_FORM,
      ...preset.payload,
      total_meal_cost_idr: preset.payload.total_meal_cost_idr ?? 14500,
    };
    setForm(next);
    setPortionsToEvaluate(next.kitchen_daily_capacity_portions);
    runPredict(mode, next);
  };

  const resetDefaults = () => {
    if (onClearLoadedRow) onClearLoadedRow();
    setForm({ ...DEFAULT_FORM });
    setPortionsToEvaluate(DEFAULT_FORM.kitchen_daily_capacity_portions);
    runPredict(mode, DEFAULT_FORM);
  };

  const handleModeSwitch = (nextMode: "pra" | "posthoc") => {
    setMode(nextMode);
    runPredict(nextMode, form);
  };

  const updateNum = (field: keyof typeof DEFAULT_FORM, val: number) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const updateStr = (field: keyof typeof DEFAULT_FORM, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const wastePct = result?.predicted_plate_waste_percentage ?? 0;
  const dailyBudgetIdr = portionsToEvaluate * form.total_meal_cost_idr;
  const dailyLossIdr = result
    ? result.estimated_loss_per_portion_idr * portionsToEvaluate
    : 0;
  const monthlyLossIdr = dailyLossIdr * schoolDays;
  const targetThresholdPct = 10.0;
  const monthlyPotentialSavingIdr =
    wastePct > targetThresholdPct
      ? ((wastePct - targetThresholdPct) / 100) * dailyBudgetIdr * schoolDays
      : 0;

  const isCold = form.food_arrival_temperature_celsius < 60;
  const riskBadgeClass =
    wastePct >= 15
      ? "bg-[#fbeae5] text-[#b93815] border-[#b93815]/25"
      : wastePct >= 10
      ? "bg-[#fbf0ea] text-[#b4532a] border-[#b4532a]/25"
      : "bg-[#e7f4ec] text-[#0f7d45] border-[#0f7d45]/25";

  return (
    <div className="space-y-6">
      {/* Mode Bar & Presets */}
      <div className="hairline-card flex flex-col justify-between gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] p-1">
            <button
              type="button"
              onClick={() => handleModeSwitch("pra")}
              className={`rounded-lg px-3.5 py-2 text-[14px] font-medium cursor-pointer transition-colors ${
                mode === "pra"
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "text-[#2f737d] hover:text-[#0d2429]"
              }`}
            >
              Pra-Distribusi (34 fitur)
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("posthoc")}
              className={`rounded-lg px-3.5 py-2 text-[14px] font-medium cursor-pointer transition-colors ${
                mode === "posthoc"
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "text-[#2f737d] hover:text-[#0d2429]"
              }`}
            >
              Post-Hoc Audit (38 fitur)
            </button>
          </div>

          {loadedHoldoutRow && (
            <span className="t-mono inline-flex items-center gap-2 rounded-lg border border-[#06525c]/25 bg-[#ebf0ee] px-3 py-1.5 text-[12px] text-[#06525c]">
              Holdout {loadedHoldoutRow.distribution_id} · Aktual{" "}
              {formatPct(loadedHoldoutRow.actual_waste_pct)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SIMULATOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded-lg border border-[rgba(6,82,92,0.18)] bg-[#f7f9f8] px-3 py-2 text-[13px] font-medium text-[#0d2429] hover:border-[#06525c] hover:bg-[#ebf0ee] transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,82,92,0.16)] bg-white px-3 py-2 text-[13px] font-medium text-[#2f737d] hover:text-[#0d2429] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Structured Controls */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runPredict(mode, form);
          }}
          className="hairline-card space-y-6 p-5 sm:p-6 xl:col-span-6"
        >
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0d2429]">
              Parameter rencana distribusi SPPG
            </h2>
            <p className="mt-1 text-[14px] text-[#2f737d]">
              Ubah spesifikasi menu, rantai dingin, atau provinsi lalu jalankan prediksi.
            </p>
          </div>

          {/* Group 1: Wilayah & Penerima */}
          <fieldset className="space-y-4 border-t border-[rgba(6,82,92,0.1)] pt-4">
            <legend className="text-[13px] font-semibold text-[#06525c]">
              1. Wilayah &amp; kelompok sasaran
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="block text-[13px]">
                <span className="font-medium text-[#0d2429]">Provinsi (Target-Encoded)</span>
                <select
                  value={form.province}
                  onChange={(e) => updateStr("province", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2.5 text-[14px] text-[#0d2429]"
                >
                  {VALID_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[13px]">
                <span className="font-medium text-[#0d2429]">Klaster geografis</span>
                <select
                  value={form.regional_cluster}
                  onChange={(e) => updateStr("regional_cluster", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2.5 text-[14px] text-[#0d2429]"
                >
                  {VALID_CLUSTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[13px]">
                <span className="font-medium text-[#0d2429]">Jenjang penerima</span>
                <select
                  value={form.beneficiary_category}
                  onChange={(e) => updateStr("beneficiary_category", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2.5 text-[14px] text-[#0d2429]"
                >
                  {VALID_BENEFICIARIES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[13px]">
                <span className="font-medium text-[#0d2429]">Kapasitas dapur SPPG (porsi/hari)</span>
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={50}
                  value={form.kitchen_daily_capacity_portions}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 100;
                    updateNum("kitchen_daily_capacity_portions", v);
                    setPortionsToEvaluate(v);
                  }}
                  className="t-mono mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[14px] text-[#0d2429]"
                />
              </label>
            </div>
          </fieldset>

          {/* Group 2: Menu, Gizi & Biaya */}
          <fieldset className="space-y-4 border-t border-[rgba(6,82,92,0.1)] pt-4">
            <legend className="text-[13px] font-semibold text-[#06525c]">
              2. Komposisi menu, protein &amp; anggaran porsi
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="block text-[13px] sm:col-span-2">
                <span className="font-medium text-[#0d2429]">Sumber protein utama</span>
                <select
                  value={form.protein_type}
                  onChange={(e) => updateStr("protein_type", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2.5 text-[14px] text-[#0d2429]"
                >
                  {VALID_PROTEINS.map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[13px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Energi menu</span>
                  <span className="t-mono text-[#06525c]">{form.estimated_calories_kcal} kkal</span>
                </div>
                <input
                  type="range"
                  min={350}
                  max={1100}
                  step={10}
                  value={form.estimated_calories_kcal}
                  onChange={(e) => updateNum("estimated_calories_kcal", Number(e.target.value))}
                  className="mt-2.5 w-full"
                />
              </label>

              <label className="block text-[13px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Protein</span>
                  <span className="t-mono text-[#06525c]">{form.estimated_protein_grams} g</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={50}
                  step={0.5}
                  value={form.estimated_protein_grams}
                  onChange={(e) => updateNum("estimated_protein_grams", Number(e.target.value))}
                  className="mt-2.5 w-full"
                />
              </label>

              <label className="block text-[13px]">
                <span className="font-medium text-[#0d2429]">Biaya bahan baku / porsi (Rp)</span>
                <input
                  type="number"
                  min={5000}
                  max={25000}
                  step={100}
                  value={form.raw_ingredient_cost_per_portion_idr}
                  onChange={(e) => updateNum("raw_ingredient_cost_per_portion_idr", Number(e.target.value))}
                  className="t-mono mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[14px] text-[#0d2429]"
                />
              </label>

              <label className="block text-[13px]">
                <span className="font-medium text-[#0d2429]">Total pagu / porsi (Rp)</span>
                <input
                  type="number"
                  min={7000}
                  max={30000}
                  step={100}
                  value={form.total_meal_cost_idr}
                  onChange={(e) => updateNum("total_meal_cost_idr", Number(e.target.value))}
                  className="t-mono mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2 text-[14px] text-[#0d2429]"
                />
              </label>
            </div>
          </fieldset>

          {/* Group 3: Logistik & Rantai Termal */}
          <fieldset className="space-y-4 border-t border-[rgba(6,82,92,0.1)] pt-4">
            <legend className="text-[13px] font-semibold text-[#06525c]">
              3. Logistik pengiriman &amp; ambang termal HACCP
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="block text-[13px] sm:col-span-2">
                <span className="font-medium text-[#0d2429]">Moda transportasi</span>
                <select
                  value={form.delivery_transport_mode}
                  onChange={(e) => updateStr("delivery_transport_mode", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2.5 text-[14px] text-[#0d2429]"
                >
                  {VALID_TRANSPORTS.map((tr) => (
                    <option key={tr} value={tr}>
                      {tr}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[13px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Jarak kirim</span>
                  <span className="t-mono text-[#06525c]">{form.delivery_distance_km} km</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={45}
                  step={0.5}
                  value={form.delivery_distance_km}
                  onChange={(e) => updateNum("delivery_distance_km", Number(e.target.value))}
                  className="mt-2.5 w-full"
                />
              </label>

              <label className="block text-[13px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Waktu transit</span>
                  <span className="t-mono text-[#06525c]">{form.transit_time_minutes} mnt</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={140}
                  step={1}
                  value={form.transit_time_minutes}
                  onChange={(e) => updateNum("transit_time_minutes", Number(e.target.value))}
                  className="mt-2.5 w-full"
                />
              </label>

              <label className="block text-[13px] sm:col-span-2">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Suhu makanan saat tiba (ambang aman &ge; 60°C)</span>
                  <span
                    className={`t-mono font-semibold ${
                      isCold ? "text-[#b93815]" : "text-[#0f7d45]"
                    }`}
                  >
                    {form.food_arrival_temperature_celsius.toFixed(1)}°C
                  </span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={80}
                  step={0.5}
                  value={form.food_arrival_temperature_celsius}
                  onChange={(e) =>
                    updateNum("food_arrival_temperature_celsius", Number(e.target.value))
                  }
                  className="mt-2.5 w-full"
                />
              </label>

              <label className="block text-[13px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Kehadiran siswa</span>
                  <span className="t-mono text-[#06525c]">{form.student_attendance_rate_pct}%</span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={100}
                  step={0.5}
                  value={form.student_attendance_rate_pct}
                  onChange={(e) => updateNum("student_attendance_rate_pct", Number(e.target.value))}
                  className="mt-2.5 w-full"
                />
              </label>

              <label className="block text-[13px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Serapan petani lokal</span>
                  <span className="t-mono text-[#06525c]">{form.local_farmer_sourcing_pct}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={0.5}
                  value={form.local_farmer_sourcing_pct}
                  onChange={(e) => updateNum("local_farmer_sourcing_pct", Number(e.target.value))}
                  className="mt-2.5 w-full"
                />
              </label>
            </div>
          </fieldset>

          {mode === "posthoc" && (
            <fieldset className="space-y-3 border-t border-[rgba(6,82,92,0.1)] pt-4">
              <legend className="text-[13px] font-semibold text-[#06525c]">
                4. Faktor pemicu pasca-distribusi (khusus Post-Hoc)
              </legend>
              <select
                value={form.primary_food_waste_driver}
                onChange={(e) => updateStr("primary_food_waste_driver", e.target.value)}
                className="w-full rounded-lg border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-3 py-2.5 text-[14px] text-[#0d2429]"
              >
                {VALID_DRIVERS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </fieldset>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menghitung prediksi &amp; TreeSHAP...
              </>
            ) : (
              <>Jalankan prediksi {mode === "pra" ? "Pra-Distribusi" : "Post-Hoc Audit"}</>
            )}
          </button>
        </form>

        {/* Right Column: Prediction, SHAP & Fiscal Impact */}
        <div className="space-y-6 xl:col-span-6">
          {errorMsg && (
            <div className="rounded-xl border border-[#b93815]/30 bg-[#fbeae5] p-4 text-[14px] text-[#b93815]">
              {errorMsg}
            </div>
          )}

          {result && (
            <>
              {/* Score Header inside Botanical Sage Frame */}
              <div className="sage-frame p-4 sm:p-5">
                <div className="rounded-[14px] border border-[rgba(6,82,92,0.12)] bg-[#ffffff] p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="t-mono text-[12px] text-[#2f737d]">
                        {result.model_version} · {result.latency_ms} ms
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-3">
                        <span className="t-mono text-[44px] font-semibold leading-none tracking-[-0.03em] text-[#0d2429]">
                          {formatPct(result.predicted_plate_waste_percentage)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${riskBadgeClass}`}
                        >
                          Risiko {result.risk_level}
                        </span>
                      </div>
                      <p className="mt-2 text-[14px] text-[#2f737d]">{result.waste_category}</p>
                    </div>

                    <div className="shrink-0 rounded-xl border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3.5 sm:text-right">
                      <div className="text-[12px] text-[#2f737d]">Biaya menguap / porsi</div>
                      <div className="t-mono mt-0.5 text-[22px] font-semibold text-[#0d2429]">
                        {formatIdr(result.estimated_loss_per_portion_idr)}
                      </div>
                      <div className="t-mono text-[12px] text-[#06525c]">
                        Efektif: {formatIdr(result.effective_cost_per_portion_idr)}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Waste Meter */}
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-[12px] text-[#2f737d]">
                      <span>Skala target BGN (&lt;10% optimal, &ge;20% kritis)</span>
                      <span className="t-mono">0% — 40%</span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#ebf0ee]">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#0f7d45]/20"
                        style={{ width: "25%" }}
                      />
                      <div
                        className="absolute inset-y-0 left-[25%] bg-[#b4532a]/20"
                        style={{ width: "25%" }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (wastePct / 40) * 100)}%`,
                          backgroundColor:
                            wastePct >= 15 ? "#b93815" : wastePct >= 10 ? "#b4532a" : "#0f7d45",
                        }}
                      />
                    </div>
                  </div>

                  {/* Derived Feature Badges */}
                  <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[rgba(6,82,92,0.1)] pt-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-[#f7f9f8] p-2.5">
                      <div className="text-[11px] text-[#2f737d]">Biaya / protein</div>
                      <div className="t-mono mt-0.5 text-[13px] font-semibold text-[#0d2429]">
                        Rp{Math.round(result.derived_telemetry.cost_to_nutrition_ratio)}/g
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#f7f9f8] p-2.5">
                      <div className="text-[11px] text-[#2f737d]">Indeks risiko basi</div>
                      <div className="t-mono mt-0.5 text-[13px] font-semibold text-[#0d2429]">
                        {result.derived_telemetry.spoilage_risk_index.toFixed(2)}/10
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#f7f9f8] p-2.5">
                      <div className="text-[11px] text-[#2f737d]">Kecepatan kirim</div>
                      <div className="t-mono mt-0.5 text-[13px] font-semibold text-[#0d2429]">
                        {result.derived_telemetry.kecepatan_km_jam} km/j
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#f7f9f8] p-2.5">
                      <div className="text-[11px] text-[#2f737d]">Status suhu</div>
                      <div
                        className={`t-mono mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap ${
                          isCold ? "text-[#b93815]" : "text-[#0f7d45]"
                        }`}
                      >
                        {isCold ? (
                          <ThermometerSnowflake className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Flame className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {isCold ? "< 60°C" : ">= 60°C"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fiscal Calculator */}
              <div className="hairline-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#0d2429]">
                      Kalkulator dampak anggaran dapur SPPG
                    </h3>
                    <p className="text-[13px] text-[#2f737d]">
                      Estimasi kebocoran rupiah harian dan potensi penghematan jika ditekan ke 10%.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <label className="flex items-center gap-1.5">
                      <span className="text-[#2f737d]">Porsi:</span>
                      <input
                        type="number"
                        min={100}
                        max={20000}
                        value={portionsToEvaluate}
                        onChange={(e) => setPortionsToEvaluate(Math.max(100, Number(e.target.value)))}
                        className="t-mono w-20 rounded-md border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-2 py-1 text-[13px]"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="text-[#2f737d]">Hari:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={schoolDays}
                        onChange={(e) => setSchoolDays(Math.max(1, Number(e.target.value)))}
                        className="t-mono w-14 rounded-md border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-2 py-1 text-[13px]"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3.5">
                    <div className="text-[12px] text-[#2f737d]">Sisa harian ({portionsToEvaluate} porsi)</div>
                    <div className="t-mono mt-1 text-[18px] font-semibold text-[#0d2429]">
                      {formatIdr(dailyLossIdr)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3.5">
                    <div className="text-[12px] text-[#2f737d]">Proyeksi {schoolDays} hari sekolah</div>
                    <div className="t-mono mt-1 text-[18px] font-semibold text-[#b93815]">
                      {formatIdr(monthlyLossIdr)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#06525c]/20 bg-[#ebf0ee] p-3.5">
                    <div className="text-[12px] text-[#06525c]">Potensi hemat (10%)</div>
                    <div className="t-mono mt-1 text-[18px] font-semibold text-[#06525c]">
                      {formatIdr(monthlyPotentialSavingIdr)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Local TreeSHAP Attribution */}
              <div className="hairline-card p-5 sm:p-6">
                <h3 className="text-[17px] font-semibold text-[#0d2429]">
                  Penjelasan TreeSHAP lokal (faktor pendorong skenario ini)
                </h3>
                <p className="mt-1 mb-4 text-[13px] text-[#2f737d]">
                  Dihitung langsung oleh shap.TreeExplainer untuk kombinasi input aktif Anda.
                </p>
                <ShapWaterfallSvg
                  baseValue={result.base_value_pct}
                  predictedPct={result.raw_predicted_pct}
                  contributions={result.contributions}
                />
              </div>

              {/* Actionable Mitigation */}
              <div className="hairline-card p-5 sm:p-6">
                <h3 className="text-[17px] font-semibold text-[#0d2429]">
                  Rekomendasi tindakan operasional BGN / SPPG
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {result.recommendations.map((rec, idx) => {
                    const isAlert =
                      rec.startsWith("RISIKO") ||
                      rec.startsWith("KRITIS") ||
                      rec.startsWith("TRANSIT") ||
                      rec.startsWith("ZONA") ||
                      rec.startsWith("AKAR MASALAH");
                    return (
                      <li
                        key={idx}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-[14px] leading-relaxed ${
                          isAlert
                            ? "border-[#b4532a]/25 bg-[#fbf0ea] text-[#0d2429]"
                            : "border-[#0f7d45]/25 bg-[#e7f4ec] text-[#0d2429]"
                        }`}
                      >
                        {isAlert ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b4532a]" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f7d45]" />
                        )}
                        <span>{rec}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
