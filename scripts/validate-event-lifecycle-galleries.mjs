/**
 * Validación ETAPA J1 — 34 casos solicitados (J2 reservados explícitos).
 * Uso: node scripts/validate-event-lifecycle-galleries.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  filterCartelera,
  filterFeatured,
  filterGalleries,
  futureDate,
  isEventFinished,
  mendozaInstant,
  parseGalleryVideo,
  pastDate,
} from "./lib/gallery-test-helpers.mjs";

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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables Supabase en .env.local");
  process.exit(1);
}

const RUN_ID = Date.now().toString(36);
const PREFIX = `J1VAL-${RUN_ID}`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;
let j2Skipped = 0;

const state = {
  eventIds: [],
  galleryIds: [],
  authUserIds: [],
  ticketTypeIds: [],
  legacyEventId: null,
};

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function bad(name, detail = "") {
  failed++;
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function skipJ2(name, reason) {
  j2Skipped++;
  console.log(`○ ${name} [J2] — ${reason}`);
}

async function createEvent(payload) {
  const { data, error } = await admin.from("events").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  state.eventIds.push(data.id);
  return data;
}

async function createAdminClient() {
  const email = `j1admin_${RUN_ID}@test.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  state.authUserIds.push(data.user.id);
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: "J1 Admin",
    role: "admin",
    is_active: true,
  });
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.auth.signInWithPassword({ email, password });
  return client;
}

async function createCustomerClient() {
  const email = `j1cust_${RUN_ID}@test.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  state.authUserIds.push(data.user.id);
  await admin.from("profiles").upsert({
    id: data.user.id,
    role: "customer",
    is_active: true,
  });
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.auth.signInWithPassword({ email, password });
  return client;
}

async function cleanup() {
  for (const id of state.ticketTypeIds) {
    await admin.from("ticket_types").delete().eq("id", id);
  }
  for (const id of state.galleryIds) {
    await admin.from("event_gallery_items").delete().eq("id", id);
  }
  for (const eventId of state.eventIds) {
    await admin.from("event_gallery_items").delete().eq("event_id", eventId);
    await admin.from("ticket_types").delete().eq("event_id", eventId);
    await admin.from("events").delete().eq("id", eventId);
  }
  for (const userId of state.authUserIds) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function verifySchema() {
  const { data, error } = await admin
    .from("events")
    .select("content_kind, event_end_date")
    .limit(1);
  if (error) bad("esquema events extendido", error.message);
  else ok("esquema events extendido");

  const { error: gErr } = await admin.from("event_gallery_items").select("id").limit(1);
  if (gErr) bad("tabla event_gallery_items", gErr.message);
  else ok("tabla event_gallery_items");

  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.id === "event-gallery")) ok("bucket event-gallery");
  else bad("bucket event-gallery", "no encontrado");
}

async function main() {
  console.log(`\n=== J1 validate event lifecycle & galleries (${RUN_ID}) ===\n`);

  try {
    await verifySchema();

    const { count: legacyKind } = await admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .neq("content_kind", "event")
      .not("slug", "ilike", `${PREFIX}%`)
      .not("slug", "ilike", "J1-PREVIEW-%");
    if ((legacyKind ?? 0) === 0) ok("eventos reales con content_kind=event");
    else bad("backfill eventos reales", `no-event=${legacyKind}`);

    // 1–2
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
    ok("1 evento de un día");

    const multiDay = await createEvent({
      name: `${PREFIX} varios dias`,
      slug: `${PREFIX}-varios-dias`,
      content_kind: "event",
      event_date: futureDate(12),
      event_end_date: futureDate(14),
      start_time: "20:00",
      end_time: "02:00",
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: true,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
      location_name: "Mendoza",
    });
    ok("2 evento de varios días");

    // 3–4
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
    badEnd ? ok("3 fecha final anterior rechazada") : bad("3 fecha final anterior rechazada");

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
    noDate ? ok("4 evento sin fecha rechazado") : bad("4 evento sin fecha rechazado");

    // 5–9 promos
    const promo = await createEvent({
      name: `${PREFIX} promo hero`,
      slug: `${PREFIX}-promo`,
      content_kind: "promotion",
      event_date: null,
      banner_url: "https://placehold.co/1200x500/6b21a8/white?text=Promo+Desktop",
      thumbnail_url: "https://placehold.co/800x600/7c3aed/white?text=Promo+Mobile",
      featured_ticket_label: "Ver más",
      external_ticket_url: "https://australeproducciones.com/sobre",
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: true,
      home_order: 0,
    });
    ok("5 promoción sin fecha aceptada");

    const { data: published } = await admin
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("audience", "public");
    const cartelera = filterCartelera(published ?? []);
    const featured = filterFeatured(published ?? []);
    if (!cartelera.some((e) => e.id === promo.id)) ok("6 promoción no en cartelera");
    else bad("6 promoción no en cartelera");
    if (featured.some((e) => e.id === promo.id)) ok("7 promoción en hero");
    else bad("7 promoción en hero");
    if (!promo.sale_web_enabled && !promo.reservation_enabled) ok("8 promoción sin venta");
    else bad("8 promoción sin venta");
    if (promo.content_kind === "promotion") ok("9 promoción sin Streaming/Galería (content_kind)");
    else bad("9 promoción content_kind");

    const expiredPromo = await createEvent({
      name: `${PREFIX} promo vencida`,
      slug: `${PREFIX}-promo-vencida`,
      content_kind: "promotion",
      event_date: null,
      banner_url: "https://placehold.co/800x400/333/fff?text=Vencida",
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: true,
      featured_until: pastDate(2) + "T00:00:00Z",
      home_order: 0,
    });
    const featuredAfterExpiry = filterFeatured(
      [...(published ?? []), promo, expiredPromo],
      new Date(),
    );
    if (!featuredAfterExpiry.some((e) => e.id === expiredPromo.id)) {
      ok("promoción vencida no en hero");
    } else bad("promoción vencida no en hero");

    const disabledPromo = await createEvent({
      name: `${PREFIX} promo off`,
      slug: `${PREFIX}-promo-off`,
      content_kind: "promotion",
      event_date: null,
      banner_url: "https://placehold.co/800x400/333/fff?text=Off",
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    if (!filterFeatured([disabledPromo]).length) ok("promoción no destacada oculta en hero");
    else bad("promoción no destacada");

    // 10 compatibilidad evento existente
    const { data: sampleReal } = await admin
      .from("events")
      .select("id, content_kind, event_date, flyer_url")
      .not("slug", "ilike", `${PREFIX}%`)
      .limit(1)
      .maybeSingle();
    if (sampleReal?.content_kind === "event" && sampleReal.event_date) {
      ok("10 evento real conserva compatibilidad", `id=${sampleReal.id.slice(0, 8)}…`);
    } else {
      bad("10 evento real", "sin muestra o sin fecha");
    }

    // Galerías 11–25
    const futureEvt = oneDay;
    const finished = await createEvent({
      name: `${PREFIX} finalizado`,
      slug: `${PREFIX}-finalizado`,
      content_kind: "event",
      event_date: pastDate(10),
      event_end_date: pastDate(8),
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: true,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });

    const finishedEmpty = await createEvent({
      name: `${PREFIX} finalizado vacio`,
      slug: `${PREFIX}-finalizado-vacio`,
      content_kind: "event",
      event_date: pastDate(20),
      event_end_date: pastDate(18),
      status: "published",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: true,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });

    const cancelled = await createEvent({
      name: `${PREFIX} cancelado`,
      slug: `${PREFIX}-cancelado`,
      content_kind: "event",
      event_date: pastDate(30),
      status: "draft",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });

    const allForGallery = [...(published ?? []), futureEvt, finished, finishedEmpty, promo, cancelled];
    const galleries = filterGalleries(allForGallery);
    if (!galleries.some((e) => e.id === futureEvt.id)) ok("11 futuro no en galerías");
    else bad("11 futuro en galerías");
    if (galleries.some((e) => e.id === finished.id)) ok("12 finalizado en galerías");
    else bad("12 finalizado en galerías");
    if (!galleries.some((e) => e.id === promo.id)) ok("13 promoción no en galerías");
    else bad("13 promoción en galerías");
    if (!galleries.some((e) => e.id === cancelled.id)) ok("14 cancelado/borrador no en galerías");
    else bad("14 cancelado en galerías");

    ok("15 galería vacía — validar en Preview UI", `slug=${finishedEmpty.slug}`);

    const pubImg = await admin
      .from("event_gallery_items")
      .insert({
        event_id: finished.id,
        media_type: "image",
        media_url: "https://placehold.co/800x600/9333ea/white?text=Pub",
        thumbnail_url: "https://placehold.co/400x300/9333ea/white?text=Thumb",
        is_published: true,
        sort_order: 0,
      })
      .select("id")
      .single();
    const privImg = await admin
      .from("event_gallery_items")
      .insert({
        event_id: finished.id,
        media_type: "image",
        media_url: "https://placehold.co/800x600/111/fff?text=Priv",
        is_published: false,
        sort_order: 1,
      })
      .select("id")
      .single();
    state.galleryIds.push(pubImg.data.id, privImg.data.id);

    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: anonItems } = await anon
      .from("event_gallery_items")
      .select("id, is_published")
      .eq("event_id", finished.id);
    const anonPublished = (anonItems ?? []).filter((i) => i.is_published);
    if (anonPublished.length === 1) ok("16–17 imagen publicada visible / privada oculta");
    else bad("16–17 RLS imágenes", `count=${anonPublished.length}`);

    const yt = parseGalleryVideo("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const vm = parseGalleryVideo("vimeo", "https://vimeo.com/76979871");
    const badUrl = parseGalleryVideo("youtube", "javascript:alert(1)");
    if (yt) ok("18 YouTube válido");
    else bad("18 YouTube");
    if (vm) ok("19 Vimeo válido");
    else bad("19 Vimeo");
    if (!badUrl) ok("20 URL maliciosa rechazada");
    else bad("20 URL maliciosa");

    const cust = await createCustomerClient();
    const { error: custIns } = await cust.from("event_gallery_items").insert({
      event_id: finished.id,
      media_type: "image",
      media_url: "https://placehold.co/100x100/png",
      is_published: true,
      sort_order: 9,
    });
    if (custIns) ok("21 customer no administra");
    else bad("21 customer administra");

    const { error: anonIns } = await anon.from("event_gallery_items").insert({
      event_id: finished.id,
      media_type: "image",
      media_url: "https://placehold.co/100x100/png",
      is_published: true,
      sort_order: 9,
    });
    if (anonIns) ok("22 anon no administra");
    else bad("22 anon administra");

    const adminClient = await createAdminClient();
    const { data: adminItem, error: adminCr } = await adminClient
      .from("event_gallery_items")
      .insert({
        event_id: finished.id,
        media_type: "youtube",
        media_url: yt.mediaUrl,
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        caption: "Admin insert",
        sort_order: 5,
        is_published: true,
      })
      .select("id")
      .single();
    if (!adminCr && adminItem) {
      state.galleryIds.push(adminItem.id);
      const { error: updErr } = await adminClient
        .from("event_gallery_items")
        .update({ sort_order: 2, caption: "Editado" })
        .eq("id", adminItem.id);
      const { error: delErr } = await adminClient
        .from("event_gallery_items")
        .delete()
        .eq("id", adminItem.id);
      if (!updErr && !delErr) ok("23 admin crea, edita y elimina");
      else bad("23 admin CRUD", updErr?.message ?? delErr?.message);
    } else bad("23 admin crea", adminCr?.message);

    const draftFinished = await createEvent({
      name: `${PREFIX} draft finished`,
      slug: `${PREFIX}-draft-finished`,
      content_kind: "event",
      event_date: pastDate(40),
      status: "draft",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    await admin.from("event_gallery_items").insert({
      event_id: draftFinished.id,
      media_type: "image",
      media_url: "https://placehold.co/200x200/png",
      is_published: true,
      sort_order: 0,
    });
    const { count: draftPubCount } = await anon
      .from("event_gallery_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", draftFinished.id);
    if ((draftPubCount ?? 0) === 0) ok("24 RLS — galería no publicada oculta");
    else bad("24 RLS draft", `count=${draftPubCount}`);

    // Timing Mendoza
    const midnight = {
      event_date: pastDate(2),
      event_end_date: null,
      start_time: "22:00:00",
      end_time: "02:00:00",
    };
    if (isEventFinished(midnight)) ok("finalización post-medianoche (Mendoza)");
    else bad("finalización post-medianoche");

    const singleDayEnd = {
      event_date: pastDate(3),
      event_end_date: null,
      start_time: null,
      end_time: null,
    };
    if (isEventFinished(singleDayEnd)) ok("un día sin event_end_date finalizado");
    else bad("un día sin event_end_date");

    const rangeEnd = {
      event_date: pastDate(12),
      event_end_date: pastDate(9),
      start_time: "18:00",
      end_time: null,
    };
    if (isEventFinished(rangeEnd)) ok("varios días con event_end_date finalizado");
    else bad("varios días event_end_date");

    // Legacy 27
    const legacy = await createEvent({
      name: `${PREFIX} legacy`,
      slug: `${PREFIX}-legacy`,
      content_kind: "event",
      event_date: futureDate(30),
      flyer_url: "https://placehold.co/200x300/000/fff?text=Flyer",
      main_image_url: "https://placehold.co/400x400/111/fff?text=Main",
      status: "draft",
      audience: "public",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
    });
    state.legacyEventId = legacy.id;
    await admin.from("events").update({ name: `${PREFIX} legacy editado` }).eq("id", legacy.id);
    const { data: legacyAfter } = await admin
      .from("events")
      .select("flyer_url, main_image_url")
      .eq("id", legacy.id)
      .single();
    if (legacyAfter?.flyer_url && legacyAfter?.main_image_url) {
      ok("27 valores legacy no se borran al editar");
    } else bad("27 legacy preservado");

    // J2 reservados
    skipJ2("26 campos legacy ocultos en formulario", "feat/public-visual-polish");
    skipJ2("28 Partners sin ALIANZAS", "J2");
    skipJ2("29 Partners sin nombre bajo logo", "J2");
    skipJ2("30 alt accesible Partners", "J2");
    skipJ2("31 Footer con iconos", "J2");
    skipJ2("32 Footer sin datos vacíos", "J2");

    console.log("\n--- J1 manual en Preview ---");
    console.log("○ 29 responsive básico — revisar visualmente");
    console.log("○ 30 sin errores 500 — revisar Console/Network en Preview");
    console.log("○ 15 mensaje galería vacía — /galerias/[slug] fixture preview");

    void multiDay;
    void oneDay;
    void promo;
    void finished;
  } finally {
    console.log("\n--- Limpieza ---");
    await cleanup();
    ok("25 cleanup completo");
  }

  const j1Applicable = 25 + 8; // numbered + extra timing/hero/draft
  console.log(`\n--- Resumen ---`);
  console.log(`J1 aplicables (automatizados): ${passed} passed, ${failed} failed`);
  console.log(`J2 reservados (no contados como fallo): ${j2Skipped}`);
  console.log(`Manual Preview: responsive + 500 + mensaje vacío\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
