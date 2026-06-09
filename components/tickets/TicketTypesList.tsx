import { Card } from "@/components/ui/Card";
import { TicketTypeCard } from "@/components/tickets/TicketTypeCard";
import type { TicketType } from "@/lib/tickets/types";

type TicketTypesListProps = {
  ticketTypes: TicketType[];
};

export function TicketTypesList({ ticketTypes }: TicketTypesListProps) {
  if (ticketTypes.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <h2 className="text-xl font-bold text-white">
          Sin tipos de entrada todavía
        </h2>
        <p className="mt-2 text-zinc-400">
          Creá el primer tipo de entrada para este evento.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ticketTypes.map((ticketType) => (
        <TicketTypeCard key={ticketType.id} ticketType={ticketType} />
      ))}
    </div>
  );
}
