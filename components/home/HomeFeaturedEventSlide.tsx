"use client";

import Image from "next/image";
import Link from "next/link";
import { isPromotionContent } from "@/lib/events/contentRules";
import { getPromotionDestination } from "@/lib/events/promotionDestination";
import type { Event } from "@/lib/events/types";
import {
  getValidExternalTicketUrl,
  getWhatsAppSaleUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDateShort } from "@/lib/events/utils";
import { getEventImage } from "@/lib/events/getEventImage";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";
import { cn } from "@/lib/utils/cn";

type HomeFeaturedEventSlideProps = {
  event: Event;
  priority?: boolean;
  hasTicketTypes?: boolean;
};

type HeroCta = {
  label: string;
  href: string;
  external?: boolean;
};

export function HomeFeaturedEventSlide({
  event,
  priority = false,
  hasTicketTypes = true,
}: HomeFeaturedEventSlideProps) {
  const isPromotion = isPromotionContent(event);
  const promotionDestination = isPromotion ? getPromotionDestination(event) : null;
  const eventHref = event.slug?.trim() ? ROUTES.evento(event.slug) : null;
  const cta = isPromotion ? null : resolveEventCta(event, hasTicketTypes, eventHref);
  const dateLabel = event.event_date ? formatEventDateShort(event.event_date) : null;
  const showDate = Boolean(dateLabel && dateLabel !== "Sin fecha");
  const metaParts = [showDate ? dateLabel : null, event.location_name?.trim() || null].filter(
    Boolean,
  );

  const banner = (
    <HomeHeroBannerImage
      src={getEventImage(event)}
      alt={isPromotion ? `Promoción ${event.name}` : `Banner del evento ${event.name}`}
      priority={priority}
    />
  );

  if (isPromotion && promotionDestination) {
    const promoLabel =
      event.featured_ticket_label?.trim() ||
      event.name?.trim() ||
      "Ver promoción";

    if (promotionDestination.external) {
      return (
        <article className="home-hero-slide-clean">
          <a
            href={promotionDestination.href}
            target={promotionDestination.openInNewTab ? "_blank" : undefined}
            rel={promotionDestination.openInNewTab ? "noopener noreferrer" : undefined}
            className="home-hero-banner-link block cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
            aria-label={promoLabel}
          >
            {banner}
          </a>
        </article>
      );
    }

    return (
      <article className="home-hero-slide-clean">
        <Link
          href={promotionDestination.href}
          className="home-hero-banner-link block cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
          aria-label={promoLabel}
        >
          {banner}
        </Link>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "home-hero-slide-clean",
        "home-hero-slide-clean--has-meta",
      )}
    >
      {banner}

      <div className="home-hero-meta-bar">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold sm:text-base">{event.name}</p>
            {metaParts.length > 0 ? (
              <p className="mt-0.5 text-xs text-[var(--public-text-secondary)] sm:text-sm">
                {metaParts.join(" · ")}
              </p>
            ) : null}
          </div>

          {cta ? (
            <HeroCtaLink cta={cta} className="shrink-0" />
          ) : eventHref ? (
            <HeroCtaLink
              cta={{ label: "Ver evento", href: eventHref }}
              className="shrink-0"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function HomeHeroBannerImage({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const optimizable = isNextImageOptimizable(src);

  return (
    <div className="home-hero-banner-shell">
      {optimizable ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="100vw"
          className="home-hero-banner-image"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="home-hero-banner-image" />
      )}
    </div>
  );
}

function HeroCtaLink({
  cta,
  className,
}: {
  cta: HeroCta;
  className?: string;
}) {
  const styles = cn(
    "public-btn-primary inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold sm:w-auto",
    className,
  );

  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={styles}>
        {cta.label}
      </a>
    );
  }

  return (
    <Link href={cta.href} className={styles}>
      {cta.label}
    </Link>
  );
}

function resolveEventCta(
  event: Event,
  hasTicketTypes: boolean,
  eventHref: string | null,
): HeroCta | null {
  const channels = resolveSaleChannels(event);

  if (channels.saleWebEnabled && hasTicketTypes) {
    return {
      label: "Comprar entradas",
      href: ROUTES.eventoEntradasCanal(event.slug, "web"),
    };
  }

  if (channels.reservationEnabled && hasTicketTypes) {
    return {
      label: "Reservar entrada",
      href: ROUTES.eventoEntradasCanal(event.slug, "reserva"),
    };
  }

  const externalUrl = getValidExternalTicketUrl(event);
  if (channels.externalSaleEnabled && externalUrl) {
    return {
      label: "Comprar entradas",
      href: externalUrl,
      external: true,
    };
  }

  const whatsappUrl = getWhatsAppSaleUrl(event);
  if (channels.saleWhatsappEnabled && whatsappUrl) {
    return {
      label: "Comprar por WhatsApp",
      href: whatsappUrl,
      external: true,
    };
  }

  if (eventHref) {
    return { label: "Ver evento", href: eventHref };
  }

  return null;
}
