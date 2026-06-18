"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { DashboardFilters } from "@/lib/admin/dashboard/types";

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
    <div className="public-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[140px] flex-1">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--public-text-soft)]">
          Período
        </label>
        <select
          className="public-input w-full"
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
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--public-text-soft)]">
          Evento
        </label>
        <select
          className="public-input w-full"
          value={filters.eventId ?? ""}
          disabled={isPending}
          onChange={(e) =>
            updateParams({ event: e.target.value || null })
          }
        >
          <option value="">Todos los eventos</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {isPending ? (
        <p className="text-xs text-[var(--public-text-soft)]">Actualizando…</p>
      ) : null}
    </div>
  );
}
