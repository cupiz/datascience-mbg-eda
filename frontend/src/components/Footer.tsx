"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "./Navbar";
import { assetUrl } from "@/lib/api";

interface FooterProps {
  showClosingCta?: boolean;
}

export default function Footer({ showClosingCta = true }: FooterProps) {
  return (
    <footer className="bg-[#06525c] text-[#f7f9f8]">
      <div className="wrap py-16 sm:py-20">
        {showClosingCta && (
          <div className="flex flex-col justify-between gap-6 border-b border-white/15 pb-14 lg:flex-row lg:items-end">
            <div className="max-w-[600px]">
              <h2 className="text-[32px] font-medium leading-[1.08] tracking-[-0.03em] text-[#f7f9f8] sm:text-[44px]">
                Uji rencana distribusi SPPG esok hari.
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-[#c1d0d2]">
                Masukkan profil menu, suhu pengantaran, dan waktu tempuh untuk membaca risiko sisa piring beserta atribusi SHAP sebelum makanan diberangkatkan.
              </p>
            </div>
            <Link
              href="/workspace"
              className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-lg bg-[#f7f9f8] px-6 text-[15px] font-semibold text-[#06525c] no-underline transition-transform duration-150 hover:-translate-y-0.5"
            >
              Buka simulator
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-[16px] font-semibold">PlateGuard MBG v2</span>
            </div>
            <p className="text-[14px] leading-relaxed text-[#c1d0d2]">
              Pendukung keputusan pra-distribusi dan audit mutu Makan Bergizi Gratis pada 13.000 rekaman layanan 2026.
            </p>
          </div>

          <div>
            <div className="text-[13px] font-medium text-[#cdd6c6]">Antarmuka</div>
            <ul className="mt-3 space-y-2.5 text-[14px]">
              <li>
                <Link href="/workspace?tab=simulator" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Simulator &amp; TreeSHAP
                </Link>
              </li>
              <li>
                <Link href="/workspace?tab=analytics" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Analitik 38 Provinsi
                </Link>
              </li>
              <li>
                <Link href="/workspace?tab=audit" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Audit Holdout &amp; 5-Fold CV
                </Link>
              </li>
              <li>
                <Link href="/workspace?tab=batch" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Batch Scoring CSV
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[13px] font-medium text-[#cdd6c6]">Layanan API</div>
            <ul className="mt-3 space-y-2.5 text-[14px]">
              <li>
                <a href={assetUrl("/docs")} target="_blank" rel="noreferrer" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Dokumentasi Swagger (/docs)
                </a>
              </li>
              <li>
                <a href={assetUrl("/api/overview")} target="_blank" rel="noreferrer" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Endpoint EDA (/api/overview)
                </a>
              </li>
              <li>
                <a href={assetUrl("/api/benchmark")} target="_blank" rel="noreferrer" className="text-[#f7f9f8]/90 hover:text-white no-underline">
                  Endpoint Benchmark (/api/benchmark)
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[13px] font-medium text-[#cdd6c6]">Spesifikasi Model</div>
            <ul className="t-mono mt-3 space-y-2 text-[13px] text-[#c1d0d2]">
              <li>Model Pra: LightGBM (Optuna)</li>
              <li>CV MAE Pra: 3,6044 ± 0,0417</li>
              <li>CV MAE Post: 2,9051 ± 0,0464</li>
              <li>Validasi: Holdout 2.600 baris</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-[13px] text-[#c1d0d2]">
          <span>PlateGuard MBG · Dataset Kaggle MBG 2026 v4</span>
          <span>FastAPI + Next.js · Docker port 7860</span>
        </div>
      </div>
    </footer>
  );
}
