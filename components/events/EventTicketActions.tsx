import Link from "next/link";
import { PublicButton } from "@/components/ui/public/PublicButton";
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
      <p className="public-muted-box">
        Entradas no disponibles
      </p>
    );
  }

  if (mode === TICKET_SALE_MODE.INTERNAL) {
    return (
      <PublicButton href={ROUTES.eventoEntradas(event.slug)} size="lg" className="w-full">
        Comprar entradas
      </PublicButton>
    );
  }

  if (mode === TICKET_SALE_MODE.EXTERNAL) {
    if (!event.external_ticket_url) {
      return (
        <p className="public-muted-box">
          Entradas no disponibles
        </p>
      );
    }

    return (
      <PublicButton
        href={event.external_ticket_url}
        size="lg"
        className="w-full"
        target="_blank"
        rel="noopener noreferrer"
      >
        Comprar entradas
      </PublicButton>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PublicButton href={ROUTES.eventoEntradas(event.slug)} size="lg" className="w-full">
        Comprar entradas
      </PublicButton>
      {event.external_ticket_url ? (
        <PublicButton
          href={event.external_ticket_url}
          variant="outline"
          size="lg"
          className="w-full"
          target="_blank"
          rel="noopener noreferrer"
        >
          Comprar en link externo
        </PublicButton>
      ) : null}
    </div>
  );
}

export function EventPriceListLink({ slug }: { slug: string }) {
  return (
    <Link href={ROUTES.eventoListaPrecios(slug)} className="public-link text-sm">
      Ver lista de precios →
    </Link>
  );
}
