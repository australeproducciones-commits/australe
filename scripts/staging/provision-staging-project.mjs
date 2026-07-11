#!/usr/bin/env node
/**
 * Provisiona o reutiliza proyecto Supabase staging (NO producción).
 * Requiere SUPABASE_ACCESS_TOKEN.
 *
 * node scripts/staging/provision-staging-project.mjs
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRODUCTION_PROJECT_REF,
  STAGING_PROJECT_NAME,
  assertNotProduction,
  maskRef,
} from "./lib/guard.mjs";
import {
  createStagingProject,
  getProjectApiKeys,
  listOrganizations,
  listProjects,
  waitForHealthyProject,
} from "./lib/management-api.mjs";

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const existingRef = process.env.STAGING_SUPABASE_PROJECT_ID?.trim();
const existingPassword = process.env.STAGING_SUPABASE_DB_PASSWORD?.trim();

if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

if (existingRef) {
  assertNotProduction({ projectRef: existingRef, context: "provision" });
}

async function main() {
  const projects = await listProjects(token);
  let project = projects.find((p) => p.name === STAGING_PROJECT_NAME);

  if (!project && existingRef) {
    project = projects.find((p) => p.id === existingRef || p.ref === existingRef);
  }

  let dbPass = existingPassword;
  if (!project) {
    const orgs = await listOrganizations(token);
    const org = orgs[0];
    if (!org?.slug) {
      throw new Error("No se encontró organization_slug");
    }
    dbPass = dbPass || randomBytes(18).toString("base64url");
    console.log(`Creando proyecto staging: ${STAGING_PROJECT_NAME}`);
    project = await createStagingProject(token, {
      orgSlug: org.slug,
      name: STAGING_PROJECT_NAME,
      dbPass,
    });
    const ref = project.ref ?? project.id;
    assertNotProduction({ projectRef: ref, context: "create" });
    console.log(`Esperando salud del proyecto ${maskRef(ref)}…`);
    await waitForHealthyProject(token, ref);
  }

  const ref = project.ref ?? project.id;
  assertNotProduction({ projectRef: ref, context: "final" });

  if (!dbPass) {
    throw new Error(
      "Falta STAGING_SUPABASE_DB_PASSWORD para el proyecto staging existente",
    );
  }

  const keys = await getProjectApiKeys(token, ref);
  let anon = null;
  let service = null;
  if (Array.isArray(keys)) {
    for (const k of keys) {
      const name = k.name ?? k.id ?? "";
      const value = k.api_key ?? k.key ?? k.value;
      if (name === "anon") anon = value;
      if (name === "service_role") service = value;
    }
  } else if (keys && typeof keys === "object") {
    anon = keys.anon ?? keys.publishable ?? null;
    service = keys.service_role ?? keys.secret ?? null;
  }

  if (!anon || !service) {
    throw new Error("No se pudieron obtener API keys del proyecto staging");
  }

  const summary = {
    staging_project_ref: ref,
    staging_project_name: STAGING_PROJECT_NAME,
    staging_supabase_url: `https://${ref}.supabase.co`,
    production_blocked: ref !== PRODUCTION_PROJECT_REF,
    anon_key_present: Boolean(anon),
    service_role_present: Boolean(service),
    db_password_generated: Boolean(dbPass && !existingPassword),
  };

  console.log("STAGING_PROVISION_OK");
  console.log(JSON.stringify(summary, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      "## Staging Supabase",
      `- Project ref: \`${maskRef(ref)}\` (completo en logs del job)`,
      `- URL: https://${ref}.supabase.co`,
      `- Producción bloqueada: ${ref !== PRODUCTION_PROJECT_REF}`,
    ];
    if (dbPass && !existingPassword) {
      lines.push(
        "- **Acción requerida:** guardar `STAGING_SUPABASE_DB_PASSWORD` en GitHub Secrets",
      );
    }
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"), { flag: "a" });
  }

  const outPath = resolve(process.cwd(), ".staging-provision.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        ref,
        url: `https://${ref}.supabase.co`,
        anon_key: anon,
        service_role_key: service,
        db_password: dbPass,
      },
      null,
      2,
    ),
  );
  console.log(`Metadata escrita en ${outPath} (no commitear)`);
}

main().catch((err) => {
  console.error("provision-staging-project:", err.message);
  process.exit(1);
});
