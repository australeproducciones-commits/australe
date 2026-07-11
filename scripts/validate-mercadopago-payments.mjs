#!/usr/bin/env node
/**
 * Validación estructural integración Mercado Pago (Etapa 3).
 * node scripts/validate-mercadopago-payments.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function check(path, label) {
  if (!existsSync(join(root, path))) {
    errors.push(`Falta ${label}: ${path}`);
  }
}

const required = [
  ["supabase/migrations/20260710180000_payment_infrastructure.sql", "migración pagos"],
  ["lib/payments/types.ts", "types pagos"],
  ["lib/payments/service.ts", "service pagos"],
  ["lib/payments/signature.ts", "firma webhook"],
  ["lib/payments/reconciliation.ts", "conciliación"],
  ["lib/payments/providers/mercadopago.ts", "proveedor MP"],
  ["lib/payments/store.ts", "store payments"],
  ["app/api/store/payments/mercadopago/preference/route.ts", "API preferencia"],
  ["app/api/webhooks/mercadopago/route.ts", "API webhook"],
  ["app/api/store/orders/[orderNumber]/payment-status/route.ts", "API estado"],
  ["app/(public)/tienda/pago/exito/page.tsx", "página éxito"],
  ["app/(public)/tienda/pago/pendiente/page.tsx", "página pendiente"],
  ["app/(public)/tienda/pago/error/page.tsx", "página error"],
  ["docs/payments/README.md", "docs pagos"],
];

for (const [path, label] of required) {
  check(path, label);
}

const migration = readFileSync(
  join(root, "supabase/migrations/20260710180000_payment_infrastructure.sql"),
  "utf8",
);

for (const item of [
  "payment_transactions",
  "payment_webhook_events",
  "reconcile_store_order_payment",
  "register_payment_webhook_event",
  "payment_review",
]) {
  if (!migration.includes(item)) {
    errors.push(`Migración sin: ${item}`);
  }
}

const envExample = readFileSync(join(root, ".env.example"), "utf8");
for (const key of [
  "MERCADOPAGO_ACCESS_TOKEN",
  "NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "MERCADOPAGO_ENVIRONMENT",
  "MERCADOPAGO_ENABLED",
]) {
  if (!envExample.includes(key)) {
    errors.push(`.env.example sin ${key}`);
  }
}

if (errors.length) {
  console.error("validate-mercadopago-payments: FALLO");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("validate-mercadopago-payments: OK");
