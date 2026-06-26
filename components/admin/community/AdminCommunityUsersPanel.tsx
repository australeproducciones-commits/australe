"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CommunityUserListItem } from "@/lib/community/admin/types";
import {
  COMMUNITY_USERS_FILTER,
  COMMUNITY_USERS_SORT,
  type CommunityUsersFilter,
  type CommunityUsersSort,
} from "@/lib/community/admin/types";
import { ROUTES } from "@/lib/constants/routes";
import { AdminCommunityInviteWizard } from "@/components/admin/community/AdminCommunityInviteWizard";

type AdminCommunityUsersPanelProps = {
  result: {
    items: CommunityUserListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  levels: Array<{ id: string; name: string }>;
  initialSearch: string;
  initialFilter: CommunityUsersFilter;
  initialSort: CommunityUsersSort;
  initialLevelId: string;
  initialMinBalance: string;
  initialMaxBalance: string;
};

function initials(name: string | null): string {
  if (!name?.trim()) {
    return "?";
  }
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminCommunityUsersPanel({
  result,
  levels,
  initialSearch,
  initialFilter,
  initialSort,
  initialLevelId,
  initialMinBalance,
  initialMaxBalance,
}: AdminCommunityUsersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(searchParams.get("invite") === "1");
  const [, startTransition] = useTransition();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      if (!updates.page) {
        params.delete("page");
      }
      const qs = params.toString();
      router.push(
        qs ? `${ROUTES.adminComunidadUsuarios}?${qs}` : ROUTES.adminComunidadUsuarios,
      );
    },
    [router, searchParams],
  );

  const allSelected = useMemo(
    () =>
      result.items.length > 0 &&
      result.items.every((item) => selected.has(item.userId)),
    [result.items, selected],
  );

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(result.items.map((item) => item.userId)));
  }

  function toggleOne(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(() => {
      pushParams({ q: search.trim() || undefined });
    });
  }

  const selectedIds = [...selected];

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="text-zinc-400">Buscar</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, email, teléfono o DNI"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Filtro</span>
            <select
              value={initialFilter}
              onChange={(e) =>
                pushParams({ filter: e.target.value as CommunityUsersFilter })
              }
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            >
              <option value={COMMUNITY_USERS_FILTER.ALL}>Todos</option>
              <option value={COMMUNITY_USERS_FILTER.WITH_POINTS}>Con puntos</option>
              <option value={COMMUNITY_USERS_FILTER.WITHOUT_POINTS}>Sin puntos</option>
              <option value={COMMUNITY_USERS_FILTER.WITH_PURCHASES}>Con compras</option>
              <option value={COMMUNITY_USERS_FILTER.WITHOUT_PURCHASES}>
                Sin compras
              </option>
              <option value={COMMUNITY_USERS_FILTER.WITH_ATTENDANCE}>
                Con asistencia
              </option>
              <option value={COMMUNITY_USERS_FILTER.RECENT}>Registrados recientes</option>
              <option value={COMMUNITY_USERS_FILTER.ACTIVE}>Activos</option>
              <option value={COMMUNITY_USERS_FILTER.INACTIVE}>Inactivos</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Nivel</span>
            <select
              value={initialLevelId}
              onChange={(e) =>
                pushParams({ level: e.target.value || undefined })
              }
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            >
              <option value="">Todos</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Saldo mín.</span>
            <input
              type="number"
              min={0}
              value={initialMinBalance}
              onChange={(e) =>
                pushParams({ minBalance: e.target.value || undefined })
              }
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Saldo máx.</span>
            <input
              type="number"
              min={0}
              value={initialMaxBalance}
              onChange={(e) =>
                pushParams({ maxBalance: e.target.value || undefined })
              }
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Orden</span>
            <select
              value={initialSort}
              onChange={(e) =>
                pushParams({ sort: e.target.value as CommunityUsersSort })
              }
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            >
              <option value={COMMUNITY_USERS_SORT.REGISTERED_DESC}>
                Registro reciente
              </option>
              <option value={COMMUNITY_USERS_SORT.REGISTERED_ASC}>
                Registro antiguo
              </option>
              <option value={COMMUNITY_USERS_SORT.NAME_ASC}>Nombre</option>
              <option value={COMMUNITY_USERS_SORT.POINTS_DESC}>Puntos ↓</option>
              <option value={COMMUNITY_USERS_SORT.POINTS_ASC}>Puntos ↑</option>
              <option value={COMMUNITY_USERS_SORT.PURCHASES_DESC}>Compras</option>
              <option value={COMMUNITY_USERS_SORT.ACTIVITY_DESC}>
                Última actividad
              </option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
        >
          Buscar
        </button>
      </form>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
          <span>{selectedIds.length} seleccionado(s)</span>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-md bg-purple-600 px-3 py-1.5 font-medium text-white hover:bg-purple-500"
          >
            Invitar seleccionados
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-purple-200 underline-offset-2 hover:underline"
          >
            Limpiar
          </button>
        </div>
      )}

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-zinc-400">
          {initialSearch || initialFilter !== COMMUNITY_USERS_FILTER.ALL
            ? "No hay coincidencias con los filtros aplicados."
            : "Todavía no hay usuarios de la comunidad."}
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-3 py-3">Usuario</th>
                  <th className="px-3 py-3">Contacto</th>
                  <th className="px-3 py-3">Registro</th>
                  <th className="px-3 py-3">Puntos</th>
                  <th className="px-3 py-3">Compras</th>
                  <th className="px-3 py-3">Asistencias</th>
                  <th className="px-3 py-3">Última actividad</th>
                  <th className="px-3 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {result.items.map((user) => (
                  <tr key={user.userId} className="hover:bg-white/5">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(user.userId)}
                        onChange={() => toggleOne(user.userId)}
                        aria-label={`Seleccionar ${user.fullName ?? user.userId}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
                          {initials(user.fullName)}
                        </span>
                        <div>
                          <p className="font-medium text-zinc-100">
                            {user.fullName ?? "Sin nombre"}
                          </p>
                          <p className="text-xs text-zinc-500">{user.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-300">
                      <p>{user.email ?? "—"}</p>
                      <p className="text-xs text-zinc-500">{user.whatsapp ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      {formatDate(user.registeredAt)}
                    </td>
                    <td className="px-3 py-3 text-zinc-200">
                      {user.pointsBalance.toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-3 text-zinc-200">{user.purchaseCount}</td>
                    <td className="px-3 py-3 text-zinc-200">{user.eventsAttended}</td>
                    <td className="px-3 py-3 text-zinc-400">
                      {formatDate(user.lastActivity)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={ROUTES.adminComunidadUsuario(user.userId)}
                          className="text-purple-300 hover:text-purple-200"
                        >
                          Ver perfil
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(new Set([user.userId]));
                            setInviteOpen(true);
                          }}
                          className="text-zinc-300 hover:text-white"
                        >
                          Invitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((user) => (
              <article
                key={user.userId}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(user.userId)}
                    onChange={() => toggleOne(user.userId)}
                    className="mt-1"
                    aria-label={`Seleccionar ${user.fullName ?? user.userId}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                        {initials(user.fullName)}
                      </span>
                      <div>
                        <p className="font-medium text-zinc-100">
                          {user.fullName ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-zinc-500">{user.email ?? user.whatsapp}</p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <div>
                        <dt>Puntos</dt>
                        <dd className="text-zinc-200">{user.pointsBalance}</dd>
                      </div>
                      <div>
                        <dt>Compras</dt>
                        <dd className="text-zinc-200">{user.purchaseCount}</dd>
                      </div>
                      <div>
                        <dt>Asistencias</dt>
                        <dd className="text-zinc-200">{user.eventsAttended}</dd>
                      </div>
                      <div>
                        <dt>Actividad</dt>
                        <dd className="text-zinc-200">{formatDate(user.lastActivity)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex gap-3 text-sm">
                      <Link
                        href={ROUTES.adminComunidadUsuario(user.userId)}
                        className="text-purple-300"
                      >
                        Ver perfil
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(new Set([user.userId]));
                          setInviteOpen(true);
                        }}
                        className="text-zinc-300"
                      >
                        Invitar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {result.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <p>
            {result.total.toLocaleString("es-AR")} usuario(s) · página {result.page} de{" "}
            {result.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={result.page <= 1}
              onClick={() => pushParams({ page: String(result.page - 1) })}
              className="rounded-md border border-zinc-700 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={result.page >= result.totalPages}
              onClick={() => pushParams({ page: String(result.page + 1) })}
              className="rounded-md border border-zinc-700 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <AdminCommunityInviteWizard
        open={inviteOpen}
        userIds={selectedIds}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}
