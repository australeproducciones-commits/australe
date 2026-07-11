#!/usr/bin/env node
/**
 * Validación Etapa 2 — hub admin de productos (estructura + CLICS no destructivo).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCiEnv } from "./lib/ci-env.mjs";

const root = process.cwd();
const errors = [];
let passed = 0;

function ok(msg, detail = "") {
  passed += 1;
  console.log(`OK  ${msg}${detail ? ` — ${detail}` : ""}`);
}

function fail(msg) {
  errors.push(msg);
  console.error(`FAIL ${msg}`);
}

const required = [
  "components/store/admin/AdminStoreProductHubForm.tsx",
  "components/store/admin/AdminStoreProductVariantsSection.tsx",
  "components/store/admin/AdminStoreProductEventsSection.tsx",
  "components/store/admin/AdminEventStoreMerchPanel.tsx",
  "lib/store/adminHub.ts",
];

for (const file of required) {
  if (!existsSync(join(root, file))) {
    fail(`Falta archivo: ${file}`);
  } else {
    ok(`archivo`, file);
  }
}

const actions = readFileSync(join(root, "lib/store/actions.ts"), "utf8");
for (const fn of [
  "updateEventStoreProductAction",
  "deactivateEventStoreProductAction",
  "adjustStoreStockAction",
]) {
  if (actions.includes(fn)) {
    ok(`action`, fn);
  } else {
    fail(`action faltante ${fn}`);
  }
}

const queries = readFileSync(join(root, "lib/store/queries.ts"), "utf8");
if (queries.includes("getStoreAdminProductsPageData")) {
  ok("query", "getStoreAdminProductsPageData");
} else {
  fail("query getStoreAdminProductsPageData");
}

const variantAction = actions.includes("stock_total: 0");
if (variantAction && actions.includes("store_adjust_stock")) {
  ok("variantes", "stock inicial vía RPC");
} else {
  fail("variantes sin stock auditado");
}

async function verifyClicsRemote() {
  const env = loadCiEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    ok("CLICS remoto", "SKIP sin credenciales");
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const productsRes = await fetch(
    `${url}/rest/v1/store_products?select=slug,show_in_store,public_price,community_price,main_image_url&slug=like.clics-modernos-*&status=eq.active&is_active=eq.true`,
    { headers },
  );
  const products = await productsRes.json();
  if (!Array.isArray(products) || products.length < 3) {
    fail(`CLICS activos esperados >=3, got ${products?.length ?? 0}`);
    return;
  }
  ok("CLICS activos", String(products.length));

  for (const product of products) {
    if (product.show_in_store !== true) {
      fail(`${product.slug} show_in_store debe ser true`);
    }
    if (Number(product.public_price) !== 55000) {
      fail(`${product.slug} precio público alterado`);
    } else {
      ok(`${product.slug}`, "precio intacto");
    }

    const variantsRes = await fetch(
      `${url}/rest/v1/store_product_variants?select=size,stock_total,is_active&product_id=eq.${(await fetch(`${url}/rest/v1/store_products?select=id&slug=eq.${product.slug}`, { headers }).then((r) => r.json()))[0]?.id}`,
      { headers },
    );
    const variants = await variantsRes.json();
    const activeSizes = (variants ?? []).filter((v) => v.is_active).map((v) => v.size);
    if (activeSizes.length < 5) {
      fail(`${product.slug} variantes insuficientes`);
    } else {
      ok(`${product.slug} talles`, activeSizes.join(","));
    }

    if (product.main_image_url) {
      const img = await fetch(product.main_image_url, { method: "HEAD" });
      if (img.status === 200) {
        ok(`${product.slug} imagen`, "HTTP 200");
      } else {
        fail(`${product.slug} imagen HTTP ${img.status}`);
      }
    }
  }
}

await verifyClicsRemote();

console.log(`\n=== Resumen: ${passed} OK, ${errors.length} FAIL ===`);
process.exit(errors.length > 0 ? 1 : 0);
