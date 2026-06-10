import Link from "next/link";
import { TicketCard } from "@/app/(public)/mi-cuenta/_components/TicketCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import type { CustomerTicket } from "@/lib/ticket-sales/types";
import { groupCustomerTicketsByStatus } from "@/lib/ticket-sales/utils";

type CustomerTicketsByStatusProps = {
  tickets: CustomerTicket[];
};

export function CustomerTicketsByStatus({
  tickets,
}: CustomerTicketsByStatusProps) {
  const sections = groupCustomerTicketsByStatus(tickets);

  if (sections.length === 0) {
    return (
      <div id="entradas">
        <Card padding="lg" className="text-center">
          <h2 className="text-xl font-bold text-white">Sin entradas todavía</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Cuando reserves entradas en eventos publicados, aparecerán acá con su
            código QR para validación en puerta.
          </p>
          <Button href={ROUTES.eventos} className="mt-6" variant="outline">
            Ver eventos
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div id="entradas" className="space-y-10">
      {sections.map((section) => (
        <section key={section.status}>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">{section.label}</h2>
            <p className="mt-1 text-sm text-zinc-400">{section.description}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {section.tickets.length} entrada
              {section.tickets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="space-y-4">
            {section.tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-center text-sm text-zinc-500">
        ¿Buscás más eventos?{" "}
        <Link href={ROUTES.eventos} className="text-purple-300 hover:text-purple-200">
          Ver cartelera
        </Link>
      </p>
    </div>
  );
}
