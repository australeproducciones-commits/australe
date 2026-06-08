import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Panel Puerta",
};

export default function AdminPuertaPage() {
  return (
    <AdminPlaceholderPage
      title="Panel Puerta"
      description="Validación de entradas por QR en acceso al evento. Interfaz simple y de lectura rápida."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
      operational
      links={[
        { href: ROUTES.adminEventos, label: "Ver eventos", variant: "outline" },
      ]}
    />
  );
}
