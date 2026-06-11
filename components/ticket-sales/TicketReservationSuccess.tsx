"use client";

import QRCode from "react-qr-code";
import { PublicKioskOrderSuccess } from "@/components/kiosk/PublicKioskOrderSuccess";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

function StatusBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "amber" | "purple";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-400/15 text-amber-200"
      : tone === "purple"
        ? "bg-purple-500/20 text-purple-200"
        : "bg-white/10 text-zinc-300";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

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
      <Card padding="lg">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xl text-emerald-300"
            aria-hidden
          >
            ✓
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
              Reserva registrada
            </p>
            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {event.name}
            </h2>
            <p className="mt-2 text-sm text-purple-200">{dateTimeLabel}</p>
            {event.location_name ? (
              <p className="mt-1 text-sm text-zinc-400">{event.location_name}</p>
            ) : null}
            {event.address ? (
              <a
                href={getGoogleMapsSearchUrl(event.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-purple-300 underline-offset-2 hover:underline"
              >
                {event.address}
              </a>
            ) : null}
          </div>
        </div>

        {result.kioskError ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left text-sm text-amber-100">
            <p className="font-medium">
              La entrada fue registrada, pero no se pudieron reservar las
              consumisiones.
            </p>
            <p className="mt-2 text-amber-100/90">
              Podés intentar reservar consumisiones desde la sección de preventa
              del evento.
            </p>
            <Button
              href={`${ROUTES.evento(event.slug)}#preventa-consumisiones`}
              variant="outline"
              size="sm"
              className="mt-4 border-amber-300/30 text-amber-50 hover:bg-amber-400/10"
            >
              Reservar consumisiones
            </Button>
          </div>
        ) : null}

        {result.buyer ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Comprador
            </p>
            <p className="mt-1 font-medium text-white">
              {result.buyer.buyerName}
            </p>
            {result.buyer.buyerWhatsapp || result.buyer.buyerDni ? (
              <p className="mt-1 text-zinc-400">
                {[result.buyer.buyerWhatsapp, result.buyer.buyerDni]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      {hasTickets ? (
        <Card padding="lg" className="text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">Entradas</h3>
            <StatusBadge tone="amber">
              Pago: {TICKET_PAYMENT_STATUS_LABELS[TICKET_PAYMENT_STATUS.PENDING]}
            </StatusBadge>
          </div>

          {result.reservationExpiresAt ? (
            <p className="mt-2 text-xs text-zinc-500">
              La reserva vence el{" "}
              {formatReservationExpiry(result.reservationExpiresAt)}.
            </p>
          ) : null}

          {result.ticketLines && result.ticketLines.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {result.ticketLines.map((line) => (
                <li
                  key={line.ticketTypeName}
                  className="flex justify-between gap-4 text-zinc-300"
                >
                  <span className="min-w-0">
                    {line.ticketTypeName} × {line.quantity}
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {formatTicketPrice(line.unitPrice)} c/u
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-white">
                    {formatTicketPrice(line.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {result.tickets && result.tickets.length > 0 ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Códigos de entrada
              </p>
              {result.tickets.map((ticket, index) => {
                const showQr = shouldShowTicketQr(ticket.ticketStatus);

                return (
                  <div
                    key={`${ticket.qrToken}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white">
                          {ticket.ticketTypeName}
                        </p>
                        <p className="mt-1 font-mono text-xs text-purple-200">
                          {ticket.qrToken}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge tone="purple">
                            {TICKET_STATUS_LABELS[ticket.ticketStatus]}
                          </StatusBadge>
                          <StatusBadge tone="amber">
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
                          <div className="rounded-xl bg-white p-3">
                            <QRCode
                              value={ticket.qrToken}
                              size={120}
                              level="M"
                              bgColor="#ffffff"
                              fgColor="#18181b"
                            />
                          </div>
                          <p className="text-center text-[11px] text-zinc-500">
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
            <p className="mt-4 flex justify-between border-t border-white/10 pt-4 font-bold text-white">
              <span>Total entradas</span>
              <span>{formatTicketPrice(result.ticketsTotal)}</span>
            </p>
          ) : null}
        </Card>
      ) : null}

      {hasKiosk && result.kioskOrder ? (
        <Card padding="lg">
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
        </Card>
      ) : null}

      {(result.ticketsTotal != null || result.kioskOrder) && hasTickets ? (
        <Card padding="md" className="text-left">
          <div className="space-y-2 text-sm">
            {result.ticketsTotal != null ? (
              <p className="flex justify-between text-zinc-300">
                <span>Total entradas</span>
                <span className="font-medium text-white">
                  {formatTicketPrice(result.ticketsTotal)}
                </span>
              </p>
            ) : null}
            {result.kioskOrder ? (
              <p className="flex justify-between text-zinc-300">
                <span>Total consumisiones</span>
                <span className="font-medium text-white">
                  {formatKioskMoney(result.kioskOrder.totalAmount)}
                </span>
              </p>
            ) : null}
            {result.grandTotal != null &&
            result.kioskOrder &&
            result.ticketsTotal != null ? (
              <p className="flex justify-between border-t border-white/10 pt-3 text-base font-bold text-white">
                <span>Total general</span>
                <span>{formatTicketPrice(result.grandTotal)}</span>
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card padding="md" className="border-white/10 bg-white/[0.02] text-left">
        <p className="text-sm leading-6 text-zinc-300">
          Presentá tu entrada el día del evento. Si reservaste consumisiones,
          mostrale al personal de kiosco el código de orden para retirarlas.
        </p>
        {hasKiosk ? (
          <p className="mt-2 text-sm text-zinc-400">
            Las consumisiones quedan reservadas. El pago se confirma según la
            modalidad indicada por la organización.
          </p>
        ) : null}
        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-zinc-500">
          <li>Guardá esta pantalla o tomá captura.</li>
          <li>Presentá tu entrada al ingresar.</li>
          {hasKiosk ? (
            <li>Presentá el código de kiosco para retirar consumisiones.</li>
          ) : null}
          <li>La organización confirmará el pago según corresponda.</li>
        </ul>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onMakeAnother} className="sm:flex-1">
          Hacer otra reserva
        </Button>
        <Button
          href={ROUTES.evento(event.slug)}
          variant="outline"
          className="sm:flex-1"
        >
          Volver al evento
        </Button>
        <Button
          href={ROUTES.miCuentaEntradas}
          variant="ghost"
          className="sm:flex-1"
        >
          Ir a mis entradas
        </Button>
      </div>
    </div>
  );
}
