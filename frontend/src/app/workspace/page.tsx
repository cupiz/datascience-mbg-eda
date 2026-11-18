import { Suspense } from "react";
import AppShell from "@/components/app/AppShell";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#c3d7e5] text-[14px] font-medium text-[#0f5257]">
          Memuat workspace PlateGuard MBG...
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
