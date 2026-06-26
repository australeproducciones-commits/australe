import { Suspense } from "react";
import { DashboardFiltersBar } from "@/components/admin/dashboard/DashboardFiltersBar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import type { AdminDashboardData } from "@/lib/admin/dashboard/types";

type AdminDashboardHeaderProps = {
  data: AdminDashboardData;
};

export function AdminDashboardHeader({ data }: AdminDashboardHeaderProps) {
  return (
    <>
      <AdminHeader
        title="Centro de control"
        description="Monitoreo operativo de eventos, ventas, consumiciones y tráfico."
      />
      <div className="border-b border-white/10 bg-zinc-950 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-3">
          <Suspense
            fallback={
              <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/70" />
            }
          >
            <DashboardFiltersBar
              filters={data.filters}
              events={data.events}
            />
          </Suspense>
          <p className="text-xs text-zinc-500">
            Período activo:{" "}
            <span className="font-medium text-zinc-300">{data.rangeLabel}</span>
          </p>
        </div>
      </div>
    </>
  );
}
