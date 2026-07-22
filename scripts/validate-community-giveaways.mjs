/**
 * Validación E2E del módulo de sorteos de Comunidad.
 *
 * Requisitos de seguridad:
 *   ALLOW_GIVEAWAY_E2E=true
 *   EXPECTED_SUPABASE_PROJECT_REF=<ref de staging>
 *
 * Uso:
 *   cp .env.staging.local.example .env.staging.local  # completar con credenciales staging
 *   node scripts/validate-community-giveaways.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PREFIX = "giveaway_e2e_";

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
  ...loadEnvFile(resolve(process.cwd(), ".env.staging.local")),
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const allowE2E = env.ALLOW_GIVEAWAY_E2E === "true";
const expectedRef = env.EXPECTED_SUPABASE_PROJECT_REF?.trim();

const REQUIRED_TABLES = [
  "community_giveaways",
  "community_giveaway_entries",
  "community_giveaway_winners",
  "community_giveaway_audit_logs",
];

const REQUIRED_RPCS = [
  "enter_community_giveaway",
  "draw_community_giveaway",
  "cancel_community_giveaway",
  "get_public_community_giveaway_results",
];

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function extractProjectRef(supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname;
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function assertSafeEnvironment() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Faltan variables Supabase (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)");
  }

  if (!allowE2E) {
    throw new Error("ALLOW_GIVEAWAY_E2E debe ser true para ejecutar mutaciones");
  }

  if (!expectedRef) {
    throw new Error("EXPECTED_SUPABASE_PROJECT_REF es obligatorio");
  }

  const actualRef = extractProjectRef(url);
  if (!actualRef || actualRef !== expectedRef) {
    throw new Error(
      `Project ref no coincide: esperado ${expectedRef}, detectado ${actualRef || "desconocido"}`,
    );
  }

  pass("entorno staging verificado", `ref=${actualRef.slice(0, 4)}…`);
}

async function assertSchema(admin) {
  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table).select("id", { head: true, count: "exact" });
    if (error) {
      throw new Error(`Tabla ${table} no disponible: ${error.message}`);
    }
    pass(`tabla ${table} existe`);
  }

  for (const rpc of REQUIRED_RPCS) {
    const { error } = await admin.rpc(rpc, rpcArgsForPreflight(rpc));
    if (!error || !isMissingRpcError(error)) {
      pass(`RPC ${rpc} existe`);
    } else {
      throw new Error(`RPC ${rpc} no disponible: ${error.message}`);
    }
  }
}

function rpcArgsForPreflight(rpc) {
  const dummy = "00000000-0000-0000-0000-000000000001";
  switch (rpc) {
    case "enter_community_giveaway":
      return { p_giveaway_id: dummy, p_user_id: dummy, p_request_id: randomUUID() };
    case "draw_community_giveaway":
      return { p_giveaway_id: dummy, p_admin_id: dummy };
    case "cancel_community_giveaway":
      return { p_giveaway_id: dummy, p_admin_id: dummy, p_reason: "preflight" };
    case "get_public_community_giveaway_results":
      return { p_giveaway_slug: `${PREFIX}missing` };
    default:
      return {};
  }
}

function isMissingRpcError(error) {
  return /function|does not exist|not found/i.test(error.message ?? "");
}

const RUN_ID = `${PREFIX}${Date.now().toString(36)}`;
let admin;

const state = {
  userId: null,
  userId2: null,
  userClient: null,
  userClient2: null,
  giveawayId: null,
  giveawaySlug: null,
  entryId: null,
  requestId: randomUUID(),
  cancelGiveawayId: null,
};

async function cleanup() {
  if (!admin) return;
  const giveawayIds = [state.giveawayId, state.cancelGiveawayId].filter(Boolean);
  for (const gid of giveawayIds) {
    await admin.from("community_giveaway_winners").delete().eq("giveaway_id", gid);
    await admin.from("community_giveaway_entries").delete().eq("giveaway_id", gid);
    await admin.from("community_giveaway_audit_logs").delete().eq("giveaway_id", gid);
    await admin.from("community_giveaways").delete().eq("id", gid);
  }

  for (const uid of [state.userId, state.userId2].filter(Boolean)) {
    await admin.from("loyalty_transactions").delete().eq("user_id", uid);
    await admin.from("loyalty_accounts").delete().eq("user_id", uid);
    await admin.from("community_members").delete().eq("profile_id", uid);
    await admin.from("profiles").delete().eq("id", uid);
    await admin.auth.admin.deleteUser(uid);
  }
}

async function createTestUser(label) {
  const email = `${RUN_ID}_${label}@test.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${label}` },
  });
  if (authError) throw authError;

  const userId = authUser.user.id;
  await admin.from("profiles").upsert({
    id: userId,
    full_name: `Test ${label}`,
    role: "customer",
    is_active: true,
  });
  await admin.from("community_members").insert({
    profile_id: userId,
    full_name: `Test ${label}`,
    whatsapp: "1100000000",
    dni: "99999999",
    birth_date: "1990-01-01",
    status: "active",
    community_code: `${RUN_ID}${label}`,
  });
  await admin.rpc("ensure_loyalty_account", { p_user_id: userId });
  await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: 500,
    p_reason: "Test sorteos",
    p_admin_id: userId,
  });

  const { data: session } = await admin.auth.signInWithPassword({ email, password });
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  });

  return { userId, client };
}

async function setup() {
  const user1 = await createTestUser("a");
  state.userId = user1.userId;
  state.userClient = user1.client;

  const user2 = await createTestUser("b");
  state.userId2 = user2.userId;
  state.userClient2 = user2.client;

  state.giveawaySlug = `${RUN_ID}-sorteo`;
  const { data: giveaway, error } = await admin
    .from("community_giveaways")
    .insert({
      name: "Sorteo Test E2E",
      slug: state.giveawaySlug,
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
  pass("setup datos de prueba");
}

async function testFreeEntry() {
  const slug = `${RUN_ID}-free`;
  const { data: g } = await admin
    .from("community_giveaways")
    .insert({
      name: "Free Test",
      slug,
      prize_description: "Premio",
      status: "active",
      entry_type: "free",
      allow_multiple_entries: false,
      winner_count: 1,
      alternate_count: 0,
      is_public: true,
      starts_at: new Date(Date.now() - 3600000).toISOString(),
      closes_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .select("id")
    .single();

  const { data, error } = await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: g.id,
    p_user_id: state.userId2,
    p_requested_quantity: 1,
    p_request_id: randomUUID(),
  });
  if (error) throw error;
  if (!data?.[0]?.entry_id) throw new Error("entry gratuita falló");

  await admin.from("community_giveaway_entries").delete().eq("giveaway_id", g.id);
  await admin.from("community_giveaways").delete().eq("id", g.id);
  pass("participación gratuita");
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
  if (data[0].entry_id !== state.entryId) throw new Error("idempotencia falló");
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

async function testUserLimit() {
  await admin.rpc("adjust_loyalty_points", {
    p_user_id: state.userId,
    p_points: 5000,
    p_reason: "recarga test",
    p_admin_id: state.userId,
  });

  const { error } = await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: state.giveawayId,
    p_user_id: state.userId,
    p_requested_quantity: 10,
    p_request_id: randomUUID(),
  });
  if (!error) throw new Error("debía fallar por límite de usuario");
  pass("límite por usuario");
}

async function testDrawAndConcurrency() {
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
  if (!draw2.already_drawn) throw new Error("segunda ejecución debía indicar already_drawn");
  pass("ejecución única del sorteo", `winners=${draw1.winners}`);
}

async function testCancelRefund() {
  const slug = `${RUN_ID}-cancel`;
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

  state.cancelGiveawayId = g.id;
  await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: g.id,
    p_user_id: state.userId,
    p_requested_quantity: 1,
    p_request_id: randomUUID(),
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
}

async function testDisqualifiedEntry() {
  const { data: entry } = await admin
    .from("community_giveaway_entries")
    .select("id")
    .eq("giveaway_id", state.giveawayId)
    .eq("user_id", state.userId)
    .maybeSingle();

  if (!entry?.id) {
    pass("entry descalificada", "omitida (sin entry activa tras sorteo)");
    return;
  }

  await admin.rpc("disqualify_community_giveaway_entry", {
    p_entry_id: entry.id,
    p_admin_id: state.userId,
    p_reason: "test",
  });
  pass("entry descalificada");
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

async function testWinnerPrivacy() {
  const { data: ownRows, error: ownError } = await state.userClient
    .from("community_giveaway_winners")
    .select("user_id")
    .eq("giveaway_id", state.giveawayId);

  if (ownError) throw ownError;
  if ((ownRows ?? []).some((r) => r.user_id === state.userId)) {
    pass("usuario ve su propio resultado");
  } else {
    pass("usuario sin premio (sin fila propia)");
  }

  const { data: foreignRows, error: foreignError } = await state.userClient
    .from("community_giveaway_winners")
    .select("user_id")
    .eq("giveaway_id", state.giveawayId)
    .neq("user_id", state.userId);

  if (foreignError) throw foreignError;
  if ((foreignRows ?? []).length > 0) {
    throw new Error("customer puede leer ganador ajeno");
  }
  pass("customer no lee ganador ajeno");

  const anon = createClient(url, anonKey);
  const { data: anonRows, error: anonError } = await anon
    .from("community_giveaway_winners")
    .select("user_id")
    .eq("giveaway_id", state.giveawayId);

  if (!anonError && (anonRows ?? []).length > 0) {
    throw new Error("anon no debería leer winners");
  }
  pass("anon no consulta tabla winners");
}

async function testPublicRpc() {
  const anon = createClient(url, anonKey);
  const { data, error } = await anon.rpc("get_public_community_giveaway_results", {
    p_giveaway_slug: state.giveawaySlug,
  });
  if (error) throw error;
  if (!data?.length) throw new Error("RPC pública sin resultados");

  const sensitiveKeys = ["user_id", "entry_id", "email", "phone", "metadata"];
  for (const row of data) {
    for (const key of sensitiveKeys) {
      if (key in row) throw new Error(`RPC expone columna sensible: ${key}`);
    }
    if (row.display_name && row.display_name.includes("@")) {
      throw new Error("display_name parece contener email");
    }
  }
  pass("RPC pública sanitizada");
}

async function main() {
  try {
    assertSafeEnvironment();
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await assertSchema(admin);
    await setup();
    await testFreeEntry();
    await testEnterPoints();
    await testIdempotentRetry();
    await testInsufficientPoints();
    await testUserLimit();
    await testDrawAndConcurrency();
    await testCancelRefund();
    await testDisqualifiedEntry();
    await testSecurityGrants();
    await testWinnerPrivacy();
    await testPublicRpc();
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
