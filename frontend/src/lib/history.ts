export interface SimulationRunRecord {
  id: string;
  createdAt: number;
  title: string;
  mode: "pra" | "posthoc";
  province: string;
  cluster: string;
  predictedWastePct: number;
  riskLevel: string;
  lossPerPortionIdr: number;
  payload: Record<string, unknown>;
}

const LS_KEY = "plateguard_mbg_sim_history_v2";

export function loadSimulationHistory(): SimulationRunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSimulationHistory(items: SimulationRunRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    // Abaikan jika storage penuh
  }
}

export function formatRelativeTime(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}
