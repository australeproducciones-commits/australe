import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <AdminPlaceholderPage
      title="Panel de administración"
      description="Centro de control para eventos, comunidad, productos, ventas, caja y usuarios de Australe Producciones."
      links={[
        { href: ROUTES.adminEventos, label: "Gestionar eventos", size: "lg" },
        { href: ROUTES.adminVentas, label: "Ver ventas", variant: "outline", size: "lg" },
        { href: ROUTES.home, label: "Ir al sitio público", variant: "ghost", size: "lg" },
      ]}
    />
  );
}
