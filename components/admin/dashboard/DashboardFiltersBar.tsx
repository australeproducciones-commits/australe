"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { DashboardFilters } from "@/lib/admin/dashboard/types";
import { cn } from "@/lib/utils/cn";

type DashboardFiltersBarProps = {
  filters: DashboardFilters;
  events: Array<{ id: string; name: string }>;
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Todo" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "month", label: "Este mes" },
] as const;

export function DashboardFiltersBar({
  filters,
  events,
}: DashboardFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      startTransition(() => {
        const query = params.toString();
        router.push(query ? `/admin?${query}` : "/admin");
      });
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[140px] flex-1">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Período
        </label>
        <select
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-purple-400/50"
          value={filters.period}
          disabled={isPending}
          onChange={(e) => updateParams({ period: e.target.value })}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[180px] flex-[2]">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Evento
        </label>
        <select
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-purple-400/50"
          value={filters.eventId ?? ""}
          disabled={isPending}
          onChange={(e) => updateParams({ event: e.target.value || null })}
        >
          <option value="">Todos los eventos</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["today", "7d", "30d"] as const).map((period) => (
          <button
            key={period}
            type="button"
            disabled={isPending}
            onClick={() => updateParams({ period })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filters.period === period
                ? "bg-purple-500/20 text-purple-100 ring-1 ring-purple-400/30"
                : "border border-white/10 text-zinc-300 hover:bg-white/5",
            )}
          >
            {period === "today" ? "Hoy" : period === "7d" ? "7 días" : "30 días"}
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="text-xs text-zinc-500">Actualizando…</p>
      ) : null}
    </div>
  );
}
