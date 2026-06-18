"use client";

import QRCode from "react-qr-code";
import { PublicKioskOrderSuccess } from "@/components/kiosk/PublicKioskOrderSuccess";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDateTime } from "@/lib/events/utils";
import { formatKioskMoney } from "@/lib/kiosk/utils";
import type { ReservationActionResult } from "@/lib/ticket-sales/types";
import { TICKET_PAYMENT_STATUS } from "@/lib/ticket-sales/types";
import {
  formatReservationExpiry,
  shouldShowTicketQr,
  TICKET_PAYMENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";

type TicketReservationSuccessProps = {
  event: Pick<
    Event,
    | "name"
    | "slug"
    | "event_date"
    | "start_time"
    | "end_time"
    | "location_name"
    | "address"
  >;
  result: ReservationActionResult;
  onMakeAnother: () => void;
};

export function TicketReservationSuccess({
  event,
  result,
  onMakeAnother,
}: TicketReservationSuccessProps) {
  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );
  const hasKiosk = Boolean(result.kioskOrder);
  const hasTickets = (result.ticketCount ?? 0) > 0;

  return (
    <div className="space-y-4">
      <PublicCard padding="lg">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(127,216,190,0.2)] text-xl text-emerald-700"
            aria-hidden
          >
            ✓
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">
              Reserva registrada
            </p>
            <h2 className="public-heading mt-1 text-2xl font-black sm:text-3xl">
              {event.name}
            </h2>
            <p className="mt-2 text-sm public-label">{dateTimeLabel}</p>
            {event.location_name ? (
              <p className="mt-1 text-sm public-text-muted">{event.location_name}</p>
            ) : null}
            {event.address ? (
              <a
                href={getGoogleMapsSearchUrl(event.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="public-link mt-1 inline-block text-sm"
              >
                {event.address}
              </a>
            ) : null}
          </div>
        </div>

        {result.kioskError ? (
          <div className="public-alert-warning mt-5 text-left text-sm">
            <p className="font-medium">
              La entrada fue registrada, pero no se pudieron reservar las
              consumisiones.
            </p>
            <p className="mt-2">
              Podés intentar reservar consumisiones desde la sección de preventa
              del evento.
            </p>
            <PublicButton
              href={`${ROUTES.evento(event.slug)}#preventa-consumisiones`}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Reservar consumisiones
            </PublicButton>
          </div>
        ) : null}

        {result.buyer ? (
          <div className="public-summary-box mt-5 text-left text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider public-text-soft">
              Comprador
            </p>
            <p className="public-heading mt-1 font-medium">
              {result.buyer.buyerName}
            </p>
            {result.buyer.buyerWhatsapp || result.buyer.buyerDni ? (
              <p className="mt-1 public-text-muted">
                {[result.buyer.buyerWhatsapp, result.buyer.buyerDni]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </PublicCard>

      {hasTickets ? (
        <PublicCard padding="lg" className="text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="public-heading text-lg font-bold">Entradas</h3>
            <StatusBadge tone="warning">
              Pago: {TICKET_PAYMENT_STATUS_LABELS[TICKET_PAYMENT_STATUS.PENDING]}
            </StatusBadge>
          </div>

          {result.reservationExpiresAt ? (
            <p className="mt-2 text-xs public-text-soft">
              La reserva vence el{" "}
              {formatReservationExpiry(result.reservationExpiresAt)}.
            </p>
          ) : null}

          {result.ticketLines && result.ticketLines.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {result.ticketLines.map((line) => (
                <li
                  key={line.ticketTypeName}
                  className="flex justify-between gap-4 public-text-muted"
                >
                  <span className="min-w-0">
                    {line.ticketTypeName} × {line.quantity}
                    <span className="mt-0.5 block text-xs public-text-soft">
                      {formatTicketPrice(line.unitPrice)} c/u
                    </span>
                  </span>
                  <span className="public-heading shrink-0 font-medium">
                    {formatTicketPrice(line.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {result.tickets && result.tickets.length > 0 ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider public-text-soft">
                Códigos de entrada
              </p>
              {result.tickets.map((ticket, index) => {
                const showQr = shouldShowTicketQr(ticket.ticketStatus);

                return (
                  <div
                    key={`${ticket.qrToken}-${index}`}
                    className="public-summary-box"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="public-heading font-medium">
                          {ticket.ticketTypeName}
                        </p>
                        <p className="public-label mt-1 font-mono text-xs">
                          {ticket.qrToken}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge tone="primary">
                            {TICKET_STATUS_LABELS[ticket.ticketStatus]}
                          </StatusBadge>
                          <StatusBadge tone="warning">
                            {
                              TICKET_PAYMENT_STATUS_LABELS[
                                ticket.paymentStatus
                              ]
                            }
                          </StatusBadge>
                        </div>
                      </div>
                      {showQr ? (
                        <div className="flex shrink-0 flex-col items-center gap-2">
                          <div className="rounded-xl border p-3" style={{ borderColor: "var(--public-border)", backgroundColor: "var(--public-card)" }}>
                            <QRCode
                              value={ticket.qrToken}
                              size={120}
                              level="M"
                              bgColor="#ffffff"
                              fgColor="#2f2a3a"
                            />
                          </div>
                          <p className="text-center text-[11px] public-text-soft">
                            Presentá este QR en puerta
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {result.ticketsTotal != null ? (
            <p className="public-heading mt-4 flex justify-between border-t pt-4 font-bold" style={{ borderColor: "var(--public-border)" }}>
              <span>Total entradas</span>
              <span>{formatTicketPrice(result.ticketsTotal)}</span>
            </p>
          ) : null}
        </PublicCard>
      ) : null}

      {hasKiosk && result.kioskOrder ? (
        <PublicCard padding="lg">
          <PublicKioskOrderSuccess
            embedded
            showHeader={false}
            showInstructions={false}
            showActions={false}
            title="Consumisiones"
            orderCode={result.kioskOrder.orderCode}
            totalAmount={result.kioskOrder.totalAmount}
            lines={result.kioskOrder.lines.map((line) => ({
              name: line.productName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subtotal: line.subtotal,
            }))}
          />
        </PublicCard>
      ) : null}

      {(result.ticketsTotal != null || result.kioskOrder) && hasTickets ? (
        <PublicCard padding="md" className="text-left">
          <div className="space-y-2 text-sm">
            {result.ticketsTotal != null ? (
              <p className="flex justify-between public-text-muted">
                <span>Total entradas</span>
                <span className="public-heading font-medium">
                  {formatTicketPrice(result.ticketsTotal)}
                </span>
              </p>
            ) : null}
            {result.kioskOrder ? (
              <p className="flex justify-between public-text-muted">
                <span>Total consumisiones</span>
                <span className="public-heading font-medium">
                  {formatKioskMoney(result.kioskOrder.totalAmount)}
                </span>
              </p>
            ) : null}
            {result.grandTotal != null &&
            result.kioskOrder &&
            result.ticketsTotal != null ? (
              <p className="public-heading flex justify-between border-t pt-3 text-base font-bold" style={{ borderColor: "var(--public-border)" }}>
                <span>Total general</span>
                <span>{formatTicketPrice(result.grandTotal)}</span>
              </p>
            ) : null}
          </div>
        </PublicCard>
      ) : null}

      <PublicCard padding="md" className="text-left">
        <p className="text-sm leading-6 public-text-muted">
          Presentá tu entrada el día del evento. Si reservaste consumisiones,
          mostrale al personal de kiosco el código de orden para retirarlas.
        </p>
        {hasKiosk ? (
          <p className="mt-2 text-sm public-text-soft">
            Las consumisiones quedan reservadas. El pago se confirma según la
            modalidad indicada por la organización.
          </p>
        ) : null}
        <ul className="mt-3 space-y-1.5 text-xs leading-5 public-text-soft">
          <li>Guardá esta pantalla o tomá captura.</li>
          <li>Presentá tu entrada al ingresar.</li>
          {hasKiosk ? (
            <li>Presentá el código de kiosco para retirar consumisiones.</li>
          ) : null}
          <li>La organización confirmará el pago según corresponda.</li>
        </ul>
      </PublicCard>

      <div className="flex flex-col gap-3 sm:flex-row">
        <PublicButton onClick={onMakeAnother} className="sm:flex-1">
          Hacer otra reserva
        </PublicButton>
        <PublicButton
          href={ROUTES.evento(event.slug)}
          variant="outline"
          className="sm:flex-1"
        >
          Volver al evento
        </PublicButton>
        <PublicButton
          href={ROUTES.miCuentaEntradas}
          variant="ghost"
          className="sm:flex-1"
        >
          Ir a mis entradas
        </PublicButton>
      </div>
    </div>
  );
}
