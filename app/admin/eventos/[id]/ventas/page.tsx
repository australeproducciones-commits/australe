import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminEventSalesDashboard } from "@/components/ticket-sales/AdminEventSalesDashboard";
import { AdminEventVentasPanel } from "@/components/ticket-sales/AdminEventVentasPanel";
import { Button } from "@/components/ui/Button";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDateTime } from "@/lib/events/utils";
import { buildEventVentasDashboard } from "@/lib/ticket-sales/eventVentasStats";
import {
  getEventForAdminSales,
  getTicketsByEventIdForAdmin,
} from "@/lib/ticket-sales/queries";
import { getTicketTypesByEventIdForAdmin } from "@/lib/tickets/queries";

type AdminEventoVentasPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string }>;
};

export async function generateMetadata({
  params,
}: AdminEventoVentasPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = isUuid(id) ? await getEventForAdminSales(id) : null;
  return {
    title: event
      ? `Admin · Ventas · ${event.name}`
      : "Admin · Ventas / reservas",
  };
}

export default async function AdminEventoVentasPage({
  params,
  searchParams,
}: AdminEventoVentasPageProps) {
  const { id } = await params;
  const { estado } = await searchParams;
  const initialFilter =
    estado === "pendiente" ? ("pending" as const) : ("all" as const);

  if (isReservedEventAdminSegment(id) || !isUuid(id)) {
    notFound();
  }

  const [event, tickets, ticketTypes] = await Promise.all([
    getEventForAdminSales(id),
    getTicketsByEventIdForAdmin(id),
    getTicketTypesByEventIdForAdmin(id),
  ]);

  if (!event) {
    notFound();
  }

  const eventDateLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    null,
  );

  const dashboard = buildEventVentasDashboard(
    tickets,
    ticketTypes,
    event.event_date,
    event.start_time,
    eventDateLabel,
  );

  return (
    <>
      <AdminHeader
        title={`Ventas · ${event.name}`}
        description="Resumen de ventas, reservas y recaudación de este evento."
      />

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap gap-3">
          <Button href={ROUTES.adminEvento(event.id)} variant="ghost" size="sm">
            ← Volver al evento
          </Button>
          <Button
            href={ROUTES.adminEventoEntradas(event.id)}
            variant="outline"
            size="sm"
          >
            Tipos de entradas
          </Button>
          <Button
            href={ROUTES.adminEventoKiosco(event.id)}
            variant="outline"
            size="sm"
          >
            Kiosco / Consumisiones
          </Button>
          <Button href={ROUTES.adminEventos} variant="outline" size="sm">
            Listado de eventos
          </Button>
        </div>

        <AdminEventSalesDashboard dashboard={dashboard} />

        <div>
          <h2 className="mb-4 text-lg font-bold text-white">
            Detalle de entradas
          </h2>
          <AdminEventVentasPanel
            tickets={tickets}
            eventName={event.name}
            eventDate={event.event_date}
            startTime={event.start_time}
            dashboard={dashboard}
            initialFilter={initialFilter}
          />
        </div>
      </div>
    </>
  );
}
