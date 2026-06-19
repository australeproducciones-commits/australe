import { ROLES, type Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

export type AdminNavLink = {
  href: string;
  label: string;
};

const ADMIN_ONLY_LINKS: AdminNavLink[] = [
  { href: ROUTES.admin, label: "Inicio" },
  { href: ROUTES.adminEventos, label: "Eventos" },
  { href: ROUTES.adminComunidad, label: "Comunidad" },
  { href: ROUTES.adminProductos, label: "Productos" },
  { href: ROUTES.adminPartners, label: "Partners" },
  { href: ROUTES.adminPublicidad, label: "Publicidad" },
  { href: ROUTES.adminConfiguracion, label: "Configuración" },
  { href: ROUTES.adminUsuarios, label: "Usuarios" },
];

export function getAdminNavLinksForRole(role: Role): AdminNavLink[] {
  switch (role) {
    case ROLES.ADMIN:
      return ADMIN_ONLY_LINKS;
    case ROLES.CASHIER:
      return [{ href: ROUTES.adminCajero, label: "Cajero" }];
    case ROLES.DOOR:
      return [{ href: ROUTES.adminPuerta, label: "Portero" }];
    default:
      return [];
  }
}
