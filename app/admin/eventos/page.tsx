import type { Metadata } from "next";
import Link from "next/link";
import { AdminQueryErrorCard } from "@/components/admin/AdminQueryErrorCard";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatSaleChannelsSummary } from "@/lib/events/saleChannels";
import {
  formatEventSoldStockLabel,
  getAdminStatsByEventIds,
} from "@/lib/events/adminStats";
import { getEventVisibilityBadge } from "@/lib/events/access";
import { getFinancialSummariesByEventIds } from "@/lib/finance/queries";
import { getPendingSalesSummary } from "@/lib/ticket-sales/pendingSales";
import { ROUTES } from "@/lib/constants/routes";
import { getAllEventsForAdmin } from "@/lib/events/queries";
import { formatEventDate } from "@/lib/events/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";
import type { Event } from "@/lib/events/types";

export const metadata: Metadata = {
  title: "Admin · Eventos",
};

export default async function AdminEventosPage() {
  let events: Event[] = [];
  let loadError: string | null = null;

  try {
    events = await getAllEventsForAdmin();
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  const eventIds = events.map((event) => event.id);
  const pendingSales = await getPendingSalesSummary();
  const [statsMap, financialMap] = await Promise.all([
    getAdminStatsByEventIds(eventIds),
    getFinancialSummariesByEventIds(eventIds, pendingSales),
  ]);

  return (
    <>
      <AdminHeader
        title="Eventos"
        description="Creación y edición de eventos, flyers, fechas, capacidad y publicación."
      />

      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            {events.length} evento{events.length === 1 ? "" : "s"} en total
          </p>
          <Button href={ROUTES.adminEventosCrear}>Crear evento</Button>
        </div>

        {loadError ? (
          <AdminQueryErrorCard message={loadError} />
        ) : events.length === 0 ? (
          <Card padding="lg" className="text-center">
            <h2 className="text-xl font-bold text-white">Sin eventos todavía</h2>
            <p className="mt-2 text-zinc-400">
              Creá el primer evento para publicarlo en la web.
            </p>
            <Button href={ROUTES.adminEventosCrear} className="mt-6">
              Crear evento
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const stats = statsMap.get(event.id);
              const financial = financialMap.get(event.id);
              const pendingCount = pendingSales.byEvent.get(event.id) ?? 0;
              const soldLabel = stats
                ? formatEventSoldStockLabel(stats)
                : "0 vendidas";

              return (
                <Card
                  key={event.id}
                  className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{event.name}</h2>
                      {event.is_featured ? (
                        <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">
                          Destacado
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatEventDate(event.event_date)}
                      {event.location_name ? ` · ${event.location_name}` : ""}
                    </p>
                    {event.address ? (
                      <p className="mt-1 text-xs">
                        <a
                          href={getGoogleMapsSearchUrl(event.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-300/90 underline-offset-2 hover:text-purple-200 hover:underline"
                        >
                          {event.address}
                        </a>
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                        {getEventVisibilityBadge(event)}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                        {formatSaleChannelsSummary(event)}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-400">
                        /{event.slug}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatBadge label={`${stats?.visits ?? 0} visitas`} />
                      <StatBadge label={soldLabel} tone="purple" />
                      <StatBadge
                        label={`${formatTicketPrice(stats?.revenue ?? 0)} recaudado`}
                        tone="emerald"
                      />
                      {financial ? (
                        <StatBadge
                          label={financial.profitBadgeLabel}
                          tone={
                            financial.profitVisualState === "negative"
                              ? "neutral"
                              : "emerald"
                          }
                        />
                      ) : null}
                      {pendingCount > 0 ? (
                        <StatBadge
                          label={`${pendingCount} por confirmar`}
                          tone="purple"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button href={ROUTES.adminEvento(event.id)} variant="outline">
                      Editar
                    </Button>
                    <Button href={ROUTES.adminEventoEntradas(event.id)} variant="secondary">
                      Entradas
                    </Button>
                    <Button href={ROUTES.adminEventoVentas(event.id)} variant="outline">
                      Ventas
                    </Button>
                    <Button href={ROUTES.adminEventoGestion(event.id)} variant="secondary">
                      Gestión
                    </Button>
                    {event.status === "published" ? (
                      <Link
                        href={ROUTES.evento(event.slug)}
                        className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-purple-300 transition hover:bg-white/5"
                      >
                        Ver público
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function StatBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "purple" | "emerald";
}) {
  const toneClass =
    tone === "purple"
      ? "bg-purple-500/15 text-purple-200"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-200"
        : "bg-white/10 text-zinc-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>
      {label}
    </span>
  );
}
