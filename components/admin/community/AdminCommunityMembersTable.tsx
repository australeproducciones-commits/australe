"use client";

import { useState, useTransition } from "react";
import { adjustMemberPointsAction } from "@/lib/community/loyalty/admin-actions";
import type { AdminCommunityMember } from "@/lib/community/loyalty/types";

type AdminCommunityMembersTableProps = {
  members: AdminCommunityMember[];
};

export function AdminCommunityMembersTable({
  members,
}: AdminCommunityMembersTableProps) {
  const [selected, setSelected] = useState<AdminCommunityMember | null>(null);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitAdjustment() {
    if (!selected) return;
    const amount = Number(points);
    if (!Number.isFinite(amount) || amount === 0) {
      setMessage("Ingresá una cantidad válida.");
      return;
    }
    const confirmed = window.confirm(
      `¿Ajustar ${amount} puntos a ${selected.fullName ?? selected.email}?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await adjustMemberPointsAction(selected.userId, amount, reason);
      setMessage(result.success ? "Ajuste aplicado." : result.error ?? "Error");
      if (result.success) {
        setPoints("");
        setReason("");
      }
    });
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Todavía no hay cuentas de puntos registradas.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Miembro</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2">Histórico</th>
              <th className="px-3 py-2">Nivel</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <p className="font-medium">{member.fullName ?? "—"}</p>
                  <p className="text-xs text-zinc-500">{member.email ?? member.fullName}</p>
                </td>
                <td className="px-3 py-2">{member.pointsBalance.toLocaleString("es-AR")}</td>
                <td className="px-3 py-2">{member.lifetimePoints.toLocaleString("es-AR")}</td>
                <td className="px-3 py-2">{member.levelName ?? "—"}</td>
                <td className="px-3 py-2">{member.status}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-violet-600 hover:underline"
                    onClick={() => {
                      setSelected(member);
                      setMessage(null);
                    }}
                  >
                    Ajustar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm font-semibold">
            Ajuste manual — {selected.fullName ?? selected.email}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              placeholder="Puntos (+ o -)"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="text"
              placeholder="Motivo obligatorio"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={submitAdjustment}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Aplicar ajuste
            </button>
            {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
