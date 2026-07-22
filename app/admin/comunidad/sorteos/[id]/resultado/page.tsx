import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminGiveawayDrawModal } from "@/components/admin/community/AdminGiveawaysPanel";
import { AdminGiveawayResultActions } from "@/components/admin/community/AdminGiveawayResultActions";
import {
  getAdminGiveawayWinners,
  getGiveawayById,
  getGiveawayTransparencyStats,
} from "@/lib/community/giveaways/queries";
import { requireAdminPage } from "@/lib/events/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Admin · Sorteo · Resultado",
};

export default async function AdminComunidadSorteoResultadoPage({ params }: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const giveaway = await getGiveawayById(id);
  if (!giveaway) notFound();

  const [winners, stats] = await Promise.all([
    getAdminGiveawayWinners(id),
    getGiveawayTransparencyStats(id),
  ]);

  return (
    <AdminCommunityShell title="Comunidad" description={`Resultado · ${giveaway.name}`}>
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
          <p>Participantes: {stats.participant_count}</p>
          <p>Total chances: {stats.total_chances}</p>
          <p>Estado: {giveaway.status}</p>
        </div>

        {giveaway.status !== "drawn" ? (
          <AdminGiveawayDrawModal
            giveaway={giveaway}
            participantCount={stats.participant_count}
            totalChances={stats.total_chances}
          />
        ) : null}

        <AdminGiveawayResultActions
          giveawayId={id}
          winners={winners}
          isDrawn={giveaway.status === "drawn"}
        />
      </div>
    </AdminCommunityShell>
  );
}
