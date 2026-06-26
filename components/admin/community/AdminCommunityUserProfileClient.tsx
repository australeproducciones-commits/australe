"use client";

import { useState } from "react";
import Link from "next/link";
import type { CommunityUserProfile } from "@/lib/community/admin/types";
import type { CommunityUserActivityItem } from "@/lib/community/admin/types";
import type { CommunityUserTicketRow } from "@/lib/community/admin/types";
import type { LoyaltyTransaction } from "@/lib/community/loyalty/types";
import { ROUTES } from "@/lib/constants/routes";
import { AdminCommunityInviteWizard } from "@/components/admin/community/AdminCommunityInviteWizard";

type HistoryTab =
  | "activity"
  | "tickets"
  | "points"
  | "rewards"
  | "invitations";

type RedemptionRow = {
  id: string;
  points_spent: number;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  reward: { name?: string } | null;
};

type InvitationRow = {
  id: string;
  eventName: string;
  invitation_type: string;
  channel: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  creatorName: string | null;
};

type AdminCommunityUserProfileClientProps = {
  profile: CommunityUserProfile;
  activity: CommunityUserActivityItem[];
  tickets: CommunityUserTicketRow[];
  transactions: LoyaltyTransaction[];
  redemptions: RedemptionRow[];
  invitations: InvitationRow[];
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-50">
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
      </p>
    </div>
  );
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("es-AR");
}

export function AdminCommunityUserProfileClient({
  profile,
  activity,
  tickets,
  transactions,
  redemptions,
  invitations,
}: AdminCommunityUserProfileClientProps) {
  const [tab, setTab] = useState<HistoryTab>("activity");
  const [inviteOpen, setInviteOpen] = useState(false);

  const tabs: { id: HistoryTab; label: string }[] = [
    { id: "activity", label: "Actividad" },
    { id: "tickets", label: "Entradas" },
    { id: "points", label: "Puntos" },
    { id: "rewards", label: "Recompensas" },
    { id: "invitations", label: "Invitaciones" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={ROUTES.adminComunidadUsuarios}
            className="text-sm text-purple-300 hover:text-purple-200"
          >
            ← Volver a usuarios
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-white">
              {(profile.fullName ?? "?").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {profile.fullName ?? "Sin nombre"}
              </h2>
              <p className="text-sm text-zinc-400">{profile.email ?? "Sin email"}</p>
              <p className="text-sm text-zinc-500">
                {profile.whatsapp ?? "Sin teléfono"} · Registro{" "}
                {formatDateTime(profile.registeredAt)}
              </p>
              <p className="text-xs text-zinc-500">
                Estado: {profile.status} ·{" "}
                {profile.isActive ? "Activo" : "Inactivo"}
                {profile.levelName ? ` · Nivel ${profile.levelName}` : ""}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
        >
          Invitar a evento
        </button>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Fidelización
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Puntos disponibles" value={profile.loyalty.pointsBalance} />
          <StatCard
            label="Puntos históricos"
            value={profile.loyalty.lifetimeEarned}
          />
          <StatCard label="Puntos utilizados" value={profile.loyalty.pointsUsed} />
          <StatCard
            label="Ajustes manuales"
            value={profile.loyalty.manualAdjustments}
          />
          <StatCard
            label="Recompensas canjeadas"
            value={profile.loyalty.redemptionsCount}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Compras y entradas
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Compras confirmadas"
            value={profile.tickets.purchaseCount}
          />
          <StatCard label="Total gastado" value={formatMoney(profile.tickets.totalSpent)} />
          <StatCard
            label="Entradas adquiridas"
            value={profile.tickets.ticketsAcquired}
          />
          <StatCard label="Entradas usadas" value={profile.tickets.ticketsUsed} />
          <StatCard
            label="Eventos asistidos"
            value={profile.tickets.eventsAttended}
          />
          <StatCard
            label="Última compra"
            value={formatDateTime(profile.tickets.lastPurchaseAt)}
          />
          <StatCard
            label="Última asistencia"
            value={formatDateTime(profile.tickets.lastAttendanceAt)}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Invitaciones
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Enviadas" value={profile.invitations.sent} />
          <StatCard label="Pendientes" value={profile.invitations.pending} />
          <StatCard label="Abiertas" value={profile.invitations.opened} />
          <StatCard label="Aceptadas" value={profile.invitations.accepted} />
          <StatCard label="Utilizadas" value={profile.invitations.used} />
        </div>
      </section>

      <section>
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-800">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "whitespace-nowrap px-4 py-2 text-sm font-medium",
                tab === item.id
                  ? "border-b-2 border-purple-400 text-white"
                  : "text-zinc-400 hover:text-zinc-200",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "activity" && (
          <ul className="space-y-3">
            {activity.length === 0 ? (
              <li className="text-sm text-zinc-500">Sin actividad registrada.</li>
            ) : (
              activity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm"
                >
                  <p className="font-medium text-zinc-100">{item.label}</p>
                  {item.detail && (
                    <p className="text-zinc-400">{item.detail}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDateTime(item.occurredAt)}
                  </p>
                </li>
              ))
            )}
          </ul>
        )}

        {tab === "tickets" && (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            {tickets.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">Sin entradas.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Evento</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Importe</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-3 py-2">
                        <Link
                          href={ROUTES.adminEvento(ticket.eventId)}
                          className="text-purple-300 hover:text-purple-200"
                        >
                          {ticket.eventName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {ticket.ticketTypeName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        {formatDateTime(ticket.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-zinc-200">
                        {formatMoney(ticket.pricePaid)}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        {ticket.ticketStatus} / {ticket.paymentStatus}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        {ticket.usedAt ? formatDateTime(ticket.usedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "points" && (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            {transactions.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">Sin movimientos de puntos.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Saldo</th>
                    <th className="px-3 py-2">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-3 py-2 text-zinc-400">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{tx.transaction_type}</td>
                      <td className="px-3 py-2 text-zinc-200">
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </td>
                      <td className="px-3 py-2 text-zinc-200">{tx.balance_after}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {tx.description ?? tx.source_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "rewards" && (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            {redemptions.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">Sin canjes.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Recompensa</th>
                    <th className="px-3 py-2">Puntos</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Uso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {redemptions.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-zinc-100">
                        {row.reward?.name ?? "Recompensa"}
                      </td>
                      <td className="px-3 py-2 text-zinc-200">{row.points_spent}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{row.status}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {formatDateTime(row.redeemed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "invitations" && (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            {invitations.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">Sin invitaciones.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Evento</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Creada por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {invitations.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-zinc-100">{row.eventName}</td>
                      <td className="px-3 py-2 text-zinc-400">{row.invitation_type}</td>
                      <td className="px-3 py-2 text-zinc-400">{row.channel}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{row.status}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {row.creatorName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <AdminCommunityInviteWizard
        open={inviteOpen}
        userIds={[profile.userId]}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}
