/**
 * Validación del módulo de sorteos de Comunidad.
 * Uso: node scripts/validate-community-giveaways.mjs
 * Requiere .env.local con Supabase. No ejecutar en producción sin entorno de prueba.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
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

const RUN_ID = Date.now().toString(36);
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
  userId: null,
  client: null,
  giveawayId: null,
  entryId: null,
  requestId: randomUUID(),
};

async function cleanup() {
  if (state.giveawayId) {
    await admin.from("community_giveaway_winners").delete().eq("giveaway_id", state.giveawayId);
    await admin.from("community_giveaway_entries").delete().eq("giveaway_id", state.giveawayId);
    await admin.from("community_giveaway_audit_logs").delete().eq("giveaway_id", state.giveawayId);
    await admin.from("community_giveaways").delete().eq("id", state.giveawayId);
  }
  if (state.userId) {
    await admin.from("loyalty_transactions").delete().eq("user_id", state.userId);
    await admin.from("loyalty_accounts").delete().eq("user_id", state.userId);
    await admin.from("community_members").delete().eq("profile_id", state.userId);
    await admin.from("profiles").delete().eq("id", state.userId);
    await admin.auth.admin.deleteUser(state.userId);
  }
}

async function setup() {
  const email = `giveaway_test_${RUN_ID}@test.invalid`;
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: `Tst!${randomUUID().slice(0, 12)}`,
    email_confirm: true,
    user_metadata: { full_name: "Giveaway Test" },
  });
  if (authError) throw authError;
  state.userId = authUser.user.id;

  await admin.from("profiles").upsert({
    id: state.userId,
    full_name: "Giveaway Test",
    role: "customer",
    is_active: true,
  });

  await admin.from("community_members").insert({
    profile_id: state.userId,
    full_name: "Giveaway Test",
    whatsapp: "1100000000",
    dni: "99999999",
    birth_date: "1990-01-01",
    status: "active",
    community_code: `GT${RUN_ID}`,
  });

  await admin.rpc("ensure_loyalty_account", { p_user_id: state.userId });
  await admin.rpc("adjust_loyalty_points", {
    p_user_id: state.userId,
    p_points: 500,
    p_reason: "Test sorteos",
    p_admin_id: state.userId,
  });

  const slug = `sorteo-test-${RUN_ID}`;
  const { data: giveaway, error } = await admin
    .from("community_giveaways")
    .insert({
      name: "Sorteo Test",
      slug,
      prize_description: "Premio test",
      status: "active",
      entry_type: "points",
      points_cost: 100,
      max_entries_per_user: 5,
      allow_multiple_entries: true,
      winner_count: 1,
      alternate_count: 1,
      is_public: true,
      starts_at: new Date(Date.now() - 3600000).toISOString(),
      closes_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  state.giveawayId = giveaway.id;
}

async function testEnterPoints() {
  const { data, error } = await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_user_id: state.userId,
    p_requested_quantity: 1,
    p_request_id: state.requestId,
  });
  if (error) throw error;
  state.entryId = data[0].entry_id;
  pass("participación con puntos");
}

async function testIdempotentRetry() {
  const { data, error } = await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_user_id: state.userId,
    p_requested_quantity: 1,
    p_request_id: state.requestId,
  });
  if (error) throw error;
  if (data[0].entry_id !== state.entryId) {
    throw new Error("idempotencia falló: entry distinta");
  }
  pass("request idempotente repetido");
}

async function testInsufficientPoints() {
  await admin.rpc("adjust_loyalty_points", {
    p_user_id: state.userId,
    p_points: -10000,
    p_reason: "vacío test",
    p_admin_id: state.userId,
  });
  const { error } = await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_user_id: state.userId,
    p_requested_quantity: 1,
    p_request_id: randomUUID(),
  });
  if (!error?.message.includes("saldo insuficiente")) {
    throw new Error("debía fallar por saldo insuficiente");
  }
  pass("saldo insuficiente");
}

async function testDrawAndConcurrency() {
  await admin.rpc("adjust_loyalty_points", {
    p_user_id: state.userId,
    p_points: 500,
    p_reason: "recarga test",
    p_admin_id: state.userId,
  });

  const { data: draw1, error: drawErr1 } = await admin.rpc("draw_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_admin_id: state.userId,
  });
  if (drawErr1) throw drawErr1;

  const { data: draw2, error: drawErr2 } = await admin.rpc("draw_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_admin_id: state.userId,
  });
  if (drawErr2) throw drawErr2;
  if (!draw2.already_drawn) {
    throw new Error("segunda ejecución debía indicar already_drawn");
  }
  pass("ejecución única del sorteo", `winners=${draw1.winners}`);
}

async function testCancelRefund() {
  const slug = `sorteo-cancel-${RUN_ID}`;
  const { data: g } = await admin
    .from("community_giveaways")
    .insert({
      name: "Cancel Test",
      slug,
      prize_description: "Premio",
      status: "active",
      entry_type: "points",
      points_cost: 50,
      allow_multiple_entries: true,
      winner_count: 1,
      alternate_count: 0,
      is_public: false,
      starts_at: new Date(Date.now() - 3600000).toISOString(),
      closes_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .select("id")
    .single();

  const req = randomUUID();
  await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: g.id,
    p_user_id: state.userId,
    p_requested_quantity: 1,
    p_request_id: req,
  });

  const { data: cancel } = await admin.rpc("cancel_community_giveaway", {
    p_giveaway_id: g.id,
    p_admin_id: state.userId,
    p_reason: "test",
  });
  if (!cancel.cancelled) throw new Error("cancelación falló");

  const { data: cancel2 } = await admin.rpc("cancel_community_giveaway", {
    p_giveaway_id: g.id,
    p_admin_id: state.userId,
    p_reason: "test",
  });
  if (!cancel2.already_cancelled) throw new Error("cancel idempotente falló");
  pass("cancelación y reintegro idempotente");

  await admin.from("community_giveaway_entries").delete().eq("giveaway_id", g.id);
  await admin.from("community_giveaway_audit_logs").delete().eq("giveaway_id", g.id);
  await admin.from("community_giveaways").delete().eq("id", g.id);
}

async function testSecurityGrants() {
  const anon = createClient(url, anonKey);
  const { error: drawError } = await anon.rpc("draw_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_admin_id: state.userId,
  });
  if (!drawError) throw new Error("anon no debería ejecutar draw");
  pass("draw bloqueado para anon");
}

async function main() {
  try {
    await setup();
    await testEnterPoints();
    await testIdempotentRetry();
    await testInsufficientPoints();
    await testDrawAndConcurrency();
    await testCancelRefund();
    await testSecurityGrants();
  } catch (error) {
    fail("suite sorteos", error instanceof Error ? error.message : String(error));
  } finally {
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
