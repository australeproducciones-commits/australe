import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketReservationForm } from "@/components/ticket-sales/TicketReservationForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getProfile } from "@/lib/auth/getProfile";
import { TICKET_SALE_MODE } from "@/lib/constants/event-status";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDateTime } from "@/lib/events/utils";
import { getPublicEventKiosk } from "@/lib/kiosk/queries";
import { getPublishedEventReservationContext } from "@/lib/ticket-sales/queries";
import { isInternalSaleEnabled } from "@/lib/ticket-sales/utils";
import { createClient } from "@/lib/supabase/server";

type EntradasPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EntradasPageProps): Promise<Metadata> {
  const { slug } = await params;
  const context = await getPublishedEventReservationContext(slug);
  return {
    title: context
      ? `Entradas · ${context.event.name}`
      : `Entradas: ${slug}`,
  };
}

export default async function EntradasPage({ params }: EntradasPageProps) {
  const { slug } = await params;
  const context = await getPublishedEventReservationContext(slug);

  if (!context) {
    notFound();
  }

  const { event, ticketTypes } = context;
  const [supabase, publicKiosk] = await Promise.all([
    createClient(),
    getPublicEventKiosk(context.event.id),
  ]);
  const profile = await getProfile(supabase);

  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  if (!isInternalSaleEnabled(event.ticket_sale_mode)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Button href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
          ← Volver al evento
        </Button>
        <Card padding="lg" className="text-center">
          <h1 className="text-2xl font-black text-white">{event.name}</h1>
          <p className="mt-4 text-zinc-400">
            La venta interna no está habilitada para este evento.
          </p>
          {event.ticket_sale_mode === TICKET_SALE_MODE.EXTERNAL &&
          event.external_ticket_url ? (
            <Button
              href={event.external_ticket_url}
              className="mt-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comprar en sitio externo
            </Button>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Button href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
        ← Volver al evento
      </Button>

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
          Reservar entradas
        </p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-2 text-purple-200">{dateTimeLabel}</p>
      </div>

      {ticketTypes.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-xl font-bold text-white">
            No hay entradas disponibles
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Por ahora no hay tipos de entrada activos o están fuera de la
            ventana de venta.
          </p>
          <Button href={ROUTES.evento(slug)} variant="outline" className="mt-6">
            Volver al evento
          </Button>
        </Card>
      ) : (
        <TicketReservationForm
          event={event}
          ticketTypes={ticketTypes}
          kioskProducts={
            publicKiosk.presaleEnabled && publicKiosk.hasSellableProducts
              ? publicKiosk.products
              : []
          }
          isLoggedIn={profile !== null}
          defaultBuyerName={profile?.full_name ?? ""}
        />
      )}
    </div>
  );
}
