"use client";

import { useState, useTransition } from "react";
import {
  saveCommunityRewardAction,
  toggleCommunityRewardAction,
} from "@/lib/community/loyalty/admin-actions";
import type { CommunityReward } from "@/lib/community/loyalty/types";

type AdminCommunityRewardsPanelProps = {
  rewards: CommunityReward[];
};

export function AdminCommunityRewardsPanel({
  rewards,
}: AdminCommunityRewardsPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("500");
  const [stock, setStock] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const result = await saveCommunityRewardAction({
        name,
        description,
        points_cost: Number(pointsCost),
        stock: stock.trim() ? Number(stock) : null,
        is_active: true,
        max_per_user: null,
      });
      setMessage(result.success ? "Recompensa creada." : result.error ?? "Error");
      if (result.success) {
        setName("");
        setDescription("");
        setStock("");
      }
    });
  }

  function handleToggle(reward: CommunityReward) {
    startTransition(async () => {
      await toggleCommunityRewardAction(reward.id, !reward.is_active);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">Nueva recompensa</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={pointsCost}
            onChange={(e) => setPointsCost(e.target.value)}
            type="number"
            placeholder="Costo en puntos"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            type="number"
            placeholder="Stock (vacío = ilimitado)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={handleCreate}
          className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Crear recompensa
        </button>
        {message ? <p className="mt-2 text-xs text-zinc-500">{message}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Costo</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <p className="font-medium">{reward.name}</p>
                  {reward.description ? (
                    <p className="text-xs text-zinc-500 line-clamp-1">{reward.description}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2">{reward.points_cost.toLocaleString("es-AR")}</td>
                <td className="px-3 py-2">
                  {reward.stock === null ? "∞" : reward.stock}
                </td>
                <td className="px-3 py-2">
                  {reward.is_active ? "Activa" : "Inactiva"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleToggle(reward)}
                    className="text-xs font-semibold text-violet-600 hover:underline"
                  >
                    {reward.is_active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
