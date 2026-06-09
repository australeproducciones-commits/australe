"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import { reserveTicketsFormAction } from "@/lib/ticket-sales/actions";
import type { ReservationActionResult } from "@/lib/ticket-sales/types";
import { TICKET_PAYMENT_STATUS } from "@/lib/ticket-sales/types";
import {
  formatReservationExpiry,
  TICKET_PAYMENT_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";
import type { TicketType } from "@/lib/tickets/types";
import {
  formatTicketPrice,
  getStockAvailableLabel,
} from "@/lib/tickets/utils";

type TicketReservationFormProps = {
  eventSlug: string;
  eventName: string;
  ticketTypes: TicketType[];
  isLoggedIn: boolean;
  defaultBuyerName?: string;
};

const initialState: ReservationActionResult = { success: false };

export function TicketReservationForm({
  eventSlug,
  eventName,
  ticketTypes,
  isLoggedIn,
  defaultBuyerName = "",
}: TicketReservationFormProps) {
  const action = reserveTicketsFormAction.bind(null, eventSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.success) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
          Reserva creada
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">
          ¡Listo, {eventName}!
        </h2>
        <p className="mt-4 text-zinc-300">
          {state.ticketCount === 1
            ? "Se creó 1 entrada reservada."
            : `Se crearon ${state.ticketCount} entradas reservadas.`}
        </p>
        <p className="mt-2 text-purple-200">
          Queda pendiente de confirmación de pago.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          La reserva vence en 24 horas
          {state.reservationExpiresAt
            ? ` (${formatReservationExpiry(state.reservationExpiresAt)})`
            : ""}
          .
        </p>
        <p className="mt-6 text-sm leading-6 text-zinc-400">
          Si iniciaste sesión con tu cuenta, las entradas aparecerán en Mi
          Cuenta cuando estén vinculadas a tu perfil de comunidad. Si no, más
          adelante podrás buscarlas por WhatsApp o DNI.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href={ROUTES.miCuentaEntradas}>Ir a mis entradas</Button>
          <Button href={ROUTES.evento(eventSlug)} variant="outline">
            Volver al evento
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {!isLoggedIn ? (
        <Card padding="md" className="border-amber-400/30 bg-amber-400/10">
          <p className="text-sm text-amber-100">
            Para reservar necesitás una cuenta de cliente.{" "}
            <Link
              href={ROUTES.login}
              className="font-semibold text-white underline"
            >
              Iniciá sesión
            </Link>{" "}
            o registrate y volvé a esta página.
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {ticketTypes.map((ticketType) => (
          <Card key={ticketType.id} padding="md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">
                  {ticketType.name}
                </h3>
                {ticketType.description ? (
                  <p className="mt-1 text-sm text-zinc-400">
                    {ticketType.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-200">
                    Público: {formatTicketPrice(ticketType.public_price)}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                    Comunidad: {formatTicketPrice(ticketType.community_price)}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-400">
                    Disponibles: {getStockAvailableLabel(ticketType)}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <label
                  htmlFor={`qty_${ticketType.id}`}
                  className="mb-2 block text-xs uppercase tracking-wider text-zinc-400"
                >
                  Cantidad (máx. {ticketType.max_per_order})
                </label>
                <select
                  id={`qty_${ticketType.id}`}
                  name={`qty_${ticketType.id}`}
                  defaultValue="0"
                  disabled={!isLoggedIn || pending}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-purple-400 focus:outline-none sm:w-28"
                >
                  {Array.from(
                    { length: ticketType.max_per_order + 1 },
                    (_, i) => (
                      <option key={i} value={i} className="bg-zinc-900">
                        {i}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        <h3 className="text-lg font-bold text-white">Datos del comprador</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Pago manual por ahora: transferencia o efectivo según indique
          Australe.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="buyer_name"
              className="mb-2 block text-sm text-zinc-300"
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
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-400 focus:outline-none"
              placeholder="Nombre y apellido"
            />
          </div>

          <div>
            <label
              htmlFor="buyer_whatsapp"
              className="mb-2 block text-sm text-zinc-300"
            >
              WhatsApp
            </label>
            <input
              id="buyer_whatsapp"
              name="buyer_whatsapp"
              type="tel"
              disabled={!isLoggedIn || pending}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-400 focus:outline-none"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label
              htmlFor="buyer_dni"
              className="mb-2 block text-sm text-zinc-300"
            >
              DNI
            </label>
            <input
              id="buyer_dni"
              name="buyer_dni"
              type="text"
              disabled={!isLoggedIn || pending}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-400 focus:outline-none"
              placeholder="Opcional"
            />
          </div>
        </div>
      </Card>

      {state.error ? (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!isLoggedIn || pending}
      >
        {pending ? "Reservando…" : "Reservar entrada"}
      </Button>

      <p className="text-xs text-zinc-500">
        Estado inicial: {TICKET_PAYMENT_STATUS_LABELS[TICKET_PAYMENT_STATUS.PENDING]}. Sin pago online
        en esta versión.
      </p>
    </form>
  );
}
