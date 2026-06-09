import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminTicketsList } from "@/components/ticket-sales/AdminTicketsList";
import { Button } from "@/components/ui/Button";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { ROUTES } from "@/lib/constants/routes";
import {
  getEventForAdminSales,
  getTicketsByEventIdForAdmin,
} from "@/lib/ticket-sales/queries";

type AdminEventoVentasPageProps = {
  params: Promise<{ id: string }>;
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
}: AdminEventoVentasPageProps) {
  const { id } = await params;

  if (isReservedEventAdminSegment(id) || !isUuid(id)) {
    notFound();
  }

  const event = await getEventForAdminSales(id);

  if (!event) {
    notFound();
  }

  const tickets = await getTicketsByEventIdForAdmin(id);

  return (
    <>
      <AdminHeader
        title={`Ventas · ${event.name}`}
        description="Reservas web y confirmación manual de pagos para este evento."
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
          <Button href={ROUTES.adminEventos} variant="outline" size="sm">
            Listado de eventos
          </Button>
        </div>

        <AdminTicketsList tickets={tickets} />
      </div>
    </>
  );
}
