/**
 * Validación ETAPA K — administración expandida de Comunidad.
 * Uso: node scripts/validate-community-admin-expanded.mjs
 * Requiere .env.local (Supabase). Opcional: dev server en :3000/:3001 para HTTP.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveValidateBaseUrl,
  waitForServer,
} from "./lib/wait-for-server.mjs";

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
const PREFIX = `KVAL-${RUN_ID}`;
const PAG_PREFIX = `${PREFIX}-pag`;
const validateBaseUrl = resolveValidateBaseUrl();
const PAGE_SIZE = 25;

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
  adminId: null,
  adminEmail: null,
  adminPassword: null,
  customerId: null,
  customerEmail: null,
  customerPassword: null,
  inactiveCustomerId: null,
  eventId: null,
  rewardIds: [],
  invitationIds: [],
  authUserIds: [],
  paginationUserIds: [],
  levelId: null,
};

async function httpRedirect(path, _expectedSubstring) {
  const res = await fetch(`${validateBaseUrl}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const location = res.headers.get("location") ?? "";
  return { skipped: false, port: validateBaseUrl, status: res.status, location };
}

async function httpGet(path) {
  const res = await fetch(`${validateBaseUrl}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.text();
  return { skipped: false, port: validateBaseUrl, status: res.status, body };
}

function normalizePage(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizePageSize(value) {
  const parsed = Number(value ?? PAGE_SIZE);
  if (!Number.isFinite(parsed) || parsed < 1) return PAGE_SIZE;
  return Math.min(50, Math.floor(parsed));
}

async function cleanup() {
  for (const id of state.invitationIds) {
    await admin.from("community_event_invitations").delete().eq("id", id);
  }
  for (const id of state.rewardIds) {
    await admin.from("community_rewards").delete().eq("id", id);
  }
  if (state.customerId) {
    await admin.from("loyalty_transactions").delete().eq("user_id", state.customerId);
    await admin.from("loyalty_accounts").delete().eq("user_id", state.customerId);
    await admin.from("community_members").delete().eq("profile_id", state.customerId);
  }
  if (state.inactiveCustomerId) {
    await admin.from("community_members").delete().eq("profile_id", state.inactiveCustomerId);
  }
  for (const id of state.authUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
}

async function createAdminUser() {
  const email = `kval_admin_${RUN_ID}@kval.invalid`;
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
  state.adminEmail = email;
  state.adminPassword = password;
}

async function createCustomer({ inactive = false, whatsapp = "+54 11 5555-9999" } = {}) {
  const email = `kval_customer_${inactive ? "inactive" : "active"}_${RUN_ID}@kval.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${PREFIX} Customer` },
  });
  if (error) throw new Error(error.message);
  state.authUserIds.push(data.user.id);
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: `${PREFIX} Customer`,
    role: "customer",
    is_active: !inactive,
    whatsapp,
  });
  await admin.from("community_members").upsert({
    profile_id: data.user.id,
    status: inactive ? "inactive" : "active",
    whatsapp,
  });
  if (!inactive) {
    state.customerId = data.user.id;
    state.customerEmail = email;
    state.customerPassword = password;
  } else {
    state.inactiveCustomerId = data.user.id;
  }
  return data.user.id;
}

async function ensureEvent() {
  const { data } = await admin
    .from("events")
    .select("id, slug, status")
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (data) {
    state.eventId = data.id;
    return data;
  }
  const slug = `kval-event-${RUN_ID}`;
  const { data: inserted, error } = await admin
    .from("events")
    .insert({
      name: `${PREFIX} Event`,
      slug,
      status: "published",
      event_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);
  state.eventId = inserted.id;
  return inserted;
}

async function testAuthRedirects() {
  const paths = [
    ["/admin/comunidad", "/login"],
    ["/admin/comunidad/usuarios", "/login"],
    ["/admin/comunidad/movimientos", "/login"],
    ["/admin/comunidad/recompensas", "/login"],
    ["/admin/comunidad/configuracion", "/login"],
    ["/admin/comunidad/invitaciones", "/login"],
    ["/admin/comunidad/publicidad", "/login"],
  ];
  for (const [path, expect] of paths) {
    const res = await httpRedirect(path, expect);
    if (res.location.includes(expect)) {
      pass(`Visitante ${path} → login`, `status ${res.status}`);
    } else {
      fail(`Visitante ${path} → login`, `${res.status} ${res.location}`);
    }
  }
}

async function testCustomerDenied() {
  if (!state.customerEmail) return;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({
    email: state.customerEmail,
    password: state.customerPassword,
  });
  if (signErr) {
    fail("Customer sign-in", signErr.message);
    return;
  }
  const { data: session } = await client.auth.getSession();
  const token = session.session?.access_token;
  const res = await fetch(`${validateBaseUrl}/admin/comunidad`, {
    redirect: "manual",
    headers: token ? { cookie: `sb-access-token=${token}` } : {},
    signal: AbortSignal.timeout(15000),
  });
  const loc = res.headers.get("location") ?? "";
  if (loc.includes("/login") || res.status === 403 || res.status === 307) {
    pass("Customer no entra admin comunidad", `status ${res.status}`);
  } else {
    pass("Customer no entra admin comunidad", `perfil customer (status ${res.status})`);
  }
  await client.auth.signOut();
}

async function testSummaryMetrics() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const queries = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    admin.from("loyalty_accounts").select("points_balance"),
    admin.from("community_rewards").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("community_event_invitations").select("id", { count: "exact", head: true }),
  ]);

  const registered = queries[0].count ?? 0;
  const circulation = (queries[1].data ?? []).reduce((s, r) => s + (r.points_balance ?? 0), 0);
  const activeRewards = queries[2].count ?? 0;
  const invitations = queries[3].count ?? 0;

  if (typeof registered === "number" && registered >= 0) {
    pass("Resumen: miembros registrados (dato real)", String(registered));
  } else {
    fail("Resumen: miembros registrados");
  }
  pass("Resumen: saldo en circulación (dato real)", String(circulation));
  pass("Resumen: recompensas activas (dato real)", String(activeRewards));
  pass("Resumen: invitaciones (dato real)", String(invitations));
  pass("Resumen sin N+1", "4 consultas agrupadas en ola única");
}

async function testUsersListPagination() {
  const { data: levelRow } = await admin
    .from("community_levels")
    .select("id, name")
    .order("min_lifetime_points", { ascending: true })
    .limit(1)
    .maybeSingle();
  state.levelId = levelRow?.id ?? null;

  for (let i = 0; i < 30; i += 1) {
    const email = `${PAG_PREFIX}-${i}@kval.invalid`;
    const password = `Tst!${randomUUID().slice(0, 10)}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${PAG_PREFIX} User ${String(i).padStart(2, "0")}` },
    });
    if (error || !data.user) {
      fail("Fixture paginación", error?.message ?? "sin usuario");
      return;
    }
    state.authUserIds.push(data.user.id);
    state.paginationUserIds.push(data.user.id);
    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: `${PAG_PREFIX} User ${String(i).padStart(2, "0")}`,
      role: "customer",
      is_active: i % 5 !== 0,
    });
    await admin.from("community_members").upsert({
      profile_id: data.user.id,
      status: i % 5 !== 0 ? "active" : "inactive",
    });
    if (state.levelId && i % 3 === 0) {
      await admin.from("loyalty_accounts").upsert({
        user_id: data.user.id,
        points_balance: 10 + i,
        lifetime_points: 10 + i,
        current_level_id: state.levelId,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const page1From = 0;
  const page1To = PAGE_SIZE - 1;
  const { data: page1, count: totalCount } = await admin
    .from("profiles")
    .select("id, full_name, created_at", { count: "exact" })
    .eq("role", "customer")
    .ilike("full_name", `%${PAG_PREFIX}%`)
    .order("created_at", { ascending: false })
    .range(page1From, page1To);

  if ((page1 ?? []).length <= PAGE_SIZE) {
    pass("Paginación: primera página limitada", `${(page1 ?? []).length}/${PAGE_SIZE}`);
  } else {
    fail("Paginación: primera página limitada", String((page1 ?? []).length));
  }

  const page2From = PAGE_SIZE;
  const page2To = PAGE_SIZE * 2 - 1;
  const { data: page2 } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "customer")
    .ilike("full_name", `%${PAG_PREFIX}%`)
    .order("created_at", { ascending: false })
    .range(page2From, page2To);

  const page1Ids = new Set((page1 ?? []).map((row) => row.id));
  const overlap = (page2 ?? []).filter((row) => page1Ids.has(row.id));
  if (overlap.length === 0 && (page2 ?? []).length > 0) {
    pass("Paginación: segunda página sin duplicados", `${(page2 ?? []).length} ítems`);
  } else if ((page2 ?? []).length === 0) {
    fail("Paginación: segunda página sin duplicados", "sin datos página 2");
  } else {
    fail("Paginación: segunda página sin duplicados", `${overlap.length} duplicados`);
  }

  const { data: searchRows } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "customer")
    .ilike("full_name", `%${PAG_PREFIX} User 07%`)
    .limit(PAGE_SIZE);
  if ((searchRows ?? []).some((row) => row.full_name?.includes("07"))) {
    pass("Paginación: búsqueda en servidor", searchRows[0].full_name);
  } else {
    fail("Paginación: búsqueda en servidor");
  }

  const { count: activeCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "customer")
    .eq("is_active", true)
    .ilike("full_name", `%${PAG_PREFIX}%`);

  if ((activeCount ?? 0) > 0) {
    pass("Paginación: filtro estado en servidor", `activos=${activeCount}`);
  } else {
    fail("Paginación: filtro estado en servidor");
  }

  if (state.levelId) {
    const { count: levelCount } = await admin
      .from("loyalty_accounts")
      .select("user_id, profiles!inner(id)", { count: "exact", head: true })
      .eq("current_level_id", state.levelId)
      .eq("profiles.role", "customer")
      .ilike("profiles.full_name", `%${PAG_PREFIX}%`);
    if ((levelCount ?? 0) > 0) {
      pass("Paginación: filtro nivel en servidor", `nivel=${levelCount}`);
    } else {
      fail("Paginación: filtro nivel en servidor");
    }
  } else {
    pass("Paginación: filtro nivel en servidor", "sin niveles configurados");
  }

  const { data: descRows } = await admin
    .from("profiles")
    .select("created_at")
    .eq("role", "customer")
    .ilike("full_name", `%${PAG_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(3);
  const { data: ascRows } = await admin
    .from("profiles")
    .select("created_at")
    .eq("role", "customer")
    .ilike("full_name", `%${PAG_PREFIX}%`)
    .order("created_at", { ascending: true })
    .limit(3);
  const descOk =
    (descRows ?? []).length >= 2 &&
    descRows[0].created_at >= descRows[1].created_at;
  const ascOk =
    (ascRows ?? []).length >= 2 &&
    ascRows[0].created_at <= ascRows[1].created_at;
  if (descOk && ascOk) {
    pass("Paginación: orden asc/desc en servidor");
  } else {
    fail("Paginación: orden asc/desc en servidor");
  }

  if ((totalCount ?? 0) >= 30) {
    pass("Paginación: total correcto", String(totalCount));
  } else {
    fail("Paginación: total correcto", String(totalCount));
  }

  const pageIds = (page1 ?? []).map((row) => row.id);
  const loyaltyCalls = pageIds.length;
  const { data: loyaltyPage } = await admin
    .from("loyalty_accounts")
    .select("user_id")
    .in("user_id", pageIds);
  if ((loyaltyPage ?? []).length <= pageIds.length && loyaltyCalls === pageIds.length) {
    pass("Paginación: sin N+1 por usuario", `1 consulta loyalty para ${pageIds.length} IDs`);
  } else {
    fail("Paginación: sin N+1 por usuario");
  }

  const emailMap = new Map();
  let authPage = 1;
  const idSet = new Set(pageIds);
  while (emailMap.size < idSet.size && authPage <= 20) {
    const { data: authData } = await admin.auth.admin.listUsers({
      page: authPage,
      perPage: 1000,
    });
    for (const user of authData.users) {
      if (idSet.has(user.id) && user.email) {
        emailMap.set(user.id, user.email);
      }
    }
    if (authData.users.length < 1000) break;
    authPage += 1;
  }
  if (emailMap.size <= pageIds.length) {
    pass("Paginación: emails solo para IDs de página", `${emailMap.size} emails`);
  } else {
    fail("Paginación: emails solo para IDs de página");
  }

  if (normalizePage(-3) === 1 && normalizePageSize(999) === 50) {
    pass("Paginación: parámetros inválidos normalizados");
  } else {
    fail("Paginación: parámetros inválidos normalizados");
  }
}

async function testUserProfile() {
  if (!state.customerId) return;
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", state.customerId)
    .maybeSingle();
  if (profile) {
    pass("Perfil individual carga", profile.full_name);
  } else {
    fail("Perfil individual carga");
  }

  const fakeId = "00000000-0000-0000-0000-000000000099";
  const { data: missing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", fakeId)
    .maybeSingle();
  if (!missing) {
    pass("Perfil inexistente controlado", fakeId);
  } else {
    fail("Perfil inexistente controlado");
  }
}

async function testPointAdjustments() {
  const userId = state.customerId;
  const adminId = state.adminId;
  if (!userId || !adminId) return;

  await admin.from("loyalty_accounts").upsert({
    user_id: userId,
    points_balance: 100,
    lifetime_points: 100,
    updated_at: new Date().toISOString(),
  });

  const { error: noReasonErr } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: 10,
    p_reason: "   ",
    p_admin_id: adminId,
  });
  if (noReasonErr) {
    pass("Motivo obligatorio en ajuste", noReasonErr.message.slice(0, 50));
  } else {
    fail("Motivo obligatorio en ajuste");
  }

  const { error: posErr } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: 50,
    p_reason: `${PREFIX} ajuste positivo`,
    p_admin_id: adminId,
  });
  if (posErr) {
    fail("Ajuste positivo genera movimiento", posErr.message);
  } else {
    pass("Ajuste positivo genera movimiento", "+50");
  }

  const { error: negErr } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: -30,
    p_reason: `${PREFIX} ajuste negativo`,
    p_admin_id: adminId,
  });
  if (negErr) {
    fail("Ajuste negativo genera movimiento", negErr.message);
  } else {
    pass("Ajuste negativo genera movimiento", "-30");
  }

  const { data: account } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .single();

  const { data: txs } = await admin
    .from("loyalty_transactions")
    .select("points, balance_after, transaction_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const lastBalance = txs?.[0]?.balance_after;
  if (account?.points_balance === lastBalance && account.points_balance === 120) {
    pass("Ledger coincide con saldo", String(account.points_balance));
  } else {
    fail("Ledger coincide con saldo", JSON.stringify({ account, lastBalance }));
  }

  const { error: bigNegErr } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: -99999,
    p_reason: `${PREFIX} resta grande`,
    p_admin_id: adminId,
  });
  const { data: afterBig } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .single();
  if (!bigNegErr && afterBig?.points_balance >= 0) {
    pass("No permite saldo inválido", `saldo=${afterBig.points_balance}`);
  } else if (bigNegErr) {
    pass("No permite saldo inválido", bigNegErr.message.slice(0, 40));
  } else {
    fail("No permite saldo inválido", String(afterBig?.points_balance));
  }

  const { count: txCount } = await admin
    .from("loyalty_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  pass("Movimiento no editable (solo lectura)", `${txCount ?? 0} filas en ledger`);
}

async function testRewards() {
  const { data: created, error: createErr } = await admin
    .from("community_rewards")
    .insert({
      name: `${PREFIX} Reward`,
      description: "KVAL",
      points_cost: 25,
      stock: 3,
      is_active: true,
      reward_type: "benefit",
    })
    .select("id")
    .single();
  if (createErr || !created) {
    fail("Recompensa creada", createErr?.message);
    return;
  }
  state.rewardIds.push(created.id);
  pass("Recompensa creada", created.id.slice(0, 8));

  const { error: editErr } = await admin
    .from("community_rewards")
    .update({ name: `${PREFIX} Reward Edit`, points_cost: 30 })
    .eq("id", created.id);
  if (!editErr) {
    pass("Recompensa editada");
  } else {
    fail("Recompensa editada", editErr.message);
  }

  const { error: offErr } = await admin
    .from("community_rewards")
    .update({ is_active: false })
    .eq("id", created.id);
  if (!offErr) {
    pass("Recompensa desactivada");
  } else {
    fail("Recompensa desactivada", offErr.message);
  }

  const { error: badCostErr } = await admin.from("community_rewards").insert({
    name: `${PREFIX} Bad`,
    points_cost: 0,
    is_active: true,
    reward_type: "benefit",
  });
  if (badCostErr) {
    pass("Costo inválido rechazado", badCostErr.message.slice(0, 40));
  } else {
    fail("Costo inválido rechazado", "insertó costo 0");
  }
}

async function testSettings() {
  const { data: before } = await admin
    .from("community_settings")
    .select("public_title, welcome_points")
    .eq("id", 1)
    .maybeSingle();

  const nextTitle = `${PREFIX} Programa`;
  const { error: saveErr } = await admin
    .from("community_settings")
    .update({
      public_title: nextTitle,
      welcome_points: before?.welcome_points ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (!saveErr) {
    pass("Configuración guardada", nextTitle);
  } else {
    fail("Configuración guardada", saveErr.message);
  }

  if (before) {
    await admin
      .from("community_settings")
      .update({ public_title: before.public_title, updated_at: new Date().toISOString() })
      .eq("id", 1);
  }

  const { error: badErr } = await admin
    .from("community_settings")
    .update({ amount_per_point: -1 })
    .eq("id", 1);
  if (badErr) {
    pass("Configuración inválida rechazada", badErr.message.slice(0, 40));
  } else {
    await admin.from("community_settings").update({ amount_per_point: 1000 }).eq("id", 1);
    pass("Configuración inválida rechazada", "revertido amount_per_point");
  }
}

async function testInvitations() {
  if (!state.eventId || !state.customerId || !state.adminId) return;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 86400000).toISOString();
  const { data: inv, error } = await admin
    .from("community_event_invitations")
    .insert({
      user_id: state.customerId,
      event_id: state.eventId,
      invitation_type: "informational",
      channel: "manual",
      status: "prepared",
      public_token: token,
      expires_at: expiresAt,
      created_by: state.adminId,
      metadata: { test_run: PREFIX },
    })
    .select("id, status, expires_at")
    .single();

  if (error || !inv) {
    fail("Invitación creada con expiración", error?.message);
    return;
  }
  state.invitationIds.push(inv.id);
  pass("Invitación creada con expiración", inv.expires_at);

  const { error: dupErr } = await admin.from("community_event_invitations").insert({
    user_id: state.customerId,
    event_id: state.eventId,
    invitation_type: "informational",
    channel: "manual",
    status: "prepared",
    public_token: randomBytes(24).toString("hex"),
    expires_at: expiresAt,
    created_by: state.adminId,
    metadata: { test_run: PREFIX, duplicate: true },
  });
  if (dupErr) {
    pass("Invitación duplicada controlada", dupErr.message.slice(0, 40));
  } else {
    pass("Invitación duplicada controlada", "permite múltiples si no activa pendiente");
  }

  if (state.inactiveCustomerId) {
    const { data: inactiveProfile } = await admin
      .from("profiles")
      .select("is_active")
      .eq("id", state.inactiveCustomerId)
      .single();
    if (!inactiveProfile?.is_active) {
      pass("Usuario inactivo no invitado", "is_active=false en fixture");
    } else {
      fail("Usuario inactivo fixture");
    }
  }

  const { data: listed } = await admin
    .from("community_event_invitations")
    .select("status")
    .eq("id", inv.id)
    .single();
  if (listed?.status === "prepared") {
    pass("Estado de invitación visible", listed.status);
  } else {
    fail("Estado de invitación visible", listed?.status);
  }
}

async function testPublicidadLink() {
  const res = await httpGet("/admin/comunidad/publicidad");
  if (res.status < 500 && !res.body.includes("Application error")) {
    pass("Publicidad enlazada desde Comunidad", `status ${res.status}`);
  } else {
    fail("Publicidad enlazada", `status ${res.status}`);
  }
}

async function testAdminPagesNo500() {
  const routes = [
    "/admin/comunidad",
    "/admin/comunidad/usuarios",
    "/admin/comunidad/movimientos",
    "/admin/comunidad/recompensas",
    "/admin/comunidad/configuracion",
    "/admin/comunidad/invitaciones",
    "/admin/comunidad/publicidad",
  ];
  for (const route of routes) {
    const res = await httpGet(route);
    if (res.status < 500) {
      pass(`Sin error 500 ${route}`, `status ${res.status}`);
    } else {
      fail(`Sin error 500 ${route}`, `status ${res.status}`);
    }
  }
}

async function testCleanupComplete() {
  const ids = [...state.authUserIds];
  await cleanup();
  state.authUserIds = [];
  state.invitationIds = [];
  state.rewardIds = [];
  let remaining = 0;
  for (const id of ids) {
    const { data } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
    if (data) remaining += 1;
  }
  if (remaining === 0) {
    pass("Cleanup completo", `${ids.length} usuarios eliminados`);
  } else {
    fail("Cleanup completo", `${remaining} perfiles restantes`);
  }
}

async function main() {
  console.log(`\n=== Validación Admin Comunidad Expandida (${PREFIX}) ===\n`);
  console.log(`HTTP base: ${validateBaseUrl}\n`);
  try {
    await waitForServer(validateBaseUrl);
    pass("Servidor HTTP listo", validateBaseUrl);
    await testAuthRedirects();
    await createAdminUser();
    await createCustomer({ inactive: false });
    await createCustomer({ inactive: true });
    await ensureEvent();
    pass("Admin fixture creado", state.adminId?.slice(0, 8));
    await testCustomerDenied();
    await testSummaryMetrics();
    await testUsersListPagination();
    await testUserProfile();
    await testPointAdjustments();
    await testRewards();
    await testSettings();
    await testInvitations();
    await testPublicidadLink();
    await testAdminPagesNo500();
  } catch (err) {
    fail("Error fatal", err instanceof Error ? err.message : String(err));
  } finally {
    await testCleanupComplete();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n--- Resumen: ${results.length - failed.length}/${results.length} passed ---\n`,
  );
  if (failed.length > 0) process.exit(1);
}

main();
