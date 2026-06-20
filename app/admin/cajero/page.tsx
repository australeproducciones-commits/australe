import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { StaffOperationalPanel } from "@/components/admin/staff/StaffOperationalPanel";
import { requireStaffPanelPage } from "@/lib/auth/requirePage";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getStaffAccessibleEvents } from "@/lib/users/queries";

export const metadata: Metadata = {
  title: "Panel Cajero",
};

type AdminCajeroPageProps = {
  searchParams: Promise<{ evento?: string }>;
};

export default async function AdminCajeroPage({
  searchParams,
}: AdminCajeroPageProps) {
  const { evento } = await searchParams;
  const { profile } = await requireStaffPanelPage(ROLES.CASHIER);
  const events = await getStaffAccessibleEvents(profile, {
    staffRole: ROLES.CASHIER,
  });

  const selectedEventId =
    evento && events.some((event) => event.id === evento) ? evento : null;

  return (
    <>
      <AdminHeader
        title="Cajero"
        description="Ventas rápidas en mostrador para el evento seleccionado."
      />
      <StaffOperationalPanel
        panelTitle="Cajero"
        panelDescription="Elegí el evento en el que vas a operar. Solo ves eventos habilitados para tu rol."
        userName={profile.full_name ?? "Usuario"}
        events={events}
        selectedEventId={selectedEventId}
        basePath={ROUTES.adminCajero}
        emptyMessage="No tenés eventos habilitados para operar como cajero."
        showAdminUsersHint={profile.role === ROLES.ADMIN}
        links={
          profile.role === ROLES.ADMIN
            ? [
                { href: ROUTES.adminCaja, label: "Ir a caja" },
                { href: ROUTES.adminProductos, label: "Ver productos" },
              ]
            : []
        }
      />
    </>
  );
}
