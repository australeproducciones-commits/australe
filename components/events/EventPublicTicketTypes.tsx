"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TicketSaleStatusPanel } from "@/components/events/TicketSaleStatusPanel";
import {
  CalendarClockIcon,
  CartIcon,
  GlobeIcon,
  LinkIcon,
} from "@/components/icons/PublicScadaIcons";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import {
  getValidExternalTicketUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/types";
import type { TicketType } from "@/lib/tickets/types";
import {
  buildPublicTicketTypeDisplays,
  buildTicketQuickNavItems,
  getCategoryBadgeLabel,
  getCategoryBadgeTone,
  getTicketTypePublicSlug,
  matchesTicketTypePublicSlug,
  type PublicTicketTypeDisplay,
} from "@/lib/tickets/publicDisplay";
import { getTicketPublicSaleStatus } from "@/lib/tickets/getTicketPublicSaleStatus";
import { cn } from "@/lib/utils/cn";

type EventPublicTicketTypesProps = {
  eventId: string;
  eventSlug: string;
  event: Pick<
    Event,
    | "sale_web_enabled"
    | "external_sale_enabled"
    | "sale_whatsapp_enabled"
    | "reservation_enabled"
    | "external_ticket_url"
    | "whatsapp_sale_number"
    | "whatsapp_sale_message"
    | "ticket_sale_mode"
  >;
  ticketTypes: TicketType[];
  embedded?: boolean;
};

type TicketTypeCardProps = {
  eventId: string;
  ticketType: TicketType;
  display: PublicTicketTypeDisplay;
  webHref: string | null;
  reservationHref: string | null;
  externalHref: string | null;
  cardRef: (node: HTMLElement | null) => void;
  onCopyLink: () => void;
  copyFeedback: boolean;
};

export function EventPublicTicketTypes({
  eventId,
  eventSlug,
  event,
  ticketTypes,
  embedded = false,
}: EventPublicTicketTypesProps) {
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimerRef = useRef<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);

  const displays = useMemo(
    () => buildPublicTicketTypeDisplays(ticketTypes),
    [ticketTypes],
  );

  const quickNavItems = useMemo(
    () => buildTicketQuickNavItems(ticketTypes, displays),
    [ticketTypes, displays],
  );

  const resolveHighlight = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get("entrada");
    const hashValue = window.location.hash.replace(/^#/, "");
    const hashEntrada = hashValue.startsWith("entrada-")
      ? hashValue.slice("entrada-".length)
      : hashValue;

    const candidate = (queryValue ?? hashEntrada).trim();
    if (!candidate) {
      return null;
    }

    const match = ticketTypes.find((ticketType) =>
      matchesTicketTypePublicSlug(ticketType, candidate),
    );

    return match?.id ?? null;
  }, [ticketTypes]);

  const highlightTicket = useCallback((ticketTypeId: string) => {
    if (highlightTimerRef.current != null) {
      window.clearTimeout(highlightTimerRef.current);
    }

    for (const [id, node] of cardRefs.current.entries()) {
      node.classList.remove("public-ticket-highlight");
      if (id === ticketTypeId) {
        node.classList.add("public-ticket-highlight");
      }
    }

    highlightTimerRef.current = window.setTimeout(() => {
      cardRefs.current.get(ticketTypeId)?.classList.remove("public-ticket-highlight");
      highlightTimerRef.current = null;
    }, 4200);
  }, []);

  useEffect(() => {
    const targetId = resolveHighlight();
    if (!targetId) {
      return;
    }

    const node = cardRefs.current.get(targetId);
    if (!node) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightTicket(targetId);
    }, 120);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [highlightTicket, resolveHighlight, ticketTypes]);

  const scrollToTicket = useCallback(
    (ticketTypeId: string) => {
      const node = cardRefs.current.get(ticketTypeId);
      if (!node) {
        return;
      }

      node.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightTicket(ticketTypeId);
    },
    [highlightTicket],
  );

  const copyTicketLink = useCallback(
    async (ticketType: TicketType) => {
      const slug = getTicketTypePublicSlug(ticketType);
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("entrada", slug);

      try {
        await navigator.clipboard.writeText(url.toString());
        setCopiedId(ticketType.id);
        window.setTimeout(() => {
          setCopiedId((current) =>
            current === ticketType.id ? null : current,
          );
        }, 2000);
      } catch {
        // Clipboard puede fallar en contextos no seguros.
      }
    },
    [],
  );

  if (ticketTypes.length === 0) {
    return null;
  }

  return (
    <section id="entradas" className={embedded ? "scroll-mt-28" : "mt-8 scroll-mt-28"}>
      {!embedded ? (
        <div className="mb-6">
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Entradas
          </p>
          <h2 className="public-heading mt-2 text-2xl font-black sm:text-3xl">
            Elegí tu entrada
          </h2>
          <p className="mt-2 text-sm public-text-muted">
            Todas las opciones activas para este evento. Elegí la que prefieras y
            continuá con la compra o reserva.
          </p>
        </div>
      ) : null}

      {quickNavItems.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {quickNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToTicket(item.ticketTypeId)}
              className="public-btn-outline rounded-full px-4 py-2 text-sm font-semibold"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {ticketTypes.map((ticketType, index) => {
          const display = displays[index]!;
          const baseHref = ROUTES.eventoEntradasTipo(eventSlug, ticketType.id);
          const webHref =
            display.canPurchase && channels.saleWebEnabled
              ? `${baseHref}&canal=web`
              : null;
          const reservationHref =
            display.canPurchase && channels.reservationEnabled
              ? `${baseHref}&canal=reserva`
              : null;
          const externalHref =
            display.canPurchase &&
            channels.externalSaleEnabled &&
            externalUrl
              ? externalUrl
              : null;

          return (
            <EventPublicTicketTypeCard
              key={ticketType.id}
              eventId={eventId}
              ticketType={ticketType}
              display={display}
              webHref={webHref}
              reservationHref={reservationHref}
              externalHref={externalHref}
              cardRef={(node) => {
                if (node) {
                  cardRefs.current.set(ticketType.id, node);
                } else {
                  cardRefs.current.delete(ticketType.id);
                }
              }}
              onCopyLink={() => copyTicketLink(ticketType)}
              copyFeedback={copiedId === ticketType.id}
            />
          );
        })}
      </div>
    </section>
  );
}

function EventPublicTicketTypeCard({
  eventId,
  ticketType,
  display,
  webHref,
  reservationHref,
  externalHref,
  cardRef,
  onCopyLink,
  copyFeedback,
}: TicketTypeCardProps) {
  const saleStatus = getTicketPublicSaleStatus(ticketType);
  const trackTicketClick = () => {
    void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.TICKET_CLICK, {
      eventId,
      ticketTypeId: ticketType.id,
    });
  };
  const hasAction = webHref || reservationHref || externalHref;
  const showAvailabilityBadge =
    display.status !== "available" &&
    display.status !== "coming_soon" &&
    display.status !== "sale_ended" &&
    display.status !== "sold_out" &&
    display.status !== "unavailable";

  return (
    <article
      id={`entrada-${display.slug}`}
      ref={cardRef}
      className={cn(
        "public-scada-ticket-card public-card rounded-2xl p-5 transition sm:p-6",
        display.featured &&
          "ring-2 ring-[var(--public-primary)] ring-offset-2 ring-offset-[var(--public-bg)]",
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
        <div className="min-w-0 flex-1 lg:pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="public-heading text-xl font-bold">{ticketType.name}</h3>
            {showAvailabilityBadge ? (
              <StatusBadge tone={display.statusTone}>{display.statusLabel}</StatusBadge>
            ) : null}
            {display.featured ? (
              <StatusBadge tone="featured">Recomendada</StatusBadge>
            ) : null}
            {display.categoryTags.map((tag) => (
              <StatusBadge key={tag} tone={getCategoryBadgeTone(tag)}>
                {getCategoryBadgeLabel(tag)}
              </StatusBadge>
            ))}
          </div>

          {ticketType.description ? (
            <p className="mt-3 text-sm leading-relaxed public-text-muted">
              {ticketType.description}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <p className="public-scada-label">PRECIO</p>
              <p className="public-heading mt-1 text-2xl font-black">
                {display.publicPriceLabel}
              </p>
            </div>
            {display.communityPriceLabel ? (
              <div>
                <p className="public-scada-label">PRECIO COMUNIDAD</p>
                <p className="public-label mt-1 text-lg font-bold">
                  {display.communityPriceLabel}
                </p>
              </div>
            ) : null}
          </div>

          <TicketSaleStatusPanel status={saleStatus} className="mt-5" />
        </div>

        <div className="public-scada-ticket-card__divider lg:mx-6" aria-hidden />

        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-56 lg:justify-center">
          {webHref ? (
            <PublicButton
              href={webHref}
              className="inline-flex w-full gap-2"
              onClick={trackTicketClick}
            >
              <CartIcon />
              Comprar en la web
            </PublicButton>
          ) : null}

          {reservationHref ? (
            <PublicButton
              href={reservationHref}
              variant={webHref ? "outline" : "primary"}
              className="inline-flex w-full gap-2 public-btn-reservation"
              onClick={trackTicketClick}
            >
              <CalendarClockIcon />
              Reserva desde la web
            </PublicButton>
          ) : null}

          {externalHref ? (
            <PublicButton
              href={externalHref}
              variant="outline"
              className="inline-flex w-full gap-2 public-btn-external"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GlobeIcon />
              Comprar en sitio externo
            </PublicButton>
          ) : null}

          {!hasAction ? (
            <PublicButton className="w-full" disabled>
              {display.buttonLabel}
            </PublicButton>
          ) : null}

          <PublicButton
            type="button"
            variant="ghost"
            size="sm"
            className="inline-flex w-full gap-2"
            onClick={onCopyLink}
            aria-live="polite"
          >
            <LinkIcon />
            {copyFeedback ? "Enlace copiado" : "Copiar enlace"}
          </PublicButton>
        </div>
      </div>
    </article>
  );
}
