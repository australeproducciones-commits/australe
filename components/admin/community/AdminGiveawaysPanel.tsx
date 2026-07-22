"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  cancelGiveawayAction,
  drawGiveawayAction,
  updateGiveawayStatusAction,
} from "@/lib/community/giveaways/admin-actions";
import type { CommunityGiveaway } from "@/lib/community/giveaways/types";
import { statusLabel } from "@/lib/community/giveaways/utils";
import { ROUTES } from "@/lib/constants/routes";

type AdminGiveawaysPanelProps = {
  giveaways: CommunityGiveaway[];
};

export function AdminGiveawaysPanel({ giveaways }: AdminGiveawaysPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.success ? "Acción completada." : result.error ?? "Error");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{giveaways.length} sorteo(s)</p>
        <Link
          href={ROUTES.adminComunidadSorteosNuevo}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
        >
          Nuevo sorteo
        </Link>
      </div>

      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {giveaways.map((g) => (
              <tr key={g.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">
                  <Link
                    href={ROUTES.adminComunidadSorteo(g.id)}
                    className="font-medium text-white hover:text-purple-300"
                  >
                    {g.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{statusLabel(g.status)}</td>
                <td className="px-4 py-3">{g.entry_type}</td>
                <td className="px-4 py-3">
                  {g.closes_at
                    ? new Date(g.closes_at).toLocaleString("es-AR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {g.status === "draft" ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-purple-400 hover:underline"
                        onClick={() =>
                          runAction(() => updateGiveawayStatusAction(g.id, "scheduled"))
                        }
                      >
                        Programar
                      </button>
                    ) : null}
                    {["draft", "scheduled"].includes(g.status) ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-purple-400 hover:underline"
                        onClick={() =>
                          runAction(() => updateGiveawayStatusAction(g.id, "active"))
                        }
                      >
                        Activar
                      </button>
                    ) : null}
                    {g.status === "active" ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-amber-400 hover:underline"
                        onClick={() =>
                          runAction(() => updateGiveawayStatusAction(g.id, "closed"))
                        }
                      >
                        Cerrar
                      </button>
                    ) : null}
                    {["active", "closed"].includes(g.status) ? (
                      <Link
                        href={ROUTES.adminComunidadSorteoResultado(g.id)}
                        className="text-emerald-400 hover:underline"
                      >
                        Sortear
                      </Link>
                    ) : null}
                    {!["drawn", "cancelled"].includes(g.status) ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-red-400 hover:underline"
                        onClick={() => {
                          const reason = window.prompt("Motivo de cancelación:");
                          if (!reason) return;
                          runAction(() => cancelGiveawayAction(g.id, reason));
                        }}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type AdminGiveawayDrawModalProps = {
  giveaway: CommunityGiveaway;
  participantCount: number;
  totalChances: number;
};

export function AdminGiveawayDrawModal({
  giveaway,
  participantCount,
  totalChances,
}: AdminGiveawayDrawModalProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDraw() {
    startTransition(async () => {
      const result = await drawGiveawayAction(giveaway.id);
      if (result.success) {
        setMessage(
          result.already_drawn
            ? "El sorteo ya había sido ejecutado."
            : `Sorteo realizado: ${result.winners ?? 0} ganador(es), ${result.alternates ?? 0} suplente(s).`,
        );
        setOpen(false);
      } else {
        setMessage(result.error ?? "No se pudo ejecutar el sorteo.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Ejecutar sorteo
      </button>
      {message ? <p className="mt-3 text-sm text-zinc-300">{message}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold text-white">Confirmar ejecución</h3>
            <p className="mt-2 text-sm text-zinc-300">{giveaway.name}</p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-400">
              <li>Participantes: {participantCount}</li>
              <li>Total chances: {totalChances}</li>
              <li>Ganadores: {giveaway.winner_count}</li>
              <li>Suplentes: {giveaway.alternate_count}</li>
              <li>
                Cierre:{" "}
                {giveaway.closes_at
                  ? new Date(giveaway.closes_at).toLocaleString("es-AR")
                  : "—"}
              </li>
            </ul>
            <p className="mt-4 text-sm text-amber-300">
              Esta acción es definitiva e irreversible desde la interfaz normal.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                onClick={handleDraw}
              >
                {pending ? "Ejecutando…" : "Confirmar sorteo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
