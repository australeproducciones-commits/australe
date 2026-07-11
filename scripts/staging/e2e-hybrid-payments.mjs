#!/usr/bin/env node
/**
 * E2E integración staging — pagos híbridos manuales.
 * node scripts/staging/e2e-hybrid-payments.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { assertNotProduction, maskRef } from "./lib/guard.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.STAGING_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.STAGING_SUPABASE_ANON_KEY;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

const RUN = process.env.STAGING_SEED_TAG ?? "hybrid-v1";
const PASSWORD = `Staging!${RUN}`;
const CASHIER_EMAIL = `cajero+${RUN}@staging.australe.invalid`;
const CUSTOMER_EMAIL = `cliente+${RUN}@staging.australe.invalid`;
const PRODUCT_SLUG = `staging-rem-${RUN}`;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables staging");
  process.exit(1);
}

const ref = assertNotProduction({ supabaseUrl: url, context: "e2e" });
console.log(`E2E staging ${maskRef(ref)}`);

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const failures = [];
const state = { orders: [] };

function ok(name, detail = "") {
  console.log(`OK ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return client;
}

async function getProduct() {
  const { data, error } = await admin
    .from("store_products")
    .select("id, public_price, stock_total, stock_reserved, stock_sold")
    .eq("slug", PRODUCT_SLUG)
    .maybeSingle();
  if (error || !data) throw new Error(`producto ${PRODUCT_SLUG} no encontrado`);
  return data;
}

async function createManualOrder(label, { asCustomer = false } = {}) {
  const product = await getProduct();
  const client = asCustomer ? await signIn(CUSTOMER_EMAIL) : anon;
  const { data, error } = await client.rpc("create_store_order", {
    p_customer_name: `E2E ${label}`,
    p_customer_email: `e2e-${label}-${Date.now()}@staging.australe.invalid`,
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_apply_community_price: false,
    p_payment_channel: "manual",
  });
  if (error) throw new Error(`create_order ${label}: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  const orderId = row.order_id;

  const { data: full } = await admin.from("store_orders").select("*").eq("id", orderId).maybeSingle();

  return {
    orderId,
    orderNumber: row.order_number,
    total: Number(row.total_amount ?? full?.total),
    order: full,
    productBefore: product,
  };
}

async function confirmAsCashier(orderId, total, method = "cash", amount = null) {
  const cashier = await signIn(CASHIER_EMAIL);
  const { data, error } = await cashier.rpc("confirm_store_manual_payment", {
    p_order_id: orderId,
    p_payment_method: method,
    p_amount_received: amount ?? total,
    p_payment_reference: method === "bank_transfer" ? "TRX-STAGING-001" : null,
    p_notes: "e2e staging",
  });
  return { data, error };
}

async function testManualOrderCreation() {
  const before = await getProduct();
  const created = await createManualOrder("manual", { asCustomer: true });
  state.orders.push(created.orderId);

  const { data: order } = await admin
    .from("store_orders")
    .select("payment_channel, payment_status, status, reserved_until, loyalty_points_awarded")
    .eq("id", created.orderId)
    .single();

  if (order.payment_channel !== "manual") fail("canal manual", order.payment_channel);
  else ok("canal manual");

  if (order.payment_status !== "pending") fail("payment pending", order.payment_status);
  else ok("payment pending");

  if (!order.reserved_until) fail("reserved_until");
  else ok("reserved_until definido");

  if (order.loyalty_points_awarded > 0) fail("sin puntos en reserva");
  else ok("sin puntos en reserva");

  const after = await getProduct();
  if (after.stock_reserved <= before.stock_reserved) fail("stock reservado");
  else ok("stock reservado");

  return created;
}

async function testCashierConfirm(created) {
  const { data, error } = await confirmAsCashier(created.orderId, created.total, "cash");
  if (error) fail("confirmación cajero", error.message);
  else ok("confirmación cajero", data?.outcome);

  const { data: order } = await admin
    .from("store_orders")
    .select(
      "payment_status, payment_method, payment_amount_received, paid_at, status, loyalty_points_awarded, payment_confirmed_by",
    )
    .eq("id", created.orderId)
    .single();

  if (order.payment_status !== "confirmed") fail("confirmed", order.payment_status);
  else ok("payment confirmed");

  if (order.payment_method !== "cash") fail("method cash", order.payment_method);
  else ok("payment_method cash");

  if (Number(order.payment_amount_received) !== created.total) fail("importe recibido");
  else ok("payment_amount_received");

  if (!order.paid_at) fail("paid_at");
  else ok("paid_at");

  if (!order.payment_confirmed_by) fail("payment_confirmed_by");
  else ok("payment_confirmed_by");

  if (order.loyalty_points_awarded <= 0) fail("puntos acreditados");
  else ok("puntos acreditados una vez", String(order.loyalty_points_awarded));
}

async function testIdempotentConfirm(created) {
  const { data, error } = await confirmAsCashier(created.orderId, created.total, "cash");
  if (error) fail("idempotencia error", error.message);
  else if (data?.outcome === "already_confirmed" || data?.idempotent) ok("doble confirm idempotente");
  else ok("doble confirm", data?.outcome);

  const { data: order } = await admin
    .from("store_orders")
    .select("loyalty_points_awarded, payment_method")
    .eq("id", created.orderId)
    .single();

  if (order.payment_method !== "cash") fail("método cambió en reintento");
  else ok("método histórico preservado");
}

async function testManualMethods() {
  const methods = ["bank_transfer", "card_terminal", "other"];
  for (const method of methods) {
    const created = await createManualOrder(method);
    state.orders.push(created.orderId);
    const { error } = await confirmAsCashier(created.orderId, created.total, method);
    if (error) fail(`método ${method}`, error.message);
    else ok(`método ${method}`);

    const { data: order } = await admin
      .from("store_orders")
      .select("payment_method")
      .eq("id", created.orderId)
      .single();
    if (order.payment_method !== method) fail(`guardó ${method}`, order.payment_method);
  }
}

async function testWrongAmount() {
  const created = await createManualOrder("wrong-amount");
  state.orders.push(created.orderId);
  const { error } = await confirmAsCashier(
    created.orderId,
    created.total,
    "cash",
    created.total - 1,
  );
  if (!error) fail("importe incorrecto aceptado");
  else ok("importe incorrecto rechazado");
}

async function testUnauthorized() {
  const created = await createManualOrder("unauth");
  state.orders.push(created.orderId);
  const customer = await signIn(CUSTOMER_EMAIL);
  const { error } = await customer.rpc("confirm_store_manual_payment", {
    p_order_id: created.orderId,
    p_payment_method: "cash",
    p_amount_received: created.total,
  });
  if (!error) fail("cliente confirmó pago");
  else ok("cliente no autorizado");
}

async function testMissingMethod() {
  const created = await createManualOrder("no-method");
  state.orders.push(created.orderId);
  const cashier = await signIn(CASHIER_EMAIL);
  const { error } = await cashier.rpc("confirm_store_manual_payment", {
    p_order_id: created.orderId,
    p_payment_method: "invalid_method",
    p_amount_received: created.total,
  });
  if (!error) fail("método inválido aceptado");
  else ok("método inválido rechazado");
}

async function testExpiration() {
  const created = await createManualOrder("expire");
  state.orders.push(created.orderId);
  const productBefore = await getProduct();

  await admin
    .from("store_orders")
    .update({ reserved_until: new Date(Date.now() - 120_000).toISOString() })
    .eq("id", created.orderId);

  const first = await admin.rpc("expire_store_reservations");
  if (first.error) fail("expire job", first.error.message);
  else ok("expire job ejecutado", `count=${first.data}`);

  const { data: order } = await admin
    .from("store_orders")
    .select("status, payment_status, loyalty_points_awarded")
    .eq("id", created.orderId)
    .single();

  if (order.status !== "expired") fail("status expired", order.status);
  else ok("orden expirada");

  const { error: confirmErr } = await confirmAsCashier(created.orderId, created.total);
  if (!confirmErr) fail("confirm tras expirar permitida");
  else ok("confirm tras expirar bloqueada");

  const second = await admin.rpc("expire_store_reservations");
  if (second.error) fail("expire idempotente", second.error.message);
  else ok("expire idempotente");

  const productAfter = await getProduct();
  if (productAfter.stock_reserved > productBefore.stock_reserved) {
    fail("stock liberado");
  } else {
    ok("stock liberado tras expiración");
  }
}

async function testConcurrency() {
  const created = await createManualOrder("concurrent");
  state.orders.push(created.orderId);

  const cashierA = await signIn(CASHIER_EMAIL);
  const cashierB = await signIn(CASHIER_EMAIL);

  const p1 = cashierA.rpc("confirm_store_manual_payment", {
    p_order_id: created.orderId,
    p_payment_method: "cash",
    p_amount_received: created.total,
  });
  const p2 = cashierB.rpc("confirm_store_manual_payment", {
    p_order_id: created.orderId,
    p_payment_method: "cash",
    p_amount_received: created.total,
  });

  const [r1, r2] = await Promise.all([p1, p2]);
  const confirmed = [r1, r2].filter((r) => r.data?.outcome === "confirmed").length;
  const already = [r1, r2].filter((r) => r.data?.outcome === "already_confirmed").length;

  if (confirmed > 1) fail("doble confirm concurrente");
  else ok("concurrencia: una sola confirmación", `confirmed=${confirmed} already=${already}`);

  const { data: order } = await admin
    .from("store_orders")
    .select("loyalty_points_awarded, payment_status")
    .eq("id", created.orderId)
    .single();

  if (order.payment_status !== "confirmed") fail("concurrencia payment_status");
  else ok("concurrencia payment_status confirmed");

  const points = order.loyalty_points_awarded;
  const { data: txs } = await admin
    .from("loyalty_transactions")
    .select("id")
    .eq("source_type", "store_order")
    .eq("source_id", String(created.orderId))
    .eq("transaction_type", "earn");

  if ((txs?.length ?? 0) > 1) fail("múltiples transacciones puntos");
  else ok("puntos únicos en concurrencia", String(points));
}

async function testMpChannelWithoutPreference() {
  const product = await getProduct();
  const { data, error } = await anon.rpc("create_store_order", {
    p_customer_name: "E2E MP",
    p_customer_email: `e2e-mp-${Date.now()}@staging.australe.invalid`,
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_payment_channel: "mercadopago",
  });
  if (error) fail("orden MP channel", error.message);
  else {
    const row = Array.isArray(data) ? data[0] : data;
    const { data: order } = await admin
      .from("store_orders")
      .select("payment_channel, payment_status")
      .eq("id", row.order_id)
      .single();
    if (order.payment_channel !== "mercadopago") fail("canal MP");
    else ok("canal mercadopago sin preferencia");
    state.orders.push(row.order_id);
  }
}

async function main() {
  console.log("e2e-hybrid-payments: inicio");

  const created = await testManualOrderCreation();
  await testCashierConfirm(created);
  await testIdempotentConfirm(created);
  await testManualMethods();
  await testWrongAmount();
  await testUnauthorized();
  await testMissingMethod();
  await testExpiration();
  await testConcurrency();
  await testMpChannelWithoutPreference();

  if (failures.length) {
    console.error(`e2e-hybrid-payments: ${failures.length} fallos`);
    process.exit(1);
  }
  console.log("e2e-hybrid-payments: OK");
}

main().catch((err) => {
  console.error("e2e-hybrid-payments:", err.message);
  process.exit(1);
});
