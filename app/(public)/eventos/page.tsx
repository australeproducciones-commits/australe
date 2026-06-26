import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { ROUTES } from "@/lib/constants/routes";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import { filterCarteleraEvents } from "@/lib/events/filters";
import { getPublishedEvents } from "@/lib/events/queries";
import type { Event } from "@/lib/events/types";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";

export const metadata: Metadata = {
  title: "Cartelera",
};

export default async function EventosPage() {
  let events: Event[] = [];
  let loadError: string | null = null;

  try {
    events = await getPublishedEvents();
    events = filterCarteleraEvents(events);
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  const carteleraItems = loadError ? [] : await buildCarteleraEvents(events);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-10 text-center">
        <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
          Cartelera
        </p>
        <h1
          className="public-heading public-page-title mx-auto mt-3 text-3xl font-black tracking-tight sm:text-4xl"
          style={{ textWrap: "balance" }}
        >
          Próximos eventos
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm public-text-soft">
          Eventos publicados de Australe Producciones.
        </p>
      </div>

      {loadError ? (
        <PublicQueryError message={loadError} />
      ) : carteleraItems.length === 0 ? (
        <div className="public-card rounded-3xl p-10 text-center">
          <h2 className="public-heading text-xl font-bold">
            Cartelera en preparación
          </h2>
          <p className="mt-2 text-sm public-text-soft">
            Volvé pronto para ver la próxima fecha.
          </p>
          <Link
            href={ROUTES.home}
            className="public-btn-outline mt-8 inline-flex rounded-2xl px-6 py-3 text-sm font-semibold"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {carteleraItems.map((item) => (
            <EventCard
              key={item.event.id}
              event={item.event}
              minPrice={item.minPrice}
              minCommunityPrice={item.minCommunityPrice}
              featured={item.featured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
