import { Card } from "@/components/ui/Card";
import { AdminTicketCard } from "@/components/ticket-sales/AdminTicketCard";
import type { TicketWithTypeName } from "@/lib/ticket-sales/types";

type AdminTicketsListProps = {
  tickets: TicketWithTypeName[];
  totalCount: number;
  isFiltered: boolean;
  onViewTicket: (ticket: TicketWithTypeName) => void;
};

export function AdminTicketsList({
  tickets,
  totalCount,
  isFiltered,
  onViewTicket,
}: AdminTicketsListProps) {
  if (totalCount === 0) {
    return (
      <Card padding="lg" className="text-center">
        <h2 className="text-xl font-bold text-white">
          Sin ventas ni reservas
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Cuando alguien reserve desde la web, las entradas aparecerán acá para
          confirmar o cancelar el pago.
        </p>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <h2 className="text-xl font-bold text-white">
          Sin resultados
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Ninguna entrada coincide con el filtro o la búsqueda actual.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        {isFiltered
          ? `${tickets.length} de ${totalCount} entrada${totalCount === 1 ? "" : "s"}`
          : `${tickets.length} entrada${tickets.length === 1 ? "" : "s"} en total`}
      </p>
      {tickets.map((ticket) => (
        <AdminTicketCard
          key={ticket.id}
          ticket={ticket}
          onViewTicket={onViewTicket}
        />
      ))}
    </div>
  );
}
