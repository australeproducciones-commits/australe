#!/usr/bin/env node
/**
 * Verifica esquema staging: columnas, RPC, grants, pg_cron.
 * node scripts/staging/verify-staging-schema.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { assertNotProduction, maskRef } from "./lib/guard.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.STAGING_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.STAGING_SUPABASE_ANON_KEY;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const stagingRef = process.env.STAGING_SUPABASE_PROJECT_ID;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables staging");
  process.exit(1);
}

const ref = assertNotProduction({ supabaseUrl: url, projectRef: stagingRef, context: "verify-schema" });
console.log(`Verificando staging ${maskRef(ref)}`);

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const failures = [];
function ok(m) {
  console.log(`OK ${m}`);
}
function fail(m, d = "") {
  failures.push(`${m}${d ? `: ${d}` : ""}`);
  console.error(`FAIL ${m}${d ? ` — ${d}` : ""}`);
}

async function verifyColumns() {
  const cols = [
    "payment_channel",
    "payment_method",
    "payment_amount_received",
    "payment_confirmed_by",
    "payment_notes",
    "payment_review_reason",
  ];
  for (const col of cols) {
    const { error } = await admin.from("store_orders").select(col).limit(1);
    if (error) fail(`columna ${col}`, error.message);
    else ok(`columna ${col}`);
  }
}

async function verifyRpcPresence() {
  const probes = [
    ["create_store_order", { p_customer_name: "x", p_customer_email: "x@y.z", p_items: [] }],
    [
      "confirm_store_manual_payment",
      {
        p_order_id: "00000000-0000-0000-0000-000000000001",
        p_payment_method: "cash",
        p_amount_received: 1,
      },
    ],
    ["expire_store_reservations", {}],
    [
      "reconcile_store_order_payment",
      {
        p_order_id: "00000000-0000-0000-0000-000000000001",
        p_provider: "mercadopago",
        p_provider_payment_id: "x",
        p_provider_preference_id: null,
        p_external_reference: "store:00000000-0000-0000-0000-000000000001",
        p_amount: 1,
        p_currency: "ARS",
        p_provider_status: "pending",
      },
    ],
  ];

  for (const [rpc, args] of probes) {
    const { error } = await admin.rpc(rpc, args);
    if (error?.message?.includes("Could not find the function")) {
      fail(`rpc ${rpc}`, "no existe");
    } else {
      ok(`rpc ${rpc} presente`);
    }
  }
}

async function verifyGrants() {
  const { error: anonConfirm } = await anon.rpc("confirm_store_manual_payment", {
    p_order_id: "00000000-0000-0000-0000-000000000001",
    p_payment_method: "cash",
    p_amount_received: 1,
  });
  if (!anonConfirm) fail("anon no bloqueado en confirm");
  else ok("anon bloqueado en confirm_store_manual_payment");

  const { error: anonExpire } = await anon.rpc("expire_store_reservations");
  if (!anonExpire) fail("anon no bloqueado en expire");
  else ok("anon bloqueado en expire_store_reservations");

  const { error: anonReconcile } = await anon.rpc("reconcile_store_order_payment", {
    p_order_id: "00000000-0000-0000-0000-000000000001",
    p_provider: "mercadopago",
    p_provider_payment_id: "x",
    p_provider_preference_id: null,
    p_external_reference: "x",
    p_amount: 1,
    p_currency: "ARS",
    p_provider_status: "pending",
  });
  if (!anonReconcile) fail("anon no bloqueado en reconcile");
  else ok("anon bloqueado en reconcile_store_order_payment");
}

async function verifyPgCron() {
  const marker = resolve(process.cwd(), ".staging-pg-cron.json");
  if (existsSync(marker)) {
    try {
      const data = JSON.parse(readFileSync(marker, "utf8"));
      if (data.jobname === "expire_store_reservations_every_5m" && data.schedule === "*/5 * * * *") {
        ok(`pg_cron job ${data.jobname} (${data.schedule})`);
        return;
      }
      fail("pg_cron", `schedule inesperado: ${data.schedule}`);
      return;
    } catch {
      fail("pg_cron", "marcador inválido");
      return;
    }
  }

  if (process.env.STAGING_PG_CRON_VERIFIED === "true") {
    ok("pg_cron verificado en paso CI");
    return;
  }

  console.log("SKIP pg_cron — ejecutar ensure-pg-cron.sql en CI");
}

async function verifyCoreTables() {
  for (const table of [
    "store_products",
    "store_product_variants",
    "store_orders",
    "store_order_items",
    "profiles",
    "community_settings",
  ]) {
    const { error } = await admin.from(table).select("id").limit(1);
    if (error && !error.message.includes("multiple")) {
      const alt = await admin.from(table).select("*").limit(1);
      if (alt.error) fail(`tabla ${table}`, alt.error.message);
      else ok(`tabla ${table}`);
    } else {
      ok(`tabla ${table}`);
    }
  }
}

async function main() {
  await verifyCoreTables();
  await verifyColumns();
  await verifyRpcPresence();
  await verifyGrants();
  await verifyPgCron();

  if (failures.length) {
    console.error(`verify-staging-schema: ${failures.length} fallos`);
    process.exit(1);
  }
  console.log("verify-staging-schema: OK");
}

main().catch((e) => {
  console.error("verify-staging-schema:", e.message);
  process.exit(1);
});
