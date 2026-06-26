/**
 * Validación ETAPA J1 — eventos varios días, promociones hero y galerías.
 * Uso: node scripts/validate-event-lifecycle-galleries.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const env = {
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables Supabase en .env.local");
  process.exit(1);
}

const RUN_ID = Date.now().toString(36);
const PREFIX = `J1-${RUN_ID}`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;
const state = { eventIds: [], galleryIds: [], authUserIds: [] };

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function bad(name, detail = "") {
  failed++;
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function pastDate(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function futureDate(daysAhead) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function createEvent(payload) {
  const { data, error } = await admin.from("events").insert(payload).select("id, slug").single();
  if (error) throw new Error(error.message);
  state.eventIds.push(data.id);
  return data;
}

async function cleanup() {
  for (const id of state.galleryIds) {
    await admin.from("event_gallery_items").delete().eq("id", id);
  }
  for (const id of state.eventIds) {
    await admin.from("event_gallery_items").delete().eq("event_id", id);
    await admin.from("events").delete().eq("id", id);
  }
  for (const id of state.authUserIds) {
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

async function main() {
  console.log(`\n=== J1 validate event lifecycle & galleries (${RUN_ID}) ===\n`);

  try {
    const { error: schemaErr } = await admin.from("events").select("content_kind, event_end_date").limit(1);
    if (schemaErr?.code === "42703") {
      bad("esquema migrado", "Aplicar 20260627120000_event_lifecycle_and_galleries.sql primero");
      return;
    }
    ok("esquema migrado");

    const oneDay = await createEvent({
      name: `${PREFIX} un dia`,
      slug: `${PREFIX}-un-dia`,
      content_kind: "event",
      event_date: futureDate(10),
      event_end_date: null,
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: true,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    ok("evento de un día");

    const multiDay = await createEvent({
      name: `${PREFIX} varios dias`,
      slug: `${PREFIX}-varios-dias`,
      content_kind: "event",
      event_date: futureDate(12),
      event_end_date: futureDate(14),
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: true,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    ok("evento de varios días");

    const { error: badEnd } = await admin.from("events").insert({
      name: `${PREFIX} bad end`,
      slug: `${PREFIX}-bad-end`,
      content_kind: "event",
      event_date: futureDate(5),
      event_end_date: pastDate(1),
      status: "draft",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    if (badEnd) ok("fecha final anterior rechazada");
    else bad("fecha final anterior rechazada");

    const { error: noDate } = await admin.from("events").insert({
      name: `${PREFIX} sin fecha`,
      slug: `${PREFIX}-sin-fecha`,
      content_kind: "event",
      event_date: null,
      status: "draft",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    if (noDate) ok("evento sin fecha rechazado");
    else bad("evento sin fecha rechazado");

    const promo = await createEvent({
      name: `${PREFIX} promo`,
      slug: `${PREFIX}-promo`,
      content_kind: "promotion",
      event_date: null,
      banner_url: "https://example.com/banner.jpg",
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: true,
      home_order: 0,
    });
    ok("promoción sin fecha aceptada");

    const finished = await createEvent({
      name: `${PREFIX} finalizado`,
      slug: `${PREFIX}-finalizado`,
      content_kind: "event",
      event_date: pastDate(5),
      event_end_date: pastDate(3),
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: true,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    ok("evento finalizado fixture");

    const { data: galleryItem, error: galleryErr } = await admin
      .from("event_gallery_items")
      .insert({
        event_id: finished.id,
        media_type: "youtube",
        media_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        sort_order: 0,
        is_published: true,
      })
      .select("id")
      .single();

    if (!galleryErr && galleryItem) {
      state.galleryIds.push(galleryItem.id);
      ok("video YouTube en galería");
    } else bad("video YouTube", galleryErr?.message);

    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { count: anonWrite } = await anon
      .from("event_gallery_items")
      .select("id", { count: "exact", head: true });
    void anonWrite;
    const { error: anonInsert } = await anon.from("event_gallery_items").insert({
      event_id: finished.id,
      media_type: "image",
      media_url: "https://example.com/x.jpg",
      sort_order: 0,
      is_published: true,
    });
    if (anonInsert) ok("anon no puede administrar galería");
    else bad("anon no puede administrar galería");

    void oneDay;
    void multiDay;
    void promo;
    void finished;
  } finally {
    console.log("\n--- Limpieza ---");
    await cleanup();
    ok("cleanup completo");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
