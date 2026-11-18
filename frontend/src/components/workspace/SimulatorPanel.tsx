"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  Flame,
  Loader2,
  RotateCcw,
  Terminal,
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
import { SimulationRunRecord } from "@/lib/history";
import ShapWaterfallSvg from "@/components/ShapWaterfallSvg";

interface SimulatorPanelProps {
  initialPresetId?: string | null;
  loadedHoldoutRow?: HoldoutItem | null;
  loadedRun?: SimulationRunRecord | null;
  onClearLoadedRow?: () => void;
  onSaveRun?: (run: SimulationRunRecord) => void;
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
  loadedRun,
  onClearLoadedRow,
  onSaveRun,
}: SimulatorPanelProps) {
  const [mode, setMode] = useState<"pra" | "posthoc">("pra");
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [portionsToEvaluate, setPortionsToEvaluate] = useState<number>(1780);
  const [schoolDays, setSchoolDays] = useState<number>(22);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [prevWastePct, setPrevWastePct] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const runPredict = async (targetMode: "pra" | "posthoc", targetForm = form) => {
    setLoading(true);
    setErrorMsg(null);
    if (result) {
      setPrevWastePct(result.predicted_plate_waste_percentage);
    }
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
    if (loadedRun) {
      const next = {
        ...DEFAULT_FORM,
        ...(loadedRun.payload as Partial<typeof DEFAULT_FORM>),
      };
      setMode(loadedRun.mode);
      setForm(next);
      setPortionsToEvaluate(next.kitchen_daily_capacity_portions);
      runPredict(loadedRun.mode, next);
      return;
    }

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
  }, [initialPresetId, loadedHoldoutRow, loadedRun]);

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

  const handleSaveCurrentRun = () => {
    if (!result || !onSaveRun) return;
    onSaveRun({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      title: `${form.province} · ${form.beneficiary_category.split("/")[0].trim()}`,
      mode,
      province: form.province,
      cluster: form.regional_cluster,
      predictedWastePct: result.predicted_plate_waste_percentage,
      riskLevel: result.risk_level,
      lossPerPortionIdr: result.estimated_loss_per_portion_idr,
      payload: { ...form },
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
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
  const monthlyPotentialSavingIdr =
    wastePct > 10.0
      ? ((wastePct - 10.0) / 100) * dailyBudgetIdr * schoolDays
      : 0;

  const isCold = form.food_arrival_temperature_celsius < 60;
  const deltaFromPrev =
    prevWastePct !== null ? Number((wastePct - prevWastePct).toFixed(2)) : null;

  const riskBadgeClass =
    wastePct >= 15
      ? "bg-[#fbeae5] text-[#b93815] border-[#b93815]/25"
      : wastePct >= 10
      ? "bg-[#fbf0ea] text-[#b4532a] border-[#b4532a]/25"
      : "bg-[#e7f4ec] text-[#0f7d45] border-[#0f7d45]/25";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Left Workbench Inspector Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runPredict(mode, form);
        }}
        className="hairline-card flex w-full shrink-0 flex-col overflow-hidden lg:w-[410px] xl:w-[435px]"
      >
        {/* Top Mode & Quick Preset Strip */}
        <div className="border-b border-[rgba(6,82,92,0.1)] bg-[#ebf0ee]/60 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[rgba(6,82,92,0.14)] bg-[#ffffff] p-0.5">
            <button
              type="button"
              onClick={() => handleModeSwitch("pra")}
              className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                mode === "pra"
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "text-[#2f737d] hover:text-[#0d2429]"
              }`}
            >
              Pra-Distribusi (34F)
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("posthoc")}
              className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                mode === "posthoc"
                  ? "bg-[#06525c] text-[#f7f9f8]"
                  : "text-[#2f737d] hover:text-[#0d2429]"
              }`}
            >
              Post-Hoc Audit (38F)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SIMULATOR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="rounded-md border border-[rgba(6,82,92,0.16)] bg-white px-2 py-1 text-[11.5px] font-medium text-[#0d2429] hover:border-[#06525c] hover:bg-[#f7f9f8] cursor-pointer"
              >
                {p.label.split("·")[0].trim()}
              </button>
            ))}
            <button
              type="button"
              onClick={resetDefaults}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-[rgba(6,82,92,0.16)] bg-white px-2 py-1 text-[11.5px] text-[#2f737d] hover:text-[#0d2429] cursor-pointer"
              title="Kembalikan default"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>

          {loadedHoldoutRow && (
            <div className="t-mono rounded-md border border-[#06525c]/25 bg-white px-2.5 py-1.5 text-[11.5px] text-[#06525c]">
              Holdout {loadedHoldoutRow.distribution_id} · Aktual{" "}
              {formatPct(loadedHoldoutRow.actual_waste_pct)}
            </div>
          )}
        </div>

        {/* Scrollable Input Sections */}
        <div className="space-y-3 p-3.5">
          <div className="space-y-2">
            <div className="t-mono text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
              1. Wilayah &amp; Sasaran
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block text-[12px]">
                <span className="font-medium text-[#0d2429]">Provinsi</span>
                <select
                  value={form.province}
                  onChange={(e) => updateStr("province", e.target.value)}
                  className="app-control mt-1"
                >
                  {VALID_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[12px]">
                <span className="font-medium text-[#0d2429]">Klaster</span>
                <select
                  value={form.regional_cluster}
                  onChange={(e) => updateStr("regional_cluster", e.target.value)}
                  className="app-control mt-1"
                >
                  {VALID_CLUSTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[12px]">
                <span className="font-medium text-[#0d2429]">Jenjang</span>
                <select
                  value={form.beneficiary_category}
                  onChange={(e) => updateStr("beneficiary_category", e.target.value)}
                  className="app-control mt-1"
                >
                  {VALID_BENEFICIARIES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[12px]">
                <span className="font-medium text-[#0d2429]">Kapasitas dapur</span>
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
                  className="t-mono app-control mt-1"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-[rgba(6,82,92,0.1)] pt-3.5">
            <div className="t-mono text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
              2. Menu, Gizi &amp; Pagu Biaya
            </div>
            <label className="block text-[12px]">
              <span className="font-medium text-[#0d2429]">Sumber protein utama</span>
              <select
                value={form.protein_type}
                onChange={(e) => updateStr("protein_type", e.target.value)}
                className="app-control mt-1"
              >
                {VALID_PROTEINS.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="block text-[12px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Energi</span>
                  <span className="t-mono text-[#06525c]">{form.estimated_calories_kcal} kkal</span>
                </div>
                <input
                  type="range"
                  min={350}
                  max={1100}
                  step={10}
                  value={form.estimated_calories_kcal}
                  onChange={(e) => updateNum("estimated_calories_kcal", Number(e.target.value))}
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-[12px]">
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
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-[12px]">
                <span className="font-medium text-[#0d2429]">Bahan baku (Rp)</span>
                <input
                  type="number"
                  min={5000}
                  max={25000}
                  step={100}
                  value={form.raw_ingredient_cost_per_portion_idr}
                  onChange={(e) => updateNum("raw_ingredient_cost_per_portion_idr", Number(e.target.value))}
                  className="t-mono app-control mt-1"
                />
              </label>

              <label className="block text-[12px]">
                <span className="font-medium text-[#0d2429]">Total pagu (Rp)</span>
                <input
                  type="number"
                  min={7000}
                  max={30000}
                  step={100}
                  value={form.total_meal_cost_idr}
                  onChange={(e) => updateNum("total_meal_cost_idr", Number(e.target.value))}
                  className="t-mono app-control mt-1"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-[rgba(6,82,92,0.1)] pt-3.5">
            <div className="t-mono text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
              3. Logistik &amp; Rantai Termal HACCP
            </div>

            <label className="block text-[12px]">
              <span className="font-medium text-[#0d2429]">Moda transportasi</span>
              <select
                value={form.delivery_transport_mode}
                onChange={(e) => updateStr("delivery_transport_mode", e.target.value)}
                className="app-control mt-1"
              >
                {VALID_TRANSPORTS.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="block text-[12px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Jarak</span>
                  <span className="t-mono text-[#06525c]">{form.delivery_distance_km} km</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={45}
                  step={0.5}
                  value={form.delivery_distance_km}
                  onChange={(e) => updateNum("delivery_distance_km", Number(e.target.value))}
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-[12px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Transit</span>
                  <span className="t-mono text-[#06525c]">{form.transit_time_minutes} mnt</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={140}
                  step={1}
                  value={form.transit_time_minutes}
                  onChange={(e) => updateNum("transit_time_minutes", Number(e.target.value))}
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="col-span-2 block text-[12px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Suhu tiba di sekolah (ambang &ge; 60°C)</span>
                  <span className={`t-mono font-semibold ${isCold ? "text-[#b93815]" : "text-[#0f7d45]"}`}>
                    {form.food_arrival_temperature_celsius.toFixed(1)}°C
                  </span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={80}
                  step={0.5}
                  value={form.food_arrival_temperature_celsius}
                  onChange={(e) => updateNum("food_arrival_temperature_celsius", Number(e.target.value))}
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-[12px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Kehadiran</span>
                  <span className="t-mono text-[#06525c]">{form.student_attendance_rate_pct}%</span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={100}
                  step={0.5}
                  value={form.student_attendance_rate_pct}
                  onChange={(e) => updateNum("student_attendance_rate_pct", Number(e.target.value))}
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-[12px]">
                <div className="flex justify-between font-medium text-[#0d2429]">
                  <span>Petani lokal</span>
                  <span className="t-mono text-[#06525c]">{form.local_farmer_sourcing_pct}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={0.5}
                  value={form.local_farmer_sourcing_pct}
                  onChange={(e) => updateNum("local_farmer_sourcing_pct", Number(e.target.value))}
                  className="mt-1.5 w-full"
                />
              </label>
            </div>
          </div>

          {mode === "posthoc" && (
            <div className="space-y-2 border-t border-[rgba(6,82,92,0.1)] pt-3.5">
              <div className="t-mono text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
                4. Pemicu Sisa Makanan (Post-Hoc)
              </div>
              <select
                value={form.primary_food_waste_driver}
                onChange={(e) => updateStr("primary_food_waste_driver", e.target.value)}
                className="app-control"
              >
                {VALID_DRIVERS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="flex items-center gap-2 border-t border-[rgba(6,82,92,0.12)] bg-[#ebf0ee]/70 p-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menghitung...
              </>
            ) : (
              <>Jalankan prediksi {mode === "pra" ? "Pra" : "Post-Hoc"}</>
            )}
          </button>
          {onSaveRun && (
            <button
              type="button"
              onClick={handleSaveCurrentRun}
              disabled={!result}
              title="Simpan skenario ini ke Riwayat Sidebar"
              className="btn-secondary shrink-0 px-3 disabled:opacity-40"
            >
              <BookmarkPlus className="h-4 w-4" />
              {savedFeedback ? "Tersimpan" : "Simpan"}
            </button>
          )}
        </div>
      </form>

      {/* Right Result & Diagnostic Cockpit */}
      <div className="min-w-0 flex-1 space-y-4">
        {errorMsg && (
          <div className="rounded-xl border border-[#b93815]/30 bg-[#fbeae5] p-3.5 text-[13px] text-[#b93815]">
            {errorMsg}
          </div>
        )}

        {result && (
          <>
            {/* Top Outcome Strip (Botanical Sage Panel + Crisp Telemetry) */}
            <div className="sage-frame p-3 sm:p-3.5">
              <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-[rgba(6,82,92,0.12)] bg-white p-4 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-mono text-[11px] font-medium text-[#2f737d]">
                      {result.model_version}
                    </span>
                    <span className="t-mono rounded bg-[#ebf0ee] px-1.5 py-0.5 text-[11px] text-[#06525c]">
                      {result.latency_ms} ms
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="t-mono text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#0d2429]">
                      {formatPct(result.predicted_plate_waste_percentage)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${riskBadgeClass}`}
                    >
                      Risiko {result.risk_level}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[#2f737d]">
                    <span>{result.waste_category}</span>
                    {deltaFromPrev !== null && deltaFromPrev !== 0 && (
                      <span
                        className={`t-mono font-medium ${
                          deltaFromPrev > 0 ? "text-[#b93815]" : "text-[#0f7d45]"
                        }`}
                      >
                        ({deltaFromPrev > 0 ? "+" : ""}
                        {deltaFromPrev.toFixed(2).replace(".", ",")} pp)
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Compact Operational Counters */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:col-span-8">
                  <div className="rounded-lg border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-2.5">
                    <div className="text-[11px] text-[#2f737d] whitespace-nowrap">Menguap/porsi</div>
                    <div className="t-mono mt-1 text-[14px] font-semibold text-[#0d2429] whitespace-nowrap">
                      {formatIdr(result.estimated_loss_per_portion_idr)}
                    </div>
                    <div className="t-mono mt-0.5 text-[11px] text-[#2f737d] whitespace-nowrap">
                      Efek {formatIdr(result.effective_cost_per_portion_idr)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-2.5">
                    <div className="text-[11px] text-[#2f737d] whitespace-nowrap">Status suhu</div>
                    <div
                      className={`t-mono mt-1 inline-flex items-center gap-1 text-[14px] font-semibold whitespace-nowrap ${
                        isCold ? "text-[#b93815]" : "text-[#0f7d45]"
                      }`}
                    >
                      {isCold ? (
                        <ThermometerSnowflake className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Flame className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {form.food_arrival_temperature_celsius.toFixed(1)}°C
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#2f737d] whitespace-nowrap">
                      {isCold ? "Di bawah 60°C" : "Aman HACCP"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-2.5">
                    <div className="text-[11px] text-[#2f737d] whitespace-nowrap">Biaya/protein</div>
                    <div className="t-mono mt-1 text-[14px] font-semibold text-[#0d2429] whitespace-nowrap">
                      Rp{Math.round(result.derived_telemetry.cost_to_nutrition_ratio)}/g
                    </div>
                    <div className="t-mono mt-0.5 text-[11px] text-[#2f737d] whitespace-nowrap">
                      Rp{result.derived_telemetry.biaya_per_kkal.toFixed(1)}/kkal
                    </div>
                  </div>

                  <div className="rounded-lg border border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-2.5">
                    <div className="text-[11px] text-[#2f737d] whitespace-nowrap">Risiko basi</div>
                    <div className="t-mono mt-1 text-[14px] font-semibold text-[#0d2429] whitespace-nowrap">
                      {result.derived_telemetry.spoilage_risk_index.toFixed(2)}/10
                    </div>
                    <div className="t-mono mt-0.5 text-[11px] text-[#2f737d] whitespace-nowrap">
                      {result.derived_telemetry.kecepatan_km_jam} km/j
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Calculator Strip */}
            <div className="hairline-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[rgba(6,82,92,0.08)]">
                <span className="text-[13.5px] font-semibold text-[#0d2429]">
                  Kalkulator kebocoran anggaran dapur SPPG
                </span>
                <div className="flex items-center gap-3 text-[12px]">
                  <label className="flex items-center gap-1.5">
                    <span className="text-[#2f737d]">Porsi:</span>
                    <input
                      type="number"
                      min={100}
                      max={20000}
                      value={portionsToEvaluate}
                      onChange={(e) => setPortionsToEvaluate(Math.max(100, Number(e.target.value)))}
                      className="t-mono w-20 rounded border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-2 py-0.5 text-[12px]"
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
                      className="t-mono w-14 rounded border border-[rgba(6,82,92,0.2)] bg-[#f7f9f8] px-2 py-0.5 text-[12px]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#f7f9f8] p-3">
                  <div className="text-[11.5px] text-[#2f737d]">Terbuang harian ({portionsToEvaluate} porsi)</div>
                  <div className="t-mono mt-0.5 text-[17px] font-semibold text-[#0d2429]">
                    {formatIdr(dailyLossIdr)}
                  </div>
                </div>
                <div className="rounded-lg bg-[#f7f9f8] p-3">
                  <div className="text-[11.5px] text-[#2f737d]">Proyeksi {schoolDays} hari sekolah</div>
                  <div className="t-mono mt-0.5 text-[17px] font-semibold text-[#b93815]">
                    {formatIdr(monthlyLossIdr)}
                  </div>
                </div>
                <div className="rounded-lg border border-[#06525c]/15 bg-[#ebf0ee] p-3">
                  <div className="text-[11.5px] text-[#06525c]">Potensi hemat (target 10%)</div>
                  <div className="t-mono mt-0.5 text-[17px] font-semibold text-[#06525c]">
                    {formatIdr(monthlyPotentialSavingIdr)}
                  </div>
                </div>
              </div>
            </div>

            {/* Dual Bottom Diagnostics: TreeSHAP + Mitigation & Pipeline Trace */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="hairline-card p-4 sm:p-5 xl:col-span-7">
                <div className="mb-3">
                  <h3 className="text-[15px] font-semibold text-[#0d2429]">
                    Atribusi TreeSHAP lokal
                  </h3>
                  <p className="text-[12.5px] text-[#2f737d]">
                    Kontribusi faktor terhadap selisih prediksi dari rataan nasional 13,33%.
                  </p>
                </div>
                <ShapWaterfallSvg
                  baseValue={result.base_value_pct}
                  predictedPct={result.raw_predicted_pct}
                  contributions={result.contributions}
                />
              </div>

              <div className="space-y-4 xl:col-span-5">
                <div className="hairline-card p-4 sm:p-5">
                  <h3 className="text-[15px] font-semibold text-[#0d2429]">
                    Rekomendasi aksi SPPG
                  </h3>
                  <ul className="mt-2.5 space-y-2">
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
                          className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-[12.5px] leading-relaxed ${
                            isAlert
                              ? "border-[#b4532a]/25 bg-[#fbf0ea] text-[#0d2429]"
                              : "border-[#0f7d45]/25 bg-[#e7f4ec] text-[#0d2429]"
                          }`}
                        >
                          {isAlert ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b4532a]" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f7d45]" />
                          )}
                          <span>{rec}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* DupeFinder-inspired Engine Trace */}
                <div className="hairline-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#06525c]">
                    <Terminal className="h-3.5 w-3.5" />
                    Trace Inferensi Engine
                  </div>
                  <div className="t-mono space-y-1 rounded-lg bg-[#0d2429] p-3 text-[11.5px] leading-relaxed text-[#c1d0d2]">
                    <div>&gt; mode: {mode} ({mode === "pra" ? "34 fitur" : "38 fitur"})</div>
                    <div>&gt; guardrail: DROP_LEAK aktif</div>
                    <div>&gt; prov_te: &quot;{form.province}&quot; -&gt; klaster {form.regional_cluster}</div>
                    <div>&gt; cool_rate: {result.derived_telemetry.transit_cooling_rate_c_per_min}°C/mnt</div>
                    <div className="text-[#f7f9f8]">&gt; selesai: {result.predicted_plate_waste_percentage}% ({result.latency_ms} ms)</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
