#!/usr/bin/env node
/**
 * Validación de persistencia de URLs de imagen en productos de tienda.
 * Ejecutar: node scripts/validate-store-product-image-urls.mjs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const imageFields = read("components/store/admin/AdminStoreProductImageFields.tsx");
const actions = read("lib/store/actions.ts");
const utils = read("lib/store/utils.ts");
const hubForm = read("components/store/admin/AdminStoreProductHubForm.tsx");

assert(!imageFields.includes("uploadStoreProductImageAction"), "UI sin upload de archivos");
assert(imageFields.includes('type="url"'), "input URL principal");
assert(imageFields.includes("isValidStoreImageUrl"), "validación cliente");
assert(imageFields.includes("Vista previa"), "preview de imagen");

assert(utils.includes("normalizeStoreImageUrl"), "helper normalizeStoreImageUrl");
assert(utils.includes("normalizeStoreGalleryUrls"), "helper normalizeStoreGalleryUrls");
assert(utils.includes("validateStoreProductImages"), "helper validateStoreProductImages");

assert(actions.includes("validateStoreProductImages"), "validación servidor en upsert");
assert(actions.includes("normalizeStoreImageUrl"), "normalización servidor main_image_url");
assert(actions.includes("ROUTES.tiendaProducto"), "revalidate ficha pública");

assert(hubForm.includes("handleSaveImages"), "guardado dedicado en pestaña Imágenes");
assert(hubForm.includes("main_image_url: mainImageUrl"), "payload incluye main_image_url");

if (errors.length > 0) {
  console.error("validate-store-product-image-urls: FALLÓ");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("validate-store-product-image-urls: OK");
