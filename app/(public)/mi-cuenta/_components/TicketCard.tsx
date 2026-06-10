"use client";

import Link from "next/link";
import QRCode from "react-qr-code";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDate } from "@/lib/events/utils";
import type { CustomerTicket } from "@/lib/ticket-sales/types";
import {
  formatReservationExpiry,
  shouldShowTicketQr,
  TICKET_PAYMENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

type TicketCardProps = {
  ticket: CustomerTicket;
};

export function TicketCard({ ticket }: TicketCardProps) {
  const showQr = shouldShowTicketQr(ticket.ticket_status);

  return (
    <Card padding="md" className="overflow-hidden">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-purple-300">
            {ticket.ticket_type_name ?? "Entrada"}
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">{ticket.event_name}</h3>
          <p className="mt-1 text-sm text-purple-200">
            {formatEventDate(ticket.event_date)}
          </p>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-xs text-zinc-500">Comprador</p>
              <p className="text-zinc-200">{ticket.buyer_name}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-xs text-zinc-500">Precio</p>
              <p className="font-semibold text-white">
                {formatTicketPrice(ticket.price_paid)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-200">
              {TICKET_STATUS_LABELS[ticket.ticket_status]}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
              {TICKET_PAYMENT_STATUS_LABELS[ticket.payment_status]}
            </span>
          </div>

          {ticket.reservation_expires_at &&
          ticket.ticket_status === "reserved" ? (
            <p className="mt-3 text-xs text-amber-200/90">
              Vence: {formatReservationExpiry(ticket.reservation_expires_at)}
            </p>
          ) : null}

          {ticket.event_slug ? (
            <Link
              href={ROUTES.evento(ticket.event_slug)}
              className="mt-4 inline-block text-sm text-purple-300 hover:text-purple-200"
            >
              Ver evento →
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3">
          {showQr ? (
            <>
              <div className="rounded-2xl bg-white p-4 shadow-lg shadow-purple-500/10">
                <QRCode
                  value={ticket.qr_token}
                  size={148}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#18181b"
                />
              </div>
              <p className="max-w-[12rem] break-all text-center text-[10px] leading-4 text-zinc-500">
                {ticket.qr_token}
              </p>
              <p className="text-center text-xs text-zinc-400">
                Presentá este QR en puerta
              </p>
            </>
          ) : (
            <div className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 text-center">
              <p className="text-sm font-medium text-zinc-400">QR no disponible</p>
              <p className="mt-1 text-xs text-zinc-500">
                {ticket.ticket_status === "used"
                  ? "Entrada ya utilizada"
                  : "Entrada inactiva"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
