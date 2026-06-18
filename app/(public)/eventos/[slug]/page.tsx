import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPageAnalytics } from "@/components/analytics/EventPageAnalytics";
import { EventPublicTicketTypes } from "@/components/events/EventPublicTicketTypes";
import { PublicEventKioskSection } from "@/components/kiosk/PublicEventKioskSection";
import { EventFlyer, EventPoster } from "@/components/events/EventFlyer";
import { EventPriceListLink } from "@/components/events/EventTicketActions";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getProfile } from "@/lib/auth/getProfile";
import { resolveEventPublicAccess } from "@/lib/events/access";
import { CommunityEventGate } from "@/components/events/CommunityEventGate";
import { createClient } from "@/lib/supabase/server";
import { getPublicEventKiosk } from "@/lib/kiosk/queries";
import { formatEventDateTime } from "@/lib/events/utils";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import {
  formatTicketPrice,
  getMinPublicPrice,
} from "@/lib/tickets/utils";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";

type EventoPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EventoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  return { title: event?.name ?? "Evento" };
}

export default async function EventoPage({ params }: EventoPageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const access = await resolveEventPublicAccess(event, profile?.id ?? null);

  if (access === "not_found") {
    notFound();
  }

  if (access === "community_gate") {
    return <CommunityEventGate />;
  }

  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  const [activeTicketTypes, publicKiosk] = await Promise.all([
    getActiveTicketTypesForPublishedEvent(event.id, event.status),
    getPublicEventKiosk(event.id),
  ]);
  const minPrice = getMinPublicPrice(activeTicketTypes);

  return (
    <PageContainer>
      <EventPageAnalytics eventId={event.id} slug={event.slug} />
      <PublicButton href={ROUTES.eventos} variant="ghost" size="sm" className="mb-6">
        ← Volver a eventos
      </PublicButton>

      <EventFlyer event={event} purpose="hero" className="mb-8" />

      <PublicCard padding="lg">
        <SectionHeading
          label="Evento"
          title={event.name}
          subtitle={dateTimeLabel}
          titleClassName="mt-3"
        />

        <EventPoster event={event} className="mt-8" />

        <div className="mt-6 grid gap-3 text-sm">
          {event.location_name ? (
            <div className="public-surface-row">
              <span className="public-text-soft">Lugar</span>
              <span className="public-heading font-medium">{event.location_name}</span>
            </div>
          ) : null}
          {event.address ? (
            <div className="public-surface-row">
              <span className="shrink-0 public-text-soft">Dirección</span>
              <a
                href={getGoogleMapsSearchUrl(event.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="public-link text-right font-medium"
              >
                {event.address}
              </a>
            </div>
          ) : null}
          {event.capacity != null ? (
            <div className="public-surface-row">
              <span className="public-text-soft">Capacidad</span>
              <span className="public-heading font-medium">{event.capacity}</span>
            </div>
          ) : null}
        </div>

        {event.description ? (
          <p className="mt-8 whitespace-pre-line leading-7 public-text-muted">
            {event.description}
          </p>
        ) : null}

        {minPrice != null && activeTicketTypes.length > 0 ? (
          <p className="public-price-banner mt-4">
            Entradas disponibles desde {formatTicketPrice(minPrice)}
          </p>
        ) : null}

        {activeTicketTypes.length === 0 ? (
          <div className="mt-8">
            <EventPriceListLink slug={event.slug} />
          </div>
        ) : null}
      </PublicCard>

      <EventPublicTicketTypes
        eventId={event.id}
        eventSlug={event.slug}
        ticketSaleMode={event.ticket_sale_mode}
        externalTicketUrl={event.external_ticket_url}
        ticketTypes={activeTicketTypes}
      />

      {activeTicketTypes.length > 0 ? (
        <div className="mt-4">
          <EventPriceListLink slug={event.slug} />
        </div>
      ) : null}

      {publicKiosk.presaleEnabled && publicKiosk.hasSellableProducts ? (
        <PublicEventKioskSection
          eventId={event.id}
          eventSlug={event.slug}
          products={publicKiosk.products}
        />
      ) : publicKiosk.presaleEnabled && publicKiosk.hasListedProducts ? (
        <PublicCard padding="lg" className="mt-8 text-center">
          <h2 className="public-heading text-xl font-bold">
            Preventa de consumisiones
          </h2>
          <p className="mt-3 text-sm public-text-muted">
            Las consumisiones están agotadas por el momento.
          </p>
        </PublicCard>
      ) : null}
    </PageContainer>
  );
}
