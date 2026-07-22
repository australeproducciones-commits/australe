"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/public";
import { PublicCard } from "@/components/ui/public/PublicCard";
import type { GiveawayListItem } from "@/lib/community/giveaways/types";
import {
  entryTypeLabel,
  getGiveawayVisualStatus,
} from "@/lib/community/giveaways/utils";
import { ROUTES } from "@/lib/constants/routes";

type GiveawayCardProps = {
  giveaway: GiveawayListItem;
};

export function GiveawayCard({ giveaway }: GiveawayCardProps) {
  const visualStatus = getGiveawayVisualStatus(giveaway);
  const closesLabel = giveaway.closes_at
    ? new Date(giveaway.closes_at).toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Sin fecha de cierre";

  return (
    <Link href={ROUTES.comunidadSorteo(giveaway.slug)} className="group block h-full">
      <PublicCard
        padding="none"
        className="flex h-full flex-col overflow-hidden transition hover:shadow-lg hover:shadow-purple-500/10"
      >
        <div className="relative aspect-[16/9] bg-gradient-to-br from-purple-900/40 via-zinc-900 to-black">
          {giveaway.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={giveaway.image_url}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-purple-200/80">Sorteo Comunidad</p>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge tone="community">{visualStatus}</StatusBadge>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="public-heading text-lg font-bold">{giveaway.name}</h3>
          {giveaway.short_description ? (
            <p className="mt-2 line-clamp-2 text-sm public-text-muted">
              {giveaway.short_description}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-purple-300">
            {giveaway.prize_description}
          </p>
          <div className="mt-4 space-y-1 text-xs public-text-soft">
            <p>{entryTypeLabel(giveaway.entry_type)}</p>
            {giveaway.entry_type === "points" ? (
              <p>{giveaway.points_cost.toLocaleString("es-AR")} puntos por participación</p>
            ) : null}
            <p>Cierre: {closesLabel}</p>
            {giveaway.participant_count !== undefined ? (
              <p>
                {giveaway.participant_count} participantes · {giveaway.total_chances ?? 0} chances
              </p>
            ) : null}
          </div>
          <span className="mt-4 inline-flex text-sm font-medium text-purple-400 group-hover:text-purple-300">
            Ver sorteo →
          </span>
        </div>
      </PublicCard>
    </Link>
  );
}
