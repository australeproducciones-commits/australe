"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminCommunityMembersTable } from "@/components/admin/community/AdminCommunityMembersTable";
import { AdminCommunityRewardsPanel } from "@/components/admin/community/AdminCommunityRewardsPanel";
import { AdminCommunitySettingsPanel } from "@/components/admin/community/AdminCommunitySettingsPanel";
import { AdminCommunitySummaryPanel } from "@/components/admin/community/AdminCommunitySummary";
import { AdminCommunityTransactionsTable } from "@/components/admin/community/AdminCommunityTransactionsTable";
import { ROUTES } from "@/lib/constants/routes";
import type {
  AdminCommunityMember,
  AdminCommunitySummary,
  CommunityReward,
  CommunitySettings,
  LoyaltyTransaction,
} from "@/lib/community/loyalty/types";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "miembros", label: "Miembros" },
  { id: "recompensas", label: "Recompensas" },
  { id: "movimientos", label: "Movimientos" },
  { id: "configuracion", label: "Configuración" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type AdminCommunityPanelProps = {
  summary: AdminCommunitySummary;
  members: AdminCommunityMember[];
  rewards: CommunityReward[];
  transactions: LoyaltyTransaction[];
  settings: CommunitySettings;
  initialTab: TabId;
};

export function AdminCommunityPanel({
  summary,
  members,
  rewards,
  transactions,
  settings,
  initialTab,
}: AdminCommunityPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId | null) ?? initialTab;

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`${ROUTES.adminComunidad}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Comunidad</h1>
          <p className="text-sm text-zinc-500">
            Fidelización, puntos, recompensas y miembros.
          </p>
        </div>
        <Link
          href={ROUTES.comunidad}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold dark:border-zinc-700"
        >
          Ver sitio público
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              tab === item.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "resumen" ? <AdminCommunitySummaryPanel summary={summary} /> : null}
      {tab === "miembros" ? <AdminCommunityMembersTable members={members} /> : null}
      {tab === "recompensas" ? <AdminCommunityRewardsPanel rewards={rewards} /> : null}
      {tab === "movimientos" ? (
        <AdminCommunityTransactionsTable transactions={transactions} />
      ) : null}
      {tab === "configuracion" ? (
        <AdminCommunitySettingsPanel settings={settings} />
      ) : null}
    </div>
  );
}
