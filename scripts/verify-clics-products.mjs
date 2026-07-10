#!/usr/bin/env node
import { loadCiEnv } from "./lib/ci-env.mjs";

const env = loadCiEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const products = await fetch(
  `${url}/rest/v1/store_products?select=name,slug,public_price,stock_total,main_image_url,is_active&slug=like.clics-modernos*&order=slug`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
).then((r) => r.json());

for (const p of products) {
  let imageOk = "sin imagen";
  if (p.main_image_url) {
    const img = await fetch(p.main_image_url, { method: "HEAD" });
    imageOk = img.ok ? "imagen OK" : `imagen HTTP ${img.status}`;
  }
  console.log(`${p.slug} | activo=${p.is_active} | $${p.public_price} | stock=${p.stock_total} | ${imageOk}`);
}
