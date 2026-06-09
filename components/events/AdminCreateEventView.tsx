import { AdminHeader } from "@/components/layout/AdminHeader";
import { EventForm } from "@/components/events/EventForm";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { createEventFormAction } from "@/lib/events/actions";
import { requireAdminPage } from "@/lib/events/queries";

export async function AdminCreateEventView() {
  await requireAdminPage();

  return (
    <>
      <AdminHeader
        title="Crear evento"
        description="Completá los datos del evento. Las imágenes por ahora son URLs externas."
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <Button href={ROUTES.adminEventos} variant="ghost" size="sm">
            ← Volver al listado
          </Button>
        </div>

        <EventForm
          action={createEventFormAction}
          submitLabel="Crear evento"
          autoSlug
        />
      </div>
    </>
  );
}
