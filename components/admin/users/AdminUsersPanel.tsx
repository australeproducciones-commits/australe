"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { StaffRoleBadge } from "@/components/admin/users/StaffRoleBadge";
import { ROUTES } from "@/lib/constants/routes";
import { INTERNAL_ROLE_LABELS } from "@/lib/constants/roles";
import { ROLES } from "@/lib/constants/roles";
import {
  sendInternalUserPasswordResetAction,
  toggleInternalUserActiveAction,
} from "@/lib/users/actions";
import type {
  InternalUserListItem,
  InternalUsersSummary,
} from "@/lib/users/types";
import { cn } from "@/lib/utils/cn";

type EventOption = {
  id: string;
  name: string;
  event_date: string;
};

type AdminUsersPanelProps = {
  users: InternalUserListItem[];
  summary: InternalUsersSummary;
  events: EventOption[];
  initialSearch?: string;
  initialRole?: string;
  initialStatus?: string;
  initialEventId?: string;
};

export function AdminUsersPanel({
  users,
  summary,
  events,
  initialSearch = "",
  initialRole = "all",
  initialStatus = "all",
  initialEventId = "",
}: AdminUsersPanelProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [eventId, setEventId] = useState(initialEventId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => users, [users]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    if (eventId) params.set("event", eventId);
    const query = params.toString();
    router.push(query ? `${ROUTES.adminUsuarios}?${query}` : ROUTES.adminUsuarios);
  }

  function handleToggleActive(user: InternalUserListItem) {
    const nextActive = !user.is_active;
    const confirmed = window.confirm(
      nextActive
        ? `¿Activar a ${user.full_name ?? user.email}?`
        : `¿Desactivar a ${user.full_name ?? user.email}? No podrá acceder al panel.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await toggleInternalUserActiveAction(user.id, nextActive);
      setMessage(result.ok ? null : result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function handlePasswordReset(user: InternalUserListItem) {
    if (!user.email) {
      setMessage("Este usuario no tiene correo registrado.");
      return;
    }

    startTransition(async () => {
      const result = await sendInternalUserPasswordResetAction(user.email!);
      setMessage(
        result.ok
          ? `Se envió un enlace de recuperación a ${user.email}.`
          : result.message,
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            Gestioná el personal interno: administradores, porteros y cajeros.
          </p>
        </div>
        <Link
          href={ROUTES.adminUsuarioNuevo}
          className="inline-flex items-center justify-center rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-400"
        >
          + Agregar usuario
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total internos" value={summary.total} />
        <SummaryCard label="Administradores" value={summary.admins} />
        <SummaryCard label="Porteros" value={summary.door} />
        <SummaryCard label="Cajeros" value={summary.cashiers} />
        <SummaryCard label="Inactivos" value={summary.inactive} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o email"
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="all">Todos los roles</option>
            <option value={ROLES.ADMIN}>{INTERNAL_ROLE_LABELS.admin}</option>
            <option value={ROLES.DOOR}>{INTERNAL_ROLE_LABELS.door}</option>
            <option value={ROLES.CASHIER}>{INTERNAL_ROLE_LABELS.cashier}</option>
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los eventos</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {message}
        </p>
      ) : null}

      {filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-zinc-400">
          No hay usuarios internos que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-black/20 text-left text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Eventos</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">
                    {user.full_name ?? "Sin nombre"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{user.email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{user.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StaffRoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        user.is_active
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-zinc-700 text-zinc-300",
                      )}
                    >
                      {user.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {user.role === ROLES.ADMIN || user.staff_all_events
                      ? "Todos"
                      : user.assigned_events.length > 0
                        ? `${user.assigned_events.length} asignado(s)`
                        : "Sin asignar"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={ROUTES.adminUsuario(user.id)}
                        className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/15"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleToggleActive(user)}
                        className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                      >
                        {user.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        disabled={pending || !user.email}
                        onClick={() => handlePasswordReset(user)}
                        className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                      >
                        Restablecer acceso
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
