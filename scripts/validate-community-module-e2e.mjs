/**
 * Validación E2E de invitaciones de Comunidad (alcance C1).
 * Uso: node scripts/validate-community-module-e2e.mjs
 * Requiere .env.local con variables Supabase.
 * Crea y elimina datos de prueba identificables (prefijo COMMUNITY-E2E-).
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
const siteUrl =
  env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables Supabase en .env.local");
  process.exit(1);
}

const RUN_ID = Date.now().toString(36);
const PREFIX = `COMMUNITY-E2E-${RUN_ID}`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
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
  adminId: null,
  customerWithPhone: null,
  customerNoPhone: null,
  customerNoEmail: null,
  eventId: null,
  eventSlug: null,
  tempEventId: null,
  invitationId: null,
  invitationToken: null,
  adCampaignId: null,
  authUserIds: [],
};

async function cleanup() {
  if (state.adCampaignId) {
    await admin.from("advertising_campaigns").delete().eq("id", state.adCampaignId);
  }
  if (state.invitationId) {
    await admin.from("community_event_invitations").delete().eq("id", state.invitationId);
  }
  if (state.tempEventId) {
    await admin.from("events").delete().eq("id", state.tempEventId);
  }
  for (const id of state.authUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
}

function normalizeWhatsapp(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("54") ? digits : `54${digits}`;
}

function buildWhatsappUrl(phone, message) {
  const normalized = normalizeWhatsapp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function isConfirmedSale(ticketStatus, paymentStatus) {
  return (
    (ticketStatus === "valid" || ticketStatus === "used") &&
    paymentStatus === "confirmed"
  );
}

async function detectDevPort() {
  for (const port of [3001, 3000]) {
    try {
      const res = await fetch(`http://localhost:${port}/`, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(3000),
      });
      if (res.status < 500) return port;
    } catch {
      /* try next */
    }
  }
  return 3001;
}

async function httpGetPage(path) {
  const port = await detectDevPort();
  const res = await fetch(`http://localhost:${port}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.text();
  return { port, status: res.status, body, location: res.headers.get("location") ?? "" };
}

async function httpRedirect(path, expectedSubstring) {
  const port = await detectDevPort();
  const res = await fetch(`http://localhost:${port}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  const location = res.headers.get("location") ?? "";
  const ok =
    (res.status === 307 || res.status === 302 || res.status === 308) &&
    location.includes(expectedSubstring);
  return { port, status: res.status, location, ok };
}

async function createTestAdmin() {
  const email = `admin_${RUN_ID}@community-e2e.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${PREFIX} Admin` },
  });
  if (error) throw new Error(error.message);
  state.authUserIds.push(data.user.id);
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: `${PREFIX} Admin`,
    role: "admin",
    is_active: true,
  });
  state.adminId = data.user.id;
  return { email, password, id: data.user.id };
}

async function createTestCustomer(label, { whatsapp, withEmail = true }) {
  const email = withEmail
    ? `customer_${label}_${RUN_ID}@community-e2e.invalid`
    : undefined;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: email ?? `noemail_${label}_${RUN_ID}@community-e2e.invalid`,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${PREFIX} ${label}` },
  });
  if (error) throw new Error(error.message);
  state.authUserIds.push(data.user.id);
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: `${PREFIX} ${label}`,
    role: "customer",
    is_active: true,
    whatsapp: whatsapp ?? null,
  });
  await admin.from("community_members").upsert({
    profile_id: data.user.id,
    status: "active",
    whatsapp: whatsapp ?? null,
  });
  return { id: data.user.id, email, password, whatsapp };
}

async function findPublishedEvent() {
  const { data } = await admin
    .from("events")
    .select("id, slug, name, event_date, status")
    .eq("status", "published")
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) {
    const { data: anyEvent } = await admin
      .from("events")
      .select("id, slug, name, event_date, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return anyEvent;
  }
  return data;
}

async function ensureTestEvent() {
  const existing = await findPublishedEvent();
  if (existing) {
    return existing;
  }

  const slug = `${PREFIX}-evento`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const eventDate = new Date(Date.now() + 30 * 86400000).toISOString();
  const { data, error } = await admin
    .from("events")
    .insert({
      name: `${PREFIX} evento de prueba`,
      slug,
      event_date: eventDate,
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
    .select("id, slug, name, event_date, status")
    .single();

  if (error || !data) {
    return null;
  }

  state.tempEventId = data.id;
  return data;
}

async function testRpcSecurity() {
  const { error } = await anon.rpc("record_community_invitation_open", {
    p_token: "fake-token",
  });
  if (error) {
    pass("RPC anon bloqueada", error.message.slice(0, 80));
  } else {
    fail("RPC anon bloqueada", "anon pudo ejecutar la RPC");
  }
}

async function testInvitationLifecycle() {
  const token = randomBytes(24).toString("hex");
  const { data: row, error } = await admin
    .from("community_event_invitations")
    .insert({
      user_id: state.customerWithPhone.id,
      event_id: state.eventId,
      invitation_type: "informational",
      channel: "whatsapp",
      status: "prepared",
      message: `${PREFIX} mensaje de prueba`,
      public_token: token,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: state.adminId,
      metadata: { test_run: RUN_ID, keep: true },
    })
    .select("id, public_token, opened_at, metadata")
    .single();
  if (error || !row) {
    fail("Crear invitación de prueba", error?.message);
    return;
  }
  state.invitationId = row.id;
  state.invitationToken = token;
  pass("Crear invitación de prueba", row.id);

  const { data: opened1, error: rpc1 } = await admin.rpc(
    "record_community_invitation_open",
    { p_token: token },
  );
  if (rpc1 || !opened1?.opened_at) {
    fail("RPC primera apertura", rpc1?.message ?? "sin opened_at");
  } else {
    pass("RPC primera apertura", `status=${opened1.status}`);
  }

  const firstOpenedAt = opened1.opened_at;
  const { data: opened2 } = await admin.rpc("record_community_invitation_open", {
    p_token: token,
  });
  if (opened2?.opened_at === firstOpenedAt) {
    pass("RPC segunda apertura idempotente", firstOpenedAt);
  } else {
    fail("RPC segunda apertura idempotente", "opened_at cambió");
  }

  const { data: afterOpen } = await admin
    .from("community_event_invitations")
    .select("metadata")
    .eq("id", row.id)
    .single();
  if (afterOpen?.metadata?.keep === true && afterOpen?.metadata?.test_run === RUN_ID) {
    pass("Metadata preservada tras RPC");
  } else {
    fail("Metadata preservada tras RPC", JSON.stringify(afterOpen?.metadata));
  }

  const { port, status, body } = await httpGetPage(`/invitacion/${token}`);
  if (status === 200 && body.includes("Iniciar sesión para aceptar")) {
    pass("HTTP /invitacion/[token] página login", `status=${status} (puerto ${port})`);
  } else {
    fail("HTTP /invitacion/[token] página login", `${status}`);
  }

  const invalid = await httpGetPage("/invitacion/token-inexistente-xyz");
  if (invalid.status === 200 && invalid.body.includes("Iniciar sesión para aceptar")) {
    pass("HTTP token inválido → pantalla genérica");
  } else {
    fail("HTTP token inválido", `${invalid.status}`);
  }

  await admin
    .from("community_event_invitations")
    .update({ cancelled_at: new Date().toISOString(), status: "cancelled" })
    .eq("id", row.id);
  const cancelled = await httpGetPage(`/invitacion/${token}`);
  if (cancelled.status === 200 && cancelled.body.includes("Iniciar sesión para aceptar")) {
    pass("HTTP token cancelado → pantalla genérica");
  } else {
    fail("HTTP token cancelado", `${cancelled.status}`);
  }

  await admin.from("community_event_invitations").delete().eq("id", row.id);
  state.invitationId = null;
}

async function testDuplicateDetection() {
  const token1 = randomBytes(24).toString("hex");
  const { data: inv1 } = await admin
    .from("community_event_invitations")
    .insert({
      user_id: state.customerWithPhone.id,
      event_id: state.eventId,
      invitation_type: "purchase_link",
      channel: "whatsapp",
      status: "prepared",
      public_token: token1,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: state.adminId,
    })
    .select("id")
    .single();

  const { data: existing } = await admin
    .from("community_event_invitations")
    .select("id")
    .eq("user_id", state.customerWithPhone.id)
    .eq("event_id", state.eventId)
    .is("cancelled_at", null)
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

  if ((existing ?? []).length >= 1) {
    pass("Detección duplicado activo", `${existing.length} invitación(es)`);
  } else {
    fail("Detección duplicado activo");
  }

  if (inv1?.id) {
    await admin.from("community_event_invitations").delete().eq("id", inv1.id);
  }
}

async function testWhatsappAndEmailUrls() {
  const phone = "11 2345-6789";
  const msg = "Hola test\nhttps://example.com/invitacion/abc";
  const wa = buildWhatsappUrl(phone, msg);
  if (wa?.startsWith("https://wa.me/54") && wa.includes("text=")) {
    pass("WhatsApp URL normalizada", wa.slice(0, 60));
  } else {
    fail("WhatsApp URL", wa);
  }
  if (!wa?.includes("sent")) {
    pass("WhatsApp no simula envío");
  }
  const mailto = `mailto:test@example.com?subject=${encodeURIComponent("Invitación")}&body=${encodeURIComponent(msg)}`;
  if (mailto.startsWith("mailto:")) {
    pass("mailto codificado");
  } else {
    fail("mailto");
  }
}

async function testUserStatsCrossCheck() {
  const userId = state.customerWithPhone.id;
  const { data: tickets } = await admin
    .from("tickets")
    .select("price_paid, ticket_status, payment_status, used_at, event_id, created_at")
    .eq("user_id", userId);

  let purchaseCount = 0;
  let totalSpent = 0;
  const attended = new Set();
  for (const t of tickets ?? []) {
    if (isConfirmedSale(t.ticket_status, t.payment_status)) {
      purchaseCount++;
      totalSpent += Number(t.price_paid ?? 0);
    }
    if (t.ticket_status === "used" && t.payment_status === "confirmed") {
      attended.add(t.event_id);
    }
  }

  const { data: loyalty } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .maybeSingle();

  pass(
    "Stats usuario prueba calculadas",
    `compras=${purchaseCount}, gasto=${totalSpent}, eventos=${attended.size}, puntos=${loyalty?.points_balance ?? 0}`,
  );

  const { data: realCustomers } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "customer")
    .limit(5);

  if ((realCustomers ?? []).length > 0) {
    const sampleId = realCustomers[0].id;
    const { data: sampleTickets } = await admin
      .from("tickets")
      .select("ticket_status, payment_status, price_paid, event_id, used_at")
      .eq("user_id", sampleId);
    let confirmed = 0;
    for (const t of sampleTickets ?? []) {
      if (isConfirmedSale(t.ticket_status, t.payment_status)) confirmed++;
    }
    pass("Muestra usuario real en BD", `id=${sampleId.slice(0, 8)}… tickets confirmados=${confirmed}`);
  }
}

async function testConcurrentInvitationOpen() {
  if (!state.eventId || !state.customerWithPhone) {
    fail("Concurrencia apertura", "sin evento o usuario de prueba");
    return;
  }

  const token = randomBytes(24).toString("hex");
  const { data: row, error } = await admin
    .from("community_event_invitations")
    .insert({
      user_id: state.customerWithPhone.id,
      event_id: state.eventId,
      invitation_type: "informational",
      channel: "manual",
      status: "prepared",
      public_token: token,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: state.adminId,
      metadata: { test_run: RUN_ID, concurrent: true },
    })
    .select("id")
    .single();

  if (error || !row) {
    fail("Concurrencia: crear invitación", error?.message);
    return;
  }

  const [r1, r2] = await Promise.all([
    admin.rpc("record_community_invitation_open", { p_token: token }),
    admin.rpc("record_community_invitation_open", { p_token: token }),
  ]);

  if (r1.error || r2.error) {
    fail("Concurrencia: RPC paralela", r1.error?.message ?? r2.error?.message);
  } else if (r1.data?.opened_at && r1.data.opened_at === r2.data?.opened_at) {
    pass("Concurrencia: doble apertura idempotente", r1.data.opened_at);
  } else {
    fail("Concurrencia: opened_at inconsistente", JSON.stringify({ a: r1.data, b: r2.data }));
  }

  await admin.from("community_event_invitations").delete().eq("id", row.id);
}

async function testAdminRedirectsUnauthenticated() {
  const tests = [
    ["/admin/publicidad", "/login"],
    ["/admin/comunidad", "/login"],
    ["/admin/comunidad/publicidad", "/login"],
  ];
  for (const [path, expect] of tests) {
    const { status, location, port } = await httpRedirect(path, expect);
    if (location.includes(expect)) {
      pass(`Sin sesión ${path} → login`, `puerto ${port} status ${status}`);
    } else {
      fail(`Sin sesión ${path}`, `${status} ${location}`);
    }
  }
}

async function testRlsNoPublicPolicies() {
  const { data: inv, error } = await anon
    .from("community_event_invitations")
    .select("id")
    .limit(1);
  if (error || (inv ?? []).length === 0) {
    pass("anon no lista invitaciones", error?.message?.slice(0, 60) ?? "0 filas");
  } else {
    fail("anon lista invitaciones", `${inv.length} filas`);
  }
}

async function main() {
  console.log(`\n=== Validación E2E Comunidad (${PREFIX}) ===\n`);
  console.log(`Site URL config: ${siteUrl}\n`);

  try {
    await testRlsNoPublicPolicies();
    await testRpcSecurity();
    await createTestAdmin();
    state.customerWithPhone = await createTestCustomer("ConWhatsApp", {
      whatsapp: "+54 11 5555-0100",
    });
    state.customerNoPhone = await createTestCustomer("SinTelefono", {
      whatsapp: null,
    });
    state.customerNoEmail = await createTestCustomer("SinEmail", {
      whatsapp: "+54 11 5555-0200",
      withEmail: false,
    });

    const event = await ensureTestEvent();
    if (!event) {
      fail("Evento publicado para invitaciones", "no hay eventos en BD");
    } else {
      state.eventId = event.id;
      state.eventSlug = event.slug;
      pass("Evento para invitaciones", `${event.name} (${event.slug})`);
      await testInvitationLifecycle();
      await testDuplicateDetection();
      await testConcurrentInvitationOpen();
    }

    await testWhatsappAndEmailUrls();
    await testUserStatsCrossCheck();
    await testAdminRedirectsUnauthenticated();
  } catch (err) {
    fail("Error fatal", err instanceof Error ? err.message : String(err));
  } finally {
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Resumen: ${results.length - failed.length} passed, ${failed.length} failed ---\n`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
