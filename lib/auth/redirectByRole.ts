import { ROLES, type Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

export function getRedirectPathForRole(role: Role | string): string {
  switch (role) {
    case ROLES.ADMIN:
      return ROUTES.admin;
    case ROLES.CASHIER:
      return ROUTES.adminCajero;
    case ROLES.DOOR:
      return ROUTES.adminPuerta;
    case ROLES.CUSTOMER:
    default:
      return ROUTES.miCuenta;
  }
}
