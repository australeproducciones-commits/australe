"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { EventImage } from "@/components/events/EventImage";
import { EventInfoBadges } from "@/components/events/EventInfoBadges";
import { ROUTES } from "@/lib/constants/routes";
import { isPromotionContent } from "@/lib/events/contentRules";
import { buildEventHeroBadges } from "@/lib/events/eventInfoBadges";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import { type EventMerchandisingContext } from "@/lib/events/eventMerchandising";
import type { Event } from "@/lib/events/types";
import {
  getValidExternalTicketUrl,
  getWhatsAppSaleUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";
import { cn } from "@/lib/utils/cn";

type EventHeroProps = {
  event: Event;
  minPrice?: number | null;
  minCommunityPrice?: number | null;
  kioskPresaleEnabled?: boolean;
  hasTicketTypes?: boolean;
  priority?: boolean;
  className?: string;
  merchandising?: EventMerchandisingContext;
  storeMerch?: EventStoreMerchContext | null;
  titleAs?: "h1" | "h2";
  bannerLink?: string | null;
  bannerControls?: ReactNode;
  bannerOnly?: boolean;
};

type HeroAction = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  primary?: boolean;
};

export function EventHero({
  event,
  minPrice = null,
  minCommunityPrice = null,
  kioskPresaleEnabled = false,
  hasTicketTypes = true,
  priority = false,
  className,
  merchandising,
  storeMerch = null,
  titleAs: TitleTag = "h1",
  bannerLink = null,
  bannerControls,
  bannerOnly = false,
}: EventHeroProps) {
  const badges = buildEventHeroBadges({
    event,
    minPrice,
    minCommunityPrice,
  merchandising,
  storeMerch,
  kioskPresaleEnabled,
  });

  const isPromotion = isPromotionContent(event);
  const saleActions = isPromotion
    ? buildPromotionHeroActions(event)
    : buildHeroSaleActions(event, hasTicketTypes);

  const bannerImage = (
    <EventImage
      event={event}
      alt={`Banner del evento ${event.name}`}
      variant="banner"
      priority={priority}
      roundedClass={bannerOnly ? "rounded-3xl" : "rounded-none rounded-t-3xl"}
      className="w-full border-x-0 border-t-0"
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1152px"
    />
  );

  return (
    <section
      className={cn("public-card overflow-hidden rounded-3xl", className)}
      aria-label={isPromotion ? `Promoción ${event.name}` : `Evento ${event.name}`}
    >
      <div className="relative">
        {bannerLink ? (
          <Link
            href={bannerLink}
            className="block cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
            aria-label={`Ver evento: ${event.name}`}
          >
            {bannerImage}
          </Link>
        ) : (
          bannerImage
        )}
        {bannerControls}
      </div>

      {bannerOnly ? null : (
      <div className="px-5 py-6 text-center sm:px-8 sm:py-8">
        <EventInfoBadges badges={badges} className="mb-5 justify-center" />

        <TitleTag
          className="public-heading mx-auto max-w-3xl text-balance text-2xl font-black leading-tight sm:text-3xl lg:text-4xl"
          style={{ textWrap: "balance" }}
        >
          {event.name}
        </TitleTag>

        {isPromotion && event.description ? (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed public-text-muted sm:text-lg">
            {event.description}
          </p>
        ) : null}

        {event.address ? (
          <p className="mt-4 text-sm sm:text-base">
            <a
              href={getGoogleMapsSearchUrl(event.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="public-link font-medium"
            >
              {event.address}
            </a>
          </p>
        ) : null}

        {!isPromotion && minPrice != null ? (
          <p className="mt-5 text-base public-text-muted">
            Entradas desde{" "}
            <span className="public-heading text-xl font-bold sm:text-2xl">
              {formatTicketPrice(minPrice)}
            </span>
          </p>
        ) : null}

        {!isPromotion && minCommunityPrice != null ? (
          <p className="mt-1 text-sm public-text-muted sm:text-base">
            Precio comunidad desde{" "}
            <span className="font-semibold text-[var(--public-primary)]">
              {formatTicketPrice(minCommunityPrice)}
            </span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {saleActions.length > 0 ? (
            saleActions.map((action) =>
              action.external ? (
                <a
                  key={action.key}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={getActionClassName(action.primary)}
                >
                  {action.label}
                </a>
              ) : (
                <Link key={action.key} href={action.href} className={getActionClassName(action.primary)}>
                  {action.label}
                </Link>
              ),
            )
          ) : (
            <p
              className="rounded-2xl border px-4 py-3 text-sm public-text-muted"
              style={{ borderColor: "var(--public-border)" }}
            >
              {isPromotion
                ? "La promoción no tiene enlace de destino configurado."
                : "Las entradas no están disponibles en este momento."}
            </p>
          )}
          {!isPromotion ? (
            <Link href={ROUTES.comunidad} className={getActionClassName(false, true)}>
              Sumarse a la comunidad
            </Link>
          ) : null}
        </div>
      </div>
      )}
    </section>
  );
}

function buildPromotionHeroActions(event: Event): HeroAction[] {
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

function getActionClassName(primary?: boolean, outline = false) {
  if (outline || !primary) {
    return "public-btn-outline w-full rounded-2xl px-6 py-3.5 text-center text-sm font-semibold sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]";
  }

  return "public-btn-primary w-full rounded-2xl px-6 py-3.5 text-center text-sm font-semibold sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]";
}

function buildHeroSaleActions(event: Event, hasTicketTypes: boolean): HeroAction[] {
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

  if (actions.length === 0) {
    return [];
  }

  return actions;
}
