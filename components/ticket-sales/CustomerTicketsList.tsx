import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDate } from "@/lib/events/utils";
import type { CustomerTicket } from "@/lib/ticket-sales/types";
import {
  formatReservationExpiry,
  SALES_CHANNEL_LABELS,
  TICKET_PAYMENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

type CustomerTicketsListProps = {
  tickets: CustomerTicket[];
  hasCommunityLink: boolean;
};

export function CustomerTicketsList({
  tickets,
  hasCommunityLink,
}: CustomerTicketsListProps) {
  if (tickets.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <h2 className="text-xl font-bold text-white">Sin entradas todavía</h2>
        {!hasCommunityLink ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            En esta versión, las entradas se muestran cuando están vinculadas a
            tu perfil de comunidad Australe. Si reservaste sin membresía, tu
            entrada quedó registrada y podrás buscarla por WhatsApp o DNI en una
            próxima etapa.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            Cuando reserves entradas en eventos publicados, aparecerán acá.
          </p>
        )}
        <Button href={ROUTES.eventos} className="mt-6" variant="outline">
          Ver eventos
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id} padding="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-purple-300">
                {ticket.ticket_type_name ?? "Entrada"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {ticket.event_name}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {formatEventDate(ticket.event_date)}
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                Comprador: {ticket.buyer_name}
              </p>
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
              {ticket.reservation_expires_at &&
              ticket.ticket_status === "reserved" ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Vence: {formatReservationExpiry(ticket.reservation_expires_at)}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-white">
                {formatTicketPrice(ticket.price_paid)}
              </p>
              {ticket.event_slug ? (
                <Link
                  href={ROUTES.evento(ticket.event_slug)}
                  className="mt-2 inline-block text-sm text-purple-300 hover:text-purple-200"
                >
                  Ver evento
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
