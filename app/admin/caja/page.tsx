import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Caja",
};

export default function AdminCajaPage() {
  return (
    <AdminPlaceholderPage
      title="Caja"
      description="Panel de caja para apertura, cierre, arqueo y control de movimientos del evento."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
      operational
      links={[
        { href: ROUTES.adminCajero, label: "Modo cajero", variant: "secondary" },
        { href: ROUTES.adminVentas, label: "Ver ventas", variant: "outline" },
      ]}
    />
  );
}
