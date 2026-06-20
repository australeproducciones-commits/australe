import { getRedirectPathForRole } from "@/lib/auth/redirectByRole";
import { buildLoginUrl, sanitizeReturnTo } from "@/lib/auth/loginRedirect";
import type { Profile } from "@/lib/auth/types";
import { ROLES, type Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

export function normalizeRole(role: string | null | undefined): Role {
  if (
    role === ROLES.ADMIN ||
    role === ROLES.CASHIER ||
    role === ROLES.DOOR ||
    role === ROLES.CUSTOMER
  ) {
    return role;
  }

  return ROLES.CUSTOMER;
}

export function getEffectiveRole(profile: Profile | null): Role {
  if (!profile || !profile.is_active) {
    return ROLES.CUSTOMER;
  }

  return normalizeRole(profile.role);
}

export function isStaffRole(role: Role): boolean {
  return (
    role === ROLES.ADMIN || role === ROLES.CASHIER || role === ROLES.DOOR
  );
}

export function isAccountPath(pathname: string): boolean {
  return (
    pathname === ROUTES.miCuenta ||
    pathname.startsWith(`${ROUTES.miCuenta}/`)
  );
}

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`)
  );
}

export function isLoginPath(pathname: string): boolean {
  return pathname === ROUTES.login;
}

export function isStaffEntryPath(pathname: string): boolean {
  return (
    pathname === ROUTES.cajero ||
    pathname.startsWith(`${ROUTES.cajero}/`) ||
    pathname === ROUTES.portero ||
    pathname.startsWith(`${ROUTES.portero}/`)
  );
}

export function isCashierAdminPath(pathname: string): boolean {
  return (
    pathname === ROUTES.adminCajero ||
    pathname.startsWith(`${ROUTES.adminCajero}/`) ||
    pathname === ROUTES.cajero ||
    pathname.startsWith(`${ROUTES.cajero}/`)
  );
}

export function isDoorAdminPath(pathname: string): boolean {
  return (
    pathname === ROUTES.adminPuerta ||
    pathname.startsWith(`${ROUTES.adminPuerta}/`) ||
    pathname === ROUTES.portero ||
    pathname.startsWith(`${ROUTES.portero}/`)
  );
}

export function requiresAuthCheck(pathname: string): boolean {
  return (
    isLoginPath(pathname) ||
    isAccountPath(pathname) ||
    isAdminPath(pathname) ||
    isStaffEntryPath(pathname)
  );
}

type MiddlewareAuthContext = {
  isAuthenticated: boolean;
  role: Role;
  returnTo?: string | null;
};

export function resolveMiddlewareRedirect(
  pathname: string,
  context: MiddlewareAuthContext,
): string | null {
  const { isAuthenticated, role, returnTo } = context;

  if (isLoginPath(pathname)) {
    if (isAuthenticated) {
      return sanitizeReturnTo(returnTo) ?? getRedirectPathForRole(role);
    }
    return null;
  }

  if (isAccountPath(pathname)) {
    if (!isAuthenticated) {
      return buildLoginUrl(pathname);
    }
    return null;
  }

  if (isAdminPath(pathname)) {
    if (!isAuthenticated) {
      return buildLoginUrl(pathname);
    }

    if (role === ROLES.CUSTOMER) {
      return ROUTES.miCuenta;
    }

    if (role === ROLES.CASHIER && !isCashierAdminPath(pathname)) {
      return ROUTES.adminCajero;
    }

    if (role === ROLES.DOOR && !isDoorAdminPath(pathname)) {
      return ROUTES.adminPuerta;
    }

    return null;
  }

  if (isStaffEntryPath(pathname)) {
    if (!isAuthenticated) {
      return buildLoginUrl(pathname);
    }

    if (role === ROLES.CUSTOMER) {
      return ROUTES.miCuenta;
    }

    if (
      pathname === ROUTES.cajero ||
      pathname.startsWith(`${ROUTES.cajero}/`)
    ) {
      return ROUTES.adminCajero;
    }

    if (
      pathname === ROUTES.portero ||
      pathname.startsWith(`${ROUTES.portero}/`)
    ) {
      return ROUTES.adminPuerta;
    }

    if (role === ROLES.CASHIER && !isCashierAdminPath(pathname)) {
      return ROUTES.adminCajero;
    }

    if (role === ROLES.DOOR && !isDoorAdminPath(pathname)) {
      return ROUTES.adminPuerta;
    }

    return null;
  }

  return null;
}
