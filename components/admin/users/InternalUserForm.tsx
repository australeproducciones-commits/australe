"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ROUTES } from "@/lib/constants/routes";
import { INTERNAL_ROLE_LABELS, ROLES } from "@/lib/constants/roles";
import {
  createInternalUserAction,
  updateInternalUserAction,
} from "@/lib/users/actions";
import type { InternalRole, InternalUserListItem } from "@/lib/users/types";

type EventOption = {
  id: string;
  name: string;
  event_date: string;
};

type InternalUserFormProps = {
  mode: "create" | "edit";
  user?: InternalUserListItem | null;
  events: EventOption[];
};

export function InternalUserForm({ mode, user, events }: InternalUserFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp ?? "");
  const [role, setRole] = useState<InternalRole>(user?.role ?? ROLES.CASHIER);
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [staffAllEvents, setStaffAllEvents] = useState(
    user?.staff_all_events ?? false,
  );
  const [eventIds, setEventIds] = useState<string[]>(
    user?.assigned_events.map((item) => item.event_id) ?? [],
  );

  const showEventSelector = role !== ROLES.ADMIN && !staffAllEvents;

  const sortedEvents = useMemo(
    () =>
      [...events].sort((left, right) =>
        right.event_date.localeCompare(left.event_date),
      ),
    [events],
  );

  function toggleEventId(eventId: string) {
    setEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        full_name: fullName,
        email,
        whatsapp,
        role,
        is_active: isActive,
        staff_all_events: role === ROLES.ADMIN ? true : staffAllEvents,
        event_ids: eventIds,
      };

      const result =
        mode === "create"
          ? await createInternalUserAction(payload)
          : await updateInternalUserAction(user!.id, payload);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.push(
        result.userId
          ? ROUTES.adminUsuario(result.userId)
          : ROUTES.adminUsuarios,
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido *">
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </Field>
        <Field label="Correo electrónico *">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            disabled={pending || mode === "edit"}
          />
        </Field>
        <Field label="Teléfono / WhatsApp">
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </Field>
        <Field label="Rol *">
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as InternalRole)}
            className={inputClass}
            disabled={pending}
          >
            <option value={ROLES.ADMIN}>{INTERNAL_ROLE_LABELS.admin}</option>
            <option value={ROLES.DOOR}>{INTERNAL_ROLE_LABELS.door}</option>
            <option value={ROLES.CASHIER}>{INTERNAL_ROLE_LABELS.cashier}</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={pending}
          className="h-4 w-4 rounded"
        />
        Usuario activo
      </label>

      {role !== ROLES.ADMIN ? (
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={staffAllEvents}
            onChange={(event) => setStaffAllEvents(event.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded"
          />
          Acceso a todos los eventos
        </label>
      ) : null}

      {showEventSelector ? (
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-sm font-semibold text-white">Eventos asignados</p>
          <p className="mt-1 text-xs text-zinc-400">
            Seleccioná los eventos en los que podrá operar este usuario.
          </p>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {sortedEvents.map((event) => (
              <label
                key={event.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={eventIds.includes(event.id)}
                  onChange={() => toggleEventId(event.id)}
                  disabled={pending}
                />
                <span className="text-sm text-zinc-200">
                  {event.name}{" "}
                  <span className="text-zinc-500">({event.event_date})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "create" ? (
        <p className="text-xs text-zinc-400">
          Se creará la cuenta y se enviará un enlace para establecer contraseña.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-50"
        >
          {pending
            ? "Guardando…"
            : mode === "create"
              ? "Crear usuario"
              : "Guardar cambios"}
        </button>
        <Link
          href={ROUTES.adminUsuarios}
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white";
