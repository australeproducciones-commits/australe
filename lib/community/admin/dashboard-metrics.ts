import type { DashboardMetricTone } from "@/lib/admin/dashboard/metrics";
import type { AdminCommunitySummary } from "@/lib/community/loyalty/types";

export type CommunityKpi = {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  tone: DashboardMetricTone;
  badge?: string;
  sparkline?: number[];
};

export type CommunityBarDatum = {
  id: string;
  label: string;
  value: number;
  tone: string;
};

export type CommunityInvitationSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type CommunityOperationalRow = {
  id: string;
  label: string;
  value: number | string;
  tone: DashboardMetricTone;
};

export type CommunityHealthInsight = {
  id: string;
  tone: DashboardMetricTone;
  title: string;
  detail: string;
};

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

export function buildCommunityKpis(
  summary: AdminCommunitySummary,
): CommunityKpi[] {
  const memberShare =
    summary.totalRegisteredUsers > 0
      ? Math.round(
          (summary.activeMembers / summary.totalRegisteredUsers) * 100,
        )
      : 0;

  return [
    {
      id: "registered-users",
      label: "Usuarios registrados",
      value: fmt(summary.totalRegisteredUsers),
      sublabel: `${fmt(summary.activeMembers)} con puntos activos`,
      tone: "blue",
      badge: memberShare > 0 ? `${memberShare}%` : undefined,
    },
    {
      id: "active-members",
      label: "Miembros con puntos",
      value: fmt(summary.activeMembers),
      sublabel: `${fmt(summary.newMembersThisMonth)} altas este mes`,
      tone: "green",
    },
    {
      id: "recent-activity",
      label: "Actividad reciente (30 d)",
      value: fmt(summary.recentActiveUsers),
      sublabel: "Cuentas con movimiento en el período",
      tone: "blue",
    },
    {
      id: "active-ads",
      label: "Publicidades activas",
      value: fmt(summary.activeAdvertisingCampaigns),
      sublabel: "Campañas vigentes en el sitio",
      tone: summary.activeAdvertisingCampaigns > 0 ? "green" : "yellow",
      badge: summary.activeAdvertisingCampaigns > 0 ? "LIVE" : "OFF",
    },
    {
      id: "invitations-sent",
      label: "Invitaciones enviadas",
      value: fmt(summary.invitationsSent),
      sublabel: `${fmt(summary.invitationsPending)} pendientes de respuesta`,
      tone: "neutral",
      sparkline: [
        summary.invitationsPending,
        summary.invitationsOpened,
        summary.invitationsAccepted,
        summary.invitationsUsed,
      ],
    },
    {
      id: "active-rewards",
      label: "Recompensas activas",
      value: fmt(summary.activeRewards),
      sublabel: `${fmt(summary.pendingRedemptions)} canjes pendientes`,
      tone: summary.activeRewards > 0 ? "green" : "yellow",
    },
  ];
}

export function buildCommunityActivityBars(
  summary: AdminCommunitySummary,
): CommunityBarDatum[] {
  return [
    {
      id: "recent-users",
      label: "Usuarios activos (30 d)",
      value: summary.recentActiveUsers,
      tone: "#38bdf8",
    },
    {
      id: "new-month",
      label: "Nuevos este mes",
      value: summary.newMembersThisMonth,
      tone: "#34d399",
    },
    {
      id: "invitations",
      label: "Invitaciones enviadas",
      value: summary.invitationsSent,
      tone: "#a78bfa",
    },
    {
      id: "pending-redemptions",
      label: "Canjes pendientes",
      value: summary.pendingRedemptions,
      tone: "#fbbf24",
    },
  ];
}

export function buildInvitationSlices(
  summary: AdminCommunitySummary,
): CommunityInvitationSlice[] {
  return [
    {
      id: "pending",
      label: "Pendientes",
      value: summary.invitationsPending,
      color: "#71717a",
    },
    {
      id: "opened",
      label: "Abiertas",
      value: summary.invitationsOpened,
      color: "#38bdf8",
    },
    {
      id: "accepted",
      label: "Aceptadas",
      value: summary.invitationsAccepted,
      color: "#a78bfa",
    },
    {
      id: "used",
      label: "Utilizadas",
      value: summary.invitationsUsed,
      color: "#34d399",
    },
    {
      id: "expired",
      label: "Vencidas",
      value: summary.invitationsExpired,
      color: "#fb7185",
    },
  ].filter((slice) => slice.value > 0);
}

export function buildCommunityOperationalRows(
  summary: AdminCommunitySummary,
): CommunityOperationalRow[] {
  return [
    {
      id: "points-circulation",
      label: "Puntos en circulación",
      value: fmt(summary.pointsInCirculation),
      tone: "blue",
    },
    {
      id: "points-issued",
      label: "Puntos emitidos (hist.)",
      value: fmt(summary.pointsIssued),
      tone: "neutral",
    },
    {
      id: "points-redeemed",
      label: "Puntos canjeados",
      value: fmt(summary.pointsRedeemed),
      tone: "green",
    },
    {
      id: "pending-redemptions",
      label: "Canjes pendientes",
      value: summary.pendingRedemptions,
      tone: summary.pendingRedemptions > 0 ? "yellow" : "green",
    },
    {
      id: "completed-redemptions",
      label: "Canjes realizados",
      value: summary.completedRedemptions,
      tone: "green",
    },
    {
      id: "inv-opened",
      label: "Invitaciones abiertas",
      value: summary.invitationsOpened,
      tone: "blue",
    },
    {
      id: "inv-accepted",
      label: "Invitaciones aceptadas",
      value: summary.invitationsAccepted,
      tone: "green",
    },
    {
      id: "inv-expired",
      label: "Invitaciones vencidas",
      value: summary.invitationsExpired,
      tone: summary.invitationsExpired > 0 ? "yellow" : "neutral",
    },
  ];
}

export function buildCommunityHealthInsights(
  summary: AdminCommunitySummary,
): CommunityHealthInsight[] {
  const insights: CommunityHealthInsight[] = [];

  if (
    summary.activeRewards === 0 ||
    summary.recentActiveUsers === 0 ||
    summary.invitationsSent === 0 ||
    summary.activeAdvertisingCampaigns === 0 ||
    summary.pendingRedemptions > 0
  ) {
    if (summary.activeRewards === 0) {
      insights.push({
        id: "no-rewards",
        tone: "yellow",
        title: "Sin recompensas activas",
        detail: "El catálogo de canje está vacío o pausado.",
      });
    }
    if (summary.recentActiveUsers === 0) {
      insights.push({
        id: "no-activity",
        tone: "yellow",
        title: "Sin actividad reciente",
        detail: "No hubo movimiento de fidelización en los últimos 30 días.",
      });
    }
    if (summary.invitationsSent === 0) {
      insights.push({
        id: "no-invitations",
        tone: "neutral",
        title: "Sin invitaciones registradas",
        detail: "Podés iniciar un flujo desde Usuarios o Invitaciones.",
      });
    }
    if (summary.activeAdvertisingCampaigns === 0) {
      insights.push({
        id: "no-ads",
        tone: "neutral",
        title: "Sin publicidad activa",
        detail: "No hay campañas publicitarias vigentes.",
      });
    }
    if (summary.pendingRedemptions > 0) {
      insights.push({
        id: "pending-redemptions",
        tone: "blue",
        title: "Canjes pendientes de revisión",
        detail: `${fmt(summary.pendingRedemptions)} solicitudes esperan gestión.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      tone: "green",
      title: "Todo en orden",
      detail:
        "Fidelización, invitaciones y recompensas operan dentro de parámetros normales.",
    });
  }

  return insights;
}

export function buildLoyaltySecondaryMetrics(
  summary: AdminCommunitySummary,
): CommunityOperationalRow[] {
  return [
    {
      id: "new-month",
      label: "Nuevos este mes",
      value: summary.newMembersThisMonth,
      tone: "blue",
    },
    {
      id: "points-circulation",
      label: "Puntos en circulación",
      value: fmt(summary.pointsInCirculation),
      tone: "neutral",
    },
    {
      id: "points-issued",
      label: "Puntos emitidos",
      value: fmt(summary.pointsIssued),
      tone: "neutral",
    },
    {
      id: "points-redeemed",
      label: "Puntos canjeados",
      value: fmt(summary.pointsRedeemed),
      tone: "green",
    },
    {
      id: "completed-redemptions",
      label: "Canjes realizados",
      value: summary.completedRedemptions,
      tone: "green",
    },
    {
      id: "active-rewards",
      label: "Recompensas activas",
      value: summary.activeRewards,
      tone: "green",
    },
  ];
}
