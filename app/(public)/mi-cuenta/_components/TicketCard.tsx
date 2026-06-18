"use client";

import Link from "next/link";
import QRCode from "react-qr-code";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
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
    <PublicCard padding="md" className="overflow-hidden">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="public-label text-xs uppercase tracking-wider">
            {ticket.ticket_type_name ?? "Entrada"}
          </p>
          <h3 className="public-heading mt-1 text-xl font-bold">{ticket.event_name}</h3>
          <p className="mt-1 text-sm public-label">
            {formatEventDate(ticket.event_date)}
          </p>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="public-surface-row flex-col items-start sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs public-text-soft">Comprador</p>
              <p className="public-heading">{ticket.buyer_name}</p>
            </div>
            <div className="public-surface-row flex-col items-start sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs public-text-soft">Precio</p>
              <p className="public-heading font-semibold">
                {formatTicketPrice(ticket.price_paid)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <StatusBadge tone="primary">
              {TICKET_STATUS_LABELS[ticket.ticket_status]}
            </StatusBadge>
            <StatusBadge tone="neutral">
              {TICKET_PAYMENT_STATUS_LABELS[ticket.payment_status]}
            </StatusBadge>
          </div>

          {ticket.reservation_expires_at &&
          ticket.ticket_status === "reserved" ? (
            <p className="mt-3 text-xs public-alert-warning inline-block border-0 bg-transparent p-0">
              Vence: {formatReservationExpiry(ticket.reservation_expires_at)}
            </p>
          ) : null}

          {ticket.event_slug ? (
            <Link
              href={ROUTES.evento(ticket.event_slug)}
              className="public-link mt-4 inline-block text-sm"
            >
              Ver evento →
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3">
          {showQr ? (
            <>
              <div
                className="rounded-2xl border p-4 shadow-lg"
                style={{
                  borderColor: "var(--public-border)",
                  backgroundColor: "var(--public-card)",
                  boxShadow: "0 8px 24px rgba(155, 126, 222, 0.12)",
                }}
              >
                <QRCode
                  value={ticket.qr_token}
                  size={148}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#2f2a3a"
                />
              </div>
              <p className="max-w-[12rem] break-all text-center text-[10px] leading-4 public-text-soft">
                {ticket.qr_token}
              </p>
              <p className="text-center text-xs public-text-muted">
                Presentá este QR en puerta
              </p>
            </>
          ) : (
            <div
              className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center"
              style={{
                borderColor: "var(--public-border)",
                backgroundColor: "var(--public-card-tint)",
              }}
            >
              <p className="text-sm font-medium public-text-muted">QR no disponible</p>
              <p className="mt-1 text-xs public-text-soft">
                {ticket.ticket_status === "used"
                  ? "Entrada ya utilizada"
                  : "Entrada inactiva"}
              </p>
            </div>
          )}
        </div>
      </div>
    </PublicCard>
  );
}
