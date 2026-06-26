import Link from "next/link";
import { AdminDashboardHeader } from "@/components/admin/dashboard/AdminDashboardHeader";
import { AttentionAlertsPanel } from "@/components/admin/dashboard/AttentionAlertsPanel";
import { DashboardMetricCard } from "@/components/admin/dashboard/DashboardMetricCard";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { OperationalStatusPanel } from "@/components/admin/dashboard/OperationalStatusPanel";
import { RecentActivityPanel } from "@/components/admin/dashboard/RecentActivityPanel";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { TrafficConversionPanel } from "@/components/admin/dashboard/TrafficConversionPanel";
import { UpcomingEventsCompact } from "@/components/admin/dashboard/UpcomingEventsCompact";
import { formatDashboardCurrency } from "@/lib/admin/dashboard/formatters";
import {
  buildConversionFunnel,
  buildDashboardKpis,
  buildOperationalStatusRows,
  computeSeriesTrend,
} from "@/lib/admin/dashboard/metrics";
import type { AdminDashboardData } from "@/lib/admin/dashboard/types";
import { ROUTES } from "@/lib/constants/routes";

type AdminDashboardProps = {
  data: AdminDashboardData;
};

export function AdminDashboard({ data }: AdminDashboardProps) {
  const kpis = buildDashboardKpis(data);
  const operationalRows = buildOperationalStatusRows(data);
  const funnel = buildConversionFunnel(data);
  const revenueTrend = computeSeriesTrend(
    data.revenueSeries.map((point) => point.total),
  );
  const alertCount = data.alerts.length;

  return (
    <>
      <AdminDashboardHeader data={data} />

      <div className="bg-zinc-950 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((metric) => (
              <DashboardMetricCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                sublabel={metric.sublabel}
                tone={metric.tone}
                badge={metric.badge}
                trendPercent={metric.trendPercent}
                sparkline={metric.sparkline}
              />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <DashboardSection
              title="Recaudación"
              description="Solo operaciones confirmadas del período seleccionado."
              className="xl:col-span-2"
            >
              <RevenueChart
                series={data.revenueSeries}
                rangeLabel={data.rangeLabel}
                totalRevenue={data.revenue.total}
                trendPercent={revenueTrend}
              />
            </DashboardSection>

            <DashboardSection title="Estado operativo" compact>
              <OperationalStatusPanel rows={operationalRows} />
            </DashboardSection>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <DashboardSection
              title="Tráfico y conversión"
              description="Visitas, embudo y señales de conversión del período."
            >
              <TrafficConversionPanel traffic={data.traffic} funnel={funnel} />
            </DashboardSection>

            <DashboardSection
              title={`Necesita atención${alertCount > 0 ? ` · ${alertCount}` : ""}`}
              description="Alertas ordenadas por criticidad con acceso directo."
            >
              <AttentionAlertsPanel alerts={data.alerts} />
            </DashboardSection>
          </section>

          <DashboardSection
            title="Actividad reciente"
            description="Historial operativo compacto de ventas, reservas y consumiciones."
          >
            <RecentActivityPanel items={data.recentActivity} />
          </DashboardSection>

          <section className="grid gap-4 xl:grid-cols-2">
            <DashboardSection
              title="Próximos eventos"
              description={
                data.nextEvent
                  ? `Siguiente: ${data.nextEvent.event.name}`
                  : "Calendario operativo de eventos activos y próximos."
              }
            >
              <UpcomingEventsCompact rows={data.upcomingEvents} />
            </DashboardSection>

            <DashboardSection
              title="Resumen económico"
              description="Indicadores financieros globales del negocio."
            >
              <div className="grid grid-cols-2 gap-3">
                <SummaryTile
                  label="Ganancia real"
                  value={formatDashboardCurrency(data.globalFinancial.realProfit)}
                />
                <SummaryTile
                  label="Ganancia proyectada"
                  value={formatDashboardCurrency(data.globalFinancial.projectedProfit)}
                />
                <SummaryTile
                  label="Gastos pagados"
                  value={formatDashboardCurrency(data.globalFinancial.expensesPaid)}
                />
                <SummaryTile
                  label="Ventas por confirmar"
                  value={String(data.pendingSales.totalOperations)}
                  href={ROUTES.adminVentas}
                />
              </div>
            </DashboardSection>
          </section>

          {data.recentEvents.length > 0 ? (
            <DashboardSection
              title="Eventos recientes"
              description="Últimos eventos finalizados con métricas resumidas."
            >
              <UpcomingEventsCompact rows={data.recentEvents} />
            </DashboardSection>
          ) : null}

          {data.topEventsByViews.length > 0 ? (
            <DashboardSection
              title="Eventos más vistos"
              description={data.traffic.conversionFormula}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                      <th className="py-2 pr-4 font-semibold">Evento</th>
                      <th className="py-2 pr-4 font-semibold">Visitas</th>
                      <th className="py-2 pr-4 font-semibold">Clics</th>
                      <th className="py-2 pr-4 font-semibold">Ventas</th>
                      <th className="py-2 font-semibold">Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topEventsByViews.map((row) => (
                      <tr
                        key={row.eventId}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-medium text-zinc-100">
                          {row.eventName}
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-300">
                          {row.visits.toLocaleString("es-AR")}
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-300">
                          {row.ticketClicks.toLocaleString("es-AR")}
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-300">
                          {row.confirmedPurchases.toLocaleString("es-AR")}
                        </td>
                        <td className="py-2.5 text-zinc-300">
                          {row.conversionPercent != null
                            ? `${row.conversionPercent.toLocaleString("es-AR")}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardSection>
          ) : null}

          <section className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
            <Link
              href={ROUTES.adminEventos}
              className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-400"
            >
              Gestionar eventos
            </Link>
            <Link
              href={ROUTES.adminVentas}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/5"
            >
              Ver ventas
            </Link>
            <Link
              href={ROUTES.home}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Ir al sitio público
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

function SummaryTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-zinc-50">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
