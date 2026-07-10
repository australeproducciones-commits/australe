#!/usr/bin/env node
/**
 * Prueba de concurrencia de stock en Tienda Australe (remoto seguro).
 * Crea un producto TEST efímero, lanza reservas paralelas y limpia.
 *
 * Uso: node scripts/validate-store-concurrency.mjs
 * Requiere: .env.local con NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const TEST_SLUG_PREFIX = "test-concurrency-";
const TEST_NAME = "TEST Concurrency Australe";

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const env = readFileSync(envPath, "utf8");
  const out = {};
  for (const line of env.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.log("SKIP: faltan credenciales Supabase en .env.local");
  process.exit(0);
}

const headers = (key, extra = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  ...extra,
});

async function rest(path, key, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(key, init.headers), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function rpc(fn, body, key) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(key, { "Content-Type": "application/json" }),
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

async function tableExists() {
  const { res } = await rest("store_products?select=id&limit=1", serviceKey);
  return res.status === 200;
}

async function cleanupProduct(productId) {
  if (!productId) return;
  const { data: items } = await rest(
    `store_order_items?select=order_id&product_id=eq.${productId}`,
    serviceKey,
  );
  const orderIds = [...new Set((items ?? []).map((i) => i.order_id))];
  for (const orderId of orderIds) {
    await rest(`store_order_items?order_id=eq.${orderId}`, serviceKey, { method: "DELETE" });
    await rest(`store_orders?id=eq.${orderId}`, serviceKey, { method: "DELETE" });
  }
  await rest(`store_stock_movements?product_id=eq.${productId}`, serviceKey, { method: "DELETE" });
  await rest(`store_products?id=eq.${productId}`, serviceKey, { method: "DELETE" });
}

const slug = `${TEST_SLUG_PREFIX}${Date.now()}`;
let productId = null;

try {
  if (!(await tableExists())) {
    console.log("SKIP: tablas store_* aún no existen en remoto");
    process.exit(0);
  }

  const insert = await rest("store_products", serviceKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name: TEST_NAME,
      slug,
      status: "active",
      is_active: true,
      public_price: 100,
      track_stock: true,
      stock_total: 1,
      stock_reserved: 0,
      stock_sold: 0,
    }),
  });

  if (!insert.res.ok || !insert.data?.[0]?.id) {
    fail(`no se pudo crear producto TEST (HTTP ${insert.res.status})`);
  }

  productId = insert.data[0].id;
  ok(`producto TEST creado (${productId}) stock_total=1`);

  const orderPayload = {
    p_customer_name: "TEST Concurrency",
    p_customer_email: "test-concurrency@australe.invalid",
    p_items: [{ product_id: productId, quantity: 1 }],
    p_apply_community_price: false,
  };

  const [a, b] = await Promise.all([
    rpc("create_store_order", orderPayload, anonKey),
    rpc("create_store_order", orderPayload, anonKey),
  ]);

  const successes = [a, b].filter((r) => r.res.ok);
  const failures = [a, b].filter((r) => !r.res.ok);

  if (successes.length !== 1) {
    fail(`se esperaba 1 reserva exitosa, hubo ${successes.length}`);
  }
  if (failures.length !== 1) {
    fail(`se esperaba 1 reserva rechazada, hubo ${failures.length}`);
  }

  ok("concurrencia: una reserva aceptada y otra rechazada");

  const { data: productRows } = await rest(
    `store_products?select=stock_total,stock_reserved,stock_sold&id=eq.${productId}`,
    serviceKey,
  );
  const product = Array.isArray(productRows) ? productRows[0] : null;
  if (!product) fail("producto TEST no encontrado tras reservas");

  if (product.stock_total < 0 || product.stock_reserved < 0) {
    fail("stock negativo detectado");
  }
  if (product.stock_reserved > product.stock_total) {
    fail("stock reservado excede total");
  }
  ok(`stock consistente: total=${product.stock_total} reserved=${product.stock_reserved} sold=${product.stock_sold}`);

  if (successes[0].data) {
    const row = Array.isArray(successes[0].data) ? successes[0].data[0] : successes[0].data;
    const successOrderId = row?.order_id;
    if (successOrderId) {
      const { data: orderRows } = await rest(
        `store_orders?select=status,payment_status&id=eq.${successOrderId}`,
        serviceKey,
      );
      const order = Array.isArray(orderRows) ? orderRows[0] : null;
      if (!order || order.status !== "reserved") {
        fail("pedido exitoso no quedó en estado reserved");
      }
      ok("pedido reservado correctamente");
    }
  }

  console.log("\nVALIDACIÓN CONCURRENCIA: OK");
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
} finally {
  if (productId) {
    await cleanupProduct(productId);
    ok("producto TEST eliminado");
  }
}
