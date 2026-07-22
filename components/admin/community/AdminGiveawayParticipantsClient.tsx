"use client";

import { useState, useTransition } from "react";
import {
  disqualifyEntryAction,
  exportParticipantsCsvAction,
} from "@/lib/community/giveaways/admin-actions";
import type { GiveawayAdminParticipant } from "@/lib/community/giveaways/types";

type AdminGiveawayParticipantsClientProps = {
  giveawayId: string;
  participants: GiveawayAdminParticipant[];
};

export function AdminGiveawayParticipantsClient({
  giveawayId,
  participants: initial,
}: AdminGiveawayParticipantsClientProps) {
  const [search, setSearch] = useState("");
  const [participants] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = participants.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.source_type.toLowerCase().includes(q)
    );
  });

  const totalChances = participants
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + p.entry_quantity, 0);
  const totalPoints = participants.reduce((s, p) => s + p.points_spent, 0);

  function handleExport() {
    startTransition(async () => {
      const result = await exportParticipantsCsvAction(giveawayId);
      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `participantes-${giveawayId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setMessage(result.error ?? "No se pudo exportar.");
      }
    });
  }

  function handleDisqualify(entryId: string) {
    const reason = window.prompt("Motivo de descalificación:");
    if (!reason?.trim()) return;
    startTransition(async () => {
      const result = await disqualifyEntryAction(entryId, reason);
      setMessage(result.success ? "Participación descalificada." : result.error ?? "Error");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email u origen"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={handleExport}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
        >
          Exportar CSV
        </button>
      </div>
      <p className="text-sm text-zinc-400">
        {filtered.length} registro(s) · {totalChances} chances activas · {totalPoints} pts
        utilizados
      </p>
      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Chances</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Puntos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.entry_id} className="border-t border-zinc-800">
                <td className="px-4 py-3">{p.full_name ?? "—"}</td>
                <td className="px-4 py-3">{p.email ?? "—"}</td>
                <td className="px-4 py-3">{p.entry_quantity}</td>
                <td className="px-4 py-3">{p.source_type}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.points_spent}</td>
                <td className="px-4 py-3">
                  {p.status === "active" ? (
                    <button
                      type="button"
                      className="text-red-400 hover:underline"
                      onClick={() => handleDisqualify(p.entry_id)}
                    >
                      Descalificar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
