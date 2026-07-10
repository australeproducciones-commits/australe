/**
 * Valida matcher y exclusiones del Proxy de autenticación.
 * Lógica espejada de lib/auth/proxyMatcher.ts y lib/auth/routeAccess.ts.
 * Uso: node scripts/validate-proxy-matcher.mjs
 */
import assert from "node:assert/strict";

const ROUTES = {
  login: "/login",
  miCuenta: "/mi-cuenta",
  admin: "/admin",
  cajero: "/cajero",
  portero: "/portero",
};

const STATIC_FILE_PATTERN =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|map|woff2?)$/i;

function isLoginPath(pathname) {
  return pathname === ROUTES.login;
}

function isAccountPath(pathname) {
  return pathname === ROUTES.miCuenta || pathname.startsWith(`${ROUTES.miCuenta}/`);
}

function isAdminPath(pathname) {
  return pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);
}

function isStaffEntryPath(pathname) {
  return (
    pathname === ROUTES.cajero ||
    pathname.startsWith(`${ROUTES.cajero}/`) ||
    pathname === ROUTES.portero ||
    pathname.startsWith(`${ROUTES.portero}/`)
  );
}

function requiresAuthCheck(pathname) {
  return (
    isLoginPath(pathname) ||
    isAccountPath(pathname) ||
    isAdminPath(pathname) ||
    isStaffEntryPath(pathname)
  );
}

function shouldRunProxyAuth(pathname) {
  if (pathname.startsWith("/_next")) {
    return false;
  }

  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
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

const proxyMatcher = [
  "/login",
  "/mi-cuenta/:path*",
  "/admin/:path*",
  "/cajero/:path*",
  "/portero/:path*",
];

const publicRoutes = [
  "/",
  "/eventos",
  "/eventos/algun-slug",
  "/eventos/foo/bar",
  "/sobre",
  "/contacto",
  "/api/analytics",
  "/api/analytics/track",
];
for (const path of publicRoutes) {
  assert.equal(
    shouldRunProxyAuth(path),
    false,
    `public route should skip proxy: ${path}`,
  );
}

const publicWithQuery = [
  "/eventos?ref=home",
  "/?utm_source=test",
  "/api/analytics?debug=1",
];
for (const path of publicWithQuery) {
  const pathname = path.split("?")[0];
  assert.equal(
    shouldRunProxyAuth(pathname),
    false,
    `public route with query should skip proxy: ${path}`,
  );
}

const staticAssets = [
  "/_next/static/chunk.js",
  "/_next/image",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/images/banner.webp",
  "/logo.svg",
  "/styles/main.css",
  "/fonts/inter.woff2",
];
for (const path of staticAssets) {
  const pathname = path.split("?")[0];
  assert.equal(
    shouldRunProxyAuth(pathname),
    false,
    `static asset should skip proxy: ${path}`,
  );
}

const protectedRoutes = [
  "/login",
  "/login?returnTo=%2Fadmin",
  "/mi-cuenta",
  "/mi-cuenta/entradas",
  "/admin",
  "/admin/eventos",
  "/cajero",
  "/cajero/venta",
  "/portero",
  "/portero/scan",
];
for (const path of protectedRoutes) {
  const pathname = path.split("?")[0];
  assert.equal(
    shouldRunProxyAuth(pathname),
    true,
    `protected route should use proxy: ${path}`,
  );
  assert.equal(
    requiresAuthCheck(pathname),
    true,
    `requiresAuthCheck: ${path}`,
  );
}

const similarButPublic = [
  "/administracion",
  "/administracion/eventos",
  "/mi-cuentas",
  "/cajeros",
  "/porteros",
  "/eventos-admin",
];
for (const path of similarButPublic) {
  assert.equal(
    shouldRunProxyAuth(path),
    false,
    `similar-but-public route should skip proxy: ${path}`,
  );
  assert.equal(
    requiresAuthCheck(path),
    false,
    `similar-but-public should not require auth: ${path}`,
  );
}

assert.ok(proxyMatcher.includes("/login"));
assert.ok(proxyMatcher.includes("/admin/:path*"));
assert.ok(proxyMatcher.includes("/mi-cuenta/:path*"));
assert.ok(proxyMatcher.includes("/cajero/:path*"));
assert.ok(proxyMatcher.includes("/portero/:path*"));

console.log("validate-proxy-matcher: OK");
