/** Bloqueo de producción — nunca ejecutar fixtures contra prod. */

export const PRODUCTION_PROJECT_REF = "vfmzabiyqmsnlpesfman";
export const STAGING_PROJECT_NAME = "australe-staging-hybrid";

export function extractProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

export function assertNotProduction({ supabaseUrl, projectRef, context = "operación" }) {
  const ref = projectRef ?? extractProjectRef(supabaseUrl);
  if (!ref) {
    throw new Error(`${context}: falta project ref / URL staging`);
  }
  if (ref === PRODUCTION_PROJECT_REF) {
    throw new Error(
      `${context}: BLOQUEADO — destino es producción (${PRODUCTION_PROJECT_REF})`,
    );
  }
  return ref;
}

export function maskRef(ref) {
  if (!ref || ref.length < 8) return "****";
  return `${ref.slice(0, 4)}…${ref.slice(-4)}`;
}
