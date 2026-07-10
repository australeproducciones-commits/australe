import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminStreamingPanel } from "@/components/streaming/AdminStreamingPanel";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { getAdminStreamsByEventId } from "@/lib/streaming/queries";

type AdminEventoStreamingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminEventoStreamingPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = isUuid(id) ? await getEventByIdForAdmin(id) : null;
  return {
    title: event ? `Admin · Streaming · ${event.name}` : "Admin · Streaming",
  };
}

export default async function AdminEventoStreamingPage({
  params,
}: AdminEventoStreamingPageProps) {
  const { id } = await params;

  if (isReservedEventAdminSegment(id) || !isUuid(id)) {
    notFound();
  }

  const event = await getEventByIdForAdmin(id);
  if (!event) {
    notFound();
  }

  const streams = await getAdminStreamsByEventId(event.id);

  return (
    <>
      <AdminHeader
        title={`Streaming · ${event.name}`}
        description="Configurá la transmisión en vivo gratuita de este evento."
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap gap-3">
          <Button href={ROUTES.adminEvento(event.id)} variant="ghost" size="sm">
            ← Volver al evento
          </Button>
          <Button href={ROUTES.adminEventoEntradas(event.id)} variant="outline" size="sm">
            Tipos de entradas
          </Button>
          <Button href={ROUTES.adminEventoVentas(event.id)} variant="outline" size="sm">
            Ventas / reservas
          </Button>
          {event.status === "published" ? (
            <Button href={ROUTES.eventoEnVivo(event.slug)} variant="outline" size="sm" target="_blank">
              Ver /en-vivo del evento
            </Button>
          ) : null}
        </div>

        <AdminStreamingPanel
          eventId={event.id}
          eventSlug={event.slug}
          streams={streams}
        />
      </div>
    </>
  );
}
