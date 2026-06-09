import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventFlyer } from "@/components/events/EventFlyer";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDate, formatEventDateTime } from "@/lib/events/utils";

type EventCardProps = {
  event: Event;
  showFullDateTime?: boolean;
};

export function EventCard({ event, showFullDateTime = false }: EventCardProps) {
  const dateLabel = showFullDateTime
    ? formatEventDateTime(event.event_date, event.start_time, event.end_time)
    : formatEventDate(event.event_date);

  return (
    <Card className="transition hover:-translate-y-1 hover:bg-white/[0.07]">
      <EventFlyer event={event} purpose="card" />
      <p className="mt-4 text-sm text-purple-300">{dateLabel}</p>
      <h3 className="mt-2 text-2xl font-bold">{event.name}</h3>
      <p className="mt-2 text-zinc-400">
        {event.location_name ?? "Lugar a confirmar"}
      </p>
      <Button href={ROUTES.evento(event.slug)} className="mt-6 w-full">
        Ver evento
      </Button>
    </Card>
  );
}
