/**
 * Valida el Preview de Vercel contra staging (sin exponer secretos).
 *
 * Variables requeridas:
 *   PREVIEW_BASE_URL — ej. https://australe-git-feat-community-giveaways-australe.vercel.app
 *   PREVIEW_CRON_SECRET — CRON_SECRET configurado en Preview
 *   VERCEL_AUTOMATION_BYPASS_SECRET — opcional, si Deployment Protection está activa
 *   EXPECTED_SUPABASE_PROJECT_REF — weuopuifmdgqfatcxjug
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

const env = {
  ...loadEnvFile(resolve(process.cwd(), ".env.preview.local")),
  ...loadEnvFile(resolve(process.cwd(), ".env.staging.local")),
  ...process.env,
};

const baseUrl = (env.PREVIEW_BASE_URL ?? "").replace(/\/$/, "");
const cronSecret = env.PREVIEW_CRON_SECRET ?? env.CRON_SECRET;
const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET;
const expectedRef = env.EXPECTED_SUPABASE_PROJECT_REF ?? "weuopuifmdgqfatcxjug";

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function buildHeaders(extra = {}) {
  const headers = { ...extra };
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
  }
  return headers;
}

async function request(path, options = {}) {
  if (!baseUrl) {
    throw new Error("PREVIEW_BASE_URL es obligatorio");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: buildHeaders(options.headers ?? {}),
    redirect: "manual",
  });

  return response;
}

async function testEnvironmentCheck() {
  const response = await request("/api/admin/environment-check", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  if (response.status === 401) {
    throw new Error("environment-check rechazó CRON_SECRET");
  }

  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(`environment-check HTTP ${response.status}: ${text.slice(0, 120)}`);
  }

  const body = await response.json();
  if (body.vercel_environment !== "preview") {
    throw new Error(`vercel_environment=${body.vercel_environment ?? "null"}`);
  }
  if (body.supabase_project_ref !== expectedRef) {
    throw new Error(
      `supabase_project_ref=${body.supabase_project_ref ?? "null"} (esperado ${expectedRef})`,
    );
  }
  if (!body.service_role_configured || !body.cron_secret_configured) {
    throw new Error("service_role o cron_secret no configurados en Preview");
  }

  pass(
    "Preview → staging confirmado",
    `ref=${body.supabase_project_ref}, commit=${String(body.git_commit_sha ?? "").slice(0, 7)}`,
  );
}

async function testCronAuth() {
  const noAuth = await request("/api/cron/community-giveaways");
  if (noAuth.status !== 401) {
    throw new Error(`cron sin auth debería ser 401, obtuvo ${noAuth.status}`);
  }
  pass("cron sin autorización → 401");

  const wrongAuth = await request("/api/cron/community-giveaways", {
    headers: { Authorization: "Bearer wrong-secret-value" },
  });
  if (wrongAuth.status !== 401) {
    throw new Error(`cron auth incorrecta debería ser 401, obtuvo ${wrongAuth.status}`);
  }
  pass("cron Authorization incorrecta → 401");

  const wrongHeader = await request("/api/cron/community-giveaways", {
    headers: { "x-cron-secret": "wrong-secret-value" },
  });
  if (wrongHeader.status !== 401) {
    throw new Error(`cron x-cron-secret incorrecto debería ser 401, obtuvo ${wrongHeader.status}`);
  }
  pass("cron x-cron-secret incorrecto → 401");

  const ok = await request("/api/cron/community-giveaways", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  if (ok.status !== 200) {
    throw new Error(`cron auth correcta debería ser 200, obtuvo ${ok.status}`);
  }
  const payload = await ok.json();
  if (!payload.ok) {
    throw new Error("cron no devolvió ok:true");
  }
  pass("cron Authorization correcta → 200");
}

async function main() {
  if (!baseUrl || !cronSecret) {
    fail(
      "configuración preview",
      "Faltan PREVIEW_BASE_URL y PREVIEW_CRON_SECRET (o CRON_SECRET)",
    );
    process.exit(1);
  }

  try {
    await testEnvironmentCheck();
    await testCronAuth();
  } catch (error) {
    fail("validación preview online", error instanceof Error ? error.message : String(error));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} pruebas Preview OK`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
