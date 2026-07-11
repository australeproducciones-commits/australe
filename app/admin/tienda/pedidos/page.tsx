import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreOrdersPanel } from "@/components/store/admin/AdminStoreOrdersPanel";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";
import { getStoreOrdersWithPaymentsForAdmin } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Admin · Tienda · Pedidos",
};

export default async function AdminTiendaPedidosPage() {
  const orders = await getStoreOrdersWithPaymentsForAdmin();

  return (
    <>
      <AdminHeader title="Pedidos de tienda" description="Gestión de reservas, pagos y entregas." />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTiendaPedidos} />
        <AdminStoreOrdersPanel orders={orders} />
      </div>
    </>
  );
}
