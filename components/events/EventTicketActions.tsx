import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import {
  TICKET_SALE_MODE,
  type TicketSaleMode,
} from "@/lib/constants/event-status";
import type { Event } from "@/lib/events/types";

type EventTicketActionsProps = {
  event: Pick<Event, "slug" | "ticket_sale_mode" | "external_ticket_url">;
};

export function EventTicketActions({ event }: EventTicketActionsProps) {
  const mode = event.ticket_sale_mode as TicketSaleMode;

  if (mode === TICKET_SALE_MODE.DISABLED) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center text-zinc-400">
        Entradas no disponibles
      </p>
    );
  }

  if (mode === TICKET_SALE_MODE.INTERNAL) {
    return (
      <Button href={ROUTES.eventoEntradas(event.slug)} size="lg" className="w-full">
        Comprar entradas
      </Button>
    );
  }

  if (mode === TICKET_SALE_MODE.EXTERNAL) {
    if (!event.external_ticket_url) {
      return (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center text-zinc-400">
          Entradas no disponibles
        </p>
      );
    }

    return (
      <Button
        href={event.external_ticket_url}
        size="lg"
        className="w-full"
        target="_blank"
        rel="noopener noreferrer"
      >
        Comprar entradas
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button href={ROUTES.eventoEntradas(event.slug)} size="lg" className="w-full">
        Comprar entradas
      </Button>
      {event.external_ticket_url ? (
        <Button
          href={event.external_ticket_url}
          variant="outline"
          size="lg"
          className="w-full"
          target="_blank"
          rel="noopener noreferrer"
        >
          Comprar en link externo
        </Button>
      ) : null}
    </div>
  );
}

export function EventPriceListLink({ slug }: { slug: string }) {
  return (
    <Link
      href={ROUTES.eventoListaPrecios(slug)}
      className="text-sm text-purple-300 transition hover:text-purple-200"
    >
      Ver lista de precios →
    </Link>
  );
}
