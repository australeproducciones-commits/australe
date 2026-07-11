#!/usr/bin/env node
/**
 * Validación estructural del Hero configurable de la tienda.
 * Ejecutar: node scripts/validate-store-hero-settings.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function check(path, label) {
  const full = join(root, path);
  if (!existsSync(full)) {
    errors.push(`Falta ${label}: ${path}`);
  }
}

const requiredFiles = [
  ["supabase/migrations/20260711040000_store_settings_hero.sql", "migración store_settings"],
  ["lib/store/settings/types.ts", "tipos hero"],
  ["lib/store/settings/constants.ts", "defaults hero"],
  ["lib/store/settings/utils.ts", "utilidades hero"],
  ["lib/store/settings/queries.ts", "queries hero"],
  ["lib/store/settings/actions.ts", "actions hero"],
  ["components/store/StoreHomeHero.tsx", "hero público"],
  ["components/store/StoreHeroImage.tsx", "imagen hero"],
  ["components/store/admin/AdminStoreHeroSettingsPanel.tsx", "panel admin hero"],
  ["app/admin/configuracion/tienda/hero/page.tsx", "ruta admin hero"],
  ["components/site/AdminConfigNav.tsx", "nav configuración"],
];

for (const [path, label] of requiredFiles) {
  check(path, label);
}

const migration = readFileSync(
  join(root, "supabase/migrations/20260711040000_store_settings_hero.sql"),
  "utf8",
);

const migrationChecks = [
  ["CREATE TABLE IF NOT EXISTS public.store_settings", "tabla store_settings"],
  ["hero_enabled", "columna hero_enabled"],
  ["hero_desktop_image_url", "columna hero_desktop_image_url"],
  ["hero_mobile_image_url", "columna hero_mobile_image_url"],
  ["ON CONFLICT (id) DO NOTHING", "seed idempotente"],
  ["store_settings_public_read", "RLS lectura pública"],
  ["store_settings_admin_write", "RLS escritura admin"],
  ["is_admin()", "validación admin"],
];

for (const [needle, label] of migrationChecks) {
  if (!migration.includes(needle)) {
    errors.push(`Migración hero: falta ${label}`);
  }
}

const tiendaPage = readFileSync(join(root, "app/(public)/tienda/page.tsx"), "utf8");
if (!tiendaPage.includes("getStoreHeroSettings")) {
  errors.push("La tienda pública no consulta getStoreHeroSettings.");
}
if (tiendaPage.includes("pickStoreHeroImage")) {
  errors.push("La tienda pública aún depende de pickStoreHeroImage.");
}

const heroComponent = readFileSync(
  join(root, "components/store/StoreHomeHero.tsx"),
  "utf8",
);
if (!heroComponent.includes("settings.hero_enabled")) {
  errors.push("StoreHomeHero no respeta hero_enabled.");
}
if (!heroComponent.includes("StoreHeroImage")) {
  errors.push("StoreHomeHero no usa StoreHeroImage.");
}

const cacheTags = readFileSync(join(root, "lib/supabase/cacheTags.ts"), "utf8");
if (!cacheTags.includes("storeSettings")) {
  errors.push("Falta CACHE_TAGS.storeSettings.");
}

if (errors.length > 0) {
  console.error("validate-store-hero-settings: falló\n");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("validate-store-hero-settings: OK");
