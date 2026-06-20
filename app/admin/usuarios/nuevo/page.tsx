import type { Metadata } from "next";
import { InternalUserForm } from "@/components/admin/users/InternalUserForm";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { requireAdminUsersPage } from "@/lib/auth/requirePage";
import { getEventsForStaffAssignment } from "@/lib/users/queries";

export const metadata: Metadata = {
  title: "Admin · Nuevo usuario",
};

export default async function AdminUsuarioNuevoPage() {
  await requireAdminUsersPage();
  const events = await getEventsForStaffAssignment();

  return (
    <>
      <AdminHeader
        title="Agregar usuario"
        description="Creá un usuario interno con rol y eventos asignados."
      />
      <div className="px-4 py-8 sm:px-8">
        <InternalUserForm mode="create" events={events} />
      </div>
    </>
  );
}
