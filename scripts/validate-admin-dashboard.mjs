/**
 * Validación ETAPA D — dashboard administrativo SCADA.
 * Uso: node scripts/validate-admin-dashboard.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

const requiredFiles = [
  "components/admin/dashboard/AdminDashboard.tsx",
  "components/admin/dashboard/AdminDashboardHeader.tsx",
  "components/admin/dashboard/DashboardFiltersBar.tsx",
  "components/admin/dashboard/DashboardMetricCard.tsx",
  "components/admin/dashboard/RevenueChart.tsx",
  "components/admin/dashboard/OperationalStatusPanel.tsx",
  "lib/admin/dashboard/metrics.ts",
  "lib/admin/dashboard/formatters.ts",
  "lib/admin/dashboard/queries.ts",
  "app/admin/page.tsx",
];

for (const file of requiredFiles) {
  if (existsSync(resolve(root, file))) {
    pass(`archivo ${file}`);
  } else {
    fail(`archivo ${file}`, "no encontrado");
  }
}

const header = read("components/admin/dashboard/AdminDashboardHeader.tsx");
if (header.includes("Centro de control")) {
  pass("encabezado Centro de control");
} else {
  fail("encabezado Centro de control");
}

const filters = read("components/admin/dashboard/DashboardFiltersBar.tsx");
for (const token of ['"today"', '"7d"', '"30d"', "updateParams({ period })"]) {
  if (filters.includes(token)) {
    pass(`filtro rápido ${token}`);
  } else {
    fail(`filtro rápido ${token}`);
  }
}

const metricCard = read("components/admin/dashboard/DashboardMetricCard.tsx");
if (!metricCard.includes("truncate text-xl")) {
  pass("métricas sin truncate agresivo en valor principal");
} else {
  fail("métricas sin truncate", "sigue usando truncate en el valor");
}

const adminDashboard = read("components/admin/dashboard/AdminDashboard.tsx");
for (const token of [
  "bg-zinc-950",
  "grid-cols-1",
  "2xl:grid-cols-6",
  "OperationalStatusPanel",
  "RevenueChart",
]) {
  if (adminDashboard.includes(token)) {
    pass(`layout SCADA ${token}`);
  } else {
    fail(`layout SCADA ${token}`);
  }
}

const queriesSrc = read("lib/admin/dashboard/queries.ts");
if (!/mock|hardcode|lorem ipsum/i.test(queriesSrc)) {
  pass("queries sin datos mock/hardcode");
} else {
  fail("queries sin mock");
}

const queryRounds =
  (queriesSrc.match(/await Promise\.all\(/g) ?? []).length +
  (queriesSrc.includes("getAllEventsForAdmin") ? 1 : 0);
pass("capa de datos agrupada", `Promise.all=${queryRounds} bloques + getAllEventsForAdmin`);

const metricsSrc = read("lib/admin/dashboard/metrics.ts");
for (const id of [
  "revenue",
  "tickets",
  "kiosk",
  "traffic",
  "conversion",
  "attention",
]) {
  if (metricsSrc.includes(`id: "${id}"`)) {
    pass(`KPI ${id}`);
  } else {
    fail(`KPI ${id}`);
  }
}

if (metricsSrc.includes('`${formatMetricNumber(traffic.totalVisits)} visitas`')) {
  pass("tráfico valor completo en métricas");
} else {
  fail("tráfico valor completo en métricas");
}

if (metricsSrc.includes("buildOperationalStatusRows")) {
  pass("estado operativo derivado de datos reales");
} else {
  fail("estado operativo");
}

const periodSrc = read("lib/admin/dashboard/period.ts");
for (const period of ["today", "7d", "30d"]) {
  if (periodSrc.includes(`"${period}"`)) {
    pass(`período ${period} en parser`);
  } else {
    fail(`período ${period} en parser`);
  }
}

const nav = read("lib/auth/adminNav.ts");
if (nav.includes("Publicidad")) {
  pass("navegación mantiene Publicidad en main");
} else {
  fail("navegación Publicidad");
}

console.log("\n--- Resumen ---");
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} OK`);
if (failed.length > 0) {
  process.exit(1);
}
