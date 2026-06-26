import type { AdminCommunitySummary } from "@/lib/community/loyalty/types";
import {
  buildCommunityActivityBars,
  buildCommunityHealthInsights,
  buildCommunityKpis,
  buildCommunityOperationalRows,
  buildInvitationSlices,
  buildLoyaltySecondaryMetrics,
} from "@/lib/community/admin/dashboard-metrics";
import { DashboardMetricCard } from "@/components/admin/dashboard/DashboardMetricCard";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { CommunityActivityChart } from "@/components/admin/community/dashboard/CommunityActivityChart";
import { CommunityDashboardHeader } from "@/components/admin/community/dashboard/CommunityDashboardHeader";
import { CommunityInsightsPanel } from "@/components/admin/community/dashboard/CommunityInsightsPanel";
import { CommunityInvitationsStatusChart } from "@/components/admin/community/dashboard/CommunityInvitationsStatusChart";
import { CommunityOperationalPanel } from "@/components/admin/community/dashboard/CommunityOperationalPanel";
import { CommunityQuickActions } from "@/components/admin/community/dashboard/CommunityQuickActions";

type AdminCommunitySummaryProps = {
  summary: AdminCommunitySummary;
};

export function AdminCommunitySummaryPanel({
  summary,
}: AdminCommunitySummaryProps) {
  const kpis = buildCommunityKpis(summary);
  const activityBars = buildCommunityActivityBars(summary);
  const invitationSlices = buildInvitationSlices(summary);
  const operationalRows = buildCommunityOperationalRows(summary);
  const loyaltyRows = buildLoyaltySecondaryMetrics(summary);
  const insights = buildCommunityHealthInsights(summary);

  const syncLabel = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CommunityDashboardHeader updatedAt={syncLabel} />
      <CommunityQuickActions />

      <section
        aria-label="Indicadores principales"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        {kpis.map((metric) => (
          <DashboardMetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            sublabel={metric.sublabel}
            tone={metric.tone}
            badge={metric.badge}
            sparkline={metric.sparkline}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DashboardSection
          title="Actividad reciente"
          description="Indicadores operativos del período actual derivados del resumen de comunidad."
          className="xl:col-span-2"
        >
          <CommunityActivityChart data={activityBars} />
        </DashboardSection>

        <DashboardSection title="Estado operativo" compact>
          <CommunityOperationalPanel rows={operationalRows} />
        </DashboardSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSection
          title="Distribución de invitaciones"
          description="Estados actuales del pipeline de invitaciones."
        >
          <CommunityInvitationsStatusChart
            slices={invitationSlices}
            total={summary.invitationsSent}
          />
        </DashboardSection>

        <DashboardSection
          title="Salud del módulo"
          description="Señales automáticas según el estado del ecosistema de comunidad."
        >
          <CommunityInsightsPanel insights={insights} />
        </DashboardSection>
      </section>

      <DashboardSection
        title="Fidelización y recompensas"
        description="Métricas secundarias de puntos, canjes y catálogo activo."
      >
        <CommunityOperationalPanel rows={loyaltyRows} />
      </DashboardSection>
    </div>
  );
}
