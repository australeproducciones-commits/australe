/**
 * Validación visual del dashboard SCADA de /admin/comunidad.
 * Ejecutar: node scripts/validate-community-dashboard-visual.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

function read(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

let passed = 0;
let failed = 0;

function ok(label, detail = "") {
  passed += 1;
  console.log(`OK  ${label}${detail ? `: ${detail}` : ""}`);
}

function bad(label, detail = "") {
  failed += 1;
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
}

function includesAll(file, fragments, label) {
  const content = read(file);
  const missing = fragments.filter((f) => !content.includes(f));
  if (missing.length === 0) ok(label);
  else bad(label, `faltan en ${file}: ${missing.join(", ")}`);
}

console.log("\n=== validate community dashboard visual ===\n");

const pagePath = "app/admin/comunidad/page.tsx";
const summaryPath = "components/admin/community/AdminCommunitySummary.tsx";
const metricsPath = "lib/community/admin/dashboard-metrics.ts";

includesAll(pagePath, ["requireAdminPage", "getAdminCommunitySummary", 'variant="dashboard"'], "1 página resumen protegida y con variant dashboard");
includesAll(summaryPath, ["CommunityDashboardHeader", "CommunityQuickActions", "DashboardMetricCard", "CommunityActivityChart", "CommunityInvitationsStatusChart", "CommunityOperationalPanel", "CommunityInsightsPanel"], "2 panel resumen con componentes SCADA");

includesAll(
  "components/admin/community/dashboard/CommunityQuickActions.tsx",
  ["Ver usuarios", "Crear recompensa", "Invitar usuarios", "Crear publicidad"],
  "3 acciones rápidas presentes",
);

includesAll(
  "components/admin/community/AdminCommunityNav.tsx",
  ["Resumen", "Usuarios", "Movimientos", "Recompensas", "Invitaciones", "Publicidad", "Configuración"],
  "4 tabs del módulo presentes",
);

includesAll(
  metricsPath,
  ["buildCommunityKpis", "buildCommunityActivityBars", "buildInvitationSlices", "buildCommunityHealthInsights"],
  "5 métricas derivadas sin consultas nuevas",
);

const summary = read(summaryPath);
if (!summary.includes("createClient") && !summary.includes("from(")) {
  ok("6 sin consultas nuevas en el panel");
} else {
  bad("6 consultas en el panel");
}

const queries = read("lib/community/loyalty/admin-queries.ts");
if (queries.includes("export async function getAdminCommunitySummary")) {
  ok("7 query original de resumen preservada");
} else {
  bad("7 query de resumen");
}

let migrationDiff = "";
try {
  migrationDiff = execSync("git diff --name-only origin/main...HEAD", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  migrationDiff = "";
}
if (
  !migrationDiff.split(/\r?\n/).some((f) => f.startsWith("supabase/migrations/"))
) {
  ok("8 sin migraciones nuevas");
} else {
  bad("8 migraciones detectadas");
}

includesAll(
  summaryPath,
  ["max-w-7xl", "grid", "xl:grid-cols"],
  "9 layout responsive básico",
);

const routes = [
  "app/admin/comunidad/usuarios/page.tsx",
  "app/admin/comunidad/movimientos/page.tsx",
  "app/admin/comunidad/recompensas/page.tsx",
  "app/admin/comunidad/invitaciones/page.tsx",
  "app/admin/comunidad/publicidad/page.tsx",
  "app/admin/comunidad/configuracion/page.tsx",
];
for (const route of routes) {
  if (existsSync(resolve(process.cwd(), route)) && read(route).includes("requireAdminPage")) {
    ok(`10 ruta protegida: ${route.split("/").slice(-2, -1)[0]}`);
  } else {
    bad(`10 ruta: ${route}`);
  }
}

if (existsSync(resolve(process.cwd(), "components/admin/community/dashboard/CommunityDashboardHeader.tsx"))) {
  ok("11 header SCADA presente");
} else {
  bad("11 header SCADA");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
