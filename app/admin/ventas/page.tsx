import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Ventas",
};

export default function AdminVentasPage() {
  return (
    <AdminPlaceholderPage
      title="Ventas"
      description="Historial de ventas, reportes y exportación a Excel por evento y período."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
      links={[
        { href: ROUTES.adminCaja, label: "Ir a caja", variant: "outline" },
      ]}
    />
  );
}
