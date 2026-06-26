/**
 * Fixture temporal para revisión visual de Streaming (ETAPA G).
 * Uso: node scripts/prepare-streaming-visual-fixture.mjs
 * Eliminar: node scripts/prepare-streaming-visual-fixture.mjs --cleanup
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RUN_ID = "visual-review";
const EVENT_SLUG = `stream-visual-${RUN_ID}`;
const EVENT_NAME = `STREAM VISUAL REVIEW — ${RUN_ID.toUpperCase()}`;
const CLEANUP = process.argv.includes("--cleanup");

const PREVIEW_BASE =
  process.env.STREAMING_VISUAL_BASE_URL ??
  process.env.STREAMING_E2E_BASE_URL ??
  "https://australe-pkd30mm8b-australe.vercel.app";

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan variables Supabase en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EVENT_DEFAULTS = {
  event_date: new Date(Date.now() + 14 * 86400000).toISOString(),
  status: "published",
  audience: "public",
  financial_management_status: "open",
  ticket_sale_mode: "internal",
  sale_web_enabled: false,
  external_sale_enabled: false,
  sale_whatsapp_enabled: false,
  reservation_enabled: false,
  is_featured: false,
  home_order: 0,
  sales_qr_enabled: false,
  qr_sell_tickets: false,
  qr_products_enabled: false,
  qr_show_price_list: false,
  qr_sell_products: false,
};

const BANNER_DESKTOP =
  "https://placehold.co/2400x1000/2d1b4e/ffffff?text=Stream+Desktop+12%3A5";
const BANNER_MOBILE =
  "https://placehold.co/1080x1350/4c1d95/ffffff?text=Stream+Mobile+4%3A5";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

async function cleanupFixture() {
  const { data: event } = await admin
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .maybeSingle();

  if (event?.id) {
    await admin.from("event_streams").delete().eq("event_id", event.id);
    await admin.from("events").delete().eq("id", event.id);
    console.log("✓ Fixture eliminado");
  } else {
    console.log("✓ Sin fixture previo");
  }
}

async function main() {
  if (CLEANUP) {
    await cleanupFixture();
    return;
  }

  await cleanupFixture();

  const { data: event, error: eventErr } = await admin
    .from("events")
    .insert({
      ...EVENT_DEFAULTS,
      name: EVENT_NAME,
      slug: EVENT_SLUG,
      description: "Evento temporal para revisión visual del módulo Streaming.",
      location_name: "Australe · Streaming",
    })
    .select("id, slug")
    .single();

  if (eventErr || !event) {
    console.error("Error creando evento:", eventErr?.message);
    process.exit(1);
  }

  const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const streams = [
    {
      event_id: event.id,
      title: "Próxima transmisión — revisión visual",
      subtitle: "Estado programado con countdown y banner",
      is_enabled: true,
      status: "scheduled",
      provider: "youtube",
      stream_url: YOUTUBE_URL,
      starts_at: startsAt,
      access_type: "free",
      stream_banner_url: BANNER_DESKTOP,
      stream_banner_mobile_url: BANNER_MOBILE,
      home_featured: true,
      home_order: 1,
      show_on_streaming_page: true,
      show_on_event_page: true,
      button_label: "Ver detalles",
    },
    {
      event_id: event.id,
      title: "EN VIVO — revisión visual",
      subtitle: "Reproductor YouTube embebido",
      is_enabled: true,
      status: "live",
      provider: "youtube",
      stream_url: YOUTUBE_URL,
      starts_at: new Date().toISOString(),
      access_type: "free",
      stream_banner_url: BANNER_DESKTOP,
      stream_banner_mobile_url: BANNER_MOBILE,
      home_featured: true,
      home_order: 0,
      show_on_streaming_page: true,
      show_on_event_page: true,
      button_label: "Ver transmisión",
    },
  ];

  const { data: created, error: streamErr } = await admin
    .from("event_streams")
    .insert(streams)
    .select("id, title, status");

  if (streamErr || !created?.length) {
    console.error("Error creando streams:", streamErr?.message);
    await admin.from("events").delete().eq("id", event.id);
    process.exit(1);
  }

  const base = PREVIEW_BASE.replace(/\/$/, "");
  console.log("\n=== Fixture visual Streaming listo ===\n");
  console.log(`Evento: ${EVENT_NAME}`);
  console.log(`Slug: ${EVENT_SLUG}`);
  console.log(`Event ID: ${event.id}`);
  console.log(`Streams: ${created.map((s) => `${s.status} (${s.id})`).join(", ")}`);
  console.log("\nURLs para revisar:\n");
  console.log(`Inicio:        ${base}/`);
  console.log(`En vivo:       ${base}/en-vivo`);
  console.log(`Evento:        ${base}/eventos/${EVENT_SLUG}`);
  console.log(`Detalle live:  ${base}/eventos/${EVENT_SLUG}/en-vivo`);
  console.log(`Admin:         ${base}/admin/eventos/${event.id}/streaming`);
  console.log("\nEliminar al terminar:");
  console.log("node scripts/prepare-streaming-visual-fixture.mjs --cleanup\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
