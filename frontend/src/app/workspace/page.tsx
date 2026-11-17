"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, ClipboardCheck, FileSpreadsheet, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SimulatorPanel from "@/components/workspace/SimulatorPanel";
import AnalyticsPanel from "@/components/workspace/AnalyticsPanel";
import AuditPanel from "@/components/workspace/AuditPanel";
import BatchPanel from "@/components/workspace/BatchPanel";
import { HoldoutItem } from "@/lib/api";

type TabId = "simulator" | "analytics" | "audit" | "batch";

const TABS: { id: TabId; label: string; icon: typeof SlidersHorizontal }[] = [
  { id: "simulator", label: "Simulator & TreeSHAP", icon: SlidersHorizontal },
  { id: "analytics", label: "Analitik 38 Provinsi", icon: BarChart3 },
  { id: "audit", label: "Audit Model & Holdout", icon: ClipboardCheck },
  { id: "batch", label: "Batch CSV & API", icon: FileSpreadsheet },
];

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as TabId | null;
  const presetParam = searchParams.get("preset");

  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "simulator"
  );
  const [loadedHoldoutRow, setLoadedHoldoutRow] = useState<HoldoutItem | null>(null);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/workspace?tab=${tab}`, { scroll: false });
  };

  const handleLoadRowToSimulator = (row: HoldoutItem) => {
    setLoadedHoldoutRow(row);
    switchTab("simulator");
  };

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-[#0d2429] flex flex-col">
      <Navbar />

      <div className="border-b border-[rgba(6,82,92,0.12)] bg-[#ffffff]">
        <div className="wrap py-6 sm:py-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="t-mono text-[12px] text-[#2f737d]">
                PLATEGUARD MBG · WORKSPACE ANALITIK V2
              </div>
              <h1 className="mt-1.5 text-[28px] font-medium tracking-[-0.03em] text-[#0d2429] sm:text-[36px]">
                Pusat simulasi pra-distribusi &amp; audit 13.000 layanan
              </h1>
            </div>

            <nav
              className="flex flex-wrap gap-2"
              aria-label="Sub-halaman workspace"
            >
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => switchTab(t.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-[#06525c] bg-[#06525c] text-[#f7f9f8]"
                        : "border-[rgba(6,82,92,0.16)] bg-[#f7f9f8] text-[#0d2429] hover:border-[#06525c]/50 hover:bg-[#ebf0ee]"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <main className="wrap flex-1 py-8 sm:py-10">
        {activeTab === "simulator" && (
          <SimulatorPanel
            initialPresetId={presetParam}
            loadedHoldoutRow={loadedHoldoutRow}
            onClearLoadedRow={() => setLoadedHoldoutRow(null)}
          />
        )}
        {activeTab === "analytics" && <AnalyticsPanel />}
        {activeTab === "audit" && (
          <AuditPanel onLoadToSimulator={handleLoadRowToSimulator} />
        )}
        {activeTab === "batch" && <BatchPanel />}
      </main>

      <Footer showClosingCta={false} />
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f9f8] p-10 text-center text-[#2f737d]">
          Menyiapkan workspace analitik PlateGuard...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
