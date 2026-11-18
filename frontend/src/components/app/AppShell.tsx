"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
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
  label: string;
  breadcrumb: string;
  icon: typeof SlidersHorizontal;
}[] = [
  {
    id: "simulator",
    label: "Simulator & TreeSHAP",
    breadcrumb: "Simulator Pra & Post-Hoc",
    icon: SlidersHorizontal,
  },
  {
    id: "analytics",
    label: "Analitik 38 Provinsi",
    breadcrumb: "Peta Risiko Nasional (13.000)",
    icon: BarChart3,
  },
  {
    id: "audit",
    label: "Audit Model & Holdout",
    breadcrumb: "Benchmark, 5-Fold & 2.600 Holdout",
    icon: ClipboardCheck,
  },
  {
    id: "batch",
    label: "Batch CSV & API",
    breadcrumb: "Skoring Batch & Dokumentasi API",
    icon: FileSpreadsheet,
  },
];

function BrandArcIcon() {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#06525c] text-[#f7f9f8]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M5 14.5C5 10.634 8.13401 7.5 12 7.5C15.866 7.5 19 10.634 19 14.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path d="M7.5 17.5H16.5" stroke="#CDD6C6" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="17.5" cy="7.5" r="2" fill="#CDD6C6" />
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
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    presetParam
  );
  const [loadedHoldoutRow, setLoadedHoldoutRow] = useState<HoldoutItem | null>(
    null
  );
  const [loadedRun, setLoadedRun] = useState<SimulationRunRecord | null>(null);
  const [history, setHistory] = useState<SimulationRunRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
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
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const switchView = (view: AppViewId) => {
    setActiveView(view);
    setMobileSidebarOpen(false);
    router.replace(`/?tab=${view}`, { scroll: false });
  };

  const triggerPreset = (presetId: string) => {
    setLoadedHoldoutRow(null);
    setLoadedRun(null);
    setSelectedPresetId(`${presetId}#${Date.now()}`);
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

  const currentNav =
    NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0];
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

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#ffffff]">
      {/* Workspace Navigation */}
      <div className="p-3 space-y-1">
        <div className="t-mono px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchView(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-[#ebf0ee] text-[#06525c]"
                  : "text-[#0d2429]/85 hover:bg-[#f7f9f8] hover:text-[#0d2429]"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-[#06525c]" : "text-[#2f737d]"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Scenario Presets */}
      <div className="border-t border-[rgba(6,82,92,0.1)] p-3 space-y-1">
        <div className="t-mono flex items-center gap-1.5 px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
          <Sparkles className="h-3 w-3" />
          Skenario cepat
        </div>
        {SIMULATOR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => triggerPreset(preset.id)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#0d2429] hover:bg-[#f7f9f8] transition-colors cursor-pointer"
          >
            <span className="truncate">{preset.label}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-medium ${
                preset.tag === "Risiko Tinggi"
                  ? "bg-[#fbeae5] text-[#b93815]"
                  : preset.tag === "Waspada"
                  ? "bg-[#fbf0ea] text-[#b4532a]"
                  : "bg-[#e7f4ec] text-[#0f7d45]"
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

      {/* Saved Simulation History */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-[rgba(6,82,92,0.1)] p-3">
        <div className="t-mono flex items-center justify-between px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#2f737d]">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Riwayat simulasi
          </span>
          <span>{history.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {history.length === 0 ? (
            <div className="px-2.5 py-4 text-[12px] leading-relaxed text-[#2f737d]">
              Belum ada skenario tersimpan. Tekan tombol{" "}
              <strong className="font-medium text-[#0d2429]">Simpan</strong> di
              Simulator untuk menyimpan hasil uji.
            </div>
          ) : (
            history.map((run) => (
              <div
                key={run.id}
                onClick={() => handleLoadRun(run)}
                className="group flex items-start justify-between gap-2 rounded-lg border border-transparent px-2.5 py-2 hover:border-[rgba(6,82,92,0.12)] hover:bg-[#f7f9f8] transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-[#0d2429]">
                    {run.title}
                  </div>
                  <div className="t-mono mt-0.5 flex items-center gap-2 text-[11px] text-[#2f737d]">
                    <span
                      className={
                        run.predictedWastePct >= 15
                          ? "font-semibold text-[#b93815]"
                          : "font-semibold text-[#06525c]"
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
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#2f737d] hover:text-[#b93815] transition-opacity cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Model Spec Summary */}
      <div className="border-t border-[rgba(6,82,92,0.1)] bg-[#f7f9f8] p-3">
        <div className="t-mono text-[11px] text-[#2f737d]">
          LightGBM Optuna · 38 Provinsi TE
        </div>
        <div className="t-mono mt-1 flex items-center justify-between text-[11.5px] font-medium text-[#0d2429]">
          <span>MAE 3,658 / 2,929</span>
          <a
            href={assetUrl("/docs")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#06525c] hover:underline no-underline"
          >
            /docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9f8] text-[#0d2429] lg:h-screen lg:overflow-hidden">
      {/* Top 48px Application Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[rgba(6,82,92,0.12)] bg-[#ffffff] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] text-[#06525c] lg:hidden cursor-pointer"
            aria-label={mobileSidebarOpen ? "Tutup menu samping" : "Buka menu samping"}
          >
            {mobileSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => switchView("simulator")}
            className="inline-flex items-center gap-2 text-left cursor-pointer"
          >
            <BrandArcIcon />
            <span className="text-[14.5px] font-semibold tracking-[-0.02em] text-[#0d2429]">
              PlateGuard <span className="text-[#2f737d] font-medium">MBG</span>
            </span>
          </button>

          <span className="hidden text-[#2f737d]/50 sm:inline">/</span>
          <span className="hidden truncate text-[13px] font-medium text-[#2f737d] sm:inline">
            {currentNav.breadcrumb}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Working Command Search Trigger */}
          <button
            type="button"
            onClick={() => {
              setPaletteQuery("");
              setPaletteOpen(true);
            }}
            className="hidden sm:inline-flex h-8 w-56 items-center justify-between gap-2 rounded-md border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] px-2.5 text-[12.5px] text-[#2f737d] hover:border-[#06525c]/40 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0" />
              Lompat ke modul / provinsi
            </span>
            <kbd className="t-mono rounded border border-[rgba(6,82,92,0.16)] bg-white px-1.5 py-0.5 text-[10.5px] text-[#0d2429]">
              /
            </kbd>
          </button>

          {/* Mobile quick search button */}
          <button
            type="button"
            onClick={() => {
              setPaletteQuery("");
              setPaletteOpen(true);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] text-[#06525c] sm:hidden cursor-pointer"
            aria-label="Cari modul atau provinsi"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Live Backend Engine Status */}
          <span
            className="t-mono inline-flex h-8 items-center gap-2 rounded-md border border-[rgba(6,82,92,0.14)] bg-[#ebf0ee] px-2.5 text-[11.5px] font-medium text-[#06525c]"
            title={
              apiOnline
                ? `Terhubung: ${health?.pra_model_name ?? "LightGBM Optuna"}`
                : "Memeriksa status backend FastAPI"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline ? "bg-[#0f7d45]" : "bg-[#b4532a]"
              }`}
              aria-hidden="true"
            />
            <span className="hidden md:inline">
              {apiOnline ? "FastAPI siap" : "Menghubungkan..."}
            </span>
          </span>
        </div>
      </header>

      {/* Main App Body: Persistent Sidebar + Scrollable Viewport */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[256px] shrink-0 border-r border-[rgba(6,82,92,0.12)] lg:block">
          {sidebarContent}
        </aside>

        {/* Mobile Drawer Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-[#0d2429]/30"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="relative z-10 h-full w-[272px] max-w-[85vw] border-r border-[rgba(6,82,92,0.14)] bg-white shadow-xl">
              <div className="flex h-12 items-center justify-between border-b border-[rgba(6,82,92,0.12)] px-4">
                <span className="text-[14px] font-semibold text-[#0d2429]">
                  Navigasi PlateGuard
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-[#2f737d]"
                  aria-label="Tutup menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-48px)] overflow-y-auto">
                {sidebarContent}
              </div>
            </aside>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto p-3.5 sm:p-4 lg:p-5">
          {activeView === "simulator" && (
            <SimulatorPanel
              initialPresetId={resolvedPresetId}
              loadedHoldoutRow={loadedHoldoutRow}
              loadedRun={loadedRun}
              onClearLoadedRow={() => {
                setLoadedHoldoutRow(null);
                setLoadedRun(null);
              }}
              onSaveRun={handleSaveRun}
            />
          )}
          {activeView === "analytics" && <AnalyticsPanel />}
          {activeView === "audit" && (
            <AuditPanel onLoadToSimulator={handleLoadHoldoutRow} />
          )}
          {activeView === "batch" && <BatchPanel />}
        </main>
      </div>

      {/* Quick Command Jump Modal */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#0d2429]/35 px-4 pt-20"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[rgba(6,82,92,0.18)] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-[rgba(6,82,92,0.12)] px-3.5 py-2.5">
              <Search className="h-4 w-4 text-[#2f737d]" />
              <input
                type="text"
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Ketik nama modul, skenario cepat, atau provinsi..."
                className="w-full bg-transparent text-[13.5px] text-[#0d2429] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="t-mono rounded border border-[rgba(6,82,92,0.16)] px-1.5 py-0.5 text-[11px] text-[#2f737d]"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
              {paletteMatches.views.length > 0 && (
                <div>
                  <div className="t-mono px-2.5 py-1 text-[11px] uppercase text-[#2f737d]">
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
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[#ebf0ee] cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-[#0d2429]">
                          <Icon className="h-4 w-4 text-[#06525c]" />
                          {v.label}
                        </span>
                        <span className="text-[12px] text-[#2f737d]">{v.breadcrumb}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {paletteMatches.presets.length > 0 && (
                <div>
                  <div className="t-mono px-2.5 py-1 text-[11px] uppercase text-[#2f737d]">
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
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[#ebf0ee] cursor-pointer"
                    >
                      <span className="font-medium text-[#0d2429]">{p.label}</span>
                      <span className="t-mono text-[11.5px] text-[#06525c]">
                        Uji langsung
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {paletteMatches.provinces.length > 0 && (
                <div>
                  <div className="t-mono px-2.5 py-1 text-[11px] uppercase text-[#2f737d]">
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
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[#ebf0ee] cursor-pointer"
                    >
                      <span className="font-medium text-[#0d2429]">{prov}</span>
                      <span className="text-[12px] text-[#2f737d]">Buka di Simulator</span>
                    </button>
                  ))}
                </div>
              )}

              {paletteMatches.views.length === 0 &&
                paletteMatches.presets.length === 0 &&
                paletteMatches.provinces.length === 0 && (
                  <div className="px-3 py-6 text-center text-[13px] text-[#2f737d]">
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
