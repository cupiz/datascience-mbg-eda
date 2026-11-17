"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { fetchHealth, HealthResponse } from "@/lib/api";

export function BrandMark() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#06525c] text-[#f7f9f8]">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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

export default function Navbar() {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/workspace");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchHealth().then((res) => {
      if (active) setHealth(res);
    });
    return () => {
      active = false;
    };
  }, []);

  const apiOnline = Boolean(health && health.status === "healthy");

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(6,82,92,0.12)] bg-[#f7f9f8]/95 backdrop-blur-md">
      <div className="wrap flex h-[70px] items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[#0d2429] no-underline"
          >
            <BrandMark />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">
              PlateGuard <span className="text-[#2f737d] font-medium">MBG</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Navigasi utama">
            <Link href="/#ringkasan" className="nav-word">
              Temuan data
            </Link>
            <Link href="/#alur" className="nav-word">
              Pipeline model
            </Link>
            <Link href="/#benchmark" className="nav-word">
              Evaluasi CV
            </Link>
            <Link
              href="/workspace"
              className="nav-word"
              aria-current={isWorkspace ? "page" : undefined}
            >
              Workspace analitik
            </Link>
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <span
            className="t-mono inline-flex items-center gap-2 rounded-full border border-[rgba(6,82,92,0.16)] bg-[#ebf0ee] px-3 py-1.5 text-[12px] text-[#06525c]"
            title={
              apiOnline
                ? `Model aktif: ${health?.pra_model_name ?? "LightGBM Optuna"}`
                : "Memeriksa status API FastAPI"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline ? "bg-[#0f7d45]" : "bg-[#b4532a]"
              }`}
              aria-hidden="true"
            />
            {apiOnline ? "FastAPI siap" : "Mode statis"}
          </span>

          {!isWorkspace && (
            <Link href="/workspace" className="btn-primary">
              Buka simulator
              <ArrowRight className="m-arrow h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(6,82,92,0.18)] bg-[#ebf0ee] text-[#06525c] md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[rgba(6,82,92,0.12)] bg-[#f7f9f8] px-5 py-5 md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/#ringkasan"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-[16px] font-medium text-[#0d2429] no-underline"
            >
              Temuan data
            </Link>
            <Link
              href="/#alur"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-[16px] font-medium text-[#0d2429] no-underline"
            >
              Pipeline model
            </Link>
            <Link
              href="/#benchmark"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-[16px] font-medium text-[#0d2429] no-underline"
            >
              Evaluasi CV
            </Link>
            <Link
              href="/workspace"
              onClick={() => setMobileOpen(false)}
              className="btn-primary mt-2 w-full"
            >
              Buka simulator
              <ArrowRight className="m-arrow h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
