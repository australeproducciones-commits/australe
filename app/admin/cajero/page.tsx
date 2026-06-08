import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Panel Cajero",
};

export default function AdminCajeroPage() {
  return (
    <AdminPlaceholderPage
      title="Panel Cajero"
      description="Interfaz operativa para venta rápida de productos y entradas en mostrador."
      backHref={ROUTES.adminCaja}
      backLabel="Volver a caja"
      operational
      links={[
        { href: ROUTES.adminProductos, label: "Ver productos", variant: "outline" },
      ]}
    />
  );
}
