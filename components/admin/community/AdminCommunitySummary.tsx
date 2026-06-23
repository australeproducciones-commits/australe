import type { AdminCommunitySummary } from "@/lib/community/loyalty/types";

type AdminCommunitySummaryProps = {
  summary: AdminCommunitySummary;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
      </p>
    </div>
  );
}

export function AdminCommunitySummaryPanel({ summary }: AdminCommunitySummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Metric label="Miembros activos" value={summary.activeMembers} />
      <Metric label="Nuevos este mes" value={summary.newMembersThisMonth} />
      <Metric label="Puntos emitidos" value={summary.pointsIssued} />
      <Metric label="Puntos canjeados" value={summary.pointsRedeemed} />
      <Metric label="Canjes pendientes" value={summary.pendingRedemptions} />
      <Metric label="Recompensas activas" value={summary.activeRewards} />
    </div>
  );
}
