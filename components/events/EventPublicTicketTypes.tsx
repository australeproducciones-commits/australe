"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import {
  TICKET_SALE_MODE,
  type TicketSaleMode,
} from "@/lib/constants/event-status";
import { ROUTES } from "@/lib/constants/routes";
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
import { cn } from "@/lib/utils/cn";

type EventPublicTicketTypesProps = {
  eventId: string;
  eventSlug: string;
  ticketSaleMode: string;
  externalTicketUrl: string | null;
  ticketTypes: TicketType[];
};

type TicketTypeCardProps = {
  eventId: string;
  ticketType: TicketType;
  display: PublicTicketTypeDisplay;
  purchaseHref: string | null;
  externalHref: string | null;
  cardRef: (node: HTMLElement | null) => void;
  onCopyLink: () => void;
  copyFeedback: boolean;
};

export function EventPublicTicketTypes({
  eventId,
  eventSlug,
  ticketSaleMode,
  externalTicketUrl,
  ticketTypes,
}: EventPublicTicketTypesProps) {
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimerRef = useRef<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mode = ticketSaleMode as TicketSaleMode;
  const internalEnabled =
    mode === TICKET_SALE_MODE.INTERNAL || mode === TICKET_SALE_MODE.BOTH;
  const externalEnabled =
    mode === TICKET_SALE_MODE.EXTERNAL || mode === TICKET_SALE_MODE.BOTH;

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
    if (mode === TICKET_SALE_MODE.DISABLED) {
      return (
        <PublicCard padding="lg" className="mt-8">
          <p className="public-muted-box">Entradas no disponibles</p>
        </PublicCard>
      );
    }

    return null;
  }

  return (
    <section id="entradas" className="mt-8 scroll-mt-28">
      <div className="mb-6">
        <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
          Entradas
        </p>
        <h2 className="public-heading mt-2 text-2xl font-black sm:text-3xl">
          Elegí tu entrada
        </h2>
        <p className="mt-2 text-sm public-text-muted">
          Todas las opciones activas para este evento. Elegí la que prefieras y
          continuá con la reserva o compra.
        </p>
      </div>

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
          const purchaseHref =
            display.canPurchase && internalEnabled
              ? ROUTES.eventoEntradasTipo(eventSlug, ticketType.id)
              : null;
          const externalHref =
            display.canPurchase && externalEnabled && externalTicketUrl
              ? externalTicketUrl
              : null;

          return (
            <EventPublicTicketTypeCard
              key={ticketType.id}
              eventId={eventId}
              ticketType={ticketType}
              display={display}
              purchaseHref={purchaseHref}
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

      {mode === TICKET_SALE_MODE.DISABLED ? (
        <p className="public-muted-box mt-4">
          La venta de entradas no está habilitada para este evento.
        </p>
      ) : null}
    </section>
  );
}

function EventPublicTicketTypeCard({
  eventId,
  ticketType,
  display,
  purchaseHref,
  externalHref,
  cardRef,
  onCopyLink,
  copyFeedback,
}: TicketTypeCardProps) {
  const trackTicketClick = () => {
    void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.TICKET_CLICK, {
      eventId,
      ticketTypeId: ticketType.id,
    });
  };
  const detailRows: Array<{ label: string; value: string }> = [];

  if (display.stockTotal != null) {
    detailRows.push({
      label: "Stock total",
      value: String(display.stockTotal),
    });
    detailRows.push({
      label: "Vendidas",
      value: String(display.stockSold),
    });
    detailRows.push({
      label: "Restantes",
      value: String(display.stockRemaining ?? 0),
    });
  } else {
    detailRows.push({
      label: "Disponibles",
      value: "Ilimitado",
    });
    if (display.stockSold > 0) {
      detailRows.push({
        label: "Vendidas",
        value: String(display.stockSold),
      });
    }
  }

  if (display.saleStartLabel) {
    detailRows.push({
      label: "Inicio de venta",
      value: display.saleStartLabel,
    });
  }

  if (display.saleEndLabel) {
    detailRows.push({
      label: "Fin de venta",
      value: display.saleEndLabel,
    });
  }

  detailRows.push({
    label: "Máximo por persona",
    value: String(ticketType.max_per_order),
  });

  return (
    <article
      id={`entrada-${display.slug}`}
      ref={cardRef}
      className={cn(
        "public-card rounded-3xl p-6 transition",
        display.featured &&
          "ring-2 ring-[var(--public-primary)] ring-offset-2 ring-offset-[var(--public-bg)]",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="public-heading text-xl font-bold">{ticketType.name}</h3>
            <StatusBadge tone={display.statusTone}>{display.statusLabel}</StatusBadge>
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
              <p className="text-xs uppercase tracking-wider public-text-soft">
                Precio
              </p>
              <p className="public-heading text-2xl font-black">
                {display.publicPriceLabel}
              </p>
            </div>
            {display.communityPriceLabel ? (
              <div>
                <p className="text-xs uppercase tracking-wider public-text-soft">
                  Precio comunidad
                </p>
                <p className="public-label text-lg font-bold">
                  {display.communityPriceLabel}
                </p>
              </div>
            ) : null}
          </div>

          <dl className="mt-5 grid gap-2 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div key={row.label} className="public-surface-row text-sm">
                <dt className="public-text-soft">{row.label}</dt>
                <dd className="public-heading font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-56">
          {purchaseHref ? (
            <PublicButton href={purchaseHref} className="w-full" onClick={trackTicketClick}>
              {display.buttonLabel}
            </PublicButton>
          ) : externalHref ? (
            <PublicButton
              href={externalHref}
              className="w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              {display.buttonLabel}
            </PublicButton>
          ) : (
            <PublicButton className="w-full" disabled>
              {display.buttonLabel}
            </PublicButton>
          )}

          {purchaseHref && externalHref ? (
            <PublicButton
              href={externalHref}
              variant="outline"
              className="w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comprar en link externo
            </PublicButton>
          ) : null}

          <PublicButton
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onCopyLink}
          >
            {copyFeedback ? "Enlace copiado" : "Copiar enlace"}
          </PublicButton>
        </div>
      </div>
    </article>
  );
}
