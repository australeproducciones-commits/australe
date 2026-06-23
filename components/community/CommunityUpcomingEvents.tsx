import Link from "next/link";
import { PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { CommunityUpcomingEvent } from "@/lib/community/loyalty/types";

type CommunityUpcomingEventsProps = {
  events: CommunityUpcomingEvent[];
};

export function CommunityUpcomingEvents({ events }: CommunityUpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <PublicCard padding="md">
        <p className="text-sm public-text-soft">No tenés eventos próximos con entradas confirmadas.</p>
      </PublicCard>
    );
  }

  return (
    <PublicCard padding="none" className="overflow-hidden">
      <ul className="divide-y divide-black/5">
        {events.map((event) => (
          <li key={event.ticketId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{event.eventName}</p>
              <p className="text-xs public-text-muted">
                {new Date(event.eventDate + "T12:00:00").toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            {event.eventSlug ? (
              <Link href={ROUTES.evento(event.eventSlug)} className="public-link text-xs font-semibold">
                Ver
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </PublicCard>
  );
}
