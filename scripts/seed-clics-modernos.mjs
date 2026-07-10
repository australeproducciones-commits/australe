#!/usr/bin/env node
/**
 * Carga/actualiza productos CLICS MODERNOS con imágenes en Supabase Storage.
 * Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso: node scripts/seed-clics-modernos.mjs
 * Aplicar antes la migración 20260710170300_store_products_storage.sql
 */
import { readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "scripts", "assets", "clics-modernos");

const env = readFileSync(join(root, ".env.local"), "utf8");
const get = (name) => {
  const line = env.split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : "";
};

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const SIZES = ["S", "M", "L", "XL", "XXL"];
const STOCK_PER_SIZE = 10;
const PUBLIC_PRICE = 55000;
const COMMUNITY_PRICE = 48000;

const PRODUCTS = [
  {
    slug: "clics-modernos-buzo-blanco",
    name: "CLICS MODERNOS - BUZO BLANCO",
    category: "buzos",
    imageFile: "clics-modernos-1.jpg",
    short_description:
      "Buzo de algodón frisado con diseño estampado en dtf. Talles S a XXL.",
    description:
      'En los diseños estampados se lee "MODERN CLIX".\n\nBuzo de algodón frisado con diseño estampado en dtf.\nTalles desde el S al XXL.',
    is_featured: true,
  },
  {
    slug: "clics-modernos-buzo-negro",
    name: "CLICS MODERNOS - BUZO NEGRO",
    category: "buzos",
    imageFile: "clics-modernos-2.jpg",
    short_description:
      "Buzo de algodón frisado con diseño estampado en dtf. Talles S a XXL.",
    description:
      'En los diseños estampados se lee "MODERN CLIX".\n\nBuzo de algodón frisado con diseño estampado en dtf.\nTalles desde el S al XXL.',
    is_featured: true,
  },
  {
    slug: "clics-modernos-remera-blanca-negra",
    name: "CLICS MODERNOS - REMERA BLANCA/NEGRA",
    category: "remeras",
    imageFile: "clics-modernos-3.jpg",
    short_description:
      "Remera de algodón cardado con diseño estampado en dtf. Talles S a XXL.",
    description:
      'En los diseños estampados se lee "MODERN CLIX".\n\nRemera de algodón cardado con diseño estampado en dtf.\nTalles desde el S al XXL.',
    is_featured: true,
  },
];

async function rest(path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${text}`);
  }

  return data;
}

async function ensureBucket() {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "store-products",
      name: "store-products",
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    }),
  });

  if (response.ok) {
    console.log("Bucket store-products creado.");
    return;
  }

  const text = await response.text();
  if (text.includes("already exists") || text.includes("Duplicate")) {
    console.log("Bucket store-products ya existe.");
    return;
  }

  throw new Error(`No se pudo asegurar el bucket store-products: ${text}`);
}

async function uploadImage(productSlug, filePath) {
  const fileName = basename(filePath);
  const objectPath = `${productSlug}/${fileName}`;
  const buffer = readFileSync(filePath);
  const contentType = fileName.endsWith(".png")
    ? "image/png"
    : fileName.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

  const response = await fetch(
    `${url}/storage/v1/object/store-products/${objectPath}`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed ${objectPath}: ${text}`);
  }

  return `${url}/storage/v1/object/public/store-products/${objectPath}`;
}

async function upsertProduct(definition, imageUrl) {
  const existing = await rest(
    `store_products?select=id,slug&slug=eq.${encodeURIComponent(definition.slug)}`,
  );

  const payload = {
    name: definition.name,
    slug: definition.slug,
    category: definition.category,
    description: definition.description,
    short_description: definition.short_description,
    public_price: PUBLIC_PRICE,
    community_price: COMMUNITY_PRICE,
    main_image_url: imageUrl,
    gallery_urls: [],
    is_active: true,
    is_featured: definition.is_featured,
    community_only: false,
    track_stock: true,
    stock_total: SIZES.length * STOCK_PER_SIZE,
    status: "active",
  };

  if (existing?.[0]?.id) {
    const updated = await rest(`store_products?id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return updated[0];
  }

  const created = await rest("store_products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return created[0];
}

async function ensureVariants(productId, productName) {
  for (let index = 0; index < SIZES.length; index += 1) {
    const size = SIZES[index];
    const variantName = `Talle ${size}`;
    const existing = await rest(
      `store_product_variants?select=id&product_id=eq.${productId}&size=eq.${encodeURIComponent(size)}`,
    );

    const payload = {
      product_id: productId,
      name: variantName,
      size,
      stock_total: STOCK_PER_SIZE,
      is_active: true,
      sort_order: index,
    };

    if (existing?.[0]?.id) {
      await rest(`store_product_variants?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await rest("store_product_variants", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
  }

  console.log(`  Variantes S–XXL OK (${productName})`);
}

async function archiveLegacyProduct() {
  const legacy = await rest(
    "store_products?select=id,slug&slug=eq.clics-modernos",
  );
  if (!legacy?.[0]?.id) {
    return;
  }

  await rest(`store_products?id=eq.${legacy[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: false, status: "archived" }),
  });
  console.log("Producto legacy clics-modernos archivado.");
}

async function main() {
  console.log("Seed CLICS MODERNOS — inicio");
  console.log(`Assets: ${assetsDir}`);
  console.log(`Precio público: $${PUBLIC_PRICE} | Comunidad: $${COMMUNITY_PRICE}`);
  console.log(`Stock por talle: ${STOCK_PER_SIZE} (${SIZES.length} talles)`);

  await ensureBucket();
  await archiveLegacyProduct();

  for (const product of PRODUCTS) {
    const imagePath = join(assetsDir, product.imageFile);
    console.log(`\n→ ${product.name}`);

    const imageUrl = await uploadImage(product.slug, imagePath);
    console.log(`  Imagen: ${product.imageFile}`);

    const saved = await upsertProduct(product, imageUrl);
    console.log(`  Producto: ${saved.slug} (${saved.id})`);

    await ensureVariants(saved.id, product.name);
  }

  console.log("\nSeed CLICS MODERNOS — completado");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
