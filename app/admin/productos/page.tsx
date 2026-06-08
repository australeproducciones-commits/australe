import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Productos",
};

export default function AdminProductosPage() {
  return (
    <AdminPlaceholderPage
      title="Productos"
      description="Catálogo de productos para cocina, kiosco y barra con control de stock por evento."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
    />
  );
}
