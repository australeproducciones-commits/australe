/**
 * SSR/navegador C1.1 — login, returnTo, render autenticado, aceptación y reutilización.
 * Reproduce el fallo Preview sin SUPABASE_SERVICE_ROLE_KEY en el servidor Next.
 *
 * Uso: node scripts/validate-community-invitations-browser.mjs
 * Requiere: npm run build previo, playwright instalado (npx playwright install chromium).
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
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
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables Supabase en .env.local");
  process.exit(1);
}

const RUN_ID = `SSR-${Date.now().toString(36)}`;
const PORT = 34567;
const BASE = `http://127.0.0.1:${PORT}`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

const state = {
  eventId: null,
  eventSlug: null,
  authUserId: null,
  invitationId: null,
  token: null,
  email: null,
  password: null,
  server: null,
};

function defaultExpires(days = 7) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

async function setupFixture() {
  const slug = `${RUN_ID}-evento`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const { data: event, error: eventError } = await admin
    .from("events")
    .insert({
      name: `${RUN_ID} evento`,
      slug,
      event_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      external_sale_enabled: false,
      sale_whatsapp_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      sales_qr_enabled: false,
      qr_sell_tickets: false,
      qr_products_enabled: false,
      qr_show_price_list: false,
      qr_sell_products: false,
    })
    .select("id, slug")
    .single();
  if (eventError || !event) throw new Error(eventError?.message ?? "evento");

  state.eventId = event.id;
  state.eventSlug = event.slug;

  state.email = `${RUN_ID}@inv-ssr.invalid`;
  state.password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: state.email,
    password: state.password,
    email_confirm: true,
    user_metadata: { full_name: `${RUN_ID} user` },
  });
  if (authError) throw new Error(authError.message);
  state.authUserId = authData.user.id;

  const adminId =
    (await admin.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle())
      .data?.id ?? null;

  await admin.from("profiles").upsert({
    id: state.authUserId,
    full_name: `${RUN_ID} user`,
    role: "customer",
    is_active: true,
  });

  const token = randomBytes(24).toString("hex");
  const { data: inv, error: invError } = await admin
    .from("community_event_invitations")
    .insert({
      user_id: state.authUserId,
      event_id: state.eventId,
      invitation_type: "informational",
      channel: "manual",
      status: "prepared",
      public_token: token,
      expires_at: defaultExpires(),
      created_by: adminId,
      metadata: { test_run: RUN_ID },
    })
    .select("id")
    .single();
  if (invError || !inv) throw new Error(invError?.message ?? "invitación");

  state.invitationId = inv.id;
  state.token = token;
}

async function cleanup() {
  if (state.invitationId) {
    await admin.from("community_event_invitations").delete().eq("id", state.invitationId);
  }
  if (state.eventId) {
    await admin.from("events").delete().eq("id", state.eventId);
  }
  if (state.authUserId) {
    await admin.auth.admin.deleteUser(state.authUserId);
  }
}

function startServerWithoutServiceRole() {
  const childEnv = { ...process.env };
  delete childEnv.SUPABASE_SERVICE_ROLE_KEY;

  return new Promise((resolvePromise, reject) => {
    const child = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) reject(new Error("Timeout esperando servidor Next"));
    }, 120000);

    function onData(chunk) {
      const text = chunk.toString();
      if (text.includes("Ready") || text.includes(`127.0.0.1:${PORT}`) || text.includes(`localhost:${PORT}`)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    }

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!settled) reject(new Error(`next start salió con código ${code}`));
    });
  });
}

async function stopServer(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true });
  } else {
    child.kill("SIGTERM");
  }
  await new Promise((r) => setTimeout(r, 1500));
}

async function dismissPostLoginAd(page) {
  const closeAd = page.getByRole("button", { name: "Cerrar publicidad" });
  if (await closeAd.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeAd.click();
    await page.waitForTimeout(500);
  } else {
    const cerrar = page.getByRole("button", { name: "Cerrar" });
    if (await cerrar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cerrar.click();
      await page.waitForTimeout(500);
    }
  }
}

async function runBrowserFlow() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    fail("playwright", "Instalá con: npx playwright install chromium");
    return;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const invitationPath = `/invitacion/${state.token}`;
  const loginPath = `/login?returnTo=${encodeURIComponent(invitationPath)}`;

  await page.goto(`${BASE}${invitationPath}`, { waitUntil: "networkidle" });
  const guestText = await page.textContent("body");
  if (guestText?.includes("Iniciar sesión para aceptar")) {
    pass("1. Invitación sin sesión");
  } else {
    fail("1. Invitación sin sesión", "sin CTA de login");
  }

  await page.goto(`${BASE}${loginPath}`, { waitUntil: "networkidle" });
  await page.fill("#email", state.email);
  await page.fill("#password", state.password);
  await page.click('button[type="submit"]');
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.waitForURL(`**${invitationPath}**`, { timeout: 30000 });
  await dismissPostLoginAd(page);

  const currentUrl = page.url();
  if (currentUrl.includes(invitationPath)) {
    pass("2. returnTo tras login");
  } else {
    fail("2. returnTo tras login", currentUrl);
  }

  await page.waitForSelector('button:has-text("Aceptar invitación")', {
    timeout: 15000,
  });
  const authedText = await page.textContent("body");
  if (authedText?.includes("Aceptar invitación") && !authedText.includes("server error")) {
    pass("3. Render autenticado sin service_role");
  } else {
    fail("3. Render autenticado", "sin botón o con error");
  }

  await dismissPostLoginAd(page);
  await page.click('button:has-text("Aceptar invitación")');

  try {
    await page.waitForURL(`**/eventos/${state.eventSlug}**`, { timeout: 20000 });
    pass("4. Aceptación y redirect", page.url());
  } catch {
    const bodyAfterAccept = await page.textContent("body");
    const { data: acceptedRow } = await admin
      .from("community_event_invitations")
      .select("status, accepted_at")
      .eq("id", state.invitationId)
      .single();

    if (acceptedRow?.accepted_at && acceptedRow.status === "accepted") {
      pass("4. Aceptación confirmada en BD", acceptedRow.status);
    } else if (bodyAfterAccept?.includes("Credenciales") || bodyAfterAccept?.includes("sesión")) {
      fail("4. Aceptación", "sesión inválida en server action");
    } else {
      fail(
        "4. Aceptación",
        bodyAfterAccept?.replace(/\s+/g, " ").slice(0, 160) ?? "sin respuesta",
      );
    }
  }

  await page.goto(`${BASE}${invitationPath}`, { waitUntil: "networkidle" });
  await dismissPostLoginAd(page);
  const reuseText = await page.textContent("body");
  if (reuseText?.includes("ya fue utilizada")) {
    pass("5. Reutilización rechazada en UI");
  } else {
    fail("5. Reutilización", reuseText?.slice(0, 120) ?? "vacío");
  }

  if (consoleErrors.length === 0) {
    pass("6. Console sin errores");
  } else {
    fail("6. Console", consoleErrors.join(" | "));
  }

  await browser.close();
}

async function main() {
  console.log(`\n=== Validación navegador invitaciones (${RUN_ID}) ===\n`);

  try {
    await setupFixture();
    state.server = await startServerWithoutServiceRole();
    await new Promise((r) => setTimeout(r, 2000));
    await runBrowserFlow();
  } catch (err) {
    fail("ejecución", err instanceof Error ? err.message : String(err));
  } finally {
    await stopServer(state.server);
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n--- Resumen navegador: ${results.length - failed.length} passed, ${failed.length} failed ---\n`,
  );
  if (failed.length) process.exit(1);
}

main();
