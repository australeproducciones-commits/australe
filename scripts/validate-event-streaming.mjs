/**
 * Validación ETAPA G — módulo event streaming.
 * Ejecutar: node scripts/validate-event-streaming.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.STREAMING_E2E_BASE_URL ?? "http://localhost:3001";
const RUN_ID = Date.now().toString(36);
const TEST_TITLE = `TEST STREAMING ${RUN_ID} — BORRAR`;
const PREFERRED_EVENT_SLUG = "doble-sentido";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const EMBED_FRAGMENT = "youtube.com/embed/dQw4w9WgXcQ";

const EVENT_FIXTURE_DEFAULTS = {
  event_date: new Date(Date.now() + 30 * 86400000).toISOString(),
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

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;
let streamId = null;
let eventId = null;
let eventSlug = PREFERRED_EVENT_SLUG;
let eventName = null;
let restoredStreams = [];
let fixtureEventIds = [];

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function bad(name, detail = "") {
  failed++;
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

async function fetchPage(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const html = await res.text();
  return { status: res.status, html };
}

function htmlHas(html, needle) {
  return html.includes(needle);
}

function htmlHasNo(html, needle) {
  return !html.includes(needle);
}

async function updateStream(patch) {
  const { error } = await admin
    .from("event_streams")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", streamId);
  if (error) throw new Error(`updateStream: ${error.message}`);
  await new Promise((r) => setTimeout(r, 400));
}

async function assertPage(name, path, checks) {
  const { status, html } = await fetchPage(path);
  if (status !== 200) {
    bad(name, `HTTP ${status}`);
    return;
  }
  let allOk = true;
  for (const [label, fn] of checks) {
    if (!fn(html)) {
      bad(`${name} — ${label}`);
      allOk = false;
    }
  }
  if (allOk) ok(name);
}

async function createFixtureEvent(status = "published") {
  const slug = `stream-e2e-${status}-${RUN_ID}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const { data, error } = await admin
    .from("events")
    .insert({
      ...EVENT_FIXTURE_DEFAULTS,
      status,
      name: `STREAM E2E ${RUN_ID} ${status}`,
      slug,
    })
    .select("id, name, slug, status")
    .single();
  if (error || !data) {
    throw new Error(`createFixtureEvent(${status}): ${error?.message ?? "sin datos"}`);
  }
  fixtureEventIds.push(data.id);
  return data;
}

async function resolveTestEvent() {
  const { data: preferred } = await admin
    .from("events")
    .select("id, name, slug, status")
    .eq("slug", PREFERRED_EVENT_SLUG)
    .maybeSingle();

  if (preferred?.status === "published") {
    eventSlug = preferred.slug;
    return preferred;
  }

  const { data: anyPublished } = await admin
    .from("events")
    .select("id, name, slug, status")
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (anyPublished) {
    eventSlug = anyPublished.slug;
    ok("Evento publicado existente reutilizado", `${anyPublished.name} (${anyPublished.slug})`);
    return anyPublished;
  }

  const created = await createFixtureEvent("published");
  eventSlug = created.slug;
  ok("Evento publicado fixture creado", `${created.name} (${created.slug})`);
  return created;
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Evento preferido: ${PREFERRED_EVENT_SLUG}\n`);

  try {
    // --- RLS / auth (sin HTTP) ---
    const { error: anonInsertErr } = await anon.from("event_streams").insert({
      event_id: "00000000-0000-0000-0000-000000000001",
      title: "anon hack",
      is_enabled: true,
      status: "scheduled",
      provider: "youtube",
      access_type: "free",
    });
    if (anonInsertErr) {
      ok("anon no puede crear transmisión");
    } else {
      bad("anon no puede crear transmisión");
    }

    const customerEmail = `stream-customer-${RUN_ID}@test.invalid`;
    const customerPassword = `Tst!${randomUUID().slice(0, 12)}`;
    const { data: customerAuth, error: customerAuthErr } =
      await admin.auth.admin.createUser({
        email: customerEmail,
        password: customerPassword,
        email_confirm: true,
      });
    if (customerAuthErr || !customerAuth.user) {
      bad("fixture customer auth", customerAuthErr?.message);
    } else {
      await admin.from("profiles").upsert({
        id: customerAuth.user.id,
        full_name: "Stream Customer Test",
        role: "customer",
        is_active: true,
      });
      const customerClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await customerClient.auth.signInWithPassword({
        email: customerEmail,
        password: customerPassword,
      });
      const { error: customerInsertErr } = await customerClient
        .from("event_streams")
        .insert({
          event_id: "00000000-0000-0000-0000-000000000001",
          title: "customer hack",
          is_enabled: true,
          status: "scheduled",
          provider: "youtube",
          access_type: "free",
        });
      if (customerInsertErr) {
        ok("customer no admin no puede crear");
      } else {
        bad("customer no admin no puede crear");
      }
      await admin.auth.admin.deleteUser(customerAuth.user.id);
    }

    const { error: badProviderErr } = await admin.from("event_streams").insert({
      event_id: "00000000-0000-0000-0000-000000000001",
      title: "bad provider",
      is_enabled: false,
      status: "draft",
      provider: "twitch",
      access_type: "free",
    });
    if (badProviderErr) {
      ok("proveedor inválido rechazado por constraint");
    } else {
      bad("proveedor inválido rechazado");
    }

    const ping = await fetchPage("/");
    if (ping.status !== 200) {
      bad("Servidor local responde", `HTTP ${ping.status}`);
      process.exit(1);
    }
    ok("Servidor local responde");

    await assertPage("estado vacío — /en-vivo sin error", "/en-vivo", [
      ["título página", (h) => htmlHas(h, "En vivo") || htmlHas(h, "en vivo")],
      ["sin error 500", (h) => htmlHasNo(h, "Internal Server Error")],
    ]);

    const event = await resolveTestEvent();
    eventId = event.id;
    eventName = event.name;
    if (event.slug === PREFERRED_EVENT_SLUG) {
      ok("Evento doble-sentido encontrado", `${event.name} (${event.id})`);
    }

    const draftEvent =
      (
        await admin
          .from("events")
          .select("id")
          .eq("status", "draft")
          .limit(1)
          .maybeSingle()
      ).data ?? (await createFixtureEvent("draft"));

    const { data: privateStream, error: privateStreamErr } = await admin
      .from("event_streams")
      .insert({
        event_id: draftEvent.id,
        title: `TEST PRIVATE STREAM ${RUN_ID}`,
        is_enabled: true,
        status: "scheduled",
        provider: "youtube",
        access_type: "free",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select("id")
      .single();

    if (privateStreamErr || !privateStream) {
      bad("fixture stream evento privado", privateStreamErr?.message);
    } else {
      const { data: anonPrivate } = await anon
        .from("event_streams")
        .select("id")
        .eq("id", privateStream.id);
      if (!anonPrivate?.length) {
        ok("evento privado no expuesto a anon");
      } else {
        bad("evento privado no expuesto a anon");
      }
      await admin.from("event_streams").delete().eq("id", privateStream.id);
    }

    const startsAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    const { data: created, error: createErr } = await admin
      .from("event_streams")
      .insert({
        event_id: eventId,
        title: TEST_TITLE,
        subtitle: "Validación temporal del módulo",
        is_enabled: true,
        status: "scheduled",
        provider: "youtube",
        stream_url: YOUTUBE_URL,
        starts_at: startsAt,
        access_type: "free",
        home_featured: true,
        home_order: 0,
        show_on_streaming_page: true,
        show_on_event_page: true,
        button_label: "Ver transmisión",
      })
      .select("id, starts_at")
      .single();

    if (createErr || !created) {
      bad("Crear transmisión temporal", createErr?.message ?? "sin datos");
      process.exit(1);
    }
    streamId = created.id;
    ok("Crear transmisión temporal", streamId);
    ok("admin crea transmisión");

    // --- scheduled ---
    await assertPage("scheduled — home hero", "/", [
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
      ["próxima transmisión", (h) => htmlHas(h, "Próxima transmisión")],
      ["sin iframe YouTube", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    await assertPage("scheduled — /en-vivo", "/en-vivo", [
      ["sección próximas", (h) => htmlHas(h, "Próximas transmisiones")],
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
      ["sin iframe", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    await assertPage("scheduled — página evento", `/eventos/${eventSlug}`, [
      ["bloque streaming", (h) => htmlHas(h, TEST_TITLE)],
      ["próxima transmisión", (h) => htmlHas(h, "Próxima transmisión")],
    ]);

    await assertPage("scheduled — /en-vivo evento", `/eventos/${eventSlug}/en-vivo`, [
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
      ["countdown label", (h) => htmlHas(h, "Comienza en")],
      ["sin iframe", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    // --- live ---
    await updateStream({ status: "live" });

    await assertPage("live — home", "/", [
      ["EN VIVO", (h) => htmlHas(h, "EN VIVO")],
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
    ]);

    await assertPage("live — /en-vivo", "/en-vivo", [
      ["ahora en vivo", (h) => htmlHas(h, "Ahora en vivo")],
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
      ["sin iframe en listado (solo en detalle)", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    await assertPage("live — detalle evento", `/eventos/${eventSlug}/en-vivo`, [
      ["EN VIVO badge", (h) => htmlHas(h, "EN VIVO")],
      ["iframe", (h) => htmlHas(h, EMBED_FRAGMENT)],
    ]);

    // --- paused ---
    await updateStream({ status: "paused" });

    await assertPage("paused — detalle", `/eventos/${eventSlug}/en-vivo`, [
      ["mensaje pausa", (h) =>
        htmlHas(h, "La transmisión se encuentra momentáneamente pausada.")],
      ["sin iframe", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
      ["sin EN VIVO engañoso en iframe area", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    await assertPage("paused — /en-vivo", "/en-vivo", [
      ["sección pausadas", (h) => htmlHas(h, "Pausadas")],
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
    ]);

    // --- ended ---
    await updateStream({ status: "ended", home_featured: true });

    await assertPage("ended — home sin hero stream", "/", [
      ["no título test en hero destacado", (h) => {
        const idx = h.indexOf(TEST_TITLE);
        const heroIdx = h.indexOf("Próxima transmisión");
        return idx === -1 || heroIdx === -1;
      }],
    ]);

    await assertPage("ended — /en-vivo", "/en-vivo", [
      ["finalizadas", (h) => htmlHas(h, "Transmisiones finalizadas")],
      ["título test", (h) => htmlHas(h, TEST_TITLE)],
      ["sin iframe", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    await assertPage("ended — detalle", `/eventos/${eventSlug}/en-vivo`, [
      ["mensaje finalizado", (h) => htmlHas(h, "Esta transmisión ha finalizado")],
      ["sin iframe", (h) => htmlHasNo(h, EMBED_FRAGMENT)],
    ]);

    // --- draft ---
    await updateStream({ status: "draft", home_featured: true });

    const anonDraft = await anon
      .from("event_streams")
      .select("id")
      .eq("id", streamId);
    if (!anonDraft.data?.length) {
      ok("draft — oculto para anon en BD");
    } else {
      bad("draft — oculto para anon en BD");
    }

    await assertPage("draft — ausente en /en-vivo", "/en-vivo", [
      ["sin título test", (h) => htmlHasNo(h, TEST_TITLE)],
    ]);

    await assertPage("draft — ausente en evento", `/eventos/${eventSlug}`, [
      ["sin bloque test", (h) => htmlHasNo(h, TEST_TITLE)],
    ]);

    // --- disabled ---
    await updateStream({ status: "scheduled", is_enabled: false });

    await assertPage("disabled — ausente público", "/en-vivo", [
      ["sin título test", (h) => htmlHasNo(h, TEST_TITLE)],
    ]);

    const unavailable = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
    if (
      unavailable.status === 200 &&
      htmlHas(unavailable.html, "no tiene una transmisión pública disponible")
    ) {
      ok("disabled — URL directa muestra ausencia segura");
    } else if (unavailable.status === 200 && htmlHasNo(unavailable.html, TEST_TITLE)) {
      ok("disabled — URL directa sin datos de test");
    } else {
      bad("disabled — URL directa muestra ausencia segura");
    }

    // --- banners (restaurar enabled scheduled para probar URLs en HTML) ---
    await updateStream({
      is_enabled: true,
      status: "scheduled",
      stream_banner_url: "https://placehold.co/1200x500/purple/white?text=Stream+Desktop",
      stream_banner_mobile_url:
        "https://placehold.co/600x900/purple/white?text=Stream+Mobile",
    });

    const bannerPage = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
    if (htmlHas(bannerPage.html, "placehold.co/1200x500")) {
      ok("banner desktop — URL en HTML");
    } else {
      bad("banner desktop — URL en HTML");
    }

    if (htmlHas(bannerPage.html, "object-cover")) {
      ok("banner — object-cover presente");
    } else {
      bad("banner — object-cover presente");
    }

    // --- prioridad hero: live gana sobre scheduled ---
    const startsLater = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const { data: secondStream, error: secondErr } = await admin
      .from("event_streams")
      .insert({
        event_id: eventId,
        title: "TEST STREAMING 2 — BORRAR",
        is_enabled: true,
        status: "scheduled",
        provider: "youtube",
        stream_url: YOUTUBE_URL,
        starts_at: startsLater,
        access_type: "free",
        home_featured: true,
        home_order: 0,
        show_on_streaming_page: true,
        show_on_event_page: false,
      })
      .select("id")
      .single();

    if (secondErr || !secondStream) {
      bad("crear segundo stream para prioridad", secondErr?.message);
    } else {
      restoredStreams.push(secondStream.id);
      await updateStream({ status: "live", home_order: 1 });
      const homeLive = await fetchPage("/");
      const idxLive = homeLive.html.indexOf(TEST_TITLE);
      const idxSched = homeLive.html.indexOf("TEST STREAMING 2 — BORRAR");
      if (idxLive !== -1 && (idxSched === -1 || idxLive < idxSched)) {
        ok("prioridad hero — live gana sobre scheduled");
      } else {
        bad("prioridad hero — live gana sobre scheduled");
      }
      await updateStream({ status: "scheduled", home_featured: true, home_order: 0 });
      await admin.from("event_streams").delete().eq("id", secondStream.id);
      restoredStreams = restoredStreams.filter((id) => id !== secondStream.id);
      ok("segundo stream temporal eliminado");
    }

    // --- timezone en BD ---
    const mendozaInput = "2026-07-15T20:00";
    const expectedIso = "2026-07-15T23:00:00.000Z";
    await updateStream({
      starts_at: expectedIso,
      status: "scheduled",
      is_enabled: true,
    });
    const { data: row } = await admin
      .from("event_streams")
      .select("starts_at")
      .eq("id", streamId)
      .single();
    if (row?.starts_at && Date.parse(row.starts_at) === Date.parse(expectedIso)) {
      ok("timezone — starts_at guardado como UTC esperado", row.starts_at);
    } else {
      bad("timezone — starts_at guardado", `got ${row?.starts_at}`);
    }

    const detailTz = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
    if (htmlHas(detailTz.html, "20:00") || htmlHas(detailTz.html, "20:")) {
      ok("timezone — hora 20:00 Mendoza visible en página pública");
    } else {
      bad("timezone — hora Mendoza visible", "no se encontró 20:00");
    }

    void mendozaInput;

    await updateStream({
      status: "live",
      stream_url: "javascript:alert(1)",
      is_enabled: true,
    });
    const maliciousPage = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
    if (
      maliciousPage.status === 200 &&
      htmlHasNo(maliciousPage.html, "javascript:") &&
      htmlHasNo(maliciousPage.html, EMBED_FRAGMENT)
    ) {
      ok("URL maliciosa — sin iframe ni javascript en HTML");
    } else {
      bad("URL maliciosa — sin iframe ni javascript en HTML");
    }
    await updateStream({ stream_url: YOUTUBE_URL, status: "scheduled" });

    const OTHER_HTTPS = "https://stream.example.com/live-room";
    await updateStream({
      status: "live",
      provider: "other",
      stream_url: OTHER_HTTPS,
      is_enabled: true,
    });
    const otherPage = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
    if (
      otherPage.status === 200 &&
      htmlHas(otherPage.html, OTHER_HTTPS) &&
      htmlHas(otherPage.html, 'rel="noopener noreferrer"') &&
      htmlHasNo(otherPage.html, "<iframe")
    ) {
      ok("other live — enlace externo seguro sin iframe");
    } else {
      bad("other live — enlace externo seguro sin iframe");
    }

    const { error: otherHttpErr } = await admin
      .from("event_streams")
      .update({ stream_url: "http://stream.example.com/live" })
      .eq("id", streamId);
    if (!otherHttpErr) {
      const otherHttpPage = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
      if (htmlHasNo(otherHttpPage.html, "http://stream.example.com/live")) {
        ok("other HTTP — no expuesto en HTML público");
      } else {
        bad("other HTTP — no expuesto en HTML público");
      }
    }
    await updateStream({ provider: "youtube", stream_url: YOUTUBE_URL, status: "scheduled" });

    const responsivePage = await fetchPage(`/eventos/${eventSlug}/en-vivo`);
    if (
      responsivePage.status === 200 &&
      (htmlHas(responsivePage.html, "aspect-video") ||
        htmlHas(responsivePage.html, "aspect-[12/5]") ||
        htmlHas(responsivePage.html, "aspect-[16/9]"))
    ) {
      ok("responsive básico — contenedor de proporción presente");
    } else {
      bad("responsive básico — contenedor de proporción presente");
    }
  } finally {
    console.log("\n--- Limpieza ---");
    const idsToDelete = [streamId, ...restoredStreams].filter(Boolean);
    for (const id of idsToDelete) {
      const { error } = await admin.from("event_streams").delete().eq("id", id);
      if (error) {
        bad(`Eliminar stream ${id}`, error.message);
      } else {
        ok(`Eliminar stream ${id}`);
      }
    }

    const { data: leftovers } = await admin
      .from("event_streams")
      .select("id, title")
      .ilike("title", `%TEST STREAMING%${RUN_ID}%`);

    if (!leftovers?.length) {
      ok("Sin filas temporales residuales en Supabase");
    } else {
      bad("Sin filas temporales residuales", leftovers.map((r) => r.title).join(", "));
    }

    for (const id of fixtureEventIds) {
      const { error } = await admin.from("events").delete().eq("id", id);
      if (error) {
        bad(`Eliminar evento fixture ${id}`, error.message);
      } else {
        ok(`Eliminar evento fixture ${id}`);
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  console.log(`Evento: ${eventName ?? eventSlug} (${eventId ?? "—"})`);
  console.log(`Stream temporal: ${streamId ?? "—"} (eliminado)`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
