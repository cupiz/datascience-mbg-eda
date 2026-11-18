"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  BookOpenText,
  CheckCircle2,
  Flame,
  GitCompare,
  Loader2,
  RotateCcw,
  Terminal,
  ThermometerSnowflake,
  Zap,
} from "lucide-react";
import {
  explainPrediction,
  ExplainResponse,
  fetchWhatIfCurve,
  formatIdr,
  formatPct,
  HoldoutItem,
  WhatIfResponse,
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
import WhatIfCurveCard from "@/components/charts/WhatIfCurveCard";

interface SimulatorPanelProps {
  initialPresetId?: string | null;
  loadedHoldoutRow?: HoldoutItem | null;
  loadedRun?: SimulationRunRecord | null;
  plainMode?: boolean;
  onTogglePlainMode?: () => void;
  onClearLoadedRow?: () => void;
  onSaveRun?: (run: SimulationRunRecord) => void;
}

interface BaselineSnapshot {
  label: string;
  wastePct: number;
  lossPerPortionIdr: number;
  monthlyLossIdr: number;
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
  plainMode = true,
  onTogglePlainMode,
  onClearLoadedRow,
  onSaveRun,
}: SimulatorPanelProps) {
  const [mode, setMode] = useState<"pra" | "posthoc">("pra");
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [portionsToEvaluate, setPortionsToEvaluate] = useState<number>(1780);
  const [schoolDays, setSchoolDays] = useState<number>(22);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [prevWastePct, setPrevWastePct] = useState<number | null>(null);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(true);
  const [baseline, setBaseline] = useState<BaselineSnapshot | null>(null);
  const [whatIfAxis, setWhatIfAxis] = useState<"temperature" | "calories" | "transit">("temperature");
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const hydratedRef = useRef(false);

  const runPredict = async (
    targetMode: "pra" | "posthoc",
    targetForm = form,
    targetAxis = whatIfAxis
  ) => {
    setLoading(true);
    setErrorMsg(null);
    if (result) {
      setPrevWastePct(result.predicted_plate_waste_percentage);
    }
    try {
      const { primary_food_waste_driver: _omit, ...praOnly } = targetForm;
      const payload = targetMode === "pra" ? praOnly : targetForm;
      const [res, curve] = await Promise.all([
        explainPrediction(targetMode, payload),
        fetchWhatIfCurve(praOnly, targetAxis).catch(() => null),
      ]);
      setResult(res);
      if (curve) setWhatIfData(curve);
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
    hydratedRef.current = false;
    if (loadedRun) {
      const next = {
        ...DEFAULT_FORM,
        ...(loadedRun.payload as Partial<typeof DEFAULT_FORM>),
      };
      setMode(loadedRun.mode);
      setForm(next);
      setPortionsToEvaluate(next.kitchen_daily_capacity_portions);
      runPredict(loadedRun.mode, next).then(() => {
        hydratedRef.current = true;
      });
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
      runPredict(mode, next).then(() => {
        hydratedRef.current = true;
      });
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
        runPredict(mode, next).then(() => {
          hydratedRef.current = true;
        });
        return;
      }
    }

    runPredict(mode, form).then(() => {
      hydratedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPresetId, loadedHoldoutRow, loadedRun]);

  // Live Auto-Update Debounced on Form Change
  useEffect(() => {
    if (!hydratedRef.current || !autoSimulate) return;
    const timer = setTimeout(() => {
      runPredict(mode, form, whatIfAxis);
    }, 260);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, autoSimulate]);

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
    runPredict(mode, next, whatIfAxis);
  };

  const resetDefaults = () => {
    if (onClearLoadedRow) onClearLoadedRow();
    setForm({ ...DEFAULT_FORM });
    setPortionsToEvaluate(DEFAULT_FORM.kitchen_daily_capacity_portions);
    runPredict(mode, DEFAULT_FORM, whatIfAxis);
  };

  const handleModeSwitch = (nextMode: "pra" | "posthoc") => {
    setMode(nextMode);
    runPredict(nextMode, form, whatIfAxis);
  };

  const handleAxisSwitch = async (nextAxis: "temperature" | "calories" | "transit") => {
    setWhatIfAxis(nextAxis);
    const { primary_food_waste_driver: _omit, ...praOnly } = form;
    const curve = await fetchWhatIfCurve(praOnly, nextAxis).catch(() => null);
    if (curve) setWhatIfData(curve);
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
      ? "bg-[rgba(181,52,24,0.14)] text-[#b53418] border-[rgba(181,52,24,0.28)]"
      : wastePct >= 10
      ? "bg-[rgba(180,83,42,0.14)] text-[#b4532a] border-[rgba(180,83,42,0.28)]"
      : "bg-[rgba(19,114,66,0.14)] text-[#137242] border-[rgba(19,114,66,0.28)]";

  const activeRecs =
    plainMode && result?.plain_recommendations?.length
      ? result.plain_recommendations
      : result?.recommendations ?? [];

  const handleToggleBaseline = () => {
    if (!result) return;
    if (baseline) {
      setBaseline(null);
      return;
    }
    setBaseline({
      label: `${form.province} · ${form.food_arrival_temperature_celsius.toFixed(0)}°C · ${form.estimated_calories_kcal} kkal`,
      wastePct,
      lossPerPortionIdr: result.estimated_loss_per_portion_idr,
      monthlyLossIdr,
    });
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* LEFT GLASS WINDOW: Rencana Distribusi Parameters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runPredict(mode, form, whatIfAxis);
        }}
        className="glass-strong flex w-full shrink-0 flex-col overflow-hidden rounded-[24px] lg:w-[410px] xl:w-[426px]"
      >
        <div className="border-b border-[rgba(15,82,87,0.1)] bg-white/40 p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-white/85 bg-white/55 p-1">
            <button
              type="button"
              onClick={() => handleModeSwitch("pra")}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors ${
                mode === "pra"
                  ? "bg-[#0f5257] text-white shadow-sm"
                  : "text-[#3d525c] hover:text-[#141414]"
              }`}
            >
              {plainMode ? "Sebelum Kirim" : "Pra-Distribusi (34F)"}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("posthoc")}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors ${
                mode === "posthoc"
                  ? "bg-[#0f5257] text-white shadow-sm"
                  : "text-[#3d525c] hover:text-[#141414]"
              }`}
            >
              {plainMode ? "Evaluasi Selesai" : "Post-Hoc Audit (38F)"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SIMULATOR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="rounded-full border border-white/90 bg-white/70 px-2.5 py-1 text-[11.5px] font-semibold text-[#141414] hover:bg-white hover:border-[#0f5257]/30 cursor-pointer"
              >
                {p.label.split("·")[0].trim()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAutoSimulate((v) => !v)}
              title="Hitung otomatis saat menggeser slider"
              className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                autoSimulate
                  ? "border-[#0f5257]/30 bg-[#0f5257]/12 text-[#0f5257]"
                  : "border-white/90 bg-white/70 text-[#3d525c]"
              }`}
            >
              <Zap className="h-3 w-3" />
              {autoSimulate ? "Auto" : "Manual"}
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-1 rounded-full border border-white/90 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#3d525c] hover:text-[#141414] cursor-pointer"
              title="Kembalikan nilai awal"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>

          {loadedHoldoutRow && (
            <div className="t-mono rounded-2xl border border-white bg-white/75 px-3 py-1.5 text-[11.5px] font-semibold text-[#0f5257]">
              Uji Sampel {loadedHoldoutRow.distribution_id} · Nyata{" "}
              {formatPct(loadedHoldoutRow.actual_waste_pct)}
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-2">
            <div className="t-mono text-[11px] font-semibold uppercase tracking-wider text-[#3d525c]">
              1. Daerah &amp; Sekolah Tujuan
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="glass-field block p-2.5 text-[11.5px]">
                <span className="font-semibold text-[#3d525c]">Provinsi</span>
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

              <label className="glass-field block p-2.5 text-[11.5px]">
                <span className="font-semibold text-[#3d525c]">Zona Wilayah</span>
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

              <label className="glass-field block p-2.5 text-[11.5px]">
                <span className="font-semibold text-[#3d525c]">Penerima</span>
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

              <label className="glass-field block p-2.5 text-[11.5px]">
                <span className="font-semibold text-[#3d525c]">Porsi Dapur/Hari</span>
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

          <div className="space-y-2.5 border-t border-[rgba(15,82,87,0.1)] pt-3">
            <div className="t-mono text-[11px] font-semibold uppercase tracking-wider text-[#3d525c]">
              2. Lauk, Gizi &amp; Biaya Porsi
            </div>
            <label className="glass-field block p-2.5 text-[11.5px]">
              <span className="font-semibold text-[#3d525c]">Menu Protein Utama</span>
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

            <div className="grid grid-cols-2 gap-2.5">
              <label className="glass-field block p-2.5 text-[11.5px]">
                <div className="flex justify-between font-semibold text-[#3d525c]">
                  <span>Kalori</span>
                  <span className="t-mono text-[#0f5257]">{form.estimated_calories_kcal} kkal</span>
                </div>
                <input
                  type="range"
                  min={350}
                  max={1100}
                  step={10}
                  value={form.estimated_calories_kcal}
                  onChange={(e) => updateNum("estimated_calories_kcal", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <label className="glass-field block p-2.5 text-[11.5px]">
                <div className="flex justify-between font-semibold text-[#3d525c]">
                  <span>Protein</span>
                  <span className="t-mono text-[#0f5257]">{form.estimated_protein_grams} g</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={50}
                  step={0.5}
                  value={form.estimated_protein_grams}
                  onChange={(e) => updateNum("estimated_protein_grams", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <label className="glass-field block p-2.5 text-[11.5px]">
                <span className="font-semibold text-[#3d525c]">Bahan Baku (Rp)</span>
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

              <label className="glass-field block p-2.5 text-[11.5px]">
                <span className="font-semibold text-[#3d525c]">Harga Total/Porsi (Rp)</span>
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

          <div className="space-y-2.5 border-t border-[rgba(15,82,87,0.1)] pt-3">
            <div className="t-mono text-[11px] font-semibold uppercase tracking-wider text-[#3d525c]">
              3. Pengiriman &amp; Kehangatan Makanan
            </div>

            <label className="glass-field block p-2.5 text-[11.5px]">
              <span className="font-semibold text-[#3d525c]">Kendaraan Pengantar</span>
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

            <div className="grid grid-cols-2 gap-2.5">
              <label className="glass-field block p-2.5 text-[11.5px]">
                <div className="flex justify-between font-semibold text-[#3d525c]">
                  <span>Jarak</span>
                  <span className="t-mono text-[#0f5257]">{form.delivery_distance_km} km</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={45}
                  step={0.5}
                  value={form.delivery_distance_km}
                  onChange={(e) => updateNum("delivery_distance_km", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <label className="glass-field block p-2.5 text-[11.5px]">
                <div className="flex justify-between font-semibold text-[#3d525c]">
                  <span>Lama Jalan</span>
                  <span className="t-mono text-[#0f5257]">{form.transit_time_minutes} mnt</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={140}
                  step={1}
                  value={form.transit_time_minutes}
                  onChange={(e) => updateNum("transit_time_minutes", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <label className="glass-field col-span-2 block p-2.5 text-[12px]">
                <div className="flex justify-between font-semibold text-[#141414]">
                  <span>Suhu Makanan Tiba (Aman &ge; 60°C)</span>
                  <span className={`t-mono font-bold ${isCold ? "text-[#b53418]" : "text-[#137242]"}`}>
                    {form.food_arrival_temperature_celsius.toFixed(1).replace(".", ",")}°C
                  </span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={80}
                  step={0.5}
                  value={form.food_arrival_temperature_celsius}
                  onChange={(e) => updateNum("food_arrival_temperature_celsius", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <label className="glass-field block p-2.5 text-[11.5px]">
                <div className="flex justify-between font-semibold text-[#3d525c]">
                  <span>Kehadiran</span>
                  <span className="t-mono text-[#0f5257]">{form.student_attendance_rate_pct}%</span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={100}
                  step={0.5}
                  value={form.student_attendance_rate_pct}
                  onChange={(e) => updateNum("student_attendance_rate_pct", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <label className="glass-field block p-2.5 text-[11.5px]">
                <div className="flex justify-between font-semibold text-[#3d525c]">
                  <span>Bahan Lokal</span>
                  <span className="t-mono text-[#0f5257]">{form.local_farmer_sourcing_pct}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={0.5}
                  value={form.local_farmer_sourcing_pct}
                  onChange={(e) => updateNum("local_farmer_sourcing_pct", Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>
            </div>
          </div>

          {mode === "posthoc" && (
            <div className="glass-field space-y-1.5 p-2.5">
              <div className="t-mono text-[11px] font-semibold uppercase tracking-wider text-[#3d525c]">
                4. Temuan Lapangan (Sesudah Makan)
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

        <div className="flex items-center gap-2 border-t border-[rgba(15,82,87,0.1)] bg-white/45 p-3.5">
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
              <>{plainMode ? "Hitung Perkiraan Sisa" : `Jalankan prediksi ${mode === "pra" ? "Pra" : "Post-Hoc"}`}</>
            )}
          </button>
          {onSaveRun && (
            <button
              type="button"
              onClick={handleSaveCurrentRun}
              disabled={!result}
              title="Simpan skenario ke panel Riwayat"
              className="btn-secondary shrink-0 px-3.5 disabled:opacity-40"
            >
              <BookmarkPlus className="h-4 w-4" />
              {savedFeedback ? "Tersimpan" : "Simpan"}
            </button>
          )}
        </div>
      </form>

      {/* RIGHT SPATIAL STAGE */}
      <div className="min-w-0 flex-1 space-y-4">
        {errorMsg && (
          <div className="rounded-[20px] border border-[rgba(181,52,24,0.3)] bg-[rgba(255,240,236,0.9)] p-4 text-[13px] font-medium text-[#b53418]">
            {errorMsg}
          </div>
        )}

        {result && (
          <>
            {/* HERO SPATIAL GLASS PANEL */}
            <div className="sage-frame p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-mono rounded-full bg-white/75 px-2.5 py-0.5 text-[11px] font-semibold text-[#3d525c]">
                      {result.model_version}
                    </span>
                    <span className="t-mono rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-semibold text-[#0f5257]">
                      {result.latency_ms} ms
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
                    <span className="t-mono text-[44px] sm:text-[50px] font-bold leading-none tracking-[-0.03em] text-[#141414]">
                      {formatPct(result.predicted_plate_waste_percentage)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ${riskBadgeClass}`}
                    >
                      Risiko {result.risk_level}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-[#3d525c]">
                    <span>
                      {plainMode
                        ? "Perkiraan porsi tersisa di piring siswa"
                        : result.waste_category}
                    </span>
                    {deltaFromPrev !== null && deltaFromPrev !== 0 && (
                      <span
                        className={`t-mono font-semibold ${
                          deltaFromPrev > 0 ? "text-[#b53418]" : "text-[#137242]"
                        }`}
                      >
                        ({deltaFromPrev > 0 ? "+" : ""}
                        {deltaFromPrev.toFixed(2).replace(".", ",")} pp)
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleToggleBaseline}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold cursor-pointer transition-colors ${
                        baseline
                          ? "border-[#0f5257] bg-[#0f5257] text-white"
                          : "border-white/90 bg-white/80 text-[#0f5257] hover:bg-white"
                      }`}
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      {baseline ? "Lepas Patokan A" : "Kunci Sebagai Patokan (A)"}
                    </button>
                  </div>
                </div>

                {/* 4 Spatial Mini Glass Tiles */}
                <div className="grid grid-cols-2 gap-2.5 lg:col-span-7">
                  <div className="glass-tile p-3">
                    <div className="text-[11px] font-semibold text-[#3d525c]">
                      {plainMode ? "Nilai terbuang per kotak" : "Menguap / porsi"}
                    </div>
                    <div className="t-mono mt-1 text-[16px] font-bold text-[#141414]">
                      {formatIdr(result.estimated_loss_per_portion_idr)}
                    </div>
                    <div className="t-mono mt-0.5 text-[11px] text-[#3d525c]">
                      {plainMode ? "Biaya efektif " : "Efek "}
                      {formatIdr(result.effective_cost_per_portion_idr)}
                    </div>
                  </div>

                  <div className="glass-tile p-3">
                    <div className="text-[11px] font-semibold text-[#3d525c]">
                      Suhu tiba di sekolah
                    </div>
                    <div
                      className={`t-mono mt-1 inline-flex items-center gap-1 text-[16px] font-bold ${
                        isCold ? "text-[#b53418]" : "text-[#137242]"
                      }`}
                    >
                      {isCold ? (
                        <ThermometerSnowflake className="h-4 w-4 shrink-0" />
                      ) : (
                        <Flame className="h-4 w-4 shrink-0" />
                      )}
                      {form.food_arrival_temperature_celsius.toFixed(1).replace(".", ",")}°C
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-[#3d525c]">
                      {isCold ? "Dingin (di bawah 60°C)" : "Hangat & aman"}
                    </div>
                  </div>

                  <div className="glass-tile p-3">
                    <div className="text-[11px] font-semibold text-[#3d525c]">
                      {plainMode ? "Biaya per gram protein" : "Cost / Nutrition Ratio"}
                    </div>
                    <div className="t-mono mt-1 text-[16px] font-bold text-[#141414]">
                      Rp{Math.round(result.derived_telemetry.cost_to_nutrition_ratio)}/g
                    </div>
                    <div className="t-mono mt-0.5 text-[11px] text-[#3d525c]">
                      Rp{result.derived_telemetry.biaya_per_kkal.toFixed(1).replace(".", ",")}/kkal
                    </div>
                  </div>

                  <div className="glass-tile p-3">
                    <div className="text-[11px] font-semibold text-[#3d525c]">
                      {plainMode ? "Risiko cepat basi" : "Indeks Pembusukan"}
                    </div>
                    <div className="t-mono mt-1 text-[16px] font-bold text-[#141414]">
                      {result.derived_telemetry.spoilage_risk_index.toFixed(2).replace(".", ",")}/10
                    </div>
                    <div className="t-mono mt-0.5 text-[11px] text-[#3d525c]">
                      {String(result.derived_telemetry.kecepatan_km_jam).replace(".", ",")} km/j
                    </div>
                  </div>
                </div>
              </div>

              {/* A vs B Comparison Bar when Baseline Pinned */}
              {baseline && (
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white bg-white/80 px-4 py-2.5 text-[12.5px]">
                  <span className="text-[#3d525c]">
                    Patokan A (<strong className="text-[#141414]">{baseline.label}</strong>):{" "}
                    <strong className="t-mono text-[#141414]">{formatPct(baseline.wastePct)}</strong>
                  </span>
                  <span className="t-mono font-bold">
                    {wastePct <= baseline.wastePct ? (
                      <span className="text-[#137242]">
                        Perubahan {(wastePct - baseline.wastePct).toFixed(2).replace(".", ",")} pp · Hemat{" "}
                        {formatIdr(Math.max(0, baseline.monthlyLossIdr - monthlyLossIdr))}/bulan
                      </span>
                    ) : (
                      <span className="text-[#b53418]">
                        Naik +{(wastePct - baseline.wastePct).toFixed(2).replace(".", ",")} pp (+
                        {formatIdr(monthlyLossIdr - baseline.monthlyLossIdr)}/bulan)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* HUMANIZER AI PLAIN-LANGUAGE CARD */}
            {result.humanizer_summary && (
              <div className="hairline-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(15,82,87,0.1)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0f5257] text-white">
                      <BookOpenText className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-[14.5px] font-bold text-[#141414]">
                      Ringkasan Bahasa Sederhana (Mudah Dipahami Awam)
                    </h3>
                  </div>
                  {onTogglePlainMode && (
                    <button
                      type="button"
                      onClick={onTogglePlainMode}
                      className="rounded-full border border-white/90 bg-white/75 px-3 py-1 text-[11.5px] font-semibold text-[#0f5257] hover:bg-white cursor-pointer"
                    >
                      {plainMode ? "Lihat Istilah Teknis" : "Aktifkan Penjelas Awam"}
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-[#141414]">
                  <p className="font-semibold text-[#0f5257]">
                    {result.humanizer_summary.headline}
                  </p>
                  <p>{result.humanizer_summary.story}</p>
                  <div className="grid grid-cols-1 gap-2.5 pt-1 md:grid-cols-2">
                    <div className="glass-field p-3 text-[12.5px]">
                      <div className="font-semibold text-[#3d525c]">Mengapa angkanya segini?</div>
                      <div className="mt-1 text-[#141414]">{result.humanizer_summary.cause_plain}</div>
                    </div>
                    <div className="glass-field p-3 text-[12.5px]">
                      <div className="font-semibold text-[#0f5257]">Langkah cepat yang disarankan</div>
                      <div className="mt-1 font-medium text-[#141414]">
                        {result.humanizer_summary.action_plain}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE WHAT-IF SENSITIVITY CURVE */}
            <WhatIfCurveCard
              whatIf={whatIfData}
              axis={whatIfAxis}
              onAxisChange={handleAxisSwitch}
              plainMode={plainMode}
            />

            {/* BUDGET IMPACT CALCULATOR */}
            <div className="hairline-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(15,82,87,0.1)] pb-3">
                <span className="text-[14.5px] font-bold text-[#141414]">
                  {plainMode
                    ? "Hitung Perkiraan Anggaran yang Terbuang"
                    : "Kalkulator kebocoran anggaran dapur SPPG"}
                </span>
                <div className="flex items-center gap-3 text-[12px]">
                  <label className="flex items-center gap-1.5">
                    <span className="font-medium text-[#3d525c]">Porsi/hari:</span>
                    <input
                      type="number"
                      min={100}
                      max={20000}
                      value={portionsToEvaluate}
                      onChange={(e) => setPortionsToEvaluate(Math.max(100, Number(e.target.value)))}
                      className="t-mono w-20 rounded-xl border border-[rgba(15,82,87,0.2)] bg-white/85 px-2.5 py-1 text-[12px] font-semibold text-[#141414]"
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="font-medium text-[#3d525c]">Hari sekolah:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={schoolDays}
                      onChange={(e) => setSchoolDays(Math.max(1, Number(e.target.value)))}
                      className="t-mono w-14 rounded-xl border border-[rgba(15,82,87,0.2)] bg-white/85 px-2.5 py-1 text-[12px] font-semibold text-[#141414]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="glass-field p-3">
                  <div className="text-[11.5px] font-medium text-[#3d525c]">
                    Terbuang per hari ({portionsToEvaluate.toLocaleString("id-ID")} kotak)
                  </div>
                  <div className="t-mono mt-1 text-[17px] font-bold text-[#141414]">
                    {formatIdr(dailyLossIdr)}
                  </div>
                </div>
                <div className="glass-field p-3">
                  <div className="text-[11.5px] font-medium text-[#3d525c]">
                    Perkiraan {schoolDays} hari sekolah
                  </div>
                  <div className="t-mono mt-1 text-[17px] font-bold text-[#b53418]">
                    {formatIdr(monthlyLossIdr)}
                  </div>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,82,87,0.22)] bg-[rgba(15,82,87,0.09)] p-3">
                  <div className="text-[11.5px] font-semibold text-[#0f5257]">
                    Uang diselamatkan jika sisa turun ke 10%
                  </div>
                  <div className="t-mono mt-1 text-[17px] font-bold text-[#0f5257]">
                    {formatIdr(monthlyPotentialSavingIdr)}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM DIAGNOSTICS: TreeSHAP + Mitigation + Trace */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="hairline-card p-5 xl:col-span-7">
                <div className="mb-3">
                  <h3 className="text-[15px] font-bold text-[#141414]">
                    {plainMode
                      ? "Faktor Penyebab Angka Prediksi (TreeSHAP)"
                      : "Atribusi TreeSHAP lokal"}
                  </h3>
                  <p className="text-[12.5px] text-[#3d525c]">
                    {plainMode
                      ? "Batang merah menaikkan perkiraan sisa makanan; batang hijau menurunkannya."
                      : "Kontribusi faktor terhadap selisih prediksi dari rataan nasional 13,33%."}
                  </p>
                </div>
                <ShapWaterfallSvg
                  baseValue={result.base_value_pct}
                  predictedPct={result.raw_predicted_pct}
                  contributions={result.contributions}
                  plainMode={plainMode}
                />
              </div>

              <div className="space-y-4 xl:col-span-5">
                <div className="hairline-card p-5">
                  <h3 className="text-[15px] font-bold text-[#141414]">
                    {plainMode ? "Saran Praktis untuk Dapur" : "Rekomendasi aksi SPPG"}
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {activeRecs.map((rec, idx) => {
                      const isAlert =
                        rec.startsWith("RISIKO") ||
                        rec.startsWith("KRITIS") ||
                        rec.startsWith("TRANSIT") ||
                        rec.startsWith("ZONA") ||
                        rec.startsWith("AKAR MASALAH") ||
                        wastePct >= 15 ||
                        isCold;
                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-2.5 rounded-2xl border p-3 text-[12.5px] leading-relaxed ${
                            isAlert
                              ? "border-[rgba(181,52,24,0.22)] bg-[rgba(255,244,240,0.85)] text-[#141414]"
                              : "border-[rgba(19,114,66,0.24)] bg-[rgba(235,250,242,0.85)] text-[#141414]"
                          }`}
                        >
                          {isAlert ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b53418]" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#137242]" />
                          )}
                          <span>{rec}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Engine Trace */}
                <div className="hairline-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-[#0f5257]">
                    <Terminal className="h-3.5 w-3.5" />
                    {plainMode ? "Catatan Perhitungan Sistem" : "Trace Inferensi Engine"}
                  </div>
                  <div className="t-mono space-y-1 rounded-2xl bg-[#102528] p-3.5 text-[11.5px] leading-relaxed text-[#c6dada]">
                    <div>&gt; mode: {mode} ({mode === "pra" ? "34 fitur" : "38 fitur"})</div>
                    <div>&gt; aturan: kolom bocor diblokir</div>
                    <div>&gt; daerah: &quot;{form.province}&quot; ({form.regional_cluster})</div>
                    <div>&gt; susut_suhu: {String(result.derived_telemetry.transit_cooling_rate_c_per_min).replace(".", ",")}°C/mnt</div>
                    <div className="font-semibold text-white">&gt; hasil: {formatPct(result.predicted_plate_waste_percentage)} ({result.latency_ms} ms)</div>
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
