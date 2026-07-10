#!/usr/bin/env node
/**
 * Verificación remota del módulo Tienda en Supabase producción.
 * No imprime secretos. Lee .env.local si existe.
 *
 * Uso: node scripts/validate-store-remote.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

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

if (!url || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = (key, extra = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  ...extra,
});

/** Tablas con la columna correcta para probe SELECT (evita falsos 400). */
const TABLES = [
  ["store_products", "id"],
  ["store_product_variants", "id"],
  ["store_collections", "id"],
  ["store_collection_products", "id"],
  ["event_store_settings", "event_id"],
  ["event_store_products", "id"],
  ["store_orders", "id"],
  ["store_order_items", "id"],
  ["store_stock_movements", "id"],
];

const RPC_PROBES = [
  [
    "event_has_available_store_merch",
    { p_event_id: "00000000-0000-0000-0000-000000000001" },
  ],
  [
    "create_store_order",
    {
      p_customer_name: "validate-remote",
      p_customer_email: "validate@australe.invalid",
      p_items: [],
    },
  ],
  [
    "mark_store_order_paid",
    { p_order_id: "00000000-0000-0000-0000-000000000001" },
  ],
  ["expire_store_reservations", {}],
  [
    "store_adjust_stock",
    {
      p_product_id: "00000000-0000-0000-0000-000000000001",
      p_quantity_delta: 0,
      p_reason: "validate-remote",
    },
  ],
  [
    "award_loyalty_points_for_store_order",
    { p_order_id: "00000000-0000-0000-0000-000000000001" },
  ],
];

async function restStatus(path, key = serviceKey, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(key), ...(init.headers ?? {}) },
  });
  return res.status;
}

async function rpcProbe(fn, body, key = serviceKey) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(key, { "Content-Type": "application/json" }),
    body: JSON.stringify(body ?? {}),
  });
  return res.status;
}

/** 404 = función inexistente; cualquier otro código indica que PostgREST la resolvió. */
function rpcExists(status) {
  return status !== 404;
}

console.log("=== Tablas store (service_role) ===");
let tablesOk = 0;
for (const [table, column] of TABLES) {
  const status = await restStatus(`${table}?select=${column}&limit=1`);
  const ok = status === 200;
  if (ok) tablesOk++;
  console.log(`${ok ? "OK" : "FAIL"} ${table}: HTTP ${status}`);
}

console.log("\n=== RPCs (existencia vía POST) ===");
let rpcsOk = 0;
for (const [fn, body] of RPC_PROBES) {
  const status = await rpcProbe(fn, body);
  const exists = rpcExists(status);
  if (exists) rpcsOk++;
  console.log(`${exists ? "OK" : "FAIL"} ${fn}: HTTP ${status}`);
}

if (anonKey) {
  console.log("\n=== Seguridad básica (anon) ===");
  const anonSelect = await restStatus("store_products?select=id&limit=1", anonKey);
  console.log(`anon SELECT store_products: HTTP ${anonSelect} (esperado 200)`);

  const anonInsert = await restStatus("store_products", anonKey, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ name: "probe", slug: "probe-invalid" }),
  });
  console.log(`anon INSERT store_products: HTTP ${anonInsert} (esperado 401/403)`);

  const anonPaid = await rpcProbe(
    "mark_store_order_paid",
    { p_order_id: "00000000-0000-0000-0000-000000000001" },
    anonKey,
  );
  const paidBlocked = anonPaid === 401 || anonPaid === 403;
  console.log(
    `anon mark_store_order_paid: HTTP ${anonPaid} (${paidBlocked ? "OK bloqueado" : "revisar"})`,
  );
}

console.log(`\nResumen: ${tablesOk}/${TABLES.length} tablas, ${rpcsOk}/${RPC_PROBES.length} RPCs`);
const success = tablesOk === TABLES.length && rpcsOk === RPC_PROBES.length;
process.exit(success ? 0 : 1);
