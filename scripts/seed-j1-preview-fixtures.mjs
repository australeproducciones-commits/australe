/**
 * Fixtures visuales temporales para Preview J1.
 * Crear: node scripts/seed-j1-preview-fixtures.mjs
 * Limpiar: node scripts/seed-j1-preview-fixtures.mjs --cleanup
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { futureDate, pastDate } from "./lib/gallery-test-helpers.mjs";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

const env = { ...loadEnvFile(resolve(process.cwd(), ".env.local")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const previewBase =
  env.PREVIEW_BASE_URL ||
  env.VERCEL_URL?.startsWith("http")
    ? env.VERCEL_URL
    : env.VERCEL_URL
      ? `https://${env.VERCEL_URL}`
      : "https://australe-git-feat-event-lifecycle-and-galleries-australe.vercel.app";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const PREFIX = "J1-PREVIEW";
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DESKTOP_BANNER = "https://placehold.co/1600x600/5b21b6/ffffff?text=Australe+Desktop";
const MOBILE_BANNER = "https://placehold.co/900x1200/7c3aed/ffffff?text=Australe+Mobile";

async function cleanupFixtures() {
  const { data: events } = await admin
    .from("events")
    .select("id, slug")
    .ilike("slug", `${PREFIX.toLowerCase()}%`);

  for (const event of events ?? []) {
    await admin.from("event_gallery_items").delete().eq("event_id", event.id);
    await admin.from("events").delete().eq("id", event.id);
  }
  console.log(`Cleanup: ${events?.length ?? 0} eventos ${PREFIX} eliminados`);
}

async function upsertFixture(row) {
  const { data: existing } = await admin
    .from("events")
    .select("id")
    .eq("slug", row.slug)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("events")
      .update(row)
      .eq("id", existing.id)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await admin.from("events").insert(row).select("id, slug").single();
  if (error) throw new Error(error.message);
  return data;
}

async function main() {
  if (process.argv.includes("--cleanup")) {
    await cleanupFixtures();
    return;
  }

  const promo = await upsertFixture({
    name: "[J1 Preview] Promoción hero sin fecha",
    slug: `${PREFIX}-promo-hero`,
    description: "Fixture temporal ETAPA J1 — promoción destacada.",
    content_kind: "promotion",
    event_date: null,
    banner_url: DESKTOP_BANNER,
    thumbnail_url: MOBILE_BANNER,
    featured_ticket_label: "Descubrir más",
    external_ticket_url: "https://australeproducciones.com/sobre",
    status: "published",
    audience: "public",
    ticket_sale_mode: "internal",
    sale_web_enabled: false,
    reservation_enabled: false,
    is_featured: true,
    home_order: 0,
  });

  const multi = await upsertFixture({
    name: "[J1 Preview] Festival de varios días",
    slug: `${PREFIX}-multidia`,
    description: "Evento futuro de varios días para revisar cartelera y detalle.",
    content_kind: "event",
    event_date: futureDate(14),
    event_end_date: futureDate(16),
    start_time: "20:00",
    end_time: "02:00",
    location_name: "Teatro Mendoza",
    address: "Mendoza, Argentina",
    banner_url: DESKTOP_BANNER,
    thumbnail_url: MOBILE_BANNER,
    status: "published",
    audience: "public",
    ticket_sale_mode: "internal",
    sale_web_enabled: true,
    reservation_enabled: true,
    is_featured: false,
    home_order: 0,
  });

  const emptyGallery = await upsertFixture({
    name: "[J1 Preview] Evento finalizado sin fotos",
    slug: `${PREFIX}-galeria-vacia`,
    description: "Debe mostrar mensaje de galería vacía.",
    content_kind: "event",
    event_date: pastDate(14),
    event_end_date: pastDate(12),
    location_name: "Espacio Australe",
    banner_url: DESKTOP_BANNER,
    status: "published",
    audience: "public",
    ticket_sale_mode: "internal",
    sale_web_enabled: true,
    reservation_enabled: false,
    is_featured: false,
    home_order: 0,
  });

  const fullGallery = await upsertFixture({
    name: "[J1 Preview] Evento finalizado con galería",
    slug: `${PREFIX}-galeria-completa`,
    description: "Imágenes + YouTube + Vimeo.",
    content_kind: "event",
    event_date: pastDate(20),
    event_end_date: pastDate(18),
    location_name: "Salón Central",
    banner_url: DESKTOP_BANNER,
    thumbnail_url: MOBILE_BANNER,
    status: "published",
    audience: "public",
    ticket_sale_mode: "internal",
    sale_web_enabled: true,
    reservation_enabled: false,
    is_featured: false,
    home_order: 0,
  });

  await admin.from("event_gallery_items").delete().eq("event_id", fullGallery.id);
  await admin.from("event_gallery_items").insert([
    {
      event_id: fullGallery.id,
      media_type: "image",
      media_url: "https://placehold.co/1200x800/9333ea/ffffff?text=Foto+1",
      thumbnail_url: "https://placehold.co/600x400/9333ea/ffffff?text=Foto+1",
      caption: "Apertura del evento",
      sort_order: 0,
      is_published: true,
    },
    {
      event_id: fullGallery.id,
      media_type: "image",
      media_url: "https://placehold.co/1200x800/6d28d9/ffffff?text=Foto+2",
      thumbnail_url: "https://placehold.co/600x400/6d28d9/ffffff?text=Foto+2",
      caption: "Público",
      sort_order: 1,
      is_published: true,
    },
    {
      event_id: fullGallery.id,
      media_type: "image",
      media_url: "https://placehold.co/1200x800/4c1d95/ffffff?text=Foto+3",
      thumbnail_url: "https://placehold.co/600x400/4c1d95/ffffff?text=Foto+3",
      caption: "Cierre",
      sort_order: 2,
      is_published: true,
    },
    {
      event_id: fullGallery.id,
      media_type: "youtube",
      media_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      caption: "Resumen en YouTube",
      sort_order: 3,
      is_published: true,
    },
    {
      event_id: fullGallery.id,
      media_type: "vimeo",
      media_url: "https://vimeo.com/76979871",
      caption: "Clip en Vimeo",
      sort_order: 4,
      is_published: true,
    },
  ]);

  const manifest = {
    prefix: PREFIX,
    previewBase,
    fixtures: {
      promoHero: { slug: promo.slug, urls: { home: `${previewBase}/` } },
      multiDay: {
        slug: multi.slug,
        urls: {
          eventos: `${previewBase}/eventos`,
          detalle: `${previewBase}/eventos/${multi.slug}`,
          admin: `${previewBase}/admin/eventos/${multi.id}`,
        },
      },
      galleryEmpty: {
        slug: emptyGallery.slug,
        urls: {
          galerias: `${previewBase}/galerias`,
          detalle: `${previewBase}/galerias/${emptyGallery.slug}`,
        },
      },
      galleryFull: {
        slug: fullGallery.slug,
        urls: {
          detalle: `${previewBase}/galerias/${fullGallery.slug}`,
          adminGaleria: `${previewBase}/admin/eventos/${fullGallery.id}/galeria`,
        },
      },
    },
    cleanup: "node scripts/seed-j1-preview-fixtures.mjs --cleanup",
  };

  const outPath = resolve(process.cwd(), "scripts/.j1-preview-manifest.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log("\n=== Fixtures J1 Preview creados ===\n");
  console.log(JSON.stringify(manifest, null, 2));
  console.log(`\nManifiesto: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
