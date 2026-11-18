"use client";

import { useState } from "react";
import {
  BookOpenText,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Play,
} from "lucide-react";
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

export default function BatchPanel({
  plainMode = true,
}: {
  plainMode?: boolean;
}) {
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
      setErrorMsg("File CSV kosong atau judul kolom tidak terbaca.");
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
    <div className="space-y-5">
      {plainMode && (
        <div className="sage-frame p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f5257] text-white">
              <BookOpenText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[14.5px] font-bold text-[#141414]">
                Periksa Banyak Jadwal Pengantaran Sekaligus
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#3d525c]">
                Tidak perlu mengecek sekolah satu per satu. Unggah daftar jadwal dalam berkas{" "}
                <strong className="text-[#141414]">CSV</strong> (hingga 100 kiriman), lalu lihat baris mana yang paling berisiko menyisakan makanan agar tim dapur segera menyiapkan kotak penghangat tambahan.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Upload & Trigger Card */}
        <div className="hairline-card space-y-5 p-6 lg:col-span-7">
          <div>
            <h2 className="text-[18px] font-bold text-[#141414]">
              {plainMode
                ? "Cek Serentak Jadwal SPPG (maksimal 100 baris)"
                : "Skoring batch CSV pra-distribusi (hingga 100 rencana sekaligus)"}
            </h2>
            <p className="mt-1 text-[13.5px] text-[#3d525c]">
              Unggah jadwal distribusi SPPG dalam format CSV atau jalankan uji cepat memakai 12 data nyata.
            </p>
          </div>

          <div className="sage-frame p-4">
            <div className="glass-field flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-6 w-6 shrink-0 text-[#0f5257]" />
                <div>
                  <div className="text-[14.5px] font-bold text-[#141414]">
                    Pilih berkas rencana SPPG (.csv)
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-[#3d525c]">
                    Memakai kolom standar (<code className="t-mono text-[#141414]">province</code>,{" "}
                    <code className="t-mono text-[#141414]">regional_cluster</code>,{" "}
                    <code className="t-mono text-[#141414]">food_arrival_temperature_celsius</code>, dan lainnya).
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses daftar...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Uji 12 Data Nyata
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
                Unduh Hasil CSV
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-2xl border border-[rgba(181,52,24,0.3)] bg-[rgba(255,240,236,0.9)] p-3.5 text-[13px] font-medium text-[#b53418]">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Developer API Card */}
        <div className="hairline-card space-y-4 p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#141414]">
              Sambungkan ke Sistem Dapur (API)
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
          <p className="text-[13px] text-[#3d525c]">
            Contoh kode singkat untuk mengambil prediksi serta ringkasan bahasa sederhana langsung dari peladen FastAPI.
          </p>
          <pre className="t-mono overflow-x-auto rounded-2xl bg-[#102528] p-4 text-[11.5px] leading-relaxed text-[#d9e7ea]">
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
print(r.json()["humanizer_summary"]["story"])`}
          </pre>
        </div>
      </div>

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="hairline-card space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-6 text-[13.5px]">
            <span>
              Total dicek:{" "}
              <strong className="t-mono text-[#141414]">{rows.length} baris</strong>
            </span>
            <span>
              Rata-rata sisa:{" "}
              <strong className="t-mono text-[#0f5257]">
                {avgWaste !== null ? formatPct(avgWaste) : "-"}
              </strong>
            </span>
            <span>
              Risiko tinggi (&ge;15%):{" "}
              <strong className="t-mono text-[#b53418]">{highRiskCount} rencana</strong>
            </span>
            <span>
              Kecepatan proses:{" "}
              <strong className="t-mono text-[#3d525c]">{latencyMs} ms</strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-[18px] border border-white/85 bg-white/60">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#eef4f7] text-[#3d525c]">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Provinsi &amp; Zona</th>
                  <th className="px-4 py-3 font-semibold">Menu &amp; Penerima</th>
                  <th className="px-4 py-3 text-right font-semibold">Suhu / Jalan</th>
                  <th className="px-4 py-3 text-right font-semibold">Perkiraan Sisa</th>
                  <th className="px-4 py-3 text-right font-semibold">Terbuang/Porsi</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(15,82,87,0.08)]">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-white/75">
                    <td className="t-mono px-4 py-2.5 text-[#3d525c]">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[#141414]">
                        {String(r.input.province)}
                      </div>
                      <div className="text-[12px] text-[#3d525c]">
                        {String(r.input.regional_cluster)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[#141414]">
                        {String(r.input.protein_type)}
                      </div>
                      <div className="text-[12px] text-[#3d525c]">
                        {String(r.input.beneficiary_category)}
                      </div>
                    </td>
                    <td className="t-mono px-4 py-2.5 text-right text-[#3d525c]">
                      {Number(r.input.food_arrival_temperature_celsius).toFixed(1).replace(".", ",")}°C /{" "}
                      {Number(r.input.transit_time_minutes)}m
                    </td>
                    <td
                      className={`t-mono px-4 py-2.5 text-right font-bold ${
                        r.predicted_plate_waste_percentage >= 15
                          ? "text-[#b53418]"
                          : "text-[#0f5257]"
                      }`}
                    >
                      {formatPct(r.predicted_plate_waste_percentage)}
                    </td>
                    <td className="t-mono px-4 py-2.5 text-right font-medium text-[#141414]">
                      {formatIdr(r.estimated_loss_per_portion_idr)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                          r.risk_level === "Tinggi"
                            ? "bg-[rgba(181,52,24,0.14)] text-[#b53418]"
                            : r.risk_level === "Sedang"
                            ? "bg-[rgba(180,83,42,0.14)] text-[#b4532a]"
                            : "bg-[rgba(19,114,66,0.14)] text-[#137242]"
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
