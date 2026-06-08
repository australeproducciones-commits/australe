import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Usuarios",
};

export default function AdminUsuariosPage() {
  return (
    <AdminPlaceholderPage
      title="Usuarios y roles"
      description="Gestión de usuarios del sistema con roles de administrador, cajero, puerta y usuario."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
    />
  );
}
