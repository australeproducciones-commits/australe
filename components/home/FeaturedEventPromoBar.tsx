"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDateShort } from "@/lib/events/utils";

type FeaturedEventPromoBarProps = {
  events: Event[];
};

export function FeaturedEventPromoBar({ events }: FeaturedEventPromoBarProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % events.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="border-b border-[#E8DDF8] bg-[#F1E8FF] px-4 py-2.5 text-center text-sm text-[#6F647C]">
        <Link href={ROUTES.comunidad} className="font-medium text-[#8568CC] hover:underline">
          Sumate a la comunidad Australe
        </Link>
      </div>
    );
  }

  const event = events[index] ?? events[0];
  const promoLabel =
    event.featured_ticket_label?.trim() || "Evento destacado";

  return (
    <div className="border-b border-[#E8DDF8] bg-gradient-to-r from-[#9B7EDE] to-[#C8B6FF] px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm sm:flex-row">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {promoLabel}
          </span>
          <span className="truncate font-semibold">{event.name}</span>
          <span className="text-white/85">
            {formatEventDateShort(event.event_date)}
          </span>
        </div>
        <Link
          href={ROUTES.evento(event.slug)}
          className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#8568CC] transition hover:bg-[#FFF9F4]"
        >
          Ver evento
        </Link>
      </div>
    </div>
  );
}
