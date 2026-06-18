import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketReservationForm } from "@/components/ticket-sales/TicketReservationForm";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { getProfile } from "@/lib/auth/getProfile";
import { TICKET_SALE_MODE } from "@/lib/constants/event-status";
import { ROUTES } from "@/lib/constants/routes";
import { resolveEventPublicAccess } from "@/lib/events/access";
import { CommunityEventGate } from "@/components/events/CommunityEventGate";
import { formatEventDateTime } from "@/lib/events/utils";
import { getPublicEventKiosk } from "@/lib/kiosk/queries";
import { getPublishedEventReservationContext } from "@/lib/ticket-sales/queries";
import { isInternalSaleEnabled } from "@/lib/ticket-sales/utils";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import { getPublicTicketTypeDisplay } from "@/lib/tickets/publicDisplay";
import { createClient } from "@/lib/supabase/server";

type EntradasPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticketType?: string }>;
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

export default async function EntradasPage({
  params,
  searchParams,
}: EntradasPageProps) {
  const { slug } = await params;
  const { ticketType: initialTicketTypeId } = await searchParams;
  const context = await getPublishedEventReservationContext(slug);

  if (!context) {
    notFound();
  }

  const { event, ticketTypes } = context;
  const [supabase, publicKiosk, allActiveTicketTypes] = await Promise.all([
    createClient(),
    getPublicEventKiosk(context.event.id),
    getActiveTicketTypesForPublishedEvent(event.id, event.status),
  ]);
  const profile = await getProfile(supabase);
  const access = await resolveEventPublicAccess(event, profile?.id ?? null);

  if (access === "not_found") {
    notFound();
  }

  if (access === "community_gate") {
    return <CommunityEventGate />;
  }

  const selectedTicketType = initialTicketTypeId
    ? allActiveTicketTypes.find((ticketType) => ticketType.id === initialTicketTypeId)
    : null;
  const selectedTicketUnavailable =
    selectedTicketType != null &&
    !ticketTypes.some((ticketType) => ticketType.id === selectedTicketType.id);
  const selectedTicketStatus = selectedTicketType
    ? getPublicTicketTypeDisplay(selectedTicketType).statusLabel
    : null;

  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  if (!isInternalSaleEnabled(event.ticket_sale_mode)) {
    return (
      <PageContainer size="sm">
        <PublicButton href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
          ← Volver al evento
        </PublicButton>
        <PublicCard padding="lg" className="text-center">
          <h1 className="public-heading text-2xl font-black">{event.name}</h1>
          <p className="mt-4 public-text-muted">
            La venta interna no está habilitada para este evento.
          </p>
          {event.ticket_sale_mode === TICKET_SALE_MODE.EXTERNAL &&
          event.external_ticket_url ? (
            <PublicButton
              href={event.external_ticket_url}
              className="mt-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comprar en sitio externo
            </PublicButton>
          ) : null}
        </PublicCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      <PublicButton href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
        ← Volver al evento
      </PublicButton>

      <SectionHeading
        label="Reservar entradas"
        title={event.name}
        subtitle={dateTimeLabel}
        className="mb-8"
      />

      {ticketTypes.length === 0 ? (
        <PublicCard padding="lg" className="text-center">
          <h2 className="public-heading text-xl font-bold">
            No hay entradas disponibles
          </h2>
          <p className="mt-2 text-sm public-text-muted">
            Por ahora no hay tipos de entrada activos o están fuera de la
            ventana de venta.
          </p>
          <PublicButton href={ROUTES.evento(slug)} variant="outline" className="mt-6">
            Volver al evento
          </PublicButton>
        </PublicCard>
      ) : (
        <>
          {selectedTicketUnavailable ? (
            <PublicCard padding="md" className="public-alert-warning mb-6">
              <p className="text-sm">
                La entrada{" "}
                <span className="font-semibold">{selectedTicketType?.name}</span>{" "}
                no está disponible para compra en este momento
                {selectedTicketStatus ? ` (${selectedTicketStatus.toLowerCase()}).` : "."}
              </p>
            </PublicCard>
          ) : null}
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
          initialTicketTypeId={initialTicketTypeId}
        />
        </>
      )}
    </PageContainer>
  );
}
