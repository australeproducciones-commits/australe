"use client";

import { useState, useTransition } from "react";
import { PublicButton, PublicCard } from "@/components/ui/public";
import { enterGiveawayAction } from "@/lib/community/giveaways/actions";
import type {
  CommunityGiveaway,
  GiveawayEligibility,
  GiveawayUserParticipation,
} from "@/lib/community/giveaways/types";
import { getGiveawayVisualStatus } from "@/lib/community/giveaways/utils";

type GiveawayParticipatePanelProps = {
  giveaway: CommunityGiveaway;
  eligibility: GiveawayEligibility;
  participation: GiveawayUserParticipation | null;
  isAuthenticated: boolean;
};

export function GiveawayParticipatePanel({
  giveaway,
  eligibility,
  participation,
  isAuthenticated,
}: GiveawayParticipatePanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [requestId] = useState(() => crypto.randomUUID());

  const visualStatus = getGiveawayVisualStatus(giveaway, {
    user_chances: participation?.total_chances ?? 0,
    is_winner: participation?.is_winner ?? false,
    is_alternate: participation?.is_alternate ?? false,
    winner_claimed: participation?.winner_record?.status === "claimed",
  });

  const needsPointsConfirm =
    giveaway.entry_type === "points" || giveaway.entry_type === "mixed";

  function handleParticipate() {
    if (needsPointsConfirm) {
      const confirmed = window.confirm(
        `¿Participar por ${giveaway.points_cost.toLocaleString("es-AR")} puntos?`,
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      setMessage(null);
      const result = await enterGiveawayAction(giveaway.slug, 1, requestId);
      if (result.success) {
        setMessage(
          `¡Participación confirmada! Tenés ${result.total_user_chances ?? 1} chance(s).`,
        );
      } else {
        setMessage(result.error ?? "No se pudo participar.");
      }
    });
  }

  return (
    <PublicCard padding="md" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold public-text">Tu participación</p>
        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
          {visualStatus}
        </span>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm public-text-muted">
          Iniciá sesión para participar en este sorteo.
        </p>
      ) : (
        <>
          <div className="grid gap-2 text-sm public-text-muted sm:grid-cols-2">
            <p>Saldo: {eligibility.points_balance.toLocaleString("es-AR")} pts</p>
            <p>Tus chances: {participation?.total_chances ?? 0}</p>
            {giveaway.entry_type === "points" ? (
              <p>Costo: {giveaway.points_cost.toLocaleString("es-AR")} pts</p>
            ) : null}
            {giveaway.max_entries_per_user ? (
              <p>Máximo: {giveaway.max_entries_per_user} chances</p>
            ) : null}
          </div>

          {message ? <p className="text-sm public-text-muted">{message}</p> : null}

          {participation?.winner_record &&
          ["selected", "notified"].includes(participation.winner_record.status) ? (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              ¡Felicitaciones! Fuiste seleccionado/a como{" "}
              {participation.is_alternate ? "suplente" : "ganador/a"}.
            </p>
          ) : null}

          {eligibility.eligible ? (
            <PublicButton
              type="button"
              className="w-full"
              disabled={pending}
              onClick={handleParticipate}
            >
              {pending ? "Procesando…" : "Participar"}
            </PublicButton>
          ) : (
            <p className="text-sm text-amber-200/90">
              {eligibility.reason ?? "No podés participar en este momento."}
            </p>
          )}
        </>
      )}
    </PublicCard>
  );
}
