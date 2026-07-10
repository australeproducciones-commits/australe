#!/usr/bin/env node
/** Limpia productos/pedidos TEST de tienda en remoto. No imprime secretos. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const get = (n) => {
  const l = env.split(/\r?\n/).find((x) => x.startsWith(`${n}=`));
  return l ? l.slice(n.length + 1).trim().replace(/^["']|["']$/g, "") : "";
};
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");

const h = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(path, init = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...h, ...(init.headers ?? {}) },
  });
}

const { data: products } = await rest(
  "store_products?select=id,name,slug&or=(name.ilike.*TEST*,slug.ilike.test-*)",
).then(async (r) => ({ data: await r.json() }));

for (const p of products ?? []) {
  const items = await rest(`store_order_items?select=order_id&product_id=eq.${p.id}`).then((r) => r.json());
  const orderIds = [...new Set((items ?? []).map((i) => i.order_id))];
  for (const orderId of orderIds) {
    await rest(`store_order_items?order_id=eq.${orderId}`, { method: "DELETE" });
    await rest(`store_orders?id=eq.${orderId}`, { method: "DELETE" });
  }
  await rest(`store_stock_movements?product_id=eq.${p.id}`, { method: "DELETE" });
  await rest(`store_products?id=eq.${p.id}`, { method: "DELETE" });
  console.log(`Eliminado: ${p.name}`);
}

const orphanOrders = await rest(
  "store_orders?select=id,order_number,customer_name&or=(customer_name.ilike.*TEST*,customer_name.ilike.*validate*)",
).then((r) => r.json());

for (const o of orphanOrders ?? []) {
  await rest(`store_order_items?order_id=eq.${o.id}`, { method: "DELETE" });
  await rest(`store_orders?id=eq.${o.id}`, { method: "DELETE" });
  console.log(`Pedido eliminado: ${o.order_number}`);
}

console.log("Limpieza TEST completada");
