import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventFlyer, EventPoster } from "@/components/events/EventFlyer";
import {
  EventPriceListLink,
  EventTicketActions,
} from "@/components/events/EventTicketActions";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { formatEventDateTime } from "@/lib/events/utils";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import {
  formatTicketPrice,
  getMinPublicPrice,
} from "@/lib/tickets/utils";

type EventoPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EventoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  return { title: event?.name ?? "Evento" };
}

export default async function EventoPage({ params }: EventoPageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  const activeTicketTypes = await getActiveTicketTypesForPublishedEvent(
    event.id,
    event.status,
  );
  const minPrice = getMinPublicPrice(activeTicketTypes);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <Button href={ROUTES.eventos} variant="ghost" size="sm" className="mb-6">
        ← Volver a eventos
      </Button>

      <EventFlyer event={event} purpose="hero" className="mb-8" />

      <Card padding="lg">
        <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
          Evento
        </p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-4 text-lg text-purple-200">{dateTimeLabel}</p>

        <EventPoster event={event} className="mt-8" />

        <div className="mt-6 grid gap-3 text-sm">
          {event.location_name ? (
            <div className="flex justify-between rounded-2xl bg-white/5 p-4">
              <span className="text-zinc-400">Lugar</span>
              <span>{event.location_name}</span>
            </div>
          ) : null}
          {event.address ? (
            <div className="flex justify-between gap-4 rounded-2xl bg-white/5 p-4">
              <span className="shrink-0 text-zinc-400">Dirección</span>
              <span className="text-right">{event.address}</span>
            </div>
          ) : null}
          {event.capacity != null ? (
            <div className="flex justify-between rounded-2xl bg-white/5 p-4">
              <span className="text-zinc-400">Capacidad</span>
              <span>{event.capacity}</span>
            </div>
          ) : null}
        </div>

        {event.description ? (
          <p className="mt-8 whitespace-pre-line leading-7 text-zinc-300">
            {event.description}
          </p>
        ) : null}

        {minPrice != null ? (
          <p className="mt-4 rounded-2xl border border-purple-400/20 bg-purple-400/10 px-4 py-3 text-sm text-purple-200">
            Entradas disponibles desde {formatTicketPrice(minPrice)}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          <EventTicketActions event={event} />
          <EventPriceListLink slug={event.slug} />
        </div>
      </Card>
    </div>
  );
}
