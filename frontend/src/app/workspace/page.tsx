import { Suspense } from "react";
import AppShell from "@/components/app/AppShell";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f9f8] text-[14px] text-[#2f737d]">
          Memuat workspace PlateGuard MBG...
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
