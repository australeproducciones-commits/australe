/**
 * Validación técnica manual post-reset (NO forma parte del flujo habitual).
 *
 * Verifica rutas HTTP y un ciclo CRUD sobre un evento temporal identificado.
 * Requiere flags explícitos; aborta sin modificar nada si no se cumplen.
 *
 * Uso:
 *   POST_RESET_FLOW_TEST=true POST_RESET_FLOW_TEST_NAME=POST-RESET-ADMIN-FLOW-TEST \
 *     node scripts/validate-post-reset-admin-flow.mjs [baseUrl]
 *
 * Login manual pendiente de confirmación por el usuario en navegador:
 *   http://localhost:3001/login
 *   http://localhost:3001/admin/eventos
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3001";
const TEST_SLUG = "validacion-ui-temporal";
const TEST_EVENT_NAME = "VALIDACIÓN UI — BORRAR";
const TEST_EVENT_NAME_EDITED = "VALIDACIÓN UI — Editado";
const REQUIRED_TEST_NAME = "POST-RESET-ADMIN-FLOW-TEST";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

function assertProtections() {
  if (process.env.POST_RESET_FLOW_TEST !== "true") {
    console.error(
      "Abortado: establecé POST_RESET_FLOW_TEST=true para ejecutar este script.",
    );
    process.exit(1);
  }
  if (process.env.POST_RESET_FLOW_TEST_NAME !== REQUIRED_TEST_NAME) {
    console.error(
      `Abortado: POST_RESET_FLOW_TEST_NAME debe ser exactamente "${REQUIRED_TEST_NAME}".`,
    );
    process.exit(1);
  }
}

const env = { ...loadEnvFile(resolve(process.cwd(), ".env.local")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan variables Supabase");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchStatus(path, opts = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      ...opts,
    });
    return res.status;
  } catch (e) {
    return `error: ${e.message}`;
  }
}

function isOurTestEvent(row) {
  return (
    row.slug === TEST_SLUG &&
    (row.name === TEST_EVENT_NAME || row.name === TEST_EVENT_NAME_EDITED)
  );
}

async function deleteTestEventById(eventId) {
  const { data: row, error: fetchErr } = await admin
    .from("events")
    .select("id, name, slug")
    .eq("id", eventId)
    .maybeSingle();

  if (fetchErr) throw new Error(`No se pudo verificar evento ${eventId}: ${fetchErr.message}`);
  if (!row) return;

  if (!isOurTestEvent(row)) {
    throw new Error(
      `Refusing delete: evento ${eventId} no coincide con identificadores de prueba (${row.slug} / ${row.name})`,
    );
  }

  const { error: delErr } = await admin.from("events").delete().eq("id", eventId);
  if (delErr) throw new Error(`Error al eliminar evento temporal ${eventId}: ${delErr.message}`);
}

async function cleanupStaleTestEvent() {
  const { data: stale } = await admin
    .from("events")
    .select("id, name, slug")
    .eq("slug", TEST_SLUG)
    .maybeSingle();

  if (stale && isOurTestEvent(stale)) {
    console.log(`ℹ Limpiando evento temporal previo: ${stale.id}`);
    await deleteTestEventById(stale.id);
  } else if (stale) {
    throw new Error(
      `Slug ${TEST_SLUG} ocupado por evento no identificado como prueba: "${stale.name}"`,
    );
  }
}

async function main() {
  assertProtections();

  console.log(`\n=== Validación flujo post-reset — ${BASE} ===\n`);

  const loginStatus = await fetchStatus("/login");
  console.log(`/login → ${loginStatus}`);
  const adminStatus = await fetchStatus("/admin/eventos");
  console.log(`/admin/eventos (sin sesión) → ${adminStatus} (esperado 307/302/308)`);

  await cleanupStaleTestEvent();

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!adminProfile) {
    console.error("✗ Sin perfil admin activo");
    process.exit(1);
  }
  console.log(`✓ Perfil admin activo: ${adminProfile.id}`);

  const eventDate = new Date();
  eventDate.setMonth(eventDate.getMonth() + 3);
  const eventDateStr = eventDate.toISOString().slice(0, 10);

  let eventId = null;

  try {
    const { data: event, error: createErr } = await admin
      .from("events")
      .insert({
        name: TEST_EVENT_NAME,
        slug: TEST_SLUG,
        status: "draft",
        event_date: eventDateStr,
        audience: "public",
        created_by: adminProfile.id,
      })
      .select("id, name, slug")
      .single();

    if (createErr || !event) {
      console.error("✗ Crear evento:", createErr?.message);
      process.exit(1);
    }

    eventId = event.id;
    console.log("✓ Evento creado (draft)");

    const { error: pubErr } = await admin
      .from("events")
      .update({ status: "published", name: TEST_EVENT_NAME_EDITED })
      .eq("id", eventId);

    if (pubErr) {
      console.error("✗ Publicar/editar evento:", pubErr.message);
      process.exit(1);
    }
    console.log("✓ Evento publicado y editado");

    const publicStatus = await fetchStatus(`/eventos/${TEST_SLUG}`);
    console.log(`/eventos/${TEST_SLUG} → ${publicStatus} (esperado 200)`);
  } finally {
    if (eventId) {
      try {
        await deleteTestEventById(eventId);
        console.log("✓ Evento temporal eliminado");
        eventId = null;
      } catch (cleanupErr) {
        console.error("✗ Limpieza en finally:", cleanupErr.message);
        process.exit(1);
      }
    }
  }

  const { count } = await admin.from("events").select("*", { count: "exact", head: true });
  console.log(`✓ events final: ${count}`);

  console.log("\nLogin manual pendiente de confirmación por el usuario en navegador.");
  console.log(`  ${BASE}/login`);
  console.log(`  ${BASE}/admin/eventos\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
