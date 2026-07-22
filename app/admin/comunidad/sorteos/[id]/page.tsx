import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminGiveawayForm } from "@/components/admin/community/AdminGiveawayForm";
import { getGiveawayById } from "@/lib/community/giveaways/queries";
import { ROUTES } from "@/lib/constants/routes";
import { requireAdminPage } from "@/lib/events/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const giveaway = await getGiveawayById(id);
  return { title: giveaway ? `Admin · ${giveaway.name}` : "Sorteo" };
}

export default async function AdminComunidadSorteoPage({ params }: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const giveaway = await getGiveawayById(id);

  if (!giveaway) {
    notFound();
  }

  return (
    <AdminCommunityShell title="Comunidad" description={`Editar: ${giveaway.name}`}>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={ROUTES.adminComunidadSorteoParticipantes(id)} className="text-purple-400">
          Participantes
        </Link>
        <Link href={ROUTES.adminComunidadSorteoResultado(id)} className="text-purple-400">
          Resultado
        </Link>
        <Link href={ROUTES.adminComunidadSorteoAuditoria(id)} className="text-purple-400">
          Auditoría
        </Link>
      </div>
      <AdminGiveawayForm giveaway={giveaway} />
    </AdminCommunityShell>
  );
}
