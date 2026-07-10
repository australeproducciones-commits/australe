import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStorePickupPanel } from "@/components/store/admin/AdminStorePickupPanel";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Tienda · Retiros",
};

export default function AdminTiendaRetirosPage() {
  return (
    <>
      <AdminHeader
        title="Retiros de tienda"
        description="Validá códigos y registrá entregas de merch."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTiendaRetiros} />
        <AdminStorePickupPanel />
      </div>
    </>
  );
}
