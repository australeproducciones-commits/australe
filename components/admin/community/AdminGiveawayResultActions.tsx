"use client";

import { useTransition } from "react";
import {
  activateAlternateAction,
  markPrizeClaimedAction,
  markWinnerNotifiedAction,
} from "@/lib/community/giveaways/admin-actions";
import type { CommunityGiveawayWinner } from "@/lib/community/giveaways/types";

type AdminGiveawayResultActionsProps = {
  giveawayId: string;
  winners: CommunityGiveawayWinner[];
  isDrawn: boolean;
};

export function AdminGiveawayResultActions({
  giveawayId,
  winners,
  isDrawn,
}: AdminGiveawayResultActionsProps) {
  const [pending, startTransition] = useTransition();

  if (!isDrawn) {
    return (
      <p className="text-sm text-zinc-400">
        El sorteo aún no fue ejecutado. Usá el botón de arriba para sortear.
      </p>
    );
  }

  if (winners.length === 0) {
    return <p className="text-sm text-zinc-400">No hay ganadores registrados.</p>;
  }

  function run(action: () => Promise<{ success: boolean }>) {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900/80 text-left text-zinc-400">
          <tr>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Posición</th>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {winners.map((w) => (
            <tr key={w.id} className="border-t border-zinc-800">
              <td className="px-4 py-3">{w.winner_type}</td>
              <td className="px-4 py-3">{w.position}</td>
              <td className="px-4 py-3 font-mono text-xs">{w.user_id.slice(0, 8)}…</td>
              <td className="px-4 py-3">{w.status}</td>
              <td className="px-4 py-3 font-mono text-xs">{w.verification_code}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {w.status === "selected" ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-purple-400 hover:underline"
                      onClick={() =>
                        run(() => markWinnerNotifiedAction(w.id))
                      }
                    >
                      Notificado
                    </button>
                  ) : null}
                  {["selected", "notified"].includes(w.status) ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-emerald-400 hover:underline"
                      onClick={() => run(() => markPrizeClaimedAction(w.id))}
                    >
                      Reclamado
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-zinc-800 p-4">
        <button
          type="button"
          disabled={pending}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
          onClick={() => run(() => activateAlternateAction(giveawayId))}
        >
          Activar siguiente suplente
        </button>
      </div>
    </div>
  );
}
