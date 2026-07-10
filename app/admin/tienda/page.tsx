import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";
import { getStoreDashboardStats } from "@/lib/store/queries";
import { formatStorePrice } from "@/lib/store/utils";

export const metadata: Metadata = {
  title: "Admin · Tienda",
};

export default async function AdminTiendaPage() {
  const stats = await getStoreDashboardStats();

  return (
    <>
      <AdminHeader
        title="Tienda / Merchandising"
        description="Ventas de merch oficial, separado del kiosco de consumiciones."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTienda} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Ventas confirmadas" value={formatStorePrice(stats.totalSales)} />
          <StatCard label="Pedidos pendientes" value={String(stats.pendingOrders)} />
          <StatCard label="Listos para retiro" value={String(stats.readyOrders)} />
          <StatCard label="Entregados" value={String(stats.deliveredOrders)} />
          <StatCard label="Stock bajo" value={String(stats.lowStockProducts)} />
          <StatCard label="Agotados" value={String(stats.soldOutProducts)} />
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
