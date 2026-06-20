import type { Metadata } from "next";
import { AdminUsersPanel } from "@/components/admin/users/AdminUsersPanel";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { requireAdminUsersPage } from "@/lib/auth/requirePage";
import {
  getEventsForStaffAssignment,
  getInternalUsersForAdmin,
  getInternalUsersSummary,
} from "@/lib/users/queries";

export const metadata: Metadata = {
  title: "Admin · Usuarios",
};

type AdminUsuariosPageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    event?: string;
  }>;
};

export default async function AdminUsuariosPage({
  searchParams,
}: AdminUsuariosPageProps) {
  await requireAdminUsersPage();
  const params = await searchParams;

  const filters = {
    search: params.q,
    role: params.role,
    status:
      params.status === "active" || params.status === "inactive"
        ? (params.status as "active" | "inactive")
        : undefined,
    eventId: params.event,
  };

  const [users, summary, events] = await Promise.all([
    getInternalUsersForAdmin(filters),
    getInternalUsersSummary(),
    getEventsForStaffAssignment(),
  ]);

  return (
    <>
      <AdminHeader
        title="Usuarios"
        description="Administrá el personal interno de Australe Producciones."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminUsersPanel
          users={users}
          summary={summary}
          events={events}
          initialSearch={params.q ?? ""}
          initialRole={params.role ?? "all"}
          initialStatus={params.status ?? "all"}
          initialEventId={params.event ?? ""}
        />
      </div>
    </>
  );
}
