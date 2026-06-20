"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  buildPublicKioskPickerLines,
  PublicEventKioskInlinePicker,
} from "@/components/kiosk/PublicEventKioskInlinePicker";
import { TicketReservationSuccess } from "@/components/ticket-sales/TicketReservationSuccess";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import { formatKioskMoney } from "@/lib/kiosk/utils";
import {
  reserveTicketsFormAction,
  reserveTicketsWithKioskFormAction,
} from "@/lib/ticket-sales/actions";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/types";
import type { ReservationActionResult } from "@/lib/ticket-sales/types";
import { TICKET_PAYMENT_STATUS } from "@/lib/ticket-sales/types";
import { TICKET_PAYMENT_STATUS_LABELS } from "@/lib/ticket-sales/utils";
import type { TicketType } from "@/lib/tickets/types";
import {
  formatCommunityPriceLabel,
  formatTicketPrice,
  getStockAvailableLabel,
} from "@/lib/tickets/utils";

type TicketReservationFormProps = {
  event: Pick<
    Event,
    | "id"
    | "name"
    | "slug"
    | "event_date"
    | "start_time"
    | "end_time"
    | "location_name"
    | "address"
  >;
  ticketTypes: TicketType[];
  kioskProducts?: PublicEventKioskProduct[];
  isLoggedIn: boolean;
  defaultBuyerName?: string;
  initialTicketTypeId?: string;
  purchaseChannel?: "web" | "reserva";
};

const initialState: ReservationActionResult = { success: false };

export function TicketReservationForm(props: TicketReservationFormProps) {
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <TicketReservationFormSession
      key={sessionKey}
      {...props}
      onMakeAnother={() => setSessionKey((key) => key + 1)}
    />
  );
}

function TicketReservationFormSession({
  event,
  ticketTypes,
  kioskProducts = [],
  isLoggedIn,
  defaultBuyerName = "",
  initialTicketTypeId,
  purchaseChannel = "web",
  onMakeAnother,
}: TicketReservationFormProps & { onMakeAnother: () => void }) {
  const hasKiosk = kioskProducts.length > 0;
  const ticketCardRefs = useRef(new Map<string, HTMLElement>());
  const action = (
    hasKiosk ? reserveTicketsWithKioskFormAction : reserveTicketsFormAction
  ).bind(null, event.slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [ticketQuantities, setTicketQuantities] = useState<
    Record<string, number>
  >(() => {
    if (
      initialTicketTypeId &&
      ticketTypes.some((ticketType) => ticketType.id === initialTicketTypeId)
    ) {
      return { [initialTicketTypeId]: 1 };
    }

    return {};
  });
  const [kioskQuantities, setKioskQuantities] = useState<
    Record<string, number>
  >({});

  const ticketLines = useMemo(() => {
    return ticketTypes
      .map((ticketType) => {
        const quantity = ticketQuantities[ticketType.id] ?? 0;
        if (quantity <= 0) {
          return null;
        }

        return {
          ticketType,
          quantity,
          subtotal: ticketType.public_price * quantity,
        };
      })
      .filter((line) => line != null);
  }, [ticketTypes, ticketQuantities]);

  const kioskLines = useMemo(
    () => buildPublicKioskPickerLines(kioskProducts, kioskQuantities),
    [kioskProducts, kioskQuantities],
  );

  const ticketsTotal = ticketLines.reduce((sum, line) => sum + line.subtotal, 0);
  const kioskTotal = kioskLines.reduce((sum, line) => sum + line.subtotal, 0);
  const grandTotal = ticketsTotal + kioskTotal;

  useEffect(() => {
    if (!initialTicketTypeId) {
      return;
    }

    const node = ticketCardRefs.current.get(initialTicketTypeId);
    if (!node) {
      return;
    }

    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.classList.add("public-ticket-highlight");
    }, 120);

    const clearTimer = window.setTimeout(() => {
      node.classList.remove("public-ticket-highlight");
    }, 4200);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
      node.classList.remove("public-ticket-highlight");
    };
  }, [initialTicketTypeId, ticketTypes]);

  const kioskItemsPayload = useMemo(
    () =>
      JSON.stringify(
        kioskLines.map((line) => ({
          eventKioskProductId: line.product.id,
          quantity: line.quantity,
          productName: line.product.product_name,
          unitPrice: line.product.price,
        })),
      ),
    [kioskLines],
  );

  if (state.success) {
    return (
      <TicketReservationSuccess
        event={event}
        result={state}
        onMakeAnother={onMakeAnother}
      />
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={() => {
        void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.RESERVATION_STARTED, {
          eventId: event.id,
        });
        void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.PURCHASE_STARTED, {
          eventId: event.id,
        });
      }}
    >
      {!isLoggedIn ? (
        <PublicCard padding="md" className="public-alert-warning">
          <p className="text-sm">
            Para reservar necesitás una cuenta de cliente.{" "}
            <Link href={ROUTES.login} className="public-link font-semibold">
              Iniciá sesión
            </Link>{" "}
            o registrate y volvé a esta página.
          </p>
        </PublicCard>
      ) : null}

      <div className="space-y-4">
        {ticketTypes.map((ticketType) => (
          <div
            key={ticketType.id}
            ref={(node) => {
              if (node) {
                ticketCardRefs.current.set(ticketType.id, node);
              } else {
                ticketCardRefs.current.delete(ticketType.id);
              }
            }}
            className={
              initialTicketTypeId === ticketType.id
                ? "public-ticket-highlight rounded-3xl"
                : undefined
            }
          >
            <PublicCard padding="md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="public-heading text-lg font-bold">
                  {ticketType.name}
                </h3>
                {ticketType.description ? (
                  <p className="mt-1 text-sm public-text-muted">
                    {ticketType.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <StatusBadge tone="primary">
                    Público: {formatTicketPrice(ticketType.public_price)}
                  </StatusBadge>
                  {formatCommunityPriceLabel(ticketType.community_price) ? (
                    <StatusBadge tone="community">
                      Comunidad:{" "}
                      {formatCommunityPriceLabel(ticketType.community_price)}
                    </StatusBadge>
                  ) : null}
                  <StatusBadge tone="neutral">
                    Disponibles: {getStockAvailableLabel(ticketType)}
                  </StatusBadge>
                </div>
              </div>

              <div className="shrink-0">
                <label
                  htmlFor={`qty_${ticketType.id}`}
                  className="mb-2 block text-xs uppercase tracking-wider public-text-soft"
                >
                  Cantidad (máx. {ticketType.max_per_order})
                </label>
                <select
                  id={`qty_${ticketType.id}`}
                  name={`qty_${ticketType.id}`}
                  value={ticketQuantities[ticketType.id] ?? 0}
                  disabled={!isLoggedIn || pending}
                  onChange={(changeEvent) => {
                    const quantity = Number.parseInt(
                      changeEvent.target.value,
                      10,
                    );
                    setTicketQuantities((current) => ({
                      ...current,
                      [ticketType.id]: Number.isFinite(quantity)
                        ? quantity
                        : 0,
                    }));
                  }}
                  className="public-select sm:w-28"
                >
                  {Array.from(
                    { length: ticketType.max_per_order + 1 },
                    (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </PublicCard>
          </div>
        ))}
      </div>

      {hasKiosk ? (
        <PublicCard padding="lg">
          <PublicEventKioskInlinePicker
            products={kioskProducts}
            value={kioskQuantities}
            onChange={setKioskQuantities}
            disabled={!isLoggedIn || pending}
          />
          <input type="hidden" name="kiosk_items" value={kioskItemsPayload} />
        </PublicCard>
      ) : null}

      {(ticketLines.length > 0 || kioskLines.length > 0) && isLoggedIn ? (
        <PublicCard padding="lg">
          <h3 className="public-heading text-lg font-bold">Resumen</h3>

          {ticketLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold uppercase tracking-wider public-text-soft">
                Entradas
              </p>
              <ul className="mt-2 space-y-1 text-sm public-text-muted">
                {ticketLines.map((line) => (
                  <li
                    key={line.ticketType.id}
                    className="flex justify-between gap-4"
                  >
                    <span>
                      {line.ticketType.name} × {line.quantity}
                    </span>
                    <span className="shrink-0 public-heading font-medium">
                      {formatTicketPrice(line.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between text-sm font-semibold public-heading">
                <span>Subtotal entradas</span>
                <span>{formatTicketPrice(ticketsTotal)}</span>
              </p>
            </div>
          ) : null}

          {kioskLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold uppercase tracking-wider public-text-soft">
                Consumisiones
              </p>
              <ul className="mt-2 space-y-1 text-sm public-text-muted">
                {kioskLines.map((line) => (
                  <li
                    key={line.product.id}
                    className="flex justify-between gap-4"
                  >
                    <span>
                      {line.product.product_name} × {line.quantity}
                    </span>
                    <span className="shrink-0 public-heading font-medium">
                      {formatKioskMoney(line.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between text-sm font-semibold public-heading">
                <span>Subtotal consumisiones</span>
                <span>{formatKioskMoney(kioskTotal)}</span>
              </p>
            </div>
          ) : null}

          {ticketLines.length > 0 && kioskLines.length > 0 ? (
            <p className="mt-4 flex justify-between border-t pt-4 text-base font-bold public-heading" style={{ borderColor: "var(--public-border)" }}>
              <span>Total general</span>
              <span>{formatTicketPrice(grandTotal)}</span>
            </p>
          ) : null}
        </PublicCard>
      ) : null}

      <PublicCard padding="lg">
        <h3 className="public-heading text-lg font-bold">Datos del comprador</h3>
        <p className="mt-1 text-sm public-text-muted">
          Pago manual por ahora: transferencia o efectivo según indique
          Australe.
          {hasKiosk
            ? " Si sumás consumisiones, completá WhatsApp o DNI."
            : ""}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="buyer_name"
              className="mb-2 block text-sm public-text-muted"
            >
              Nombre *
            </label>
            <input
              id="buyer_name"
              name="buyer_name"
              type="text"
              required
              defaultValue={defaultBuyerName}
              disabled={!isLoggedIn || pending}
              className="public-input"
              placeholder="Nombre y apellido"
            />
          </div>

          <div>
            <label
              htmlFor="buyer_whatsapp"
              className="mb-2 block text-sm public-text-muted"
            >
              WhatsApp
            </label>
            <input
              id="buyer_whatsapp"
              name="buyer_whatsapp"
              type="tel"
              disabled={!isLoggedIn || pending}
              className="public-input"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label
              htmlFor="buyer_dni"
              className="mb-2 block text-sm public-text-muted"
            >
              DNI
            </label>
            <input
              id="buyer_dni"
              name="buyer_dni"
              type="text"
              disabled={!isLoggedIn || pending}
              className="public-input"
              placeholder="Opcional"
            />
          </div>
        </div>
      </PublicCard>

      {state.error ? (
        <p className="public-alert-error">{state.error}</p>
      ) : null}

      <PublicButton
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!isLoggedIn || pending}
      >
        {pending
          ? "Confirmando…"
          : purchaseChannel === "web"
            ? kioskLines.length > 0
              ? "Comprar entrada y consumisiones"
              : "Comprar en la web"
            : kioskLines.length > 0
              ? "Reservar entrada y consumisiones"
              : "Reservar entrada"}
      </PublicButton>

      <p className="text-xs public-text-soft">
        Estado inicial: {TICKET_PAYMENT_STATUS_LABELS[TICKET_PAYMENT_STATUS.PENDING]}. Sin pago online
        en esta versión.
      </p>
    </form>
  );
}
