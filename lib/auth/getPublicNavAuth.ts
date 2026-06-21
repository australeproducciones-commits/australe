import type { PublicSessionUser } from "@/lib/auth/getPublicSessionUser";
import { getEffectiveRole } from "@/lib/auth/routeAccess";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

export type PublicNavAuthLink = {
  href: string;
  label: string;
};

export function getPublicNavAuthLink(
  sessionUser: PublicSessionUser,
): PublicNavAuthLink {
  const role = getEffectiveRole(sessionUser.profile);

  switch (role) {
    case ROLES.ADMIN:
      return { href: ROUTES.admin, label: "Panel" };
    case ROLES.CASHIER:
      return { href: ROUTES.adminCajero, label: "Cajero" };
    case ROLES.DOOR:
      return { href: ROUTES.adminPuerta, label: "Portero" };
    case ROLES.CUSTOMER:
    default:
      return { href: ROUTES.miCuenta, label: "Mi cuenta" };
  }
}
