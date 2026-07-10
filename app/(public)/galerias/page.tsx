import type { Metadata } from "next";
import Link from "next/link";
import { GalleryEventCard } from "@/components/gallery/GalleryEventCard";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { ROUTES } from "@/lib/constants/routes";
import { getFinishedGalleryEvents } from "@/lib/events/gallery/queries";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";

import type { Event } from "@/lib/events/types";

export const metadata: Metadata = {
  title: "Galerías",
  description: "Fotos y videos de eventos finalizados de Australe Producciones.",
};

export default async function GaleriasPage() {
  let events: Event[] = [];
  let loadError: string | null = null;

  try {
    events = await getFinishedGalleryEvents();
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-10 text-center">
        <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
          Recuerdos
        </p>
        <h1
          className="public-heading public-page-title mx-auto mt-3 text-3xl font-black tracking-tight sm:text-4xl"
          style={{ textWrap: "balance" }}
        >
          Galerías
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm public-text-soft">
          Reviví los momentos de nuestros eventos finalizados.
        </p>
      </div>

      {loadError ? (
        <PublicQueryError message={loadError} />
      ) : events.length === 0 ? (
        <div className="public-card rounded-3xl p-10 text-center">
          <p className="public-text-soft">
            Todavía no hay eventos finalizados en la galería.
          </p>
          <Link
            href={ROUTES.eventos}
            className="public-btn-outline mt-8 inline-flex rounded-2xl px-6 py-3 text-sm font-semibold"
          >
            Ver próximos eventos
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <GalleryEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
