"use client";

import { useMemo, useState } from "react";
import { AdminTicketDetailModal } from "@/components/ticket-sales/AdminTicketDetailModal";
import { AdminTicketsList } from "@/components/ticket-sales/AdminTicketsList";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EventVentasDashboard } from "@/lib/ticket-sales/eventVentasStats";
import {
  computeVentasAlerts,
  countTicketsByVentasFilter,
  exportConfirmedSalesCsv,
  exportReservationsCsv,
  exportTypeSummaryCsv,
  filterVentasTickets,
  VENTAS_STATUS_FILTERS,
  type VentasStatusFilter,
} from "@/lib/ticket-sales/adminVentasTools";
import type { TicketWithTypeName } from "@/lib/ticket-sales/types";
import { cn } from "@/lib/utils/cn";
import { adminInputClassName } from "@/lib/utils/adminFormStyles";

type AdminEventVentasPanelProps = {
  tickets: TicketWithTypeName[];
  eventName: string;
  eventDate: string | null;
  startTime: string | null;
  dashboard: EventVentasDashboard;
  initialFilter?: VentasStatusFilter;
};

export function AdminEventVentasPanel({
  tickets,
  eventName,
  eventDate,
  startTime,
  dashboard,
  initialFilter = "all",
}: AdminEventVentasPanelProps) {
  const [filter, setFilter] = useState<VentasStatusFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<TicketWithTypeName | null>(null);

  const alerts = useMemo(
    () => computeVentasAlerts(tickets, eventDate, startTime),
    [tickets, eventDate, startTime],
  );

  const filteredTickets = useMemo(
    () => filterVentasTickets(tickets, filter, searchQuery),
    [tickets, filter, searchQuery],
  );

  const isFiltered = filter !== "all" || searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                if (alert.filter) {
                  setFilter(alert.filter);
                }
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                alert.tone === "amber" &&
                  "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-400/25",
                alert.tone === "red" &&
                  "bg-red-400/15 text-red-200 ring-1 ring-red-400/30 hover:bg-red-400/25",
                alert.tone === "sky" &&
                  "bg-sky-400/15 text-sky-200 ring-1 ring-sky-400/30 hover:bg-sky-400/25",
                alert.filter ? "cursor-pointer" : "cursor-default",
              )}
            >
              {alert.label}
            </button>
          ))}
        </div>
      ) : null}

      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="ventas-search"
              className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400"
            >
              Buscar
            </label>
            <input
              id="ventas-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nombre, contacto, DNI, QR o ID de entrada"
              className={adminInputClassName}
            />
          </div>

          <div className="relative shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExportOpen((open) => !open)}
            >
              Exportar CSV ▾
            </Button>
            {exportOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Cerrar menú de exportación"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 min-w-56 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-xl">
                  <ExportMenuItem
                    label="Ventas confirmadas"
                    onClick={() => {
                      exportConfirmedSalesCsv(tickets, eventName);
                      setExportOpen(false);
                    }}
                  />
                  <ExportMenuItem
                    label="Reservas"
                    onClick={() => {
                      exportReservationsCsv(tickets, eventName);
                      setExportOpen(false);
                    }}
                  />
                  <ExportMenuItem
                    label="Resumen por tipo"
                    onClick={() => {
                      exportTypeSummaryCsv(dashboard, eventName);
                      setExportOpen(false);
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {VENTAS_STATUS_FILTERS.map((option) => {
            const count = countTicketsByVentasFilter(tickets, option.id);
            const active = filter === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-purple-500 text-white"
                    : "bg-white/10 text-zinc-300 hover:bg-white/15 hover:text-white",
                )}
              >
                {option.label}
                <span className={cn("ml-1.5", active ? "text-purple-100" : "text-zinc-500")}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <AdminTicketsList
        tickets={filteredTickets}
        totalCount={tickets.length}
        isFiltered={isFiltered}
        onViewTicket={setViewTicket}
      />

      <AdminTicketDetailModal
        ticket={viewTicket}
        onClose={() => setViewTicket(null)}
      />
    </div>
  );
}

function ExportMenuItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-4 py-3 text-left text-sm text-zinc-200 transition hover:bg-white/10"
    >
      {label}
    </button>
  );
}
