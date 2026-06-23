import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCommunityPanel } from "@/components/admin/community/AdminCommunityPanel";
import {
  getAdminCommunityMembers,
  getAdminCommunityRewards,
  getAdminCommunitySettings,
  getAdminCommunitySummary,
  getAdminLoyaltyTransactions,
} from "@/lib/community/loyalty/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad",
};

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminComunidadPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = params.tab ?? "resumen";

  const [summary, members, rewards, transactions, settings] = await Promise.all([
    getAdminCommunitySummary(),
    getAdminCommunityMembers(),
    getAdminCommunityRewards(),
    getAdminLoyaltyTransactions(),
    getAdminCommunitySettings(),
  ]);

  const defaultSettings = {
    id: 1,
    community_enabled: true,
    ticket_points_enabled: true,
    consumption_points_enabled: false,
    amount_per_point: 1000,
    welcome_points: 0,
    public_title: "Comunidad Australe",
    public_description: "",
  };

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
      <AdminCommunityPanel
        summary={summary}
        members={members}
        rewards={rewards}
        transactions={transactions}
        settings={settings ?? defaultSettings}
        initialTab={
          tab === "miembros" ||
          tab === "recompensas" ||
          tab === "movimientos" ||
          tab === "configuracion"
            ? tab
            : "resumen"
        }
      />
    </Suspense>
  );
}
