#!/usr/bin/env node
/**
 * Validaciones unitarias de Mercado Pago (sin red ni credenciales).
 * node scripts/validate-mercadopago-unit.mjs
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function parseSignature(header) {
  let ts = null;
  let v1 = null;
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "ts") ts = value?.trim() ?? null;
    if (key?.trim() === "v1") v1 = value?.trim() ?? null;
  }
  return { ts, v1 };
}

function buildManifest({ dataId, requestId, ts }) {
  const parts = [];
  if (dataId) parts.push(`id:${dataId.toLowerCase()}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return parts.length ? `${parts.join(";")};` : "";
}

function computeSignature(manifest, secret) {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

function verify({ dataId, requestId, signatureHeader, secret }) {
  const { ts, v1 } = parseSignature(signatureHeader);
  const manifest = buildManifest({ dataId, requestId, ts });
  const expected = computeSignature(manifest, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(v1 ?? "");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Casos de firma
const secret = "test-secret-key";
const ts = "1700000000";
const requestId = "req-abc-123";
const dataId = "123456789";
const manifest = buildManifest({ dataId, requestId, ts });
const sig = computeSignature(manifest, secret);
const header = `ts=${ts},v1=${sig}`;

assert(verify({ dataId, requestId, signatureHeader: header, secret }), "firma válida");
assert(!verify({ dataId, requestId, signatureHeader: header, secret: "wrong" }), "secreto incorrecto");
assert(!verify({ dataId, requestId: "other", signatureHeader: header, secret }), "request-id distinto");

// External reference
const storeTs = readFileSync(join(root, "lib/payments/config.ts"), "utf8");
assert(storeTs.includes("store:"), "buildStoreExternalReference presente");

// Mapeo de estados
const providerTs = readFileSync(join(root, "lib/payments/providers/mercadopago.ts"), "utf8");
for (const status of ["approved", "pending", "rejected", "refunded", "charged_back"]) {
  assert(providerTs.includes(`"${status}"`), `mapeo ${status}`);
}

// Medios offline excluidos
assert(providerTs.includes('"ticket"'), "excluye ticket");
assert(providerTs.includes('"atm"'), "excluye atm");

// Feature flag backend
const storePayments = readFileSync(join(root, "lib/payments/store.ts"), "utf8");
assert(storePayments.includes("isMercadoPagoEnabled"), "flag en store payments");

if (errors.length) {
  console.error("validate-mercadopago-unit: FALLO");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("validate-mercadopago-unit: OK (8+ comprobaciones)");
