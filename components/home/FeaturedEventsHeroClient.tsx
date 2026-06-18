"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/lib/constants/routes";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import type { Event } from "@/lib/events/types";
import {
  formatEventDate,
  formatTime,
  getEventHeroBannerUrl,
} from "@/lib/events/utils";
import { cn } from "@/lib/utils/cn";

const AUTO_INTERVAL_MS = 6000;

const NEXT_IMAGE_HOSTS = [
  "i.postimg.cc",
  "postimg.cc",
  "res.cloudinary.com",
];

type FeaturedEventsHeroClientProps = {
  events: Event[];
};

export function FeaturedEventsHeroClient({
  events,
}: FeaturedEventsHeroClientProps) {
  const [index, setIndex] = useState(0);
  const count = events.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) {
        return;
      }
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (count <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTO_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) {
    return <FeaturedHeroEmpty />;
  }

  const event = events[index] ?? events[0];

  return (
    <section
      className="relative overflow-hidden border-b"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg)",
      }}
      aria-roledescription="carousel"
      aria-label="Eventos destacados"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        <article className="public-card overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-[1.2fr_1fr]">
            <Link
              href={ROUTES.evento(event.slug)}
              className="group relative block min-h-[240px] sm:min-h-[320px] lg:min-h-[420px]"
              aria-label={`Ver ${event.name}`}
            >
              <HeroSlideImage
                src={getEventHeroBannerUrl(event)}
                alt={event.name}
                priority={index === 0}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-[#8568CC]/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-[var(--public-card)]" />
            </Link>

            <div
              className="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-10"
              style={{ backgroundColor: "var(--public-card)" }}
            >
              <span className="mb-3 inline-flex w-fit">
                <StatusBadge tone="primary">Evento destacado</StatusBadge>
              </span>

              <Link href={ROUTES.evento(event.slug)} className="group">
                <h1 className="public-heading text-2xl font-black leading-tight transition group-hover:text-[var(--public-primary)] sm:text-3xl lg:text-4xl">
                  {event.name}
                </h1>
              </Link>

              {event.description ? (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed public-text-muted sm:text-base">
                  {event.description}
                </p>
              ) : null}

              <ul className="mt-5 space-y-2 text-sm public-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 public-label" aria-hidden>
                    ◆
                  </span>
                  <span>{formatEventDate(event.event_date)}</span>
                </li>
                {formatTime(event.start_time) ? (
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 public-label" aria-hidden>
                      ◆
                    </span>
                    <span>
                      {formatTime(event.start_time)}
                      {formatTime(event.end_time)
                        ? ` – ${formatTime(event.end_time)}`
                        : ""}
                    </span>
                  </li>
                ) : null}
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 public-label" aria-hidden>
                    ◆
                  </span>
                  <span>
                    {event.location_name ?? "Ubicación a confirmar"}
                    {event.address ? ` · ${event.address}` : ""}
                  </span>
                </li>
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={ROUTES.evento(event.slug)}
                  className="public-btn-primary rounded-2xl px-6 py-3.5 text-center text-sm font-semibold"
                >
                  Ver evento
                </Link>
                <HeroSecondaryAction event={event} />
              </div>
            </div>
          </div>
        </article>

        {count > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-[var(--public-card)]"
              style={{
                borderColor: "var(--public-border)",
                color: "var(--public-primary)",
                backgroundColor: "var(--public-card-tint)",
              }}
              aria-label="Evento anterior"
            >
              ‹
            </button>

            <div className="flex items-center gap-2" role="tablist">
              {events.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={dotIndex === index}
                  aria-label={`Ir a ${item.name}`}
                  onClick={() => goTo(dotIndex)}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    dotIndex === index
                      ? "w-8 bg-[var(--public-primary)]"
                      : "w-2.5 hover:bg-[var(--public-secondary)]",
                  )}
                  style={
                    dotIndex === index
                      ? undefined
                      : { backgroundColor: "var(--public-border)" }
                  }
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-[var(--public-card)]"
              style={{
                borderColor: "var(--public-border)",
                color: "var(--public-primary)",
                backgroundColor: "var(--public-card-tint)",
              }}
              aria-label="Siguiente evento"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HeroSecondaryAction({ event }: { event: Event }) {
  const hasExternal =
    (event.ticket_sale_mode === "external" ||
      event.ticket_sale_mode === "both") &&
    Boolean(event.external_ticket_url?.trim());

  if (hasExternal) {
    return (
      <a
        href={event.external_ticket_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="public-btn-outline rounded-2xl px-6 py-3.5 text-center text-sm font-semibold"
      >
        Comprar entrada
      </a>
    );
  }

  return (
    <Link
      href={ROUTES.eventoEntradas(event.slug)}
      className="public-btn-outline rounded-2xl px-6 py-3.5 text-center text-sm font-semibold"
    >
      Reservar / Ver entradas
    </Link>
  );
}

function HeroSlideImage({
  src,
  alt,
  priority,
}: {
  src: string | null;
  alt: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ background: "var(--public-image-fallback)" }}
      >
        <span className="text-4xl" style={{ color: "var(--public-secondary)" }}>
          ✦
        </span>
        <span className="mt-3 px-6 text-sm public-text-soft">
          Imagen próximamente
        </span>
      </div>
    );
  }

  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
    />
  );
}

function canUseNextImage(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return NEXT_IMAGE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(".postimg.cc"),
    );
  } catch {
    return false;
  }
}

function FeaturedHeroEmpty() {
  return (
    <section
      className="border-b"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="public-card mx-auto max-w-2xl rounded-3xl px-8 py-12 text-center">
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Cartelera
          </p>
          <h1 className="public-heading mt-4 text-3xl font-black sm:text-4xl">
            Próximos encuentros
          </h1>
          <p className="mt-4 text-base leading-relaxed public-text-muted">
            Muy pronto nuevas fechas de Australe Producciones.
          </p>
          <Link
            href={ROUTES.eventos}
            className="public-btn-primary mt-8 inline-flex rounded-2xl px-8 py-4 text-sm font-semibold"
          >
            Ver cartelera
          </Link>
        </div>
      </div>
    </section>
  );
}
