"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildPublicKioskPickerLines,
  PublicEventKioskInlinePicker,
} from "@/components/kiosk/PublicEventKioskInlinePicker";
import { TicketReservationSuccess } from "@/components/ticket-sales/TicketReservationSuccess";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import { formatKioskMoney } from "@/lib/kiosk/utils";
import {
  reserveTicketsFormAction,
  reserveTicketsWithKioskFormAction,
} from "@/lib/ticket-sales/actions";
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
  onMakeAnother,
}: TicketReservationFormProps & { onMakeAnother: () => void }) {
  const hasKiosk = kioskProducts.length > 0;
  const action = (
    hasKiosk ? reserveTicketsWithKioskFormAction : reserveTicketsFormAction
  ).bind(null, event.slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [ticketQuantities, setTicketQuantities] = useState<
    Record<string, number>
  >({});
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
                  {formatCommunityPriceLabel(ticketType.community_price) ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                      Comunidad:{" "}
                      {formatCommunityPriceLabel(ticketType.community_price)}
                    </span>
                  ) : null}
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

      {hasKiosk ? (
        <Card padding="lg">
          <PublicEventKioskInlinePicker
            products={kioskProducts}
            value={kioskQuantities}
            onChange={setKioskQuantities}
            disabled={!isLoggedIn || pending}
          />
          <input type="hidden" name="kiosk_items" value={kioskItemsPayload} />
        </Card>
      ) : null}

      {(ticketLines.length > 0 || kioskLines.length > 0) && isLoggedIn ? (
        <Card padding="lg">
          <h3 className="text-lg font-bold text-white">Resumen</h3>

          {ticketLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Entradas
              </p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                {ticketLines.map((line) => (
                  <li
                    key={line.ticketType.id}
                    className="flex justify-between gap-4"
                  >
                    <span>
                      {line.ticketType.name} × {line.quantity}
                    </span>
                    <span className="shrink-0 text-white">
                      {formatTicketPrice(line.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between text-sm font-semibold text-white">
                <span>Subtotal entradas</span>
                <span>{formatTicketPrice(ticketsTotal)}</span>
              </p>
            </div>
          ) : null}

          {kioskLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Consumisiones
              </p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                {kioskLines.map((line) => (
                  <li
                    key={line.product.id}
                    className="flex justify-between gap-4"
                  >
                    <span>
                      {line.product.product_name} × {line.quantity}
                    </span>
                    <span className="shrink-0 text-white">
                      {formatKioskMoney(line.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between text-sm font-semibold text-white">
                <span>Subtotal consumisiones</span>
                <span>{formatKioskMoney(kioskTotal)}</span>
              </p>
            </div>
          ) : null}

          {ticketLines.length > 0 && kioskLines.length > 0 ? (
            <p className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base font-bold text-white">
              <span>Total general</span>
              <span>{formatTicketPrice(grandTotal)}</span>
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card padding="lg">
        <h3 className="text-lg font-bold text-white">Datos del comprador</h3>
        <p className="mt-1 text-sm text-zinc-400">
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
        {pending
          ? "Confirmando…"
          : kioskLines.length > 0
            ? "Reservar entrada y consumisiones"
            : "Reservar entrada"}
      </Button>

      <p className="text-xs text-zinc-500">
        Estado inicial: {TICKET_PAYMENT_STATUS_LABELS[TICKET_PAYMENT_STATUS.PENDING]}. Sin pago online
        en esta versión.
      </p>
    </form>
  );
}
