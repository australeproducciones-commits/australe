import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminGiveawayParticipantsClient } from "@/components/admin/community/AdminGiveawayParticipantsClient";
import {
  getAdminGiveawayParticipants,
  getGiveawayById,
} from "@/lib/community/giveaways/queries";
import { requireAdminPage } from "@/lib/events/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Admin · Sorteo · Participantes",
};

export default async function AdminComunidadSorteoParticipantesPage({
  params,
}: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const giveaway = await getGiveawayById(id);
  if (!giveaway) notFound();

  const participants = await getAdminGiveawayParticipants(id);

  return (
    <AdminCommunityShell
      title="Comunidad"
      description={`Participantes · ${giveaway.name}`}
    >
      <AdminGiveawayParticipantsClient
        giveawayId={id}
        participants={participants}
      />
    </AdminCommunityShell>
  );
}
