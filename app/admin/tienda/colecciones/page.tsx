import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";
import { getStoreCollectionsForAdmin } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Admin · Tienda · Colecciones",
};

export default async function AdminTiendaColeccionesPage() {
  const collections = await getStoreCollectionsForAdmin();

  return (
    <>
      <AdminHeader title="Colecciones" description="Ediciones y agrupaciones de productos." />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTiendaColecciones} />
        {collections.length === 0 ? (
          <p className="text-zinc-400">Todavía no hay colecciones creadas.</p>
        ) : (
          <ul className="space-y-3">
            {collections.map((collection) => (
              <li
                key={collection.id}
                className="rounded-xl border border-zinc-800 px-4 py-3 text-white"
              >
                {collection.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
