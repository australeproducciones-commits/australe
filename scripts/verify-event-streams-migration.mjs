/**
 * Verificación remota post-migración event_streams.
 * Uso: node scripts/verify-event-streams-migration.mjs
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

const EXPECTED_COLUMNS = [
  "id",
  "event_id",
  "title",
  "subtitle",
  "is_enabled",
  "status",
  "provider",
  "stream_url",
  "starts_at",
  "ends_at",
  "access_type",
  "stream_banner_url",
  "stream_banner_mobile_url",
  "home_featured",
  "home_order",
  "show_on_streaming_page",
  "show_on_event_page",
  "button_label",
  "created_by",
  "created_at",
  "updated_at",
];

let passed = 0;
let failed = 0;

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}
function bad(name, detail = "") {
  failed++;
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  console.log("\n=== Verificación remota event_streams ===\n");

  const { error: tableError } = await admin
    .from("event_streams")
    .select("id")
    .limit(1);

  if (tableError) {
    bad("Tabla event_streams existe", tableError.message);
    process.exit(1);
  }
  ok("Tabla event_streams existe");

  const { data: sample } = await admin.from("event_streams").select("*").limit(1);
  const cols = sample?.[0] ? Object.keys(sample[0]) : EXPECTED_COLUMNS;
  for (const col of EXPECTED_COLUMNS) {
    if (cols.includes(col) || sample?.length === 0) {
      ok(`Columna ${col}`);
    } else {
      bad(`Columna ${col}`, "no encontrada");
    }
  }

  const { data: publishedEvent } = await admin
    .from("events")
    .select("id, slug, status")
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  const { data: draftEvent } = await admin
    .from("events")
    .select("id")
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();

  if (!publishedEvent) {
    bad("Evento published para pruebas", "no hay eventos publicados");
  } else {
    ok("Evento published disponible", publishedEvent.slug);
  }

  let testStreamId = null;

  if (publishedEvent) {
    const { data: draftDisabled, error: insertErr } = await admin
      .from("event_streams")
      .insert({
        event_id: publishedEvent.id,
        title: "STREAM-MIGRATION-VERIFY-TEMP",
        is_enabled: false,
        status: "draft",
        provider: "youtube",
        access_type: "free",
      })
      .select("id")
      .single();

    if (insertErr || !draftDisabled) {
      bad("Insert temporal draft/deshabilitado", insertErr?.message);
    } else {
      testStreamId = draftDisabled.id;
      ok("Insert temporal draft/deshabilitado", testStreamId);

      const { data: anonDraft } = await anon
        .from("event_streams")
        .select("id")
        .eq("id", testStreamId);
      if ((anonDraft ?? []).length === 0) {
        ok("anon no ve draft/deshabilitado");
      } else {
        bad("anon no ve draft/deshabilitado", "devolvió filas");
      }

      const { data: enabledPublic, error: pubInsertErr } = await admin
        .from("event_streams")
        .insert({
          event_id: publishedEvent.id,
          title: "STREAM-MIGRATION-VERIFY-PUBLIC-TEMP",
          is_enabled: true,
          status: "scheduled",
          provider: "youtube",
          access_type: "free",
          starts_at: new Date(Date.now() + 86400000).toISOString(),
          show_on_streaming_page: true,
        })
        .select("id")
        .single();

      let publicTempId = enabledPublic?.id ?? null;
      if (pubInsertErr || !publicTempId) {
        bad("Insert temporal público programado", pubInsertErr?.message);
      } else {
        const { data: anonPublic } = await anon
          .from("event_streams")
          .select("id")
          .eq("id", publicTempId);
        if ((anonPublic ?? []).length === 1) {
          ok("anon ve stream público programado habilitado");
        } else {
          bad("anon ve stream público", JSON.stringify(anonPublic));
        }

        const { error: anonInsertErr } = await anon.from("event_streams").insert({
          event_id: publishedEvent.id,
          is_enabled: true,
          status: "live",
          provider: "youtube",
          access_type: "free",
        });
        if (anonInsertErr) {
          ok("anon no puede insertar", anonInsertErr.message.slice(0, 60));
        } else {
          bad("anon no puede insertar", "insertó sin error");
        }

        await admin.from("event_streams").delete().eq("id", publicTempId);
        ok("Eliminado temporal público");
      }
    }
  }

  if (draftEvent) {
    const { data: draftOnlyStream, error: draftStreamErr } = await admin
      .from("event_streams")
      .insert({
        event_id: draftEvent.id,
        is_enabled: true,
        status: "scheduled",
        provider: "youtube",
        access_type: "free",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select("id")
      .single();

    if (!draftStreamErr && draftOnlyStream?.id) {
      const { data: anonDraftEventStream } = await anon
        .from("event_streams")
        .select("id")
        .eq("id", draftOnlyStream.id);
      if ((anonDraftEventStream ?? []).length === 0) {
        ok("anon no ve stream de evento no publicado");
      } else {
        bad("anon no ve stream de evento no publicado");
      }
      await admin.from("event_streams").delete().eq("id", draftOnlyStream.id);
      ok("Eliminado temporal evento draft");
    }
  }

  if (testStreamId) {
    const before = await admin
      .from("event_streams")
      .select("updated_at, title")
      .eq("id", testStreamId)
      .single();

    await new Promise((r) => setTimeout(r, 1100));

    await admin
      .from("event_streams")
      .update({ title: "STREAM-MIGRATION-VERIFY-TEMP-UPDATED" })
      .eq("id", testStreamId);

    const after = await admin
      .from("event_streams")
      .select("updated_at, title")
      .eq("id", testStreamId)
      .single();

    if (
      after.data?.title === "STREAM-MIGRATION-VERIFY-TEMP-UPDATED" &&
      after.data?.updated_at &&
      after.data.updated_at !== before.data?.updated_at
    ) {
      ok("Trigger updated_at", after.data.updated_at);
    } else {
      bad("Trigger updated_at", JSON.stringify({ before: before.data, after: after.data }));
    }

    await admin.from("event_streams").delete().eq("id", testStreamId);
    ok("Eliminado temporal draft");
  }

  const { count } = await admin
    .from("event_streams")
    .select("id", { count: "exact", head: true })
    .or("title.ilike.STREAM-MIGRATION-VERIFY%");

  if ((count ?? 0) === 0) {
    ok("Sin datos ficticios residuales");
  } else {
    bad("Datos ficticios residuales", `count=${count}`);
    await admin
      .from("event_streams")
      .delete()
      .or("title.ilike.STREAM-MIGRATION-VERIFY%");
  }

  console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
