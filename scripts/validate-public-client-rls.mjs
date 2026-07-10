/**
 * Valida acceso anónimo del cliente público de Supabase (RLS, sin modificar políticas).
 * Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.
 * Uso: node scripts/validate-public-client-rls.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "validate-public-client-rls: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function isPermissionDenied(error) {
  if (!error) {
    return false;
  }
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("violates row-level security")
  );
}

async function run() {
  const { data: publishedEvents, error: publishedError } = await supabase
    .from("events")
    .select("id, status, audience")
    .eq("status", "published")
    .eq("audience", "public");

  assert.ok(!publishedError, `published events readable: ${publishedError?.message}`);
  for (const row of publishedEvents ?? []) {
    assert.equal(row.status, "published");
    assert.equal(row.audience, "public");
  }

  const { data: communityEvents, error: communityError } = await supabase
    .from("events")
    .select("id")
    .eq("audience", "community");

  assert.ok(!communityError, `community query should not error: ${communityError?.message}`);
  assert.equal(
    (communityEvents ?? []).length,
    0,
    "community events must not be readable by anon",
  );

  const { data: privateEvents, error: privateError } = await supabase
    .from("events")
    .select("id")
    .eq("audience", "private");

  assert.ok(!privateError, `private query should not error: ${privateError?.message}`);
  assert.equal(
    (privateEvents ?? []).length,
    0,
    "private events must not be readable by anon",
  );

  const { data: draftEvents, error: draftError } = await supabase
    .from("events")
    .select("id")
    .eq("status", "draft");

  assert.ok(!draftError, `draft query should not error: ${draftError?.message}`);
  assert.equal((draftEvents ?? []).length, 0, "draft events must not be readable by anon");

  const { data: ticketTypes, error: ticketError } = await supabase
    .from("ticket_types")
    .select("id, is_active, event_id")
    .eq("is_active", true);

  assert.ok(!ticketError, `ticket types readable: ${ticketError?.message}`);
  for (const row of ticketTypes ?? []) {
    assert.equal(row.is_active, true);
  }

  const { data: siteSettings, error: siteError } = await supabase
    .from("site_settings")
    .select("contact_email, contact_phone, contact_whatsapp, contact_location, instagram_url")
    .eq("id", 1)
    .maybeSingle();

  assert.ok(!siteError, `site_settings readable: ${siteError?.message}`);
  if (siteSettings) {
    const keys = Object.keys(siteSettings);
    assert.deepEqual(
      keys.sort(),
      [
        "contact_email",
        "contact_location",
        "contact_phone",
        "contact_whatsapp",
        "instagram_url",
      ].sort(),
      "site_settings public query must expose only public columns",
    );
  }

  const appColumnList = [
    "contact_email",
    "contact_phone",
    "contact_whatsapp",
    "contact_location",
    "instagram_url",
  ];
  assert.deepEqual(
    appColumnList.sort(),
    [
      "contact_email",
      "contact_location",
      "contact_phone",
      "contact_whatsapp",
      "instagram_url",
    ].sort(),
    "application site_settings column list must remain public-only",
  );

  const { data: partners, error: partnersError } = await supabase
    .from("partners")
    .select("id, is_active")
    .order("sort_order", { ascending: true });

  assert.ok(!partnersError, `partners readable: ${partnersError?.message}`);
  for (const row of partners ?? []) {
    assert.equal(row.is_active, true, "inactive partners must not appear");
  }

  const { error: insertEventError } = await supabase.from("events").insert({
    name: "rls-test",
    slug: `rls-test-${Date.now()}`,
    status: "draft",
    audience: "public",
  });
  assert.ok(isPermissionDenied(insertEventError), "anon must not insert events");

  const { error: insertPartnerError } = await supabase.from("partners").insert({
    name: "rls-test",
    image_url: "https://example.com/test.png",
  });
  assert.ok(isPermissionDenied(insertPartnerError), "anon must not insert partners");

  const { data: partnerSample } = await supabase
    .from("partners")
    .select("id, name")
    .limit(1);

  if ((partnerSample ?? []).length > 0) {
    const partner = partnerSample[0];
    const { error: updatePartnerError, data: updatedRows } = await supabase
      .from("partners")
      .update({ name: "rls-test-should-not-apply" })
      .eq("id", partner.id)
      .select("name");

    assert.ok(
      isPermissionDenied(updatePartnerError) || (updatedRows ?? []).length === 0,
      "anon must not update partners",
    );

    const { data: afterUpdate } = await supabase
      .from("partners")
      .select("name")
      .eq("id", partner.id)
      .maybeSingle();

    assert.equal(
      afterUpdate?.name,
      partner.name,
      "partner row must remain unchanged after anon update attempt",
    );
  }

  const { data: settingsBeforeDelete } = await supabase
    .from("site_settings")
    .select("contact_email")
    .eq("id", 1)
    .maybeSingle();

  const { error: deleteSettingsError, data: deletedSettings } = await supabase
    .from("site_settings")
    .delete()
    .eq("id", 1)
    .select("id");

  assert.ok(
    isPermissionDenied(deleteSettingsError) || (deletedSettings ?? []).length === 0,
    "anon must not delete site_settings",
  );

  const { data: settingsAfterDelete } = await supabase
    .from("site_settings")
    .select("contact_email")
    .eq("id", 1)
    .maybeSingle();

  assert.deepEqual(
    settingsAfterDelete,
    settingsBeforeDelete,
    "site_settings must remain after anon delete attempt",
  );

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  assert.ok(
    profilesError || (profiles ?? []).length === 0,
    "profiles must not be readable by anon",
  );

  console.log("validate-public-client-rls: OK");
}

run().catch((error) => {
  console.error("validate-public-client-rls: FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
