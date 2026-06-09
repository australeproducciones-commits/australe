import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCreateEventView } from "@/components/events/AdminCreateEventView";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { EventForm } from "@/components/events/EventForm";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { updateEventFormAction } from "@/lib/events/actions";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { eventToFormInput } from "@/lib/events/utils";

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
          {event.status === "published" ? (
            <Button href={ROUTES.evento(event.slug)} variant="outline" size="sm">
              Ver público
            </Button>
          ) : null}
        </div>

        <EventForm
          initialValues={eventToFormInput(event)}
          action={updateAction}
          submitLabel="Guardar cambios"
        />
      </div>
    </>
  );
}
