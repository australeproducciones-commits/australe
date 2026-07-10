import { requiresAuthCheck } from "@/lib/auth/routeAccess";

/** Rutas donde el Proxy debe ejecutar lógica de autenticación. */
export const PROXY_AUTH_PREFIXES = [
  "/login",
  "/mi-cuenta",
  "/admin",
  "/cajero",
  "/portero",
] as const;

const STATIC_FILE_PATTERN =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|map|woff2?)$/i;

export function shouldRunProxyAuth(pathname: string): boolean {
  if (pathname.startsWith("/_next")) {
    return false;
  }

  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return false;
  }

  if (STATIC_FILE_PATTERN.test(pathname)) {
    return false;
  }

  if (pathname === "/api/analytics" || pathname.startsWith("/api/analytics/")) {
    return false;
  }

  return requiresAuthCheck(pathname);
}

export const proxyMatcher = [
  "/login",
  "/mi-cuenta/:path*",
  "/admin/:path*",
  "/cajero/:path*",
  "/portero/:path*",
] as const;
