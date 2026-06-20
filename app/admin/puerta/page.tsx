import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { StaffOperationalPanel } from "@/components/admin/staff/StaffOperationalPanel";
import { requireStaffPanelPage } from "@/lib/auth/requirePage";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getStaffAccessibleEvents } from "@/lib/users/queries";

export const metadata: Metadata = {
  title: "Panel Portero",
};

type AdminPuertaPageProps = {
  searchParams: Promise<{ evento?: string }>;
};

export default async function AdminPuertaPage({
  searchParams,
}: AdminPuertaPageProps) {
  const { evento } = await searchParams;
  const { profile } = await requireStaffPanelPage(ROLES.DOOR);
  const events = await getStaffAccessibleEvents(profile, {
    staffRole: ROLES.DOOR,
  });

  const selectedEventId =
    evento && events.some((event) => event.id === evento) ? evento : null;

  return (
    <>
      <AdminHeader
        title="Portero"
        description="Control de ingreso al evento seleccionado."
      />
      <StaffOperationalPanel
        panelTitle="Portero"
        panelDescription="Elegí el evento en el que vas a controlar el acceso. Solo ves eventos habilitados para tu rol."
        userName={profile.full_name ?? "Usuario"}
        events={events}
        selectedEventId={selectedEventId}
        basePath={ROUTES.adminPuerta}
        emptyMessage="No tenés eventos habilitados para operar como portero."
        showAdminUsersHint={profile.role === ROLES.ADMIN}
        links={
          profile.role === ROLES.ADMIN
            ? [{ href: ROUTES.adminEventos, label: "Ver eventos" }]
            : []
        }
      />
    </>
  );
}
