"use client";

import Link from "next/link";
import { EventImage } from "@/components/events/EventImage";
import { EventInfoBadges } from "@/components/events/EventInfoBadges";
import { PublicButton } from "@/components/ui/public";
import { isPromotionContent } from "@/lib/events/contentRules";
import { buildEventHeroBadges } from "@/lib/events/eventInfoBadges";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import type { Event } from "@/lib/events/types";
import {
  getValidExternalTicketUrl,
  getWhatsAppSaleUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDateShort } from "@/lib/events/utils";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";
import { cn } from "@/lib/utils/cn";

type HomeFeaturedEventSlideProps = {
  event: Event;
  priority?: boolean;
  storeMerch?: EventStoreMerchContext | null;
  hasTicketTypes?: boolean;
};

type HeroAction = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  primary?: boolean;
};

export function HomeFeaturedEventSlide({
  event,
  priority = false,
  storeMerch = null,
  hasTicketTypes = true,
}: HomeFeaturedEventSlideProps) {
  const isPromotion = isPromotionContent(event);
  const badges = buildEventHeroBadges({
    event,
    storeMerch,
    kioskPresaleEnabled: false,
  });
  const saleActions = isPromotion
    ? buildPromotionActions(event)
    : buildSaleActions(event, hasTicketTypes);
  const eventHref = event.slug?.trim() ? ROUTES.evento(event.slug) : null;
  const experienceLabel = isPromotion
    ? event.featured_ticket_label?.trim() || "Promoción"
    : "Próximo evento";

  return (
    <article
      className="home-hero-slide home-hero-slide--event"
      aria-label={isPromotion ? `Promoción ${event.name}` : `Evento ${event.name}`}
    >
      <div className="absolute inset-0">
        <EventImage
          event={event}
          alt={`Banner del evento ${event.name}`}
          variant="banner"
          priority={priority}
          roundedClass="rounded-none"
          className="h-full min-h-full w-full border-0"
          imageClassName="object-cover"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,9,13,0.15) 0%, rgba(10,9,13,0.55) 45%, rgba(10,9,13,0.92) 100%), linear-gradient(90deg, rgba(10,9,13,0.75) 0%, rgba(10,9,13,0.2) 55%, transparent 100%)",
          }}
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(72vh,720px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:min-h-[min(78vh,780px)] lg:pb-24">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="store-badge">{experienceLabel}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              {formatEventDateShort(event.event_date)}
            </span>
          </div>

          <EventInfoBadges badges={badges} className="mt-4" />

          <h2 className="mt-4 text-[clamp(1.75rem,5vw,3.25rem)] font-black leading-[1.05] tracking-tight text-white">
            {event.name}
          </h2>

          {isPromotion && event.description ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              {event.description}
            </p>
          ) : null}

          {event.location_name ? (
            <p className="mt-3 text-sm text-white/80 sm:text-base">
              {event.address ? (
                <a
                  href={getGoogleMapsSearchUrl(event.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {event.location_name}
                </a>
              ) : (
                event.location_name
              )}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {saleActions.map((action) => (
              <HeroActionButton key={action.key} action={action} />
            ))}
            {eventHref ? (
              <PublicButton
                href={eventHref}
                variant={saleActions.length > 0 ? "outline" : "primary"}
                size="lg"
                className={cn(
                  "w-full sm:w-auto",
                  saleActions.length > 0 &&
                    "border-white/25 bg-white/10 text-white hover:bg-white/15",
                )}
              >
                Ver evento
              </PublicButton>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroActionButton({ action }: { action: HeroAction }) {
  if (action.external) {
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        className={getActionClassName(action.primary)}
      >
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={getActionClassName(action.primary)}>
      {action.label}
    </Link>
  );
}

function getActionClassName(primary?: boolean) {
  if (primary) {
    return "public-btn-primary inline-flex w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-semibold sm:w-auto";
  }

  return "inline-flex w-full items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto";
}

function buildPromotionActions(event: Event): HeroAction[] {
  const externalUrl = getValidExternalTicketUrl(event);
  if (!externalUrl) {
    return [];
  }

  return [
    {
      key: "promo",
      label: event.featured_ticket_label?.trim() || "Ver más",
      href: externalUrl,
      external: true,
      primary: true,
    },
  ];
}

function buildSaleActions(event: Event, hasTicketTypes: boolean): HeroAction[] {
  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);
  const whatsappUrl = getWhatsAppSaleUrl(event);
  const actions: HeroAction[] = [];

  if (channels.saleWebEnabled && hasTicketTypes) {
    actions.push({
      key: "web",
      label: "Comprar entradas",
      href: ROUTES.eventoEntradasCanal(event.slug, "web"),
      primary: true,
    });
  }

  if (channels.reservationEnabled && hasTicketTypes) {
    actions.push({
      key: "reservation",
      label: "Reservar entrada",
      href: ROUTES.eventoEntradasCanal(event.slug, "reserva"),
      primary: actions.length === 0,
    });
  }

  if (channels.externalSaleEnabled && externalUrl) {
    actions.push({
      key: "external",
      label: "Comprar en sitio externo",
      href: externalUrl,
      external: true,
      primary: actions.length === 0,
    });
  }

  if (channels.saleWhatsappEnabled && whatsappUrl) {
    actions.push({
      key: "whatsapp",
      label: "Comprar por WhatsApp",
      href: whatsappUrl,
      external: true,
      primary: actions.length === 0,
    });
  }

  return actions;
}
