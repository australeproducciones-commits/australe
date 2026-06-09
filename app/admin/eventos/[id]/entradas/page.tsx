import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { TicketTypeForm } from "@/components/tickets/TicketTypeForm";
import { TicketTypesList } from "@/components/tickets/TicketTypesList";
import { Button } from "@/components/ui/Button";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { ROUTES } from "@/lib/constants/routes";
import { createTicketTypeFormAction } from "@/lib/tickets/actions";
import { getEventWithTicketTypesForAdmin } from "@/lib/tickets/queries";

type AdminEventoEntradasPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminEventoEntradasPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = isUuid(id) ? await getEventWithTicketTypesForAdmin(id) : null;
  return {
    title: data
      ? `Admin · Entradas · ${data.event.name}`
      : "Admin · Tipos de entrada",
  };
}

export default async function AdminEventoEntradasPage({
  params,
}: AdminEventoEntradasPageProps) {
  const { id } = await params;

  if (isReservedEventAdminSegment(id) || !isUuid(id)) {
    notFound();
  }

  const data = await getEventWithTicketTypesForAdmin(id);

  if (!data) {
    notFound();
  }

  const { event, ticketTypes } = data;
  const createAction = createTicketTypeFormAction.bind(null, event.id);
  const nextSortOrder = ticketTypes.length;

  return (
    <>
      <AdminHeader
        title={`Entradas · ${event.name}`}
        description="Tipos de entrada, precios, stock y ventanas de venta para este evento."
      />

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap gap-3">
          <Button href={ROUTES.adminEvento(event.id)} variant="ghost" size="sm">
            ← Volver al evento
          </Button>
          <Button href={ROUTES.adminEventos} variant="outline" size="sm">
            Listado de eventos
          </Button>
        </div>

        <TicketTypeForm
          title="Nuevo tipo de entrada"
          action={createAction}
          submitLabel="Crear tipo de entrada"
          initialValues={{
            name: "",
            description: "",
            public_price: "0",
            community_price: "0",
            stock_total: "",
            max_per_order: "10",
            sale_start_at: "",
            sale_end_at: "",
            is_active: true,
            sort_order: String(nextSortOrder),
          }}
        />

        <div>
          <h2 className="mb-4 text-lg font-bold text-white">
            Tipos de entrada ({ticketTypes.length})
          </h2>
          <TicketTypesList ticketTypes={ticketTypes} />
        </div>
      </div>
    </>
  );
}
