#!/usr/bin/env node
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
const key = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");

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
