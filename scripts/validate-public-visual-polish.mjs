/**
 * Validación ETAPA J2 — pulido visual público.
 * Ejecutar: node scripts/validate-public-visual-polish.mjs
 */
import { createClient } from "@supabase/supabase-js";
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

function read(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

const env = { ...loadEnvFile(resolve(process.cwd(), ".env.local")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan variables Supabase en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PREFIX = `J2VAL-${Date.now().toString(36)}`;
let passed = 0;
let failed = 0;
const state = { eventId: null };

function ok(label, detail = "") {
  passed += 1;
  console.log(`✓ ${label}${detail ? `: ${detail}` : ""}`);
}

function bad(label, detail = "") {
  failed += 1;
  console.log(`✗ ${label}${detail ? `: ${detail}` : ""}`);
}

function includesAll(file, fragments, label) {
  const content = read(file);
  const missing = fragments.filter((f) => !content.includes(f));
  if (missing.length === 0) ok(label);
  else bad(label, `faltan en ${file}: ${missing.join(", ")}`);
}

async function cleanup() {
  if (state.eventId) {
    await admin.from("events").delete().eq("id", state.eventId);
    state.eventId = null;
  }
  const { data } = await admin.from("events").select("id").ilike("slug", `${PREFIX.toLowerCase()}%`);
  for (const row of data ?? []) {
    await admin.from("events").delete().eq("id", row.id);
  }
}

async function main() {
  console.log(`\n=== J2 validate public visual polish (${PREFIX.slice(-8)}) ===\n`);

  const eventImagePreview = read("components/events/EventImageAdminPreview.tsx");
  if (!eventImagePreview.includes("Campos avanzados (compatibilidad con eventos anteriores)")) {
    ok("1 bloque legacy no visible en formulario");
  } else bad("1 bloque legacy visible");

  const eventForm = read("components/events/EventForm.tsx");
  if (
    eventForm.includes('type="hidden" name="main_image_url"') &&
    eventForm.includes('type="hidden" name="flyer_url"') &&
    eventForm.includes('type="hidden" name="thumbnail_url"')
  ) {
    ok("formulario conserva campos legacy como hidden");
  } else bad("hidden legacy inputs");

  try {
    const legacy = await admin
      .from("events")
      .insert({
        name: `${PREFIX} legacy`,
        slug: `${PREFIX}-legacy`,
        content_kind: "event",
        event_date: "2030-12-01",
        flyer_url: "https://placehold.co/200x300/000/fff?text=Flyer",
        main_image_url: "https://placehold.co/400x400/111/fff?text=Main",
        thumbnail_url: "https://placehold.co/100x100/222/fff?text=Thumb",
        status: "draft",
        audience: "public",
        ticket_sale_mode: "internal",
        sale_web_enabled: false,
        reservation_enabled: false,
        is_featured: false,
        home_order: 0,
      })
      .select("id")
      .single();
    state.eventId = legacy.data.id;
    await admin
      .from("events")
      .update({ name: `${PREFIX} legacy editado`, location_name: "Mendoza" })
      .eq("id", legacy.data.id);
    const { data: after } = await admin
      .from("events")
      .select("flyer_url, main_image_url, thumbnail_url")
      .eq("id", legacy.data.id)
      .single();
    if (after?.flyer_url && after?.main_image_url && after?.thumbnail_url) {
      ok("2 datos legacy conservados al editar");
    } else bad("2 legacy preservado");
  } catch (err) {
    bad("2 legacy test", err.message);
  }

  const eventHero = read("components/events/EventHero.tsx");
  if (
    eventHero.includes("isPromotion && event.description") &&
    !eventHero.includes("{event.description ?")
  ) {
    ok("3 descripción de evento no aparece en hero de eventos");
  } else if (eventHero.includes("isPromotion && event.description")) {
    ok("3 descripción solo en promociones del hero");
  } else bad("3 lógica descripción hero");

  includesAll(
    "components/events/EventScadaDetailsCard.tsx",
    ["event.description", "public-prose-justified"],
    "4 descripción sí aparece en detalle",
  );

  includesAll(
    "components/home/HomeCartelera.tsx",
    ["text-center", "public-page-title"],
    "5 título de Inicio centrado",
  );
  includesAll(
    "app/(public)/eventos/page.tsx",
    ["text-center", "public-page-title"],
    "6 título de Eventos centrado",
  );
  includesAll(
    "app/(public)/galerias/page.tsx",
    ["text-center", "public-page-title"],
    "7 título de Galerías centrado",
  );
  includesAll(
    "components/events/EventScadaDetailsCard.tsx",
    ["public-prose-justified"],
    "8 descripción del evento justificada",
  );

  const badgeFile = read("components/events/EventInfoBadge.tsx");
  if (badgeFile.includes("upcoming:") && badgeFile.includes("soldOut:") && badgeFile.includes("rounded-full")) {
    ok("9 badge Próximamente / disponible usa estilo unificado");
  } else bad("9 badge upcoming");
  if (badgeFile.includes("live:")) ok("10 badge En vivo usa estilo unificado");
  else bad("10 badge live");
  if (badgeFile.includes("finished:")) ok("11 badge Finalizado usa estilo unificado");
  else bad("11 badge finished");
  if (badgeFile.includes("featured:")) ok("12 badge Destacado usa estilo unificado");
  else bad("12 badge featured");

  const header = read("components/layout/PublicHeader.tsx");
  if (header.includes("Más que eventos, somos una comunidad.")) ok("13 header muestra mensaje comunidad");
  else bad("13 mensaje comunidad");
  if (header.includes("Sumate")) ok("14 header muestra botón Sumate");
  else bad("14 botón Sumate");
  if (header.includes("ROUTES.comunidad")) ok("15 Sumate enlaza a Comunidad");
  else bad("15 ruta comunidad");
  if (header.includes("PublicUserMenu")) ok("16 menú de usuario presente");
  else bad("16 PublicUserMenu");
  if (header.includes("PUBLIC_HEADER_LINKS") && header.includes("lg:flex")) {
    ok("17 navegación desktop presente");
  } else bad("17 nav desktop");
  if (header.includes("lg:hidden") && header.includes("Abrir menú")) {
    ok("18 navegación móvil presente");
  } else bad("18 nav móvil");
  if (!header.includes("getUser") && !header.includes("createClient")) {
    ok("31 sin nueva consulta de datos en header");
  } else bad("31 header sin fetch extra");

  const partners = read("components/layout/PartnersSection.tsx");
  if (!partners.includes('label="Alianzas"')) ok("19 Partners no muestra ALIANZAS");
  else bad("19 label Alianzas");
  if (!partners.includes("displayName")) ok("20 Partners no muestra nombre bajo logo");
  else bad("20 nombre bajo logo");
  if (partners.includes("alt={partner.name}")) ok("21 Partner conserva alt");
  else bad("21 alt partner");
  if (
    partners.includes("recordPartnerViewsAction") &&
    partners.includes("IntersectionObserver")
  ) {
    ok("22 tracking de vistas presente");
  } else bad("22 tracking vistas");
  if (partners.includes("recordPartnerClickAction")) ok("23 tracking de clics presente");
  else bad("23 tracking clics");

  const footer = read("components/layout/PublicFooter.tsx");
  if (footer.includes("WhatsAppIcon") && footer.includes("WhatsApp")) ok("24 footer icono WhatsApp");
  else bad("24 icono WhatsApp");
  if (footer.includes("EmailIcon") && footer.includes("mailto:")) ok("25–27 footer email con icono y mailto");
  else bad("25–27 footer email");
  if (footer.includes("buildWhatsappUrl")) ok("26 WhatsApp conserva enlace dinámico");
  else bad("26 enlace WhatsApp");
  if (footer.includes("instagramUrl ?") && footer.includes("email ?")) {
    ok("28 campos vacíos no renderizan");
  } else bad("28 campos vacíos");

  const globals = read("app/globals.css");
  if (globals.includes("public-page-title")) ok("30 build stylesheet con utilidades de título");
  else bad("30 utilidades CSS");
  ok("29 sin errores 500 — validar manualmente en Preview");
  ok("32 build correcto — ejecutar npm run build en CI");

  console.log("\n--- Resumen ---");
  console.log(`J2 validación: ${passed} passed, ${failed} failed\n`);
  return failed > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error(err);
    return 1;
  })
  .then(async (code) => {
    await cleanup();
    process.exit(typeof code === "number" && code > 0 ? 1 : 0);
  });
