import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardFiltersBar } from "@/components/admin/dashboard/DashboardFiltersBar";
import { SimpleBarChart } from "@/components/admin/dashboard/SimpleBarChart";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { formatRelativeTime } from "@/lib/admin/dashboard/format";
import type { AdminDashboardData, EventDashboardRow } from "@/lib/admin/dashboard/types";
import { EconomicBadges } from "@/components/finance/EconomicBadges";
import { getEventVisibilityBadge } from "@/lib/events/access";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDate, formatTime } from "@/lib/events/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

type AdminDashboardProps = {
  data: AdminDashboardData;
};

function MetricCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`public-card flex flex-col p-5 ${className}`}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--public-text-soft)]">
        {title}
      </h2>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-[var(--public-text-soft)]">{children}</p>
  );
}

function EventRowCard({ row }: { row: EventDashboardRow }) {
  const { event, timing } = row;
  const imageUrl = event.thumbnail_url || event.main_image_url;
  const stockLabel = row.hasUndefinedStock && row.stockTotal === null
    ? `${row.ticketsSold} vendidas`
    : row.stockTotal != null
      ? `${row.ticketsSold} / ${row.stockTotal}`
      : `${row.ticketsSold}`;

  return (
    <article className="public-card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-36 w-full shrink-0 bg-[var(--public-bg-section)] sm:h-auto sm:w-36">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="144px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[var(--public-text-soft)]">
              Sin imagen
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--public-text)]">{event.name}</h3>
              <p className="mt-1 text-sm text-[var(--public-text-secondary)]">
                {formatEventDate(event.event_date)}
                {formatTime(event.start_time) ? ` · ${formatTime(event.start_time)}` : ""}
              </p>
              {event.location_name ? (
                <p className="text-sm text-[var(--public-text-soft)]">{event.location_name}</p>
              ) : null}
            </div>
            <span className="public-badge shrink-0">{timing.shortLabel}</span>
          </div>

          <div className="grid gap-2 text-sm text-[var(--public-text-secondary)] sm:grid-cols-2">
            <p>Entradas: <strong className="text-[var(--public-text)]">{stockLabel}</strong></p>
            <p>Reservas: <strong className="text-[var(--public-text)]">{row.pendingReservations} pendientes</strong></p>
            <p>Recaudado: <strong className="text-[var(--public-text)]">{formatTicketPrice(row.revenue)}</strong></p>
            <p>Consumiciones: <strong className="text-[var(--public-text)]">{formatTicketPrice(row.kioskRevenue)}</strong></p>
            <p>Visitas: <strong className="text-[var(--public-text)]">{row.visits.toLocaleString("es-AR")}</strong></p>
            <p>Estado: <strong className="text-[var(--public-text)]">{getEventVisibilityBadge(event)}</strong></p>
          </div>

          <EconomicBadges
            summary={row.financial}
            ventasHref={`${ROUTES.adminEventoVentas(event.id)}?estado=pendiente`}
            gestionHref={ROUTES.adminEventoGestion(event.id)}
            compact
          />

          <div className="flex flex-wrap gap-2">
            <Link
              href={ROUTES.adminEventoGestion(event.id)}
              className="public-btn-secondary text-sm"
            >
              Gestión
            </Link>
            <Link
              href={ROUTES.adminEvento(event.id)}
              className="public-btn-primary text-sm"
            >
              Administrar
            </Link>
            <Link
              href={ROUTES.evento(event.slug)}
              className="public-btn-secondary text-sm"
              target="_blank"
            >
              Ver evento
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const { nextEvent, revenue, tickets, kiosk, traffic } = data;

  const revenueLabels = data.revenueSeries.map((p) => p.date);
  const trafficLabels = data.trafficSeries.map((p) => p.date);

  return (
    <>
      <AdminHeader
        title="Panel de administración"
        description="Resumen operativo de eventos, ventas, consumiciones y tráfico de la plataforma."
      />

      <div className="public-theme bg-[var(--public-bg)] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <Suspense fallback={<div className="public-card h-16 animate-pulse p-4" />}>
            <DashboardFiltersBar filters={data.filters} events={data.events} />
          </Suspense>

          <p className="text-sm text-[var(--public-text-soft)]">
            Mostrando métricas para: <strong className="text-[var(--public-text)]">{data.rangeLabel}</strong>
          </p>

          {/* Ventas por confirmar + resultado económico */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Ventas por confirmar">
              {data.pendingSales.totalOperations > 0 ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-[var(--public-text)]">
                    {data.pendingSales.totalOperations} operaciones
                  </p>
                  <p className="text-sm text-[var(--public-text-secondary)]">
                    {data.pendingSales.totalTickets} entradas ·{" "}
                    {formatTicketPrice(data.pendingSales.totalAmount)} pendientes
                  </p>
                  <Link href={ROUTES.adminVentas} className="public-btn-primary text-sm">
                    Revisar ventas
                  </Link>
                </div>
              ) : (
                <EmptyHint>No hay ventas pendientes de confirmar.</EmptyHint>
              )}
            </MetricCard>

            <MetricCard title="Ganancia real">
              <p className="text-2xl font-bold text-[var(--public-text)]">
                {formatTicketPrice(data.globalFinancial.realProfit)}
              </p>
              <p className="mt-2 text-sm text-[var(--public-text-secondary)]">
                Gastos pagados: {formatTicketPrice(data.globalFinancial.expensesPaid)}
              </p>
            </MetricCard>

            <MetricCard title="Ganancia proyectada">
              <p className="text-2xl font-bold text-[var(--public-text)]">
                {formatTicketPrice(data.globalFinancial.projectedProfit)}
              </p>
              <p className="mt-2 text-xs text-[var(--public-text-soft)]">
                Incluye pendientes; no es dinero confirmado
              </p>
            </MetricCard>

            <MetricCard title="Gastos acumulados">
              <p className="text-2xl font-bold text-[var(--public-text)]">
                {formatTicketPrice(data.globalFinancial.expensesPaid)}
              </p>
              <p className="mt-2 text-sm text-[var(--public-text-secondary)]">
                Comprometidos: {formatTicketPrice(data.globalFinancial.expensesCommitted)}
              </p>
            </MetricCard>
          </section>

          {/* Fila superior */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Próximo evento">
              {nextEvent ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[var(--public-text)]">
                    {nextEvent.event.name}
                  </p>
                  <p className="text-sm text-[var(--public-text-secondary)]">
                    {formatEventDate(nextEvent.event.event_date)}
                    {formatTime(nextEvent.event.start_time)
                      ? ` · ${formatTime(nextEvent.event.start_time)}`
                      : ""}
                  </p>
                  {nextEvent.event.location_name ? (
                    <p className="text-sm text-[var(--public-text-soft)]">
                      {nextEvent.event.location_name}
                    </p>
                  ) : null}
                  <p className="text-sm font-medium text-[var(--public-primary)]">
                    {nextEvent.timing.fullLabel}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={ROUTES.evento(nextEvent.event.slug)}
                      className="public-btn-secondary text-sm"
                      target="_blank"
                    >
                      Ver evento
                    </Link>
                    <Link
                      href={ROUTES.adminEvento(nextEvent.event.id)}
                      className="public-btn-primary text-sm"
                    >
                      Administrar
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyHint>No hay eventos próximos programados.</EmptyHint>
              )}
            </MetricCard>

            <MetricCard title="Recaudación total">
              {revenue.total > 0 || revenue.pending > 0 ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-[var(--public-text)]">
                    {formatTicketPrice(revenue.total)}
                  </p>
                  <ul className="space-y-1 text-sm text-[var(--public-text-secondary)]">
                    <li>Entradas: {formatTicketPrice(revenue.tickets)}</li>
                    <li>Consumiciones: {formatTicketPrice(revenue.kiosk)}</li>
                    <li>Ventas manuales: {formatTicketPrice(revenue.manual)}</li>
                  </ul>
                  <p className="text-xs text-[var(--public-text-soft)]">
                    Mes: {formatTicketPrice(data.revenueMonth)} · 7 días: {formatTicketPrice(data.revenue7d)}
                  </p>
                  {revenue.pending > 0 ? (
                    <p className="text-xs text-[var(--public-accent)]">
                      Pendiente (no recaudado): {formatTicketPrice(revenue.pending)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <EmptyHint>Todavía no hay ventas confirmadas para este período.</EmptyHint>
              )}
            </MetricCard>

            <MetricCard title="Entradas vendidas">
              {tickets.soldConfirmed > 0 || tickets.pendingConfirmation > 0 ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-[var(--public-text)]">
                    {tickets.stockTotal != null
                      ? `${tickets.soldConfirmed} / ${tickets.stockTotal}`
                      : tickets.soldConfirmed}
                  </p>
                  <p className="text-sm text-[var(--public-text-secondary)]">
                    {tickets.stockTotal != null
                      ? `${tickets.soldPercent ?? 0}% vendido`
                      : "Sin capacidad total definida"}
                  </p>
                  <ul className="text-sm text-[var(--public-text-secondary)]">
                    <li>Pendientes: {tickets.pendingConfirmation}</li>
                    <li>Utilizadas: {tickets.used}</li>
                    <li>Canceladas: {tickets.cancelled}</li>
                  </ul>
                </div>
              ) : (
                <EmptyHint>Sin entradas confirmadas en este período.</EmptyHint>
              )}
            </MetricCard>

            <MetricCard title="Tráfico de la página">
              {traffic.available && traffic.totalVisits > 0 ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-[var(--public-text)]">
                    {traffic.totalVisits.toLocaleString("es-AR")} visitas
                  </p>
                  <ul className="text-sm text-[var(--public-text-secondary)]">
                    <li>Únicos estimados: {traffic.uniqueVisitors.toLocaleString("es-AR")}</li>
                    <li>Hoy: {traffic.visitsToday.toLocaleString("es-AR")}</li>
                    <li>7 días: {traffic.visits7d.toLocaleString("es-AR")}</li>
                    <li>30 días: {traffic.visits30d.toLocaleString("es-AR")}</li>
                  </ul>
                  {traffic.topEventName ? (
                    <p className="text-xs text-[var(--public-text-soft)]">
                      Más visitado: {traffic.topEventName}
                    </p>
                  ) : null}
                </div>
              ) : (
                <EmptyHint>
                  {traffic.available
                    ? "Todavía no hay visitas registradas."
                    : "Activa la migración de analítica para registrar visitas."}
                </EmptyHint>
              )}
            </MetricCard>
          </section>

          {/* Consumiciones resumen */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Consumiciones" className="md:col-span-2 xl:col-span-4">
              {kiosk.ordersConfirmed > 0 || kiosk.ordersPending > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-[var(--public-text-soft)]">Órdenes confirmadas</p>
                    <p className="text-xl font-semibold">{kiosk.ordersConfirmed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--public-text-soft)]">Productos vendidos</p>
                    <p className="text-xl font-semibold">{kiosk.productsSold}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--public-text-soft)]">Recaudación</p>
                    <p className="text-xl font-semibold">{formatTicketPrice(kiosk.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--public-text-soft)]">Pendientes / stock bajo</p>
                    <p className="text-xl font-semibold">
                      {kiosk.ordersPending} / {kiosk.lowStockProducts}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyHint>Sin consumiciones confirmadas en este período.</EmptyHint>
              )}
            </MetricCard>
          </section>

          {/* Próximos eventos */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[var(--public-text)]">Próximos eventos</h2>
            {data.upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingEvents.map((row) => (
                  <EventRowCard key={row.event.id} row={row} />
                ))}
              </div>
            ) : (
              <div className="public-card p-6">
                <EmptyHint>No hay eventos próximos.</EmptyHint>
              </div>
            )}
          </section>

          {/* Gráficos */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="public-card p-5">
              <h2 className="text-lg font-bold text-[var(--public-text)]">Recaudación</h2>
              <p className="mt-1 text-xs text-[var(--public-text-soft)]">
                Solo operaciones confirmadas (entradas válidas/usadas + consumiciones pagadas).
              </p>
              <div className="mt-4">
                <SimpleBarChart
                  labels={revenueLabels}
                  formatValue={(v) => formatTicketPrice(v)}
                  series={[
                    {
                      key: "tickets",
                      label: "Entradas",
                      color: "var(--public-primary)",
                      values: data.revenueSeries.map((p) => p.tickets),
                    },
                    {
                      key: "kiosk",
                      label: "Consumiciones",
                      color: "var(--public-fresh)",
                      values: data.revenueSeries.map((p) => p.kiosk),
                    },
                  ]}
                  emptyMessage="Todavía no hay recaudación confirmada para este período."
                />
              </div>
            </div>

            <div className="public-card p-5">
              <h2 className="text-lg font-bold text-[var(--public-text)]">Tráfico</h2>
              {traffic.visitsChangePercent != null ? (
                <p className="mt-1 text-xs text-[var(--public-text-soft)]">
                  Hoy vs ayer: {traffic.visitsChangePercent > 0 ? "+" : ""}
                  {traffic.visitsChangePercent}%
                </p>
              ) : null}
              <div className="mt-4">
                <SimpleBarChart
                  labels={trafficLabels}
                  series={[
                    {
                      key: "visits",
                      label: "Visitas",
                      color: "var(--public-secondary)",
                      values: data.trafficSeries.map((p) => p.visits),
                    },
                  ]}
                  emptyMessage="Sin visitas registradas para este período."
                />
              </div>
            </div>
          </section>

          {/* Actividad y alertas */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="public-card p-5">
              <h2 className="text-lg font-bold text-[var(--public-text)]">Actividad reciente</h2>
              {data.recentActivity.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {data.recentActivity.map((item) => (
                    <li key={item.id} className="border-b border-[var(--public-border)] pb-3 last:border-0">
                      <p className="text-xs text-[var(--public-text-soft)]">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                      <p className="text-sm text-[var(--public-text)]">{item.label}</p>
                      <p className="text-sm text-[var(--public-text-secondary)]">
                        {item.eventName ?? "General"}
                        {item.amount != null ? ` · ${formatTicketPrice(item.amount)}` : ""}
                      </p>
                      {item.href ? (
                        <Link href={item.href} className="text-xs text-[var(--public-primary)] hover:underline">
                          Ver detalle
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[var(--public-text-soft)]">
                  Sin actividad reciente en este período.
                </p>
              )}
            </div>

            <div className="public-card p-5">
              <h2 className="text-lg font-bold text-[var(--public-text)]">Necesita atención</h2>
              {data.alerts.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {data.alerts.map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={alert.href}
                        className="block rounded-xl border border-[var(--public-border)] p-3 transition hover:border-[var(--public-primary)]"
                      >
                        <p className="text-sm font-medium text-[var(--public-text)]">{alert.title}</p>
                        <p className="mt-1 text-xs text-[var(--public-text-secondary)]">
                          {alert.description}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[var(--public-text-soft)]">
                  Todo en orden. No hay alertas pendientes.
                </p>
              )}
            </div>
          </section>

          {/* Eventos recientes finalizados */}
          {data.recentEvents.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-[var(--public-text)]">Eventos recientes</h2>
              <div className="space-y-4">
                {data.recentEvents.map((row) => (
                  <EventRowCard key={row.event.id} row={row} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Tabla eventos más vistos */}
          <section className="public-card overflow-hidden p-5">
            <h2 className="text-lg font-bold text-[var(--public-text)]">Eventos más vistos</h2>
            <p className="mt-1 text-xs text-[var(--public-text-soft)]">
              Conversión: {traffic.conversionFormula}
            </p>

            {data.topEventsByViews.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--public-border)] text-xs uppercase text-[var(--public-text-soft)]">
                      <th className="py-2 pr-4">Evento</th>
                      <th className="py-2 pr-4">Visitas</th>
                      <th className="py-2 pr-4">Clics</th>
                      <th className="py-2 pr-4">Ventas</th>
                      <th className="py-2">Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topEventsByViews.map((row) => (
                      <tr key={row.eventId} className="border-b border-[var(--public-border)] last:border-0">
                        <td className="py-3 pr-4 font-medium text-[var(--public-text)]">{row.eventName}</td>
                        <td className="py-3 pr-4">{row.visits.toLocaleString("es-AR")}</td>
                        <td className="py-3 pr-4">{row.ticketClicks.toLocaleString("es-AR")}</td>
                        <td className="py-3 pr-4">{row.confirmedPurchases.toLocaleString("es-AR")}</td>
                        <td className="py-3">
                          {row.conversionPercent != null
                            ? `${row.conversionPercent.toLocaleString("es-AR")} %`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--public-text-soft)]">
                Sin datos de visitas por evento todavía.
              </p>
            )}
          </section>

          {/* Accesos rápidos (preservar funcionalidad existente) */}
          <section className="flex flex-wrap gap-3 border-t border-[var(--public-border)] pt-6">
            <Link href={ROUTES.adminEventos} className="public-btn-primary">
              Gestionar eventos
            </Link>
            <Link href={ROUTES.adminVentas} className="public-btn-secondary">
              Ver ventas
            </Link>
            <Link href={ROUTES.home} className="public-btn-ghost">
              Ir al sitio público
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
