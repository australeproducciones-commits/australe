import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InternalUserForm } from "@/components/admin/users/InternalUserForm";
import { StaffRoleBadge } from "@/components/admin/users/StaffRoleBadge";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { requireAdminUsersPage } from "@/lib/auth/requirePage";
import {
  getEventsForStaffAssignment,
  getInternalUserById,
} from "@/lib/users/queries";

type AdminUsuarioPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminUsuarioPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getInternalUserById(id);
  return {
    title: user
      ? `Admin · ${user.full_name ?? user.email ?? "Usuario"}`
      : "Admin · Usuario",
  };
}

export default async function AdminUsuarioPage({ params }: AdminUsuarioPageProps) {
  await requireAdminUsersPage();
  const { id } = await params;

  const [user, events] = await Promise.all([
    getInternalUserById(id),
    getEventsForStaffAssignment(),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <>
      <AdminHeader
        title={user.full_name ?? "Usuario interno"}
        description={user.email ?? "Editar datos, rol y asignaciones."}
      />
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StaffRoleBadge role={user.role} />
          <span className="text-sm text-zinc-400">
            {user.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
        <InternalUserForm mode="edit" user={user} events={events} />
      </div>
    </>
  );
}
