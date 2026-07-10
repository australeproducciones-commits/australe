/**
 * Carga variables para scripts en CI o local.
 * Prioridad: process.env > .env.local (si existe).
 * No imprime valores.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function loadCiEnv() {
  const out = {};

  const envPath = join(root, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  }

  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PROJECT_ID",
  ]) {
    if (process.env[key]) {
      out[key] = process.env[key];
    }
  }

  if (!out.NEXT_PUBLIC_SUPABASE_URL && out.SUPABASE_PROJECT_ID) {
    out.NEXT_PUBLIC_SUPABASE_URL = `https://${out.SUPABASE_PROJECT_ID}.supabase.co`;
  }

  return out;
}
