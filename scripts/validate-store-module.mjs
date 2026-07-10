#!/usr/bin/env node
/**
 * Validación estructural del módulo de tienda/merchandising.
 * Ejecutar: node scripts/validate-store-module.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function check(path, label) {
  const full = join(root, path);
  if (!existsSync(full)) {
    errors.push(`Falta ${label}: ${path}`);
  }
}

const requiredFiles = [
  ["supabase/migrations/20260710170000_store_merchandising_foundation.sql", "migración foundation"],
  ["supabase/migrations/20260710170100_store_stock_orders_rpc.sql", "migración RPCs"],
  ["lib/store/types.ts", "types"],
  ["lib/store/queries.ts", "queries"],
  ["lib/store/actions.ts", "actions"],
  ["app/(public)/tienda/page.tsx", "tienda pública"],
  ["app/admin/tienda/page.tsx", "admin tienda"],
  ["components/store/StoreMerchBadge.tsx", "badge merch"],
  ["docs/store-merchandising/README.md", "documentación"],
];

for (const [path, label] of requiredFiles) {
  check(path, label);
}

const migration = readFileSync(
  join(root, "supabase/migrations/20260710170000_store_merchandising_foundation.sql"),
  "utf8",
);

const tables = [
  "store_products",
  "store_product_variants",
  "store_collections",
  "event_store_settings",
  "event_store_products",
  "store_orders",
  "store_order_items",
  "store_stock_movements",
];

for (const table of tables) {
  if (!migration.includes(`public.${table}`)) {
    errors.push(`Tabla no encontrada en migración: ${table}`);
  }
}

const rpcMigration = readFileSync(
  join(root, "supabase/migrations/20260710170100_store_stock_orders_rpc.sql"),
  "utf8",
);

const rpcs = [
  "store_reserve_stock",
  "create_store_order",
  "mark_store_order_paid",
  "mark_store_order_delivered",
  "cancel_store_order",
  "award_loyalty_points_for_store_order",
];

const foundationRpcs = ["event_has_available_store_merch"];

for (const rpc of rpcs) {
  if (!rpcMigration.includes(rpc)) {
    errors.push(`RPC no encontrada: ${rpc}`);
  }
}

for (const rpc of foundationRpcs) {
  if (!migration.includes(rpc)) {
    errors.push(`RPC foundation no encontrada: ${rpc}`);
  }
}

if (errors.length > 0) {
  console.error("VALIDACIÓN STORE: FALLÓ");
  for (const err of errors) {
    console.error(" -", err);
  }
  process.exit(1);
}

console.log("VALIDACIÓN STORE: OK");
console.log(`Tablas verificadas: ${tables.length}`);
console.log(`RPCs verificadas: ${rpcs.length}`);
