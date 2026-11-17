"use client";

import { useState } from "react";
import { Download, ExternalLink, FileSpreadsheet, Loader2, Play } from "lucide-react";
import {
  assetUrl,
  fetchHoldoutSamples,
  formatIdr,
  formatPct,
  predictBatchPra,
} from "@/lib/api";

interface BatchResultRow {
  input: Record<string, unknown>;
  predicted_plate_waste_percentage: number;
  risk_level: string;
  estimated_loss_per_portion_idr: number;
  effective_cost_per_portion_idr: number;
  recommendations: string[];
}

function parseCsvText(raw: string): Record<string, unknown>[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split respecting quoted fields
    const vals: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        vals.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    vals.push(cur.trim());

    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      const v = (vals[idx] ?? "").replace(/^"|"$/g, "");
      if (v !== "" && !Number.isNaN(Number(v)) && !h.includes("id")) {
        obj[h] = Number(v);
      } else if (v !== "") {
        obj[h] = v;
      }
    });
    rows.push(obj);
  }
  return rows;
}

export default function BatchPanel() {
  const [rows, setRows] = useState<BatchResultRow[]>([]);
  const [avgWaste, setAvgWaste] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runBatchOnRecords = async (records: Record<string, unknown>[]) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const cleaned = records.slice(0, 100).map((r) => ({
        kitchen_daily_capacity_portions: Number(r.kitchen_daily_capacity_portions ?? 1780),
        raw_ingredient_cost_per_portion_idr: Number(r.raw_ingredient_cost_per_portion_idr ?? 11300),
        total_meal_cost_idr: r.total_meal_cost_idr !== undefined ? Number(r.total_meal_cost_idr) : undefined,
        delivery_distance_km: Number(r.delivery_distance_km ?? 6.8),
        transit_time_minutes: Number(r.transit_time_minutes ?? 25),
        food_arrival_temperature_celsius: Number(r.food_arrival_temperature_celsius ?? 65.0),
        estimated_calories_kcal: Number(r.estimated_calories_kcal ?? 680),
        estimated_protein_grams: Number(r.estimated_protein_grams ?? 22.7),
        regional_cluster: String(r.regional_cluster ?? "Jawa Metropolitan"),
        province: String(r.province ?? "Jawa Tengah"),
        beneficiary_category: String(r.beneficiary_category ?? "Siswa SD / Madrasah Ibtidaiyah"),
        protein_type: String(r.protein_type ?? "Daging Ayam Broiler"),
        delivery_transport_mode: String(r.delivery_transport_mode ?? "Mobil Pickup Termal"),
        student_attendance_rate_pct: Number(r.student_attendance_rate_pct ?? 94.4),
        local_farmer_sourcing_pct: Number(r.local_farmer_sourcing_pct ?? 73.7),
      }));

      const res = await predictBatchPra(cleaned);
      const merged: BatchResultRow[] = res.results.map(
        (out: Omit<BatchResultRow, "input">, i: number) => ({
          ...out,
          input: cleaned[i],
        })
      );
      setRows(merged);
      setAvgWaste(res.average_predicted_waste_pct);
      setLatencyMs(res.batch_latency_ms);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memproses batch CSV."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSampleHoldoutBatch = async () => {
    setLoading(true);
    try {
      const sample = await fetchHoldoutSamples({
        sort_by: "actual_desc",
        limit: 12,
        offset: 0,
      });
      await runBatchOnRecords(
        sample.items as unknown as Record<string, unknown>[]
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengambil sampel holdout."
      );
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsvText(text);
    if (parsed.length === 0) {
      setErrorMsg("File CSV kosong atau header tidak terbaca.");
      return;
    }
    await runBatchOnRecords(parsed);
  };

  const downloadScoredCsv = () => {
    if (rows.length === 0) return;
    const header = [
      "province",
      "regional_cluster",
      "beneficiary_category",
      "protein_type",
      "food_arrival_temperature_celsius",
      "transit_time_minutes",
      "predicted_plate_waste_percentage",
      "risk_level",
      "estimated_loss_per_portion_idr",
      "effective_cost_per_portion_idr",
    ];
    const body = rows.map((r) =>
      [
        `"${r.input.province}"`,
        `"${r.input.regional_cluster}"`,
        `"${r.input.beneficiary_category}"`,
        `"${r.input.protein_type}"`,
        r.input.food_arrival_temperature_celsius,
        r.input.transit_time_minutes,
        r.predicted_plate_waste_percentage,
        r.risk_level,
        r.estimated_loss_per_portion_idr,
        r.effective_cost_per_portion_idr,
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plateguard_batch_predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const highRiskCount = rows.filter(
    (r) => r.predicted_plate_waste_percentage >= 15
  ).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upload & Trigger Card */}
        <div className="hairline-card p-6 lg:col-span-7 space-y-5">
          <div>
            <h2 className="text-[19px] font-semibold text-[#0d2429]">
              Skoring batch CSV pra-distribusi (hingga 100 rencana sekaligus)
            </h2>
            <p className="mt-1 text-[14px] text-[#2f737d]">
              Unggah jadwal distribusi SPPG dalam format CSV atau jalankan uji cepat memakai 12 baris acak dari holdout test.
            </p>
          </div>

          <div className="sage-frame p-5">
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[rgba(6,82,92,0.14)] bg-white p-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-6 w-6 text-[#06525c] shrink-0" />
                <div>
                  <div className="text-[15px] font-semibold text-[#0d2429]">
                    Pilih file rencana SPPG (.csv)
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#2f737d]">
                    Mendukung kolom skema standar (<code className="t-mono text-[#0d2429]">province</code>,{" "}
                    <code className="t-mono text-[#0d2429]">regional_cluster</code>,{" "}
                    <code className="t-mono text-[#0d2429]">food_arrival_temperature_celsius</code>, dll.).
                  </div>
                </div>
              </div>
              <label className="btn-secondary shrink-0 cursor-pointer">
                Unggah CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSampleHoldoutBatch}
              disabled={loading}
              className="btn-primary disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses batch...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Uji 12 sampel holdout
                </>
              )}
            </button>

            {rows.length > 0 && (
              <button
                type="button"
                onClick={downloadScoredCsv}
                className="btn-secondary"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Unduh hasil CSV
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-[#b93815]/30 bg-[#fbeae5] p-3.5 text-[13px] text-[#b93815]">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Developer API Card */}
        <div className="hairline-card p-6 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#0d2429]">
              Integrasi REST API FastAPI
            </h3>
            <a
              href={assetUrl("/docs")}
              target="_blank"
              rel="noreferrer"
              className="link-draw text-[13px]"
            >
              Swagger /docs
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
          <p className="text-[13px] text-[#2f737d]">
            Contoh pemanggilan langsung endpoint inferensi dengan TreeSHAP lokal dari skrip Python internal BGN.
          </p>
          <pre className="t-mono overflow-x-auto rounded-xl border border-[rgba(6,82,92,0.14)] bg-[#0d2429] p-4 text-[11.5px] leading-relaxed text-[#ebf0ee]">
{`import requests

payload = {
  "province": "Papua Selatan",
  "regional_cluster":
    "Wilayah 3T Perbatasan & Pedalaman",
  "food_arrival_temperature_celsius": 56.5,
  "transit_time_minutes": 72,
  "estimated_calories_kcal": 580
}
r = requests.post(
  "http://localhost:8000/api/explain/pra",
  json=payload
)
print(r.json()["predicted_plate_waste_percentage"])`}
          </pre>
        </div>
      </div>

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="hairline-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-6 text-[14px]">
              <span>
                Total dievaluasi:{" "}
                <strong className="t-mono text-[#0d2429]">{rows.length} baris</strong>
              </span>
              <span>
                Rataan prediksi:{" "}
                <strong className="t-mono text-[#06525c]">
                  {avgWaste !== null ? formatPct(avgWaste) : "-"}
                </strong>
              </span>
              <span>
                Berisiko tinggi (&ge;15%):{" "}
                <strong className="t-mono text-[#b93815]">{highRiskCount} rencana</strong>
              </span>
              <span>
                Latensi batch:{" "}
                <strong className="t-mono text-[#2f737d]">{latencyMs} ms</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[rgba(6,82,92,0.12)]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#ebf0ee] text-[#2f737d]">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Provinsi &amp; Klaster</th>
                  <th className="px-4 py-3 font-medium">Menu &amp; Penerima</th>
                  <th className="px-4 py-3 text-right font-medium">Suhu / Transit</th>
                  <th className="px-4 py-3 text-right font-medium">Prediksi Sisa</th>
                  <th className="px-4 py-3 text-right font-medium">Sisa / Porsi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(6,82,92,0.08)]">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#f7f9f8]">
                    <td className="t-mono px-4 py-2.5 text-[#2f737d]">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[#0d2429]">
                        {String(r.input.province)}
                      </div>
                      <div className="text-[12px] text-[#2f737d]">
                        {String(r.input.regional_cluster)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[#0d2429]">
                        {String(r.input.protein_type)}
                      </div>
                      <div className="text-[12px] text-[#2f737d]">
                        {String(r.input.beneficiary_category)}
                      </div>
                    </td>
                    <td className="t-mono px-4 py-2.5 text-right text-[#2f737d]">
                      {Number(r.input.food_arrival_temperature_celsius).toFixed(1)}°C /{" "}
                      {Number(r.input.transit_time_minutes)}m
                    </td>
                    <td
                      className={`t-mono px-4 py-2.5 text-right font-semibold ${
                        r.predicted_plate_waste_percentage >= 15
                          ? "text-[#b93815]"
                          : "text-[#06525c]"
                      }`}
                    >
                      {formatPct(r.predicted_plate_waste_percentage)}
                    </td>
                    <td className="t-mono px-4 py-2.5 text-right text-[#0d2429]">
                      {formatIdr(r.estimated_loss_per_portion_idr)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-medium ${
                          r.risk_level === "Tinggi"
                            ? "bg-[#fbeae5] text-[#b93815]"
                            : r.risk_level === "Sedang"
                            ? "bg-[#fbf0ea] text-[#b4532a]"
                            : "bg-[#e7f4ec] text-[#0f7d45]"
                        }`}
                      >
                        {r.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
