import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunitySummaryPanel } from "@/components/admin/community/AdminCommunitySummary";
import { getAdminCommunitySummary } from "@/lib/community/loyalty/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Comunidad",
};

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminComunidadResumenPage({
  searchParams,
}: PageProps) {
  await requireAdminPage();
  const params = await searchParams;

  if (params.tab === "miembros") {
    redirect(ROUTES.adminComunidadUsuarios);
  }
  if (params.tab === "recompensas") {
    redirect(ROUTES.adminComunidadRecompensas);
  }
  if (params.tab === "movimientos") {
    redirect(ROUTES.adminComunidadMovimientos);
  }
  if (params.tab === "configuracion") {
    redirect(ROUTES.adminComunidadConfiguracion);
  }
  if (params.tab === "invitaciones") {
    redirect(ROUTES.adminComunidadInvitaciones);
  }

  const summary = await getAdminCommunitySummary();

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Resumen de fidelización, usuarios, recompensas e invitaciones."
    >
      <AdminCommunitySummaryPanel summary={summary} />
    </AdminCommunityShell>
  );
}
