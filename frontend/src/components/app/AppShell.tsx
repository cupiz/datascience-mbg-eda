"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Menu,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  assetUrl,
  fetchHealth,
  formatPct,
  HealthResponse,
  HoldoutItem,
} from "@/lib/api";
import { SIMULATOR_PRESETS, VALID_PROVINCES } from "@/lib/constants";
import {
  formatRelativeTime,
  loadSimulationHistory,
  saveSimulationHistory,
  SimulationRunRecord,
} from "@/lib/history";
import SimulatorPanel from "@/components/workspace/SimulatorPanel";
import AnalyticsPanel from "@/components/workspace/AnalyticsPanel";
import AuditPanel from "@/components/workspace/AuditPanel";
import BatchPanel from "@/components/workspace/BatchPanel";

export type AppViewId = "simulator" | "analytics" | "audit" | "batch";

const NAV_ITEMS: {
  id: AppViewId;
  shortLabel: string;
  label: string;
  breadcrumb: string;
  icon: typeof SlidersHorizontal;
}[] = [
  {
    id: "simulator",
    shortLabel: "Simulasi",
    label: "Simulator & TreeSHAP",
    breadcrumb: "Uji Rencana Distribusi",
    icon: SlidersHorizontal,
  },
  {
    id: "analytics",
    shortLabel: "Analitik",
    label: "Analitik 38 Provinsi",
    breadcrumb: "Peta Risiko 38 Provinsi",
    icon: BarChart3,
  },
  {
    id: "audit",
    shortLabel: "Audit",
    label: "Audit Model & Holdout",
    breadcrumb: "Akurasi & 2.600 Uji Nyata",
    icon: ClipboardCheck,
  },
  {
    id: "batch",
    shortLabel: "Batch CSV",
    label: "Batch CSV & API",
    breadcrumb: "Cek Banyak Rute Sekaligus",
    icon: FileSpreadsheet,
  },
];

function BrandOrbIcon() {
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f5257] text-white shadow-[0_6px_14px_rgba(15,82,87,0.28)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M5 14.5C5 10.634 8.13401 7.5 12 7.5C15.866 7.5 19 10.634 19 14.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path d="M7.5 17.5H16.5" stroke="#cdd6c6" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="17.5" cy="7.5" r="2" fill="#cdd6c6" />
      </svg>
    </span>
  );
}

export default function AppShell() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as AppViewId | null;
  const presetParam = searchParams.get("preset");

  const [activeView, setActiveView] = useState<AppViewId>(
    tabParam && NAV_ITEMS.some((t) => t.id === tabParam) ? tabParam : "simulator"
  );
  const [plainMode, setPlainMode] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    presetParam
  );
  const [loadedHoldoutRow, setLoadedHoldoutRow] = useState<HoldoutItem | null>(
    null
  );
  const [loadedRun, setLoadedRun] = useState<SimulationRunRecord | null>(null);
  const [history, setHistory] = useState<SimulationRunRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState<boolean>(false);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [paletteQuery, setPaletteQuery] = useState<string>("");

  useEffect(() => {
    setHistory(loadSimulationHistory());
    fetchHealth().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    if (tabParam && NAV_ITEMS.some((t) => t.id === tabParam)) {
      setActiveView(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !isTyping)) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
        setHistoryDrawerOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const switchView = (view: AppViewId) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    router.replace(`/?tab=${view}`, { scroll: false });
  };

  const triggerPreset = (presetId: string) => {
    setLoadedHoldoutRow(null);
    setLoadedRun(null);
    setSelectedPresetId(`${presetId}#${Date.now()}`);
    setHistoryDrawerOpen(false);
    setMobileMenuOpen(false);
    switchView("simulator");
  };

  const resolvedPresetId = selectedPresetId ? selectedPresetId.split("#")[0] : null;

  const handleLoadHoldoutRow = (row: HoldoutItem) => {
    setLoadedRun(null);
    setLoadedHoldoutRow(row);
    switchView("simulator");
  };

  const handleLoadRun = (run: SimulationRunRecord) => {
    setLoadedHoldoutRow(null);
    setLoadedRun(run);
    setHistoryDrawerOpen(false);
    setMobileMenuOpen(false);
    switchView("simulator");
  };

  const handleSaveRun = (run: SimulationRunRecord) => {
    const next = [run, ...history].slice(0, 20);
    setHistory(next);
    saveSimulationHistory(next);
  };

  const handleDeleteRun = (id: string) => {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    saveSimulationHistory(next);
  };

  const apiOnline = Boolean(health && health.status === "healthy");

  const paletteMatches = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const views = NAV_ITEMS.filter((v) =>
      `${v.label} ${v.breadcrumb}`.toLowerCase().includes(q)
    );
    const presets = SIMULATOR_PRESETS.filter((p) =>
      `${p.label} ${p.note}`.toLowerCase().includes(q)
    );
    const provinces = q
      ? VALID_PROVINCES.filter((prov) => prov.toLowerCase().includes(q)).slice(
          0,
          6
        )
      : [];
    return { views, presets, provinces };
  }, [paletteQuery]);

  const drawerContent = (
    <div className="flex h-full flex-col gap-4">
      {/* Presets Section */}
      <div className="space-y-2">
        <div className="t-mono flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#3d525c]">
          <Sparkles className="h-3.5 w-3.5 text-[#0f5257]" />
          Contoh Skenario Cepat
        </div>
        <div className="space-y-1.5">
          {SIMULATOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => triggerPreset(preset.id)}
              className="glass-field flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-transform hover:scale-[1.01] cursor-pointer"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[#141414]">
                  {preset.label}
                </div>
                <div className="truncate text-[11.5px] text-[#3d525c]">
                  {preset.note}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                  preset.tag === "Risiko Tinggi"
                    ? "bg-[rgba(181,52,24,0.14)] text-[#b53418]"
                    : preset.tag === "Waspada"
                    ? "bg-[rgba(180,83,42,0.14)] text-[#b4532a]"
                    : "bg-[rgba(19,114,66,0.14)] text-[#137242]"
                }`}
              >
                {preset.tag === "Risiko Tinggi"
                  ? "Tinggi"
                  : preset.tag === "Waspada"
                  ? "Waspada"
                  : "Optimal"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved History Section */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-[rgba(15,82,87,0.12)] pt-3">
        <div className="t-mono flex items-center justify-between pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#3d525c]">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#0f5257]" />
            Riwayat Tersimpan
          </span>
          <span>{history.length}</span>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {history.length === 0 ? (
            <div className="glass-field p-3 text-[12.5px] leading-relaxed text-[#3d525c]">
              Belum ada uji coba tersimpan. Tekan{" "}
              <strong className="font-semibold text-[#141414]">Simpan</strong>{" "}
              pada Simulator agar skenario dapat dibuka lagi di sini.
            </div>
          ) : (
            history.map((run) => (
              <div
                key={run.id}
                onClick={() => handleLoadRun(run)}
                className="glass-field group flex items-start justify-between gap-2 px-3 py-2.5 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#141414]">
                    {run.title}
                  </div>
                  <div className="t-mono mt-0.5 flex items-center gap-2 text-[11.5px] text-[#3d525c]">
                    <span
                      className={
                        run.predictedWastePct >= 15
                          ? "font-semibold text-[#b53418]"
                          : "font-semibold text-[#0f5257]"
                      }
                    >
                      {formatPct(run.predictedWastePct)}
                    </span>
                    <span>· {run.mode === "pra" ? "Pra" : "Post"}</span>
                    <span>· {formatRelativeTime(run.createdAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRun(run.id);
                  }}
                  title="Hapus riwayat"
                  className="rounded-full p-1 text-[#3d525c] hover:text-[#b53418] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Specs */}
      <div className="glass-field p-3 text-[12px]">
        <div className="t-mono font-medium text-[#3d525c]">
          LightGBM Optuna · 38 Provinsi TE
        </div>
        <div className="t-mono mt-1 flex items-center justify-between font-semibold text-[#141414]">
          <span>MAE 3,658 / 2,929</span>
          <a
            href={assetUrl("/docs")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#0f5257] hover:underline no-underline"
          >
            Swagger /docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col gap-3.5 p-3 sm:p-4 lg:h-screen lg:overflow-hidden lg:p-[18px_22px]">
      {/* DESIGN 5: FLOATING TOP GLASS PILL BAR */}
      <header className="glass-strong flex h-[54px] shrink-0 items-center justify-between gap-2 rounded-full px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/70 text-[#0f5257] lg:hidden cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => switchView("simulator")}
            className="inline-flex items-center gap-2.5 text-left cursor-pointer"
          >
            <BrandOrbIcon />
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[#141414] whitespace-nowrap">
              PlateGuard <span className="font-medium text-[#3d525c]">MBG</span>
            </span>
          </button>
        </div>

        {/* Center Glass Segmented Pill Switcher */}
        <nav
          aria-label="Navigasi modul utama"
          className="hidden xl:flex items-center gap-1 rounded-full border border-white/75 bg-white/45 p-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchView(item.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#0f5257] font-semibold text-white shadow-[0_4px_12px_rgba(15,82,87,0.28)]"
                    : "font-medium text-[#3d525c] hover:text-[#141414]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Compact mid-width segmented pill for md/lg screens */}
        <nav
          aria-label="Navigasi ringkas"
          className="hidden md:flex xl:hidden items-center gap-1 rounded-full border border-white/75 bg-white/45 p-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchView(item.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#0f5257] font-semibold text-white shadow-[0_4px_12px_rgba(15,82,87,0.28)]"
                    : "font-medium text-[#3d525c] hover:text-[#141414]"
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Bahasa Awam Toggle + Search + History + Live Status */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Plain-Language Humanizer Toggle */}
          <div
            className="hidden sm:flex items-center rounded-full border border-white/80 bg-white/55 p-0.5"
            title="Pilih tampilan Bahasa Awam (mudah dipahami masyarakat) atau istilah Teknis ML"
          >
            <button
              type="button"
              onClick={() => setPlainMode(true)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                plainMode
                  ? "bg-[#0f5257] text-white shadow-sm"
                  : "text-[#3d525c] hover:text-[#141414]"
              }`}
            >
              <BookOpenText className="h-3 w-3" />
              Awam
            </button>
            <button
              type="button"
              onClick={() => setPlainMode(false)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                !plainMode
                  ? "bg-[#0f5257] text-white shadow-sm"
                  : "text-[#3d525c] hover:text-[#141414]"
              }`}
            >
              Teknis
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPaletteQuery("");
              setPaletteOpen(true);
            }}
            title="Cari modul, skenario, atau provinsi (/)"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/85 bg-white/70 px-2.5 text-[12px] font-medium text-[#3d525c] hover:bg-white cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 text-[#0f5257]" />
            <span className="hidden 2xl:inline">Cari</span>
            <kbd className="t-mono hidden sm:inline rounded-full bg-white px-1.5 py-0.5 text-[10px] text-[#141414] border border-[rgba(15,82,87,0.16)]">
              /
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(true)}
            title="Buka Skenario Cepat dan Riwayat Tersimpan"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/85 bg-white/70 px-2.5 text-[12px] font-semibold text-[#0f5257] hover:bg-white cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Riwayat</span>
            {history.length > 0 && (
              <span className="t-mono rounded-full bg-[#0f5257] px-1.5 py-0.2 text-[10.5px] text-white">
                {history.length}
              </span>
            )}
          </button>

          <span
            className="t-mono inline-flex h-8 items-center gap-2 rounded-full border border-white/90 bg-white/75 px-3 text-[11.5px] font-semibold text-[#0f5257] whitespace-nowrap"
            title={
              apiOnline
                ? `Terhubung: ${health?.pra_model_name ?? "LightGBM Optuna"}`
                : "Memeriksa status backend FastAPI"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline ? "bg-[#137242]" : "bg-[#b4532a]"
              }`}
              aria-hidden="true"
            />
            <span className="hidden md:inline">
              {apiOnline ? "FastAPI siap" : "Memuat..."}
            </span>
          </span>
        </div>
      </header>

      {/* SPATIAL BODY: LEFT FLOATING VERTICAL GLASS DOCK + WORKSPACE PANES */}
      <div className="relative flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Desktop Floating Glass Dock */}
        <aside className="glass-surface hidden w-[74px] shrink-0 flex-col items-center justify-between rounded-[28px] py-3.5 px-2 lg:flex">
          <div className="flex flex-col items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchView(item.id)}
                  className="group flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-[16px] transition-all ${
                      active
                        ? "bg-[#0f5257] text-white shadow-[0_8px_18px_-4px_rgba(15,82,87,0.35)]"
                        : "bg-white/40 text-[#3d525c] group-hover:bg-white/80 group-hover:text-[#141414]"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span
                    className={`text-[10.5px] font-semibold leading-none ${
                      active ? "text-[#0f5257]" : "text-[#3d525c]"
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-[rgba(15,82,87,0.12)] pt-3">
            <button
              type="button"
              onClick={() => setPlainMode((v) => !v)}
              title="Ubah antara Bahasa Awam dan Teknis"
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/85 ${
                  plainMode
                    ? "bg-[#0f5257]/12 text-[#0f5257]"
                    : "bg-white/55 text-[#3d525c]"
                }`}
              >
                <BookOpenText className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-semibold text-[#3d525c]">
                {plainMode ? "Awam" : "Teknis"}
              </span>
            </button>

            <a
              href={assetUrl("/docs")}
              target="_blank"
              rel="noreferrer"
              title="Buka Dokumentasi API (/docs)"
              className="flex flex-col items-center gap-1 no-underline"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/85 bg-white/55 text-[#3d525c] hover:text-[#0f5257]">
                <ExternalLink className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-semibold text-[#3d525c]">API</span>
            </a>
          </div>
        </aside>

        {/* Active Module Viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto pr-0.5 pb-1">
          {activeView === "simulator" && (
            <SimulatorPanel
              initialPresetId={resolvedPresetId}
              loadedHoldoutRow={loadedHoldoutRow}
              loadedRun={loadedRun}
              plainMode={plainMode}
              onTogglePlainMode={() => setPlainMode((v) => !v)}
              onClearLoadedRow={() => {
                setLoadedHoldoutRow(null);
                setLoadedRun(null);
              }}
              onSaveRun={handleSaveRun}
            />
          )}
          {activeView === "analytics" && <AnalyticsPanel plainMode={plainMode} />}
          {activeView === "audit" && (
            <AuditPanel
              plainMode={plainMode}
              onLoadToSimulator={handleLoadHoldoutRow}
            />
          )}
          {activeView === "batch" && <BatchPanel plainMode={plainMode} />}
        </main>
      </div>

      {/* Mobile Navigation Drawer (< lg) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#141414]/25 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="glass-strong relative z-10 m-3 flex h-[calc(100%-24px)] w-[300px] max-w-[88vw] flex-col rounded-[24px] p-4">
            <div className="flex items-center justify-between border-b border-[rgba(15,82,87,0.12)] pb-3">
              <div className="flex items-center gap-2">
                <BrandOrbIcon />
                <span className="text-[15px] font-bold text-[#141414]">
                  Menu PlateGuard
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-white/70 p-1.5 text-[#3d525c]"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchView(item.id)}
                    className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-[13.5px] font-semibold cursor-pointer ${
                      active
                        ? "bg-[#0f5257] text-white"
                        : "bg-white/55 text-[#141414]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/85 bg-white/60 px-3 py-2">
              <span className="text-[12.5px] font-semibold text-[#141414]">
                Gaya Bahasa
              </span>
              <button
                type="button"
                onClick={() => setPlainMode((v) => !v)}
                className="rounded-full bg-[#0f5257] px-3 py-1 text-[11.5px] font-semibold text-white"
              >
                {plainMode ? "Mode Awam Aktif" : "Mode Teknis ML"}
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{drawerContent}</div>
          </aside>
        </div>
      )}

      {/* Slide-Over Presets & History Glass Drawer */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-[#141414]/25 backdrop-blur-xs"
            onClick={() => setHistoryDrawerOpen(false)}
          />
          <aside className="glass-strong relative z-10 m-3 flex h-[calc(100%-24px)] w-[350px] max-w-[92vw] flex-col rounded-[24px] p-4">
            <div className="flex items-center justify-between border-b border-[rgba(15,82,87,0.12)] pb-3">
              <span className="text-[15px] font-bold text-[#141414]">
                Skenario &amp; Riwayat
              </span>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="rounded-full bg-white/75 p-1.5 text-[#3d525c] hover:text-[#141414] cursor-pointer"
                aria-label="Tutup panel riwayat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{drawerContent}</div>
          </aside>
        </div>
      )}

      {/* Quick Command Search Modal */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#141414]/30 px-4 pt-20 backdrop-blur-xs"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="glass-strong w-full max-w-[540px] overflow-hidden rounded-[24px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-[rgba(15,82,87,0.12)] px-4 py-3">
              <Search className="h-4 w-4 text-[#0f5257]" />
              <input
                type="text"
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Ketik nama modul, skenario cepat, atau provinsi..."
                className="w-full bg-transparent text-[13.5px] font-medium text-[#141414] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="t-mono rounded-full border border-[rgba(15,82,87,0.2)] bg-white/75 px-2 py-0.5 text-[11px] font-medium text-[#3d525c]"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[360px] space-y-3 overflow-y-auto p-3">
              {paletteMatches.views.length > 0 && (
                <div>
                  <div className="t-mono px-2.5 py-1 text-[11px] font-semibold uppercase text-[#3d525c]">
                    Modul Kerja
                  </div>
                  {paletteMatches.views.map((v) => {
                    const Icon = v.icon;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          switchView(v.id);
                          setPaletteOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] hover:bg-white/75 cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-2 font-semibold text-[#141414]">
                          <Icon className="h-4 w-4 text-[#0f5257]" />
                          {v.label}
                        </span>
                        <span className="text-[12px] text-[#3d525c]">{v.breadcrumb}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {paletteMatches.presets.length > 0 && (
                <div>
                  <div className="t-mono px-2.5 py-1 text-[11px] font-semibold uppercase text-[#3d525c]">
                    Skenario Cepat Simulator
                  </div>
                  {paletteMatches.presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        triggerPreset(p.id);
                        setPaletteOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] hover:bg-white/75 cursor-pointer"
                    >
                      <span className="font-semibold text-[#141414]">{p.label}</span>
                      <span className="t-mono text-[11.5px] font-semibold text-[#0f5257]">
                        Uji langsung
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {paletteMatches.provinces.length > 0 && (
                <div>
                  <div className="t-mono px-2.5 py-1 text-[11px] font-semibold uppercase text-[#3d525c]">
                    Provinsi -&gt; Simulator
                  </div>
                  {paletteMatches.provinces.map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => {
                        setLoadedHoldoutRow(null);
                        setLoadedRun({
                          id: `quick-${prov}`,
                          createdAt: Date.now(),
                          title: prov,
                          mode: "pra",
                          province: prov,
                          cluster: "Luar Jawa Urban",
                          predictedWastePct: 13.34,
                          riskLevel: "Sedang",
                          lossPerPortionIdr: 2000,
                          payload: { province: prov },
                        });
                        switchView("simulator");
                        setPaletteOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] hover:bg-white/75 cursor-pointer"
                    >
                      <span className="font-semibold text-[#141414]">{prov}</span>
                      <span className="text-[12px] text-[#3d525c]">Buka di Simulator</span>
                    </button>
                  ))}
                </div>
              )}

              {paletteMatches.views.length === 0 &&
                paletteMatches.presets.length === 0 &&
                paletteMatches.provinces.length === 0 && (
                  <div className="px-3 py-6 text-center text-[13px] text-[#3d525c]">
                    Tidak ada hasil untuk &quot;{paletteQuery}&quot;.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
