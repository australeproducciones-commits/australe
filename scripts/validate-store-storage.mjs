#!/usr/bin/env node
/**
 * Valida bucket store-products y controles de acceso Storage.
 * No imprime secretos.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadCiEnv } from "./lib/ci-env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const fileEnv = loadCiEnv();
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) {
    return fileEnv;
  }
  const out = { ...fileEnv };
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
  if (!out.NEXT_PUBLIC_SUPABASE_URL && out.SUPABASE_PROJECT_ID) {
    out.NEXT_PUBLIC_SUPABASE_URL = `https://${out.SUPABASE_PROJECT_ID}.supabase.co`;
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const BUCKET = "store-products";
const results = [];

function record(control, result, evidence) {
  results.push({ control, result, evidence });
  const icon = result === "OK" ? "OK" : result === "WARN" ? "WARN" : "FAIL";
  console.log(`[${icon}] ${control}: ${evidence}`);
}

async function storageRequest(key, path, init = {}) {
  return fetch(`${url}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
  });
}

function tinyWebpBuffer() {
  // 1x1 WebP mínimo
  return Buffer.from(
    "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=",
    "base64",
  );
}

async function main() {
  console.log("=== Validación Storage store-products ===\n");

  const bucketRes = await storageRequest(serviceKey, `bucket/${BUCKET}`);
  if (!bucketRes.ok) {
    record("Bucket existe", "FAIL", `HTTP ${bucketRes.status}`);
    printSummary();
    process.exit(1);
  }

  const bucket = await bucketRes.json();
  record("Bucket existe", "OK", BUCKET);
  record(
    "Lectura pública (bucket.public)",
    bucket.public ? "OK" : "FAIL",
    String(bucket.public),
  );
  record(
    "MIME permitidos",
    bucket.allowed_mime_types?.includes("image/webp") ? "OK" : "WARN",
    (bucket.allowed_mime_types ?? []).join(", ") || "sin restricción",
  );
  record(
    "Tamaño máximo",
    bucket.file_size_limit === 5242880 ? "OK" : "WARN",
    `${bucket.file_size_limit ?? "n/a"} bytes`,
  );

  const products = await fetch(
    `${url}/rest/v1/store_products?select=slug,main_image_url&slug=like.clics-modernos-*&is_active=eq.true`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  ).then((r) => r.json());

  const sampleUrl = products?.find((p) => p.main_image_url)?.main_image_url ?? null;
  if (sampleUrl) {
    const head = await fetch(sampleUrl, { method: "HEAD" });
    record(
      "Lectura pública imagen CLICS",
      head.ok ? "OK" : "FAIL",
      `HTTP ${head.status}`,
    );
  } else {
    record("Lectura pública imagen CLICS", "WARN", "Sin URL de muestra");
  }

  const testPath = `__storage-tests__/TEST-storage-admin-${randomUUID()}.webp`;
  const body = tinyWebpBuffer();

  const anonUpload = await storageRequest(anonKey, `object/${BUCKET}/${testPath}`, {
    method: "POST",
    headers: { "Content-Type": "image/webp", "x-upsert": "true" },
    body,
  });
  record(
    "Anon upload bloqueado",
    !anonUpload.ok ? "OK" : "FAIL",
    `HTTP ${anonUpload.status}`,
  );

  if (anonUpload.ok) {
    await storageRequest(serviceKey, `object/${BUCKET}/${testPath}`, { method: "DELETE" });
  }

  const serviceUpload = await storageRequest(serviceKey, `object/${BUCKET}/${testPath}`, {
    method: "POST",
    headers: { "Content-Type": "image/webp", "x-upsert": "true" },
    body,
  });
  record(
    "Service role upload (bypass RLS)",
    serviceUpload.ok ? "OK" : "FAIL",
    `HTTP ${serviceUpload.status}`,
  );

  if (serviceUpload.ok) {
    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${testPath}`;
    const publicHead = await fetch(publicUrl, { method: "HEAD" });
    record(
      "Lectura pública archivo TEST",
      publicHead.ok ? "OK" : "FAIL",
      `HTTP ${publicHead.status}`,
    );

    const serviceDelete = await storageRequest(serviceKey, `object/${BUCKET}/${testPath}`, {
      method: "DELETE",
    });
    record(
      "Service role delete TEST",
      serviceDelete.ok ? "OK" : "FAIL",
      `HTTP ${serviceDelete.status}`,
    );
  }

  const policyProbe = await fetch(
    `${url}/rest/v1/rpc/is_admin`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  );
  record(
    "Función is_admin expuesta",
    policyProbe.status === 404 || policyProbe.status === 401 ? "OK" : "WARN",
    `HTTP ${policyProbe.status} (no debe ser invocable por anon)`,
  );

  printSummary();
  const failures = results.filter((r) => r.result === "FAIL").length;
  process.exit(failures > 0 ? 1 : 0);
}

function printSummary() {
  console.log("\n=== Resumen ===");
  const ok = results.filter((r) => r.result === "OK").length;
  const fail = results.filter((r) => r.result === "FAIL").length;
  const warn = results.filter((r) => r.result === "WARN").length;
  console.log(`OK: ${ok} | WARN: ${warn} | FAIL: ${fail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
