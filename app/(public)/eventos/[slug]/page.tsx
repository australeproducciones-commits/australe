import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPageAnalytics } from "@/components/analytics/EventPageAnalytics";
import { EventScadaDetailsCard } from "@/components/events/EventScadaDetailsCard";
import { EventPublicTicketTypes } from "@/components/events/EventPublicTicketTypes";
import { EventSaleChannelPicker } from "@/components/events/EventSaleChannelPicker";
import { PublicEventKioskSection } from "@/components/kiosk/PublicEventKioskSection";
import { EventFlyer } from "@/components/events/EventFlyer";
import {
  EventPriceListLink,
  EventTicketActions,
  hasPublicSaleChannels,
} from "@/components/events/EventTicketActions";
import { PageContainer, PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { isEventContent } from "@/lib/events/contentRules";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { resolveEventPublicAccess } from "@/lib/events/access";
import { CommunityEventGate } from "@/components/events/CommunityEventGate";
import { createClient } from "@/lib/supabase/server";
import { getPublicEventKiosk } from "@/lib/kiosk/queries";
import { getWhatsAppSaleUrl } from "@/lib/events/saleChannels";
import { EventStoreMerchSection } from "@/components/store/EventStoreMerchSection";
import { EventStreamingSection } from "@/components/streaming/EventStreamingSection";
import { getPublicStreamForEventPage } from "@/lib/streaming/queries";
import { getEventStoreMerchSummary } from "@/lib/store/queries";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";

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

  if (!event || !isEventContent(event)) {
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

  const [activeTicketTypes, publicKiosk, isCommunityMember, eventStream, storeMerch] =
    await Promise.all([
    getActiveTicketTypesForPublishedEvent(event.id, event.status),
    getPublicEventKiosk(event.id),
    isActiveCommunityMember(profile?.id),
    getPublicStreamForEventPage(event.id),
    getEventStoreMerchSummary(event.id),
  ]);
  const isLoggedIn = profile !== null;
  const hasTicketTypes = activeTicketTypes.length > 0;
  const whatsappUrl = getWhatsAppSaleUrl(event);

  return (
    <PageContainer>
      <EventPageAnalytics eventId={event.id} slug={event.slug} />
      <PublicButton href={ROUTES.eventos} variant="ghost" size="sm" className="mb-6">
        ← Volver a eventos
      </PublicButton>

      <EventFlyer event={event} purpose="hero" className="mb-8" />

      <EventScadaDetailsCard event={event} />

      {eventStream ? <EventStreamingSection stream={eventStream} /> : null}

      {!hasTicketTypes && hasPublicSaleChannels(event, false) ? (
        <div className="mt-8">
          <EventTicketActions event={event} hasTicketTypes={false} />
        </div>
      ) : null}

      {!hasTicketTypes ? (
        <div className="mt-8">
          <EventPriceListLink slug={event.slug} />
        </div>
      ) : null}

      {hasTicketTypes ? (
        <EventPublicTicketTypes
          eventId={event.id}
          eventSlug={event.slug}
          event={event}
          ticketTypes={activeTicketTypes}
        />
      ) : null}

      {hasTicketTypes && whatsappUrl ? (
        <EventSaleChannelPicker
          event={event}
          hasTicketTypes
          onlyChannels={["whatsapp"]}
        />
      ) : null}

      {hasTicketTypes ? (
        <div className="mt-4">
          <EventPriceListLink slug={event.slug} />
        </div>
      ) : null}

      {publicKiosk.presaleEnabled && publicKiosk.hasSellableProducts ? (
        <PublicEventKioskSection
          eventId={event.id}
          eventSlug={event.slug}
          products={publicKiosk.products}
          isLoggedIn={isLoggedIn}
          isCommunityMember={isCommunityMember}
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

      {storeMerch.hasMerch && storeMerch.showBlock ? (
        <EventStoreMerchSection
          eventSlug={event.slug}
          eventName={event.name}
          products={storeMerch.featuredProducts}
        />
      ) : null}
    </PageContainer>
  );
}
