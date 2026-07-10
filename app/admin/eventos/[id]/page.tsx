import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCreateEventView } from "@/components/events/AdminCreateEventView";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { EventForm } from "@/components/events/EventForm";
import { EventSalesQrAdminCard } from "@/components/events/EventSalesQrAdminCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import { canHaveGallery, canHaveStreaming } from "@/lib/events/contentRules";
import { updateEventFormAction } from "@/lib/events/actions";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { eventToFormInput } from "@/lib/events/utils";
import { getActiveTicketTypesByEventId } from "@/lib/tickets/queries";

type AdminEditEventoPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminEditEventoPageProps): Promise<Metadata> {
  const { id } = await params;

  if (isReservedEventAdminSegment(id)) {
    return { title: "Admin · Crear evento" };
  }

  const event = await getEventByIdForAdmin(id);
  return { title: event ? `Admin · ${event.name}` : "Admin · Evento" };
}

export default async function AdminEditEventoPage({
  params,
}: AdminEditEventoPageProps) {
  const { id } = await params;

  if (isReservedEventAdminSegment(id)) {
    return <AdminCreateEventView />;
  }

  if (!isUuid(id)) {
    notFound();
  }

  const event = await getEventByIdForAdmin(id);

  if (!event) {
    notFound();
  }

  const activeTicketTypes = await getActiveTicketTypesByEventId(event.id);

  const updateAction = updateEventFormAction.bind(null, event.id);

  return (
    <>
      <AdminHeader
        title="Editar evento"
        description={`Actualizá la información de ${event.name}.`}
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <Button href={ROUTES.adminEventos} variant="ghost" size="sm">
            ← Volver al listado
          </Button>
          <Button
            href={ROUTES.adminEventoEntradas(event.id)}
            variant="secondary"
            size="sm"
          >
            Tipos de entradas
          </Button>
          <Button
            href={ROUTES.adminEventoVentas(event.id)}
            variant="outline"
            size="sm"
          >
            Ventas / reservas
          </Button>
          <Button
            href={ROUTES.adminEventoKiosco(event.id)}
            variant="outline"
            size="sm"
          >
            Kiosco / Consumisiones
          </Button>
          {canHaveStreaming(event) ? (
            <Button
              href={ROUTES.adminEventoStreaming(event.id)}
              variant="outline"
              size="sm"
            >
              Streaming
            </Button>
          ) : null}
          {canHaveGallery(event) ? (
            <Button
              href={ROUTES.adminEventoGaleria(event.id)}
              variant="outline"
              size="sm"
            >
              Galería
            </Button>
          ) : null}
          <Button
            href={ROUTES.adminEventoGestion(event.id)}
            variant="secondary"
            size="sm"
          >
            Gestión
          </Button>
          {event.status === "published" ? (
            <Button href={ROUTES.evento(event.slug)} variant="outline" size="sm">
              Ver público
            </Button>
          ) : null}
        </div>

        <EventSalesQrAdminCard event={event} />

        <Card padding="sm" className="mb-6 border-purple-400/20 bg-purple-400/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-white">Kiosco / Consumisiones</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Configurá productos, stock, preventa y ventas de consumisiones
                para este evento.
              </p>
            </div>
            <Button href={ROUTES.adminEventoKiosco(event.id)} size="sm">
              Ir al kiosco
            </Button>
          </div>
        </Card>

        <EventForm
          initialValues={eventToFormInput(event)}
          action={updateAction}
          submitLabel="Guardar cambios"
          activeTicketTypeCount={activeTicketTypes.length}
        />
      </div>
    </>
  );
}
