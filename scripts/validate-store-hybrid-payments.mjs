#!/usr/bin/env node
/**
 * Validaciones estáticas del flujo híbrido de pagos tienda.
 * node scripts/validate-store-hybrid-payments.mjs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

const migration = read("supabase/migrations/20260711020000_store_hybrid_payments.sql");
const config = read("lib/payments/config.ts");
const channels = read("lib/store/payment-channels.ts");
const checkout = read("components/store/StoreCheckoutClient.tsx");
const actions = read("lib/store/actions.ts");
const adminPanel = read("components/store/admin/AdminStoreOrdersPanel.tsx");
const modal = read("components/store/admin/ConfirmManualPaymentModal.tsx");
const storePayments = read("lib/payments/store.ts");

assert(migration.includes("payment_channel"), "migración: payment_channel");
assert(migration.includes("payment_method"), "migración: payment_method");
assert(migration.includes("confirm_store_manual_payment"), "migración: RPC confirmación manual");
assert(migration.includes("duplicate_mp_after_manual"), "migración: conflicto MP tras manual");
assert(migration.includes("p_payment_channel"), "migración: create_store_order con canal");

assert(config.includes("STORE_MANUAL_PAYMENT_ENABLED"), "config: flag manual");
assert(config.includes("getStoreCheckoutPaymentAvailability"), "config: matriz checkout");

assert(channels.includes("mercadopago"), "canales: mercadopago");
assert(channels.includes("manual"), "canales: manual");
assert(channels.includes("bank_transfer"), "canales: transferencia");

assert(checkout.includes("Pagar con Mercado Pago"), "checkout: tarjeta MP");
assert(checkout.includes("Pagar en caja"), "checkout: tarjeta manual");
assert(checkout.includes("paymentChannel"), "checkout: canal requerido");
assert(checkout.includes("Pedido reservado"), "checkout: pantalla manual");

assert(actions.includes("confirmStoreManualPaymentAction"), "actions: confirmación manual");
assert(actions.includes("p_payment_channel"), "actions: canal en RPC create");
assert(actions.includes("requireStaffKioskAction"), "actions: cajero autorizado");

assert(adminPanel.includes("ConfirmManualPaymentModal"), "admin: modal confirmación");
assert(adminPanel.includes("Pendiente de pago"), "admin: filtro pendiente");
assert(modal.includes("confirmStoreManualPaymentAction"), "modal: acción servidor");

assert(storePayments.includes('payment_channel === "manual"'), "store MP: bloqueo canal manual");
assert(read("app/api/cron/expire-store-reservations/route.ts").includes("expire_store_reservations"), "cron: endpoint expiración");
assert(read("vercel.json").includes("expire-store-reservations"), "vercel.json: cron schedule");
assert(migration.includes("store_orders_payment_channel_chk"), "migración: constraint canal");
assert(migration.includes("payment_channel = 'mercadopago'"), "migración: backfill MP");

if (errors.length > 0) {
  console.error("validate-store-hybrid-payments: FALLÓ");
  for (const err of errors) console.error(" -", err);
  process.exit(1);
}

console.log("validate-store-hybrid-payments: OK");
