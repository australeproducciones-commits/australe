"use client";

import QRCode from "react-qr-code";
import { Modal } from "@/components/ui/Modal";
import type { TicketWithTypeName } from "@/lib/ticket-sales/types";
import {
  formatReservationExpiry,
  SALES_CHANNEL_LABELS,
  shouldShowTicketQr,
  TICKET_PAYMENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

type AdminTicketDetailModalProps = {
  ticket: TicketWithTypeName | null;
  onClose: () => void;
};

export function AdminTicketDetailModal({
  ticket,
  onClose,
}: AdminTicketDetailModalProps) {
  if (!ticket) {
    return null;
  }

  const showQr = shouldShowTicketQr(ticket.ticket_status);

  return (
    <Modal open={Boolean(ticket)} onClose={onClose} title="Detalle de entrada">
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-purple-300">
            {ticket.ticket_type_name ?? "Sin tipo"}
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">{ticket.buyer_name}</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Contacto" value={ticket.buyer_whatsapp} />
          <DetailField label="DNI" value={ticket.buyer_dni} />
          <DetailField label="Precio" value={formatTicketPrice(ticket.price_paid)} />
          <DetailField
            label="Estado"
            value={TICKET_STATUS_LABELS[ticket.ticket_status]}
          />
          <DetailField
            label="Pago"
            value={TICKET_PAYMENT_STATUS_LABELS[ticket.payment_status]}
          />
          <DetailField
            label="Canal"
            value={SALES_CHANNEL_LABELS[ticket.sales_channel]}
          />
          <DetailField label="ID" value={ticket.id} mono />
          <DetailField label="QR token" value={ticket.qr_token} mono />
        </div>

        {ticket.reservation_expires_at ? (
          <p className="text-sm text-zinc-400">
            Vence reserva: {formatReservationExpiry(ticket.reservation_expires_at)}
          </p>
        ) : null}

        {ticket.used_at ? (
          <p className="text-sm text-zinc-400">
            Usada:{" "}
            {new Intl.DateTimeFormat("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(ticket.used_at))}
          </p>
        ) : null}

        {ticket.cancel_reason ? (
          <p className="text-sm text-zinc-500">Motivo: {ticket.cancel_reason}</p>
        ) : null}

        {showQr ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white p-4">
            <QRCode value={ticket.qr_token} size={180} />
            <p className="text-center text-xs text-zinc-600">
              Código para validación en puerta
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-sm text-zinc-200 ${mono ? "break-all font-mono text-xs" : ""}`}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}
