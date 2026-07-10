import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";
import { getStoreProductsForAdmin, getStoreStockMovements } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Admin · Tienda · Stock",
};

export default async function AdminTiendaStockPage() {
  const [products, movements] = await Promise.all([
    getStoreProductsForAdmin(),
    getStoreStockMovements(),
  ]);

  return (
    <>
      <AdminHeader title="Stock de tienda" description="Disponibilidad y movimientos auditados." />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTiendaStock} />
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border border-zinc-800 p-4">
              <p className="font-semibold text-white">{product.name}</p>
              <p className="text-sm text-zinc-400">
                Disponible: {product.stock_total - product.stock_reserved}
              </p>
            </div>
          ))}
        </div>
        <h2 className="mb-4 text-lg font-semibold text-white">Últimos movimientos</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Stock prev → nuevo</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-zinc-300">{m.movement_type}</td>
                  <td className="px-4 py-3 text-zinc-300">{m.quantity}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {m.previous_stock} → {m.new_stock}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{m.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {new Date(m.created_at).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
