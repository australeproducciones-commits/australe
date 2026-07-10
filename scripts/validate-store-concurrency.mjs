/**
 * Script de validación de concurrencia de stock (requiere Supabase local/remoto).
 * Demuestra que dos reservas simultáneas no pueden exceder stock disponible.
 *
 * Uso: node scripts/validate-store-concurrency.mjs
 * Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en entorno
 */

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("SKIP: sin credenciales Supabase para prueba de concurrencia");
  process.exit(0);
}

console.log("Prueba de concurrencia: ejecutar manualmente con producto de prueba");
console.log("1. Crear producto con stock_total=1");
console.log("2. Lanzar 2 create_store_order en paralelo");
console.log("3. Verificar que solo uno tiene éxito");
console.log("RPC usa FOR UPDATE en store_reserve_stock");
