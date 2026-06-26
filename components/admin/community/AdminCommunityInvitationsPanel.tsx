"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cancelCommunityInvitationAction } from "@/lib/community/invitations/actions";
import type { AdminInvitationListItem } from "@/lib/community/invitations/admin-queries";
import { INVITATION_STATUS } from "@/lib/community/invitations/types";
import { ROUTES } from "@/lib/constants/routes";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  prepared: "Preparada",
  sent: "Enviada",
  opened: "Abierta",
  accepted: "Aceptada",
  used: "Utilizada",
  expired: "Vencida",
  cancelled: "Cancelada",
  failed: "Fallida",
};

const CANCELLABLE_STATUSES = new Set<string>([
  INVITATION_STATUS.DRAFT,
  INVITATION_STATUS.PREPARED,
  INVITATION_STATUS.SENT,
  INVITATION_STATUS.OPENED,
]);

type AdminCommunityInvitationsPanelProps = {
  result: {
    items: AdminInvitationListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  initialStatus: string;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const tone =
    status === "accepted" || status === "used"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "cancelled" || status === "expired" || status === "failed"
        ? "bg-zinc-500/15 text-zinc-400"
        : status === "opened" || status === "sent"
          ? "bg-purple-500/15 text-purple-300"
          : "bg-white/10 text-zinc-300";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function AdminCommunityInvitationsPanel({
  result,
  initialStatus,
}: AdminCommunityInvitationsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(
        qs
          ? `${ROUTES.adminComunidadInvitaciones}?${qs}`
          : ROUTES.adminComunidadInvitaciones,
      );
    },
    [router, searchParams],
  );

  function handleCancel(id: string) {
    if (!window.confirm("¿Cancelar esta invitación?")) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await cancelCommunityInvitationAction(id);
      if (res.success) {
        setMessage("Invitación cancelada.");
        router.refresh();
      } else {
        setMessage(res.error ?? "No se pudo cancelar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              pushParams({ status: next || undefined, page: undefined });
            }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white sm:w-56"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-zinc-500">
          {result.total} invitación{result.total === 1 ? "" : "es"}
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
          {message}
        </p>
      ) : null}

      {result.items.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin invitaciones para mostrar.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Destinatario</th>
                  <th className="px-3 py-2">Evento</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Creada</th>
                  <th className="px-3 py-2">Vence</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {result.items.map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-2">
                      <div className="font-medium text-white">
                        {row.userName ?? "Sin nombre"}
                      </div>
                      <div className="text-xs text-zinc-500">{row.userEmail ?? row.userId.slice(0, 8)}</div>
                    </td>
                    <td className="px-3 py-2">{row.eventName}</td>
                    <td className="px-3 py-2">{statusBadge(row.status)}</td>
                    <td className="px-3 py-2 capitalize">{row.channel}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.expiresAt)}</td>
                    <td className="px-3 py-2 text-right">
                      {CANCELLABLE_STATUSES.has(row.status) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleCancel(row.id)}
                          className="text-xs text-red-300 hover:underline disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{row.userName ?? "Sin nombre"}</p>
                    <p className="text-xs text-zinc-500">{row.eventName}</p>
                  </div>
                  {statusBadge(row.status)}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Creada {formatDate(row.createdAt)} · Vence {formatDate(row.expiresAt)}
                </p>
                {CANCELLABLE_STATUSES.has(row.status) ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleCancel(row.id)}
                    className="mt-3 text-xs text-red-300 hover:underline disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={result.page <= 1}
            onClick={() => pushParams({ page: String(result.page - 1) })}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-zinc-500">
            Página {result.page} de {result.totalPages}
          </span>
          <button
            type="button"
            disabled={result.page >= result.totalPages}
            onClick={() => pushParams({ page: String(result.page + 1) })}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}

      <p className="text-xs text-zinc-600">
        Para invitar desde la lista de usuarios, usá{" "}
        <Link href={ROUTES.adminComunidadUsuarios} className="text-purple-300 hover:underline">
          Usuarios
        </Link>
        .
      </p>
    </div>
  );
}
