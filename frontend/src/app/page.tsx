import { Suspense } from "react";
import AppShell from "@/components/app/AppShell";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#c3d7e5] text-[14px] font-medium text-[#0f5257]">
          Memuat aplikasi PlateGuard MBG...
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
