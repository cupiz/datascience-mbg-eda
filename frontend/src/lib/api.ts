export interface HealthResponse {
  status: string;
  models_loaded: {
    pra_distribution: boolean;
    post_hoc: boolean;
  };
  pra_model_name?: string;
  posthoc_model_name?: string;
  timestamp: number;
}

export interface GroupStat {
  name: string;
  count: number;
  share_pct: number;
  mean_waste_pct: number;
  median_waste_pct: number;
  bermasalah_pct: number;
  optimal_pct: number;
  mean_cost_idr: number;
  mean_effective_cost_idr: number;
  mean_temp_c: number;
  below_60c_pct: number;
  mean_transit_min: number;
  mean_distance_km: number;
}

export interface OverviewResponse {
  eda: Record<string, unknown>;
  aggregates: {
    n_total: number;
    n_train: number;
    n_test: number;
    n_provinces: number;
    summary: {
      mean_waste_pct: number;
      median_waste_pct: number;
      max_waste_pct: number;
      min_waste_pct: number;
      p90_waste_pct: number;
      bermasalah_pct: number;
      optimal_pct: number;
      mean_cost_idr: number;
      mean_effective_cost_idr: number;
      mean_loss_per_portion_idr: number;
      mean_temp_c: number;
      below_60c_pct: number;
      cold_arrival_bermasalah_pct: number;
      warm_arrival_bermasalah_pct: number;
      cold_arrival_mean_waste_pct: number;
      warm_arrival_mean_waste_pct: number;
    };
    clusters: GroupStat[];
    provinces: GroupStat[];
    beneficiaries: GroupStat[];
    proteins: GroupStat[];
    transports: GroupStat[];
    drivers: GroupStat[];
    tiers: GroupStat[];
  };
}

export interface ModelMetricRow {
  model: string;
  cv_mae_mean: number;
  cv_mae_std: number;
  cv_rmse_mean: number;
  cv_rmse_std: number;
  cv_r2_mean: number;
  cv_r2_std: number;
  holdout_MAE: number;
  holdout_RMSE: number;
  holdout_R2: number;
}

export interface CvFoldRow {
  scenario: "pra" | "posthoc";
  model: string;
  fold: number;
  MAE: number;
  RMSE: number;
  R2: number;
}

export interface BenchmarkResponse {
  metrics: {
    pra?: {
      model: string;
      MAE: number;
      RMSE: number;
      R2: number;
      cv_mae_mean: number;
      cv_mae_std: number;
      holdout_all_models: ModelMetricRow[];
    };
    posthoc?: {
      model: string;
      MAE: number;
      RMSE: number;
      R2: number;
      cv_mae_mean: number;
      cv_mae_std: number;
      holdout_all_models: ModelMetricRow[];
    };
  };
  cv_folds: CvFoldRow[];
  leakage_audit: {
    valid_posthoc_cv: { mae: number; rmse: number; r2: number; label: string };
    leaked_hgb_demo: { mae: number; rmse: number; r2: number };
    effective_cost_formula_maxdiff_idr: number;
    rejected_features: { column: string; reason: string }[];
  };
  te_ablation: {
    scenario: string;
    config: string;
    cv_mae: number;
    cv_rmse: number;
    cv_r2: number;
  }[];
}

export interface ExplainContribution {
  key: string;
  label: string;
  display_value: string;
  shap_pp: number;
}

export interface ExplainResponse {
  scenario: string;
  predicted_plate_waste_percentage: number;
  risk_level: string;
  waste_category: string;
  estimated_loss_per_portion_idr: number;
  effective_cost_per_portion_idr: number;
  recommendations: string[];
  model_version: string;
  latency_ms: number;
  base_value_pct: number;
  raw_predicted_pct: number;
  contributions: ExplainContribution[];
  derived_telemetry: Record<string, number>;
  alert_flags: string[];
}

export interface HoldoutItem {
  distribution_id: string;
  province: string;
  regional_cluster: string;
  beneficiary_category: string;
  protein_type: string;
  delivery_transport_mode: string;
  kitchen_daily_capacity_portions: number;
  raw_ingredient_cost_per_portion_idr: number;
  total_meal_cost_idr: number;
  estimated_calories_kcal: number;
  estimated_protein_grams: number;
  delivery_distance_km: number;
  transit_time_minutes: number;
  food_arrival_temperature_celsius: number;
  student_attendance_rate_pct: number;
  local_farmer_sourcing_pct: number;
  primary_food_waste_driver: string;
  actual_waste_pct: number;
  pred_pra_pct: number;
  pred_posthoc_pct: number;
  abs_error_pra: number;
  abs_error_posthoc: number;
}

export interface HoldoutResponse {
  total: number;
  offset: number;
  limit: number;
  slice_metrics: {
    mae_pra: number;
    mae_posthoc: number;
    mean_actual_waste_pct: number;
  };
  items: HoldoutItem[];
}

export function getApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    if ((hostname === "localhost" || hostname === "127.0.0.1") && port === "3000") {
      return "http://127.0.0.1:8000";
    }
  }
  return "";
}

export function assetUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatPct(value: number, digits = 2): string {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchOverview(): Promise<OverviewResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/overview`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function fetchBenchmark(): Promise<BenchmarkResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/benchmark`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function explainPrediction(
  mode: "pra" | "posthoc",
  payload: Record<string, unknown>
): Promise<ExplainResponse> {
  const endpoint = mode === "pra" ? "/api/explain/pra" : "/api/explain/posthoc";
  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchHoldoutSamples(params: {
  cluster?: string;
  province?: string;
  risk_tier?: string;
  q?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}): Promise<HoldoutResponse> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "Semua") {
      sp.set(k, String(v));
    }
  });
  const res = await fetch(`${getApiBaseUrl()}/api/holdout-samples?${sp.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function predictBatchPra(plans: Record<string, unknown>[]) {
  const res = await fetch(`${getApiBaseUrl()}/api/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plans),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return await res.json();
}
