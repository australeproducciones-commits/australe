import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCommunityInvitationsPanel } from "@/components/admin/community/AdminCommunityInvitationsPanel";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { searchAdminCommunityInvitations } from "@/lib/community/invitations/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Invitaciones",
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
    page?: string;
    eventId?: string;
    userId?: string;
  }>;
};

export default async function AdminComunidadInvitacionesPage({
  searchParams,
}: PageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const result = await searchAdminCommunityInvitations({
    status: params.status,
    eventId: params.eventId,
    userId: params.userId,
    page,
  });

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Consultá el estado de invitaciones y gestioná envíos seguros."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando invitaciones…</p>}>
        <AdminCommunityInvitationsPanel
          result={result}
          initialStatus={params.status ?? ""}
        />
      </Suspense>
    </AdminCommunityShell>
  );
}
