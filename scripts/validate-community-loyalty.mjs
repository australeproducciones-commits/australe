/**
 * Validación completa del módulo Comunidad / Fidelización.
 * Uso: node scripts/validate-community-loyalty.mjs
 * Requiere .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * No almacena credenciales. Crea y elimina usuarios/datos de prueba.
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
  console.error("Faltan variables de entorno Supabase en .env.local");
  process.exit(1);
}

const RUN_ID = Date.now().toString(36);
const TEST_PREFIX = `loyalty-test-${RUN_ID}`;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const state = {
  userA: null,
  userB: null,
  clientA: null,
  clientB: null,
  rewardIds: [],
  ticketIds: [],
  authUserIds: [],
};

async function createTestCustomer(label) {
  const email = `customer_test_${label}_${RUN_ID}@loyalty-test.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Customer Test ${label.toUpperCase()}` },
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  state.authUserIds.push(data.user.id);

  let profile = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sleep(400);
    const { data: row, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profileError && row) {
      profile = row;
      break;
    }
  }

  if (!profile) {
    const { error: insertProfileErr } = await admin.from("profiles").insert({
      id: data.user.id,
      full_name: `Customer Test ${label.toUpperCase()}`,
      whatsapp: null,
      role: "customer",
      is_active: true,
    });
    if (insertProfileErr) {
      throw new Error(`perfil ${label} no creado: ${insertProfileErr.message}`);
    }
    profile = { id: data.user.id, role: "customer" };
  }

  return { id: profile.id, email, password, role: profile.role };
}

async function signInCustomer({ email, password }) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  return client;
}

async function cleanupAll() {
  for (const ticketId of state.ticketIds) {
    await admin
      .from("loyalty_transactions")
      .delete()
      .or(`source_id.eq.${ticketId},idempotency_key.like.ticket:${ticketId}%`);
    await admin.from("tickets").delete().eq("id", ticketId);
  }
  for (const rewardId of state.rewardIds) {
    await admin.from("community_redemptions").delete().eq("reward_id", rewardId);
    await admin.from("community_rewards").delete().eq("id", rewardId);
  }
  const userIds = [state.userA?.id, state.userB?.id].filter(Boolean);
  for (const userId of userIds) {
    await admin.from("loyalty_transactions").delete().eq("user_id", userId);
    await admin.from("community_redemptions").delete().eq("user_id", userId);
    await admin.from("loyalty_accounts").delete().eq("user_id", userId);
  }
  for (const authId of state.authUserIds) {
    await admin.auth.admin.deleteUser(authId);
  }
}

async function testRpcGrants() {
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: adjustErr } = await anon.rpc("adjust_loyalty_points", {
    p_user_id: state.userA.id,
    p_points: 1,
    p_reason: "hack",
    p_admin_id: state.userA.id,
  });
  if (adjustErr?.message?.includes("permission denied")) {
    pass("anon no puede ejecutar adjust_loyalty_points");
  } else {
    fail("anon no puede ejecutar adjust_loyalty_points", adjustErr?.message ?? "sin error");
  }

  const { error: authAdjustErr } = await state.clientA.rpc("adjust_loyalty_points", {
    p_user_id: state.userA.id,
    p_points: 1,
    p_reason: "hack",
    p_admin_id: state.userA.id,
  });
  if (authAdjustErr?.message?.includes("permission denied")) {
    pass("customer autenticado no puede ejecutar adjust_loyalty_points");
  } else {
    fail(
      "customer autenticado no puede ejecutar adjust_loyalty_points",
      authAdjustErr?.message ?? "sin error",
    );
  }
}

async function testRls() {
  await admin.rpc("ensure_loyalty_account", { p_user_id: state.userA.id });

  const { data: ownAccount, error: ownAccErr } = await state.clientA
    .from("loyalty_accounts")
    .select("user_id, points_balance")
    .eq("user_id", state.userA.id);
  if (!ownAccErr && ownAccount?.length === 1) {
    pass("RLS: customer A lee su cuenta");
  } else {
    fail("RLS: customer A lee su cuenta", ownAccErr?.message ?? `filas=${ownAccount?.length ?? 0}`);
  }

  await admin.rpc("ensure_loyalty_account", { p_user_id: state.userB.id });
  await admin.rpc("award_loyalty_points", {
    p_user_id: state.userB.id,
    p_points: 42,
    p_source_type: "test",
    p_source_id: `${TEST_PREFIX}:b-seed`,
    p_idempotency_key: `${TEST_PREFIX}:b-seed`,
    p_description: "seed B",
    p_metadata: {},
    p_created_by: null,
  });

  const { data: crossAccount } = await state.clientA
    .from("loyalty_accounts")
    .select("user_id, points_balance")
    .eq("user_id", state.userB.id);
  if (!crossAccount?.length) {
    pass("RLS: customer A no lee cuenta de B");
  } else {
    fail("RLS: customer A no lee cuenta de B", `filas=${crossAccount.length}`);
  }

  const { data: ownTx } = await state.clientA
    .from("loyalty_transactions")
    .select("id")
    .eq("user_id", state.userA.id);
  if (Array.isArray(ownTx)) {
    pass("RLS: customer A lee sus movimientos");
  } else {
    fail("RLS: customer A lee sus movimientos");
  }

  const { data: crossTx } = await state.clientA
    .from("loyalty_transactions")
    .select("id")
    .eq("user_id", state.userB.id);
  if (!crossTx?.length) {
    pass("RLS: customer A no lee movimientos de B");
  } else {
    fail("RLS: customer A no lee movimientos de B");
  }

  const { data: crossTxB } = await state.clientB
    .from("loyalty_transactions")
    .select("id")
    .eq("user_id", state.userA.id);
  if (!crossTxB?.length) {
    pass("RLS: customer B no lee movimientos de A");
  } else {
    fail("RLS: customer B no lee movimientos de A");
  }

  const { error: insertTxErr } = await state.clientA.from("loyalty_transactions").insert({
    user_id: state.userA.id,
    transaction_type: "earn",
    points: 50,
    balance_after: 50,
    source_type: "hack",
    idempotency_key: `${TEST_PREFIX}:direct-insert`,
  });
  if (insertTxErr) {
    pass("RLS: customer no inserta loyalty_transactions");
  } else {
    fail("RLS: customer no inserta loyalty_transactions");
  }

  const { data: updatedRows, error: updateBalanceErr } = await state.clientA
    .from("loyalty_accounts")
    .update({ points_balance: 99999 })
    .eq("user_id", state.userA.id)
    .select("user_id");
  if (updateBalanceErr || !updatedRows?.length) {
    pass("RLS: customer no actualiza points_balance");
  } else {
    fail("RLS: customer no actualiza points_balance", `filas=${updatedRows.length}`);
  }

  const { error: rewardInsertErr } = await state.clientA.from("community_rewards").insert({
    name: "hack",
    points_cost: 1,
    is_active: true,
    reward_type: "benefit",
  });
  if (rewardInsertErr) {
    pass("RLS: customer no crea recompensas");
  } else {
    fail("RLS: customer no crea recompensas");
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: publicLevels } = await anon.from("community_levels").select("id").eq("is_active", true);
  if (publicLevels?.length) {
    pass("RLS: anon lee niveles activos");
  } else {
    fail("RLS: anon lee niveles activos");
  }

  const { data: anonAccounts } = await anon.from("loyalty_accounts").select("user_id").limit(1);
  if (!anonAccounts?.length) {
    pass("RLS: anon no lee cuentas");
  } else {
    fail("RLS: anon no lee cuentas");
  }
}

async function testLedger() {
  const userId = state.userA.id;

  const { data: settings } = await admin
    .from("community_settings")
    .select("welcome_points")
    .eq("id", 1)
    .single();
  const welcomePoints = settings?.welcome_points ?? 0;

  await admin.from("loyalty_transactions").delete().eq("user_id", userId);
  await admin.from("loyalty_accounts").delete().eq("user_id", userId);

  await admin.rpc("ensure_loyalty_account", { p_user_id: userId });
  await admin.rpc("ensure_loyalty_account", { p_user_id: userId });

  const { count: accountCount } = await admin
    .from("loyalty_accounts")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: welcomeTxCount } = await admin
    .from("loyalty_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("idempotency_key", `welcome:${userId}`);

  if (accountCount === 1 && welcomeTxCount <= 1) {
    pass("ensure + bienvenida no duplican cuenta", `welcome_tx=${welcomeTxCount}`);
  } else {
    fail("ensure + bienvenida", `accounts=${accountCount} welcome=${welcomeTxCount}`);
  }

  const idemKey = `${TEST_PREFIX}:earn`;
  const { data: tx1 } = await admin.rpc("award_loyalty_points", {
    p_user_id: userId,
    p_points: 100,
    p_source_type: "test",
    p_source_id: TEST_PREFIX,
    p_idempotency_key: idemKey,
    p_description: "earn",
    p_metadata: {},
    p_created_by: null,
  });
  const { data: tx2 } = await admin.rpc("award_loyalty_points", {
    p_user_id: userId,
    p_points: 100,
    p_source_type: "test",
    p_source_id: TEST_PREFIX,
    p_idempotency_key: idemKey,
    p_description: "earn",
    p_metadata: {},
    p_created_by: null,
  });
  const { data: acct } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .single();

  const expectedBase = welcomePoints + 100;
  if (tx1 === tx2 && acct.points_balance === expectedBase && acct.lifetime_points === expectedBase) {
    pass("acreditación idempotente", `saldo=${acct.points_balance}`);
  } else {
    fail("acreditación idempotente", JSON.stringify({ tx1, tx2, acct, expectedBase }));
  }

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  const adminId = adminProfile?.id ?? userId;
  const { data: adjId, error: adjErr } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: 25,
    p_reason: "Ajuste prueba +25",
    p_admin_id: adminId,
  });
  if (adjErr) throw new Error(adjErr.message);

  const { data: adjTx } = await admin
    .from("loyalty_transactions")
    .select("transaction_type, created_by, points")
    .eq("id", adjId)
    .single();

  if (adjTx?.transaction_type === "adjustment" && adjTx.created_by === adminId && adjTx.points === 25) {
    pass("ajuste administrativo +25 con created_by");
  } else {
    fail("ajuste administrativo +25", JSON.stringify(adjTx));
  }

  const { error: emptyReasonErr } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: 1,
    p_reason: "   ",
    p_admin_id: adminId,
  });
  if (emptyReasonErr?.message?.includes("motivo")) {
    pass("ajuste rechaza motivo vacío");
  } else {
    fail("ajuste rechaza motivo vacío", emptyReasonErr?.message);
  }

  const { data: beforeNeg } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .single();

  await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: -(beforeNeg.points_balance + 500),
    p_reason: "Resta grande prueba",
    p_admin_id: adminId,
  });

  const { data: afterNeg } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .single();

  if (afterNeg.points_balance === 0) {
    pass("resta superior al saldo deja saldo en 0, no negativo");
  } else {
    fail("resta superior al saldo", `saldo=${afterNeg.points_balance}`);
  }

  const { data: expensiveReward } = await admin
    .from("community_rewards")
    .insert({
      name: `${TEST_PREFIX} expensive`,
      description: "test",
      points_cost: 999999,
      stock: 5,
      is_active: true,
      reward_type: "benefit",
    })
    .select("id")
    .single();
  state.rewardIds.push(expensiveReward.id);

  const { error: insufficientErr } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: expensiveReward.id,
  });
  if (insufficientErr?.message?.includes("saldo insuficiente")) {
    pass("canje rechazado por saldo insuficiente");
  } else {
    fail("canje saldo insuficiente", insufficientErr?.message ?? "sin error");
  }

  await admin.rpc("award_loyalty_points", {
    p_user_id: userId,
    p_points: 200,
    p_source_type: "test",
    p_source_id: `${TEST_PREFIX}:redeem-seed`,
    p_idempotency_key: `${TEST_PREFIX}:redeem-seed`,
    p_description: "seed redeem",
    p_metadata: {},
    p_created_by: null,
  });

  const { data: reward } = await admin
    .from("community_rewards")
    .insert({
      name: `${TEST_PREFIX} reward`,
      description: "test",
      points_cost: 80,
      stock: 2,
      max_per_user: 1,
      is_active: true,
      reward_type: "benefit",
    })
    .select("id")
    .single();
  state.rewardIds.push(reward.id);

  const { data: beforeRedeem } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .single();

  const { data: redeemRows, error: redeemOkErr } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: reward.id,
  });
  if (redeemOkErr) throw new Error(redeemOkErr.message);

  const { data: afterRedeem } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .single();

  const { data: stockRow } = await admin
    .from("community_rewards")
    .select("stock")
    .eq("id", reward.id)
    .single();

  if (
    afterRedeem.points_balance === beforeRedeem.points_balance - 80 &&
    afterRedeem.lifetime_points === beforeRedeem.lifetime_points &&
    stockRow.stock === 1 &&
    redeemRows?.[0]?.redemption_code
  ) {
    pass("canje válido con stock y lifetime intacto");
  } else {
    fail("canje válido", JSON.stringify({ beforeRedeem, afterRedeem, stockRow }));
  }

  const { error: limitErr } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: reward.id,
  });
  if (limitErr?.message?.includes("límite")) {
    pass("canje respeta max_per_user");
  } else {
    fail("canje max_per_user", limitErr?.message ?? "sin error");
  }

  await admin
    .from("community_rewards")
    .update({ max_per_user: null })
    .eq("id", reward.id);

  const { error: secondRedeemErr } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: reward.id,
  });
  if (secondRedeemErr) {
    fail("segundo canje con stock disponible", secondRedeemErr.message);
  } else {
    pass("segundo canje consume stock restante");
  }

  const { error: stockErr } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: reward.id,
  });
  if (stockErr?.message?.includes("agotada")) {
    pass("canje rechazado por stock agotado");
  } else {
    fail("canje stock agotado", stockErr?.message ?? "sin error");
  }

  const { data: expiredReward } = await admin
    .from("community_rewards")
    .insert({
      name: `${TEST_PREFIX} expired`,
      points_cost: 10,
      is_active: false,
      reward_type: "benefit",
      ends_at: new Date(Date.now() - 86400000).toISOString(),
    })
    .select("id")
    .single();
  state.rewardIds.push(expiredReward.id);

  const { error: expiredErr } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: expiredReward.id,
  });
  if (expiredErr) {
    pass("canje rechazado en recompensa inactiva/vencida");
  } else {
    fail("canje recompensa inactiva");
  }
}

async function testReversalAfterSpend() {
  const userId = state.userA.id;
  await admin.from("loyalty_transactions").delete().eq("user_id", userId);
  await admin.from("loyalty_accounts").delete().eq("user_id", userId);

  const ticketKey = `${TEST_PREFIX}:ticket-spend`;
  await admin.rpc("award_loyalty_points", {
    p_user_id: userId,
    p_points: 100,
    p_source_type: "ticket",
    p_source_id: ticketKey,
    p_idempotency_key: `ticket:${ticketKey}:earn`,
    p_description: "ticket earn",
    p_metadata: {},
    p_created_by: null,
  });

  const { data: reward } = await admin
    .from("community_rewards")
    .insert({
      name: `${TEST_PREFIX} spend-reward`,
      points_cost: 60,
      stock: null,
      is_active: true,
      reward_type: "benefit",
    })
    .select("id")
    .single();
  state.rewardIds.push(reward.id);

  await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: reward.id,
  });

  const { data: beforeRev } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .single();

  const revKey = `ticket:${ticketKey}:reversal`;
  await admin.rpc("reverse_loyalty_points", {
    p_user_id: userId,
    p_points: 100,
    p_source_type: "ticket",
    p_source_id: ticketKey,
    p_idempotency_key: revKey,
    p_description: "reversal",
    p_metadata: {},
    p_created_by: null,
  });
  const { data: rev2 } = await admin.rpc("reverse_loyalty_points", {
    p_user_id: userId,
    p_points: 100,
    p_source_type: "ticket",
    p_source_id: ticketKey,
    p_idempotency_key: revKey,
    p_description: "reversal",
    p_metadata: {},
    p_created_by: null,
  });

  const { data: afterRev } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .single();

  const { count: txCount } = await admin
    .from("loyalty_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("transaction_type", "reversal");

  if (
    afterRev.points_balance >= 0 &&
    afterRev.points_balance === beforeRev.points_balance - Math.min(100, beforeRev.points_balance) &&
    txCount === 1 &&
    rev2
  ) {
    pass(
      "reverso tras gasto parcial: saldo no negativo",
      `saldo=${afterRev.points_balance}, lifetime=${afterRev.lifetime_points}`,
    );
  } else {
    fail("reverso tras gasto parcial", JSON.stringify({ beforeRev, afterRev, txCount }));
  }
}

async function testTicketIntegration() {
  const userId = state.userA.id;
  const { data: event } = await admin
    .from("events")
    .select("id")
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (!event) {
    fail("integración tickets", "no hay evento publicado para prueba");
    return;
  }

  const { data: ticketType } = await admin
    .from("ticket_types")
    .select("id, public_price")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const ticketTypeId = ticketType?.id ?? null;

  const pricePaid = 20000;
  const { data: ticket, error: ticketErr } = await admin
    .from("tickets")
    .insert({
      event_id: event.id,
      ticket_type_id: ticketTypeId,
      user_id: userId,
      buyer_name: "Test Loyalty",
      buyer_whatsapp: null,
      buyer_dni: null,
      qr_token: `test-${RUN_ID}`,
      original_price: pricePaid,
      price_paid: pricePaid,
      discount_amount: 0,
      payment_method: "pending",
      payment_status: "pending",
      ticket_status: "reserved",
      sales_channel: "web",
    })
    .select("id")
    .single();

  if (ticketErr) {
    fail("crear ticket prueba", ticketErr.message);
    return;
  }
  state.ticketIds.push(ticket.id);

  await admin
    .from("tickets")
    .update({ payment_status: "confirmed", ticket_status: "valid" })
    .eq("id", ticket.id);

  const { data: txId1, error: awardErr } = await admin.rpc("award_loyalty_points_for_ticket", {
    p_ticket_id: ticket.id,
  });
  if (awardErr) throw new Error(awardErr.message);

  const expectedPoints = Math.floor(pricePaid / 1000);
  const { data: acct } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .single();

  const { data: txId2 } = await admin.rpc("award_loyalty_points_for_ticket", {
    p_ticket_id: ticket.id,
  });

  const { data: earnTx } = await admin
    .from("loyalty_transactions")
    .select("points, source_type, source_id, idempotency_key")
    .eq("idempotency_key", `ticket:${ticket.id}:earn`)
    .maybeSingle();

  if (
    txId1 &&
    txId1 === txId2 &&
    earnTx?.points === expectedPoints &&
    earnTx.source_type === "ticket"
  ) {
    pass("ticket confirmado acredita puntos idempotente", `${expectedPoints} pts`);
  } else {
    fail("ticket acreditación", JSON.stringify({ txId1, txId2, earnTx, expectedPoints }));
  }

  const { data: anonTicket, error: anonTicketErr } = await admin
    .from("tickets")
    .insert({
      event_id: event.id,
      ticket_type_id: ticketTypeId,
      user_id: null,
      buyer_name: "Anon Test",
      buyer_whatsapp: null,
      buyer_dni: null,
      qr_token: `test-anon-${RUN_ID}`,
      original_price: 10000,
      price_paid: 10000,
      discount_amount: 0,
      payment_method: "cash",
      payment_status: "confirmed",
      ticket_status: "valid",
      sales_channel: "web",
    })
    .select("id")
    .single();

  if (!anonTicketErr && anonTicket) {
    state.ticketIds.push(anonTicket.id);
    const { data: noAward } = await admin.rpc("award_loyalty_points_for_ticket", {
      p_ticket_id: anonTicket.id,
    });
    if (noAward === null) {
      pass("ticket sin user_id no acredita puntos");
    } else {
      fail("ticket sin user_id", String(noAward));
    }
  }

  const { data: revId1 } = await admin.rpc("reverse_loyalty_points_for_ticket", {
    p_ticket_id: ticket.id,
  });
  const { data: revId2 } = await admin.rpc("reverse_loyalty_points_for_ticket", {
    p_ticket_id: ticket.id,
  });

  const { data: afterCancel } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .single();

  if (revId1 && revId1 === revId2 && afterCancel.points_balance >= 0) {
    pass("reverso ticket idempotente", `saldo=${afterCancel.points_balance}`);
  } else {
    fail("reverso ticket", JSON.stringify({ revId1, revId2, afterCancel }));
  }
}

async function main() {
  try {
    state.userA = await createTestCustomer("a");
    state.userB = await createTestCustomer("b");
    state.clientA = await signInCustomer(state.userA);
    state.clientB = await signInCustomer(state.userB);

    pass("usuarios de prueba creados", `A=${state.userA.id.slice(0, 8)}… B=${state.userB.id.slice(0, 8)}…`);

    await testRpcGrants();
    await testRls();
    await testLedger();
    await testReversalAfterSpend();
    await testTicketIntegration();
  } catch (err) {
    fail("ejecución", err instanceof Error ? err.message : String(err));
  } finally {
    await cleanupAll();
    pass("cleanup completo");
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- Resumen ---");
  console.log(`Total: ${results.length}, OK: ${results.length - failed.length}, Fallos: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.error(`  - ${f.name}: ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
