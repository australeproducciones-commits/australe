import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventCard } from "@/components/events/EventCard";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedEvents } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Eventos",
};

export default async function EventosPage() {
  const events = await getPublishedEvents();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
            Agenda
          </p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Próximos eventos
          </h1>
        </div>
        <p className="max-w-xl text-zinc-400">
          Eventos publicados de Australe Producciones.
        </p>
      </div>

      {events.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-xl font-bold text-white">
            Todavía no hay eventos publicados
          </h2>
          <p className="mt-2 text-zinc-400">
            Volvé pronto para ver la próxima fecha.
          </p>
          <Button href={ROUTES.home} variant="outline" className="mt-6">
            Volver al inicio
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
