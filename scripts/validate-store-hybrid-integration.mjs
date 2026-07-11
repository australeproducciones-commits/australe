#!/usr/bin/env node
/**
 * Pruebas de integración DB — pagos híbridos tienda.
 * Requiere migración aplicada y .env.local con credenciales Supabase.
 *
 * Uso: node scripts/validate-store-hybrid-integration.mjs
 * No imprime secretos. Omite pruebas si falta columna payment_channel.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
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
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[trimmed.slice(0, idx).trim()] = val;
  }
  return out;
}

const env = {
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...loadEnvFile(resolve(process.cwd(), "../australeweb/.env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("validate-store-hybrid-integration: omitido — faltan variables Supabase");
  process.exit(0);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const failures = [];
function ok(name, detail = "") {
  console.log(`OK ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

async function probeMigration() {
  const { error } = await admin.from("store_orders").select("payment_channel").limit(1);
  if (error?.message?.includes("payment_channel")) {
    return false;
  }
  if (error) {
    fail("probe migración", error.message);
    return false;
  }
  return true;
}

async function rpcExists(name) {
  const { error } = await admin.rpc(name, {});
  if (!error) return true;
  const msg = error.message ?? "";
  if (msg.includes("Could not find the function") || msg.includes("does not exist")) {
    return false;
  }
  return true;
}

async function testAnonCannotConfirm() {
  const { error } = await anon.rpc("confirm_store_manual_payment", {
    p_order_id: randomUUID(),
    p_payment_method: "cash",
    p_amount_received: 100,
  });
  if (!error) {
    fail("anon no puede confirm_store_manual_payment", "RPC sin error");
    return;
  }
  ok("anon bloqueado en confirm_store_manual_payment");
}

async function testAnonCannotExpire() {
  const { error } = await anon.rpc("expire_store_reservations");
  if (!error) {
    fail("anon no puede expire_store_reservations");
    return;
  }
  ok("anon bloqueado en expire_store_reservations");
}

async function testServiceCanExpireIdempotent() {
  const first = await admin.rpc("expire_store_reservations");
  if (first.error) {
    fail("service expire_store_reservations", first.error.message);
    return;
  }
  const second = await admin.rpc("expire_store_reservations");
  if (second.error) {
    fail("service expire idempotente", second.error.message);
    return;
  }
  ok("expire_store_reservations idempotente", `counts ${first.data}/${second.data}`);
}

async function findActiveProduct() {
  const { data, error } = await admin
    .from("store_products")
    .select("id, slug, public_price, stock_total, show_in_store, status, is_active")
    .eq("is_active", true)
    .eq("status", "active")
    .eq("show_in_store", true)
    .gt("stock_total", 0)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function testManualOrderCreation() {
  const product = await findActiveProduct();
  if (!product) {
    ok("creación manual", "omitido — sin producto activo con stock");
    return null;
  }

  const { data, error } = await anon.rpc("create_store_order", {
    p_customer_name: "Hybrid Test",
    p_customer_email: `hybrid-${Date.now()}@australe.invalid`,
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_apply_community_price: false,
    p_payment_channel: "manual",
  });

  if (error) {
    fail("create_store_order manual", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.order_id) {
    fail("create_store_order manual", "sin order_id");
    return null;
  }

  const { data: order } = await admin
    .from("store_orders")
    .select("payment_channel, payment_status, status, reserved_until")
    .eq("id", row.order_id)
    .maybeSingle();

  if (order?.payment_channel !== "manual") {
    fail("canal manual", `got ${order?.payment_channel}`);
  } else {
    ok("create_store_order canal manual", row.order_number);
  }

  return { orderId: row.order_id, orderNumber: row.order_number, total: row.total_amount };
}

async function testMpChannelOrder() {
  const product = await findActiveProduct();
  if (!product) {
    ok("creación MP", "omitido — sin producto");
    return;
  }

  const { data, error } = await anon.rpc("create_store_order", {
    p_customer_name: "Hybrid MP Test",
    p_customer_email: `hybrid-mp-${Date.now()}@australe.invalid`,
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_apply_community_price: false,
    p_payment_channel: "mercadopago",
  });

  if (error) {
    fail("create_store_order mercadopago", error.message);
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  const { data: order } = await admin
    .from("store_orders")
    .select("payment_channel")
    .eq("id", row.order_id)
    .maybeSingle();

  if (order?.payment_channel !== "mercadopago") {
    fail("canal mercadopago", order?.payment_channel ?? "null");
  } else {
    ok("create_store_order canal mercadopago");
  }

  await admin.rpc("cancel_store_order", { p_order_id: row.order_id, p_reason: "test cleanup" });
}

async function testExpiredReservation(orderId) {
  if (!orderId) return;

  await admin
    .from("store_orders")
    .update({ reserved_until: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", orderId);

  const expired = await admin.rpc("expire_store_reservations");
  if (expired.error) {
    fail("expirar orden prueba", expired.error.message);
    return;
  }

  const { data: order } = await admin
    .from("store_orders")
    .select("status, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (order?.status !== "expired") {
    fail("estado expirado", order?.status ?? "null");
  } else {
    ok("reserva expirada por job", order.payment_status);
  }

  const again = await admin.rpc("expire_store_reservations");
  if (again.error) {
    fail("re-expirar idempotente", again.error.message);
  } else {
    ok("re-ejecución expire sin error");
  }
}

async function testConfirmWithoutAuth(orderId) {
  if (!orderId) return;
  const { error } = await anon.rpc("confirm_store_manual_payment", {
    p_order_id: orderId,
    p_payment_method: "cash",
    p_amount_received: 1,
  });
  if (!error) {
    fail("confirm sin staff");
  } else {
    ok("confirmación requiere staff");
  }
}

async function main() {
  console.log("validate-store-hybrid-integration: inicio");

  const migrated = await probeMigration();
  if (!migrated) {
    console.log("validate-store-hybrid-integration: omitido — aplicar migración híbrida primero");
    process.exit(0);
  }

  const hasConfirm = await rpcExists("confirm_store_manual_payment");
  if (!hasConfirm) {
    console.log("validate-store-hybrid-integration: omitido — falta RPC confirm_store_manual_payment");
    process.exit(0);
  }

  await testAnonCannotConfirm();
  await testAnonCannotExpire();
  await testServiceCanExpireIdempotent();

  const manual = await testManualOrderCreation();
  await testMpChannelOrder();
  await testConfirmWithoutAuth(manual?.orderId);
  await testExpiredReservation(manual?.orderId);

  if (failures.length > 0) {
    console.error(`validate-store-hybrid-integration: FALLÓ (${failures.length})`);
    process.exit(1);
  }

  console.log("validate-store-hybrid-integration: OK");
}

main().catch((err) => {
  console.error("validate-store-hybrid-integration:", err.message);
  process.exit(1);
});
