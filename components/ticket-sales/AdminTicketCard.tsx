"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  cancelTicketAction,
  confirmTicketPaymentAction,
  markTicketExpiredAction,
} from "@/lib/ticket-sales/actions";
import type { TicketWithTypeName } from "@/lib/ticket-sales/types";
import {
  canMarkTicketExpired,
  formatReservationExpiry,
  SALES_CHANNEL_LABELS,
  TICKET_PAYMENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

type AdminTicketCardProps = {
  ticket: TicketWithTypeName;
};

export function AdminTicketCard({ ticket }: AdminTicketCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const canConfirm =
    ticket.payment_status === "pending" && ticket.ticket_status === "reserved";
  const canCancel =
    ticket.ticket_status !== "cancelled" && ticket.ticket_status !== "used";
  const canExpire = canMarkTicketExpired(ticket);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await confirmTicketPaymentAction(ticket.id);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo confirmar.");
      return;
    }

    router.refresh();
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const result = await cancelTicketAction(ticket.id, cancelReason);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo cancelar.");
      return;
    }

    setShowCancel(false);
    setCancelReason("");
    router.refresh();
  }

  async function handleExpire() {
    setLoading(true);
    setError(null);
    const result = await markTicketExpiredAction(ticket.id);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo marcar como vencida.");
      return;
    }

    router.refresh();
  }

  return (
    <Card padding="md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-purple-300">
            {ticket.ticket_type_name ?? "Sin tipo"}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            {ticket.buyer_name}
          </h3>
          <div className="mt-2 space-y-1 text-sm text-zinc-400">
            {ticket.buyer_whatsapp ? (
              <p>WhatsApp: {ticket.buyer_whatsapp}</p>
            ) : null}
            {ticket.buyer_dni ? <p>DNI: {ticket.buyer_dni}</p> : null}
            <p>
              Creada:{" "}
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(ticket.created_at))}
            </p>
            {ticket.reservation_expires_at ? (
              <p>
                Vence: {formatReservationExpiry(ticket.reservation_expires_at)}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
              {TICKET_PAYMENT_STATUS_LABELS[ticket.payment_status]}
            </span>
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-200">
              {TICKET_STATUS_LABELS[ticket.ticket_status]}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-400">
              {SALES_CHANNEL_LABELS[ticket.sales_channel]}
            </span>
          </div>
          {ticket.cancel_reason ? (
            <p className="mt-2 text-xs text-zinc-500">
              Motivo: {ticket.cancel_reason}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-white">
            {formatTicketPrice(ticket.price_paid)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : null}

      {showCancel ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="block text-sm text-zinc-300" htmlFor={`reason-${ticket.id}`}>
            Motivo de cancelación
          </label>
          <input
            id={`reason-${ticket.id}`}
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-purple-400 focus:outline-none"
            placeholder="Opcional"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={handleCancel}
            >
              Confirmar cancelación
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => setShowCancel(false)}
            >
              Volver
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {canConfirm ? (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={handleConfirm}
            >
              Confirmar pago
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => setShowCancel(true)}
            >
              Cancelar
            </Button>
          ) : null}
          {canExpire ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={handleExpire}
            >
              Marcar vencida
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}
