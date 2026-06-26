"use client";

import { useState } from "react";
import { EventImage } from "@/components/events/EventImage";
import { parseGalleryVideoInput } from "@/lib/events/gallery/utils";
import type { EventGalleryItem } from "@/lib/events/gallery/types";
import type { Event } from "@/lib/events/types";
import { formatPublicEventDate } from "@/lib/events/formatPublicEventDate";
import { cn } from "@/lib/utils/cn";

type GalleryDetailViewProps = {
  event: Event;
  items: EventGalleryItem[];
};

export function GalleryDetailView({ event, items }: GalleryDetailViewProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const dateLabel = event.event_date
    ? formatPublicEventDate(
        event.event_date,
        event.start_time,
        event.end_time,
        event.event_end_date,
      )
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="public-card overflow-hidden rounded-3xl">
        <EventImage
          event={event}
          alt={event.name}
          variant="banner"
          roundedClass="rounded-none"
          className="aspect-[21/9] w-full border-0"
          sizes="100vw"
        />
        <div className="space-y-3 p-6 sm:p-8">
          <p className="public-label text-xs font-semibold uppercase tracking-[0.28em]">
            Galería
          </p>
          <h1 className="public-heading text-3xl font-black sm:text-4xl">{event.name}</h1>
          {dateLabel ? <p className="public-text-soft">{dateLabel}</p> : null}
          {event.location_name ? (
            <p className="public-text-soft">{event.location_name}</p>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="public-card mt-8 rounded-3xl p-10 text-center">
          <p className="public-text-soft">
            Próximamente vamos a compartir las fotos y videos de este evento.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            if (item.media_type === "image") {
              const thumb = item.thumbnail_url ?? item.media_url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLightboxUrl(item.media_url)}
                  className="public-card group overflow-hidden rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={item.caption ?? `Foto de ${event.name}`}
                    className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  {item.caption ? (
                    <p className="p-4 text-sm public-text-soft">{item.caption}</p>
                  ) : null}
                </button>
              );
            }

            const parsed = parseGalleryVideoInput(item.media_type, item.media_url);
            if (!parsed) return null;

            return (
              <div key={item.id} className="public-card overflow-hidden rounded-2xl">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={parsed.embedUrl}
                    title={item.caption ?? `Video de ${event.name}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {item.caption ? (
                  <p className="p-4 text-sm public-text-soft">{item.caption}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-2 text-white"
            onClick={() => setLightboxUrl(null)}
          >
            Cerrar
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Vista ampliada"
            className={cn("max-h-[90vh] max-w-full rounded-2xl object-contain")}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
