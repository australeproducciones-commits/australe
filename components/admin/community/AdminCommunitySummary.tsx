import Link from "next/link";
import type { AdminCommunitySummary } from "@/lib/community/loyalty/types";
import { ROUTES } from "@/lib/constants/routes";

type AdminCommunitySummaryProps = {
  summary: AdminCommunitySummary;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-zinc-50">
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
    >
      {label}
    </Link>
  );
}

export function AdminCommunitySummaryPanel({ summary }: AdminCommunitySummaryProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <QuickLink href={ROUTES.adminComunidadUsuarios} label="Ver usuarios" />
        <QuickLink
          href={`${ROUTES.adminComunidadRecompensas}#crear`}
          label="Crear recompensa"
        />
        <QuickLink
          href={`${ROUTES.adminComunidadUsuarios}?invite=1`}
          label="Invitar usuarios"
        />
        <QuickLink
          href={ROUTES.adminComunidadPublicidad}
          label="Crear publicidad"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Metric label="Usuarios registrados" value={summary.totalRegisteredUsers} />
        <Metric label="Miembros con puntos" value={summary.activeMembers} />
        <Metric label="Nuevos este mes" value={summary.newMembersThisMonth} />
        <Metric
          label="Actividad reciente (30 d)"
          value={summary.recentActiveUsers}
        />
        <Metric
          label="Puntos en circulación"
          value={summary.pointsInCirculation}
        />
        <Metric label="Puntos emitidos (hist.)" value={summary.pointsIssued} />
        <Metric label="Puntos canjeados" value={summary.pointsRedeemed} />
        <Metric label="Canjes pendientes" value={summary.pendingRedemptions} />
        <Metric label="Canjes realizados" value={summary.completedRedemptions} />
        <Metric label="Recompensas activas" value={summary.activeRewards} />
        <Metric label="Invitaciones enviadas" value={summary.invitationsSent} />
        <Metric label="Invitaciones pendientes" value={summary.invitationsPending} />
        <Metric
          label="Invitaciones abiertas"
          value={summary.invitationsOpened}
        />
        <Metric label="Invitaciones aceptadas" value={summary.invitationsAccepted} />
        <Metric label="Invitaciones utilizadas" value={summary.invitationsUsed} />
        <Metric label="Invitaciones vencidas" value={summary.invitationsExpired} />
        <Metric
          label="Publicidades activas"
          value={summary.activeAdvertisingCampaigns}
        />
      </div>
    </div>
  );
}
