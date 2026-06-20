import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketReservationForm } from "@/components/ticket-sales/TicketReservationForm";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { EventSaleChannelPicker } from "@/components/events/EventSaleChannelPicker";
import { getProfile } from "@/lib/auth/getProfile";
import { ROUTES } from "@/lib/constants/routes";
import { resolveEventPublicAccess } from "@/lib/events/access";
import { CommunityEventGate } from "@/components/events/CommunityEventGate";
import { formatEventDateTime } from "@/lib/events/utils";
import {
  getValidExternalTicketUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";
import { getPublicEventKiosk } from "@/lib/kiosk/queries";
import { getPublishedEventReservationContext } from "@/lib/ticket-sales/queries";
import {
  isReservationSaleEnabled,
  isSaleWebEnabled,
} from "@/lib/ticket-sales/utils";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import { getPublicTicketTypeDisplay } from "@/lib/tickets/publicDisplay";
import { createClient } from "@/lib/supabase/server";

type EntradasPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticketType?: string; canal?: string }>;
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
  const { ticketType: initialTicketTypeId, canal } = await searchParams;
  const purchaseChannel = canal === "reserva" ? "reserva" : "web";
  const context = await getPublishedEventReservationContext(slug);

  if (!context) {
    notFound();
  }

  const { event, ticketTypes } = context;
  const channels = resolveSaleChannels(event);
  const webAllowed = isSaleWebEnabled(event);
  const reservationAllowed = isReservationSaleEnabled(event);
  const channelAllowed =
    purchaseChannel === "reserva" ? reservationAllowed : webAllowed;

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

  if (!webAllowed && !reservationAllowed) {
    const externalUrl = getValidExternalTicketUrl(event);

    return (
      <PageContainer size="sm">
        <PublicButton href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
          ← Volver al evento
        </PublicButton>
        <PublicCard padding="lg" className="text-center">
          <h1 className="public-heading text-2xl font-black">{event.name}</h1>
          <p className="mt-4 public-text-muted">
            La compra o reserva web no está habilitada para este evento.
          </p>
          {externalUrl ? (
            <PublicButton
              href={externalUrl}
              className="mt-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comprar en sitio externo
            </PublicButton>
          ) : (
            <EventSaleChannelPicker
              event={event}
              hasTicketTypes={allActiveTicketTypes.length > 0}
              className="mt-6 text-left"
            />
          )}
        </PublicCard>
      </PageContainer>
    );
  }

  if (!channelAllowed) {
    return (
      <PageContainer size="sm">
        <PublicButton href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
          ← Volver al evento
        </PublicButton>
        <PublicCard padding="lg" className="text-center">
          <h1 className="public-heading text-2xl font-black">{event.name}</h1>
          <p className="mt-4 public-text-muted">
            {purchaseChannel === "reserva"
              ? "La reserva no está habilitada para este evento."
              : "La venta web no está habilitada para este evento."}
          </p>
          <EventSaleChannelPicker
            event={event}
            hasTicketTypes={allActiveTicketTypes.length > 0}
            className="mt-6 text-left"
          />
        </PublicCard>
      </PageContainer>
    );
  }

  const sectionLabel =
    purchaseChannel === "reserva" ? "Reservar entradas" : "Comprar entradas";
  const sectionTitle =
    purchaseChannel === "reserva"
      ? "Reservá tu entrada"
      : "Comprá tu entrada";

  return (
    <PageContainer size="sm">
      <PublicButton href={ROUTES.evento(slug)} variant="ghost" size="sm" className="mb-6">
        ← Volver al evento
      </PublicButton>

      <SectionHeading
        label={sectionLabel}
        title={sectionTitle}
        subtitle={dateTimeLabel}
        className="mb-8"
      />

      {purchaseChannel === "reserva" ? (
        <p className="public-muted-box mb-6 text-sm">
          Tu reserva quedará pendiente de confirmación de pago. No equivale a
          una venta confirmada hasta que el equipo la apruebe.
        </p>
      ) : null}

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
          {!profile ? (
            <PublicCard padding="md" className="public-alert-warning">
              <p className="text-sm">
                Para {purchaseChannel === "reserva" ? "reservar" : "comprar"} necesitás
                una cuenta de cliente.{" "}
                <Link href={ROUTES.login} className="public-link font-semibold">
                  Iniciá sesión
                </Link>{" "}
                o registrate y volvé a esta página.
              </p>
            </PublicCard>
          ) : (
            <TicketReservationForm
              event={event}
              ticketTypes={ticketTypes}
              kioskProducts={
                publicKiosk.presaleEnabled && publicKiosk.hasSellableProducts
                  ? publicKiosk.products
                  : []
              }
              isLoggedIn
              defaultBuyerName={profile.full_name ?? ""}
              initialTicketTypeId={initialTicketTypeId}
              purchaseChannel={purchaseChannel}
            />
          )}
        </>
      )}

      {(channels.externalSaleEnabled || channels.saleWhatsappEnabled) &&
      (webAllowed || reservationAllowed) ? (
        <EventSaleChannelPicker
          event={event}
          hasTicketTypes={ticketTypes.length > 0}
          className="mt-8"
        />
      ) : null}
    </PageContainer>
  );
}
