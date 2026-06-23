"use client";

import { useState, useTransition } from "react";
import { PublicButton, PublicCard } from "@/components/ui/public";
import { redeemCommunityRewardAction } from "@/lib/community/loyalty/actions";
import type { CommunityReward } from "@/lib/community/loyalty/types";

type CommunityRewardCardProps = {
  reward: CommunityReward;
  userBalance: number;
};

export function CommunityRewardCard({ reward, userBalance }: CommunityRewardCardProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const outOfStock = reward.stock !== null && reward.stock <= 0;
  const insufficient = userBalance < reward.points_cost;
  const disabled = pending || outOfStock || insufficient;

  function handleRedeem() {
    const confirmed = window.confirm(
      `¿Canjear "${reward.name}" por ${reward.points_cost.toLocaleString("es-AR")} puntos?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      setMessage(null);
      setCode(null);
      const result = await redeemCommunityRewardAction(reward.id);
      if (result.success) {
        setCode(result.redemptionCode ?? null);
        setMessage("¡Canje realizado! Guardá tu código.");
      } else {
        setMessage(result.error ?? "No se pudo canjear.");
      }
    });
  }

  return (
    <PublicCard padding="md" className="flex h-full flex-col">
      <div className="flex-1">
        <p className="public-heading text-base font-bold">{reward.name}</p>
        {reward.description ? (
          <p className="mt-1 text-sm public-text-muted line-clamp-3">{reward.description}</p>
        ) : null}
        <p className="mt-3 text-sm font-semibold public-text">
          {reward.points_cost.toLocaleString("es-AR")} pts
        </p>
        {reward.stock !== null ? (
          <p className="mt-1 text-xs public-text-soft">
            {outOfStock ? "Agotada" : `${reward.stock} disponibles`}
          </p>
        ) : null}
      </div>
      <div className="mt-4">
        {code ? (
          <p className="mb-2 rounded-lg bg-black/5 px-3 py-2 text-center text-sm font-mono font-semibold">
            {code}
          </p>
        ) : null}
        {message ? <p className="mb-2 text-xs public-text-muted">{message}</p> : null}
        <PublicButton
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={handleRedeem}
        >
          {outOfStock ? "Agotada" : insufficient ? "Puntos insuficientes" : "Canjear"}
        </PublicButton>
      </div>
    </PublicCard>
  );
}
