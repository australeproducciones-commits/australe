/**
 * Auditoría read-only de datos transaccionales (Fase 1).
 * No modifica datos. Ejecutar: node scripts/audit-production-data.mjs
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tablas clasificadas para el reset de producción */
const TABLES = {
  A_config: [
    { table: "events", label: "Eventos" },
    { table: "ticket_types", label: "Tipos de entrada" },
    { table: "kiosk_products", label: "Catálogo kiosco" },
    { table: "kiosk_product_categories", label: "Categorías kiosco" },
    { table: "event_kiosk_products", label: "Productos por evento (kiosco)" },
    { table: "event_kiosk_settings", label: "Config kiosco por evento" },
    { table: "products", label: "Productos legacy" },
    { table: "event_products", label: "Productos legacy por evento" },
    { table: "site_settings", label: "Configuración del sitio" },
    { table: "partners", label: "Partners" },
    { table: "advertising_campaigns", label: "Campañas publicidad" },
    { table: "profiles", label: "Perfiles" },
    { table: "community_settings", label: "Config comunidad" },
    { table: "community_levels", label: "Niveles fidelización" },
    { table: "community_rewards", label: "Recompensas" },
    { table: "community_members", label: "Miembros comunidad" },
    { table: "community_event_invitations", label: "Invitaciones comunidad" },
    { table: "event_streams", label: "Streams" },
    { table: "event_staff", label: "Staff por evento" },
    { table: "event_expense_categories", label: "Categorías gastos" },
  ],
  B_transaccional: [
    { table: "tickets", label: "Tickets / entradas" },
    { table: "kiosk_orders", label: "Órdenes consumiciones" },
    { table: "kiosk_order_items", label: "Ítems de órdenes" },
    { table: "kiosk_product_stock_movements", label: "Movimientos stock kiosco" },
    { table: "cash_closures", label: "Cierres de caja" },
  ],
  C_acumulados: [
    { table: "analytics_events", label: "Analítica web" },
    { table: "advertising_impressions", label: "Impresiones publicidad" },
    { table: "audit_logs", label: "Auditoría app" },
  ],
  D_loyalty: [
    { table: "loyalty_transactions", label: "Movimientos fidelización" },
    { table: "loyalty_accounts", label: "Cuentas fidelización" },
    { table: "community_redemptions", label: "Canjes recompensas" },
  ],
  D_finanzas: [
    { table: "event_expenses", label: "Gastos de evento" },
    { table: "event_expense_payments", label: "Pagos de gastos" },
    { table: "event_other_income", label: "Otros ingresos" },
  ],
};

async function countTable(table) {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    return { count: null, error: error.message };
  }
  return { count: count ?? 0, error: null };
}

async function sumColumn(table, column, filter) {
  let q = admin.from(table).select(column);
  if (filter) {
    for (const [k, v] of Object.entries(filter)) {
      q = q.eq(k, v);
    }
  }
  const { data, error } = await q;
  if (error) return { sum: null, error: error.message };
  const sum = (data ?? []).reduce((acc, row) => acc + (Number(row[column]) || 0), 0);
  return { sum, error: null };
}

async function main() {
  console.log("\n=== AUDITORÍA READ-ONLY — Datos transaccionales Australe ===\n");
  console.log(`Proyecto: ${url}\n`);

  const allGroups = Object.entries(TABLES);
  const results = {};

  for (const [group, items] of allGroups) {
    console.log(`--- ${group} ---`);
    for (const { table, label } of items) {
      const { count, error } = await countTable(table);
      results[table] = { count, error, group, label };
      if (error) {
        console.log(`  ? ${table} (${label}): no accesible — ${error}`);
      } else {
        console.log(`  ${String(count).padStart(6)}  ${table} — ${label}`);
      }
    }
    console.log("");
  }

  console.log("--- Contadores persistidos (stock / revenue) ---");

  const ttSold = await sumColumn("ticket_types", "stock_sold");
  console.log(
    `  stock_sold total (ticket_types): ${ttSold.error ? ttSold.error : ttSold.sum}`,
  );

  const ekpSold = await sumColumn("event_kiosk_products", "stock_sold");
  console.log(
    `  stock_sold total (event_kiosk_products): ${ekpSold.error ? ekpSold.error : ekpSold.sum}`,
  );

  const { data: kioskStock } = await admin
    .from("kiosk_products")
    .select("stock_on_hand, stock_reserved");
  if (kioskStock) {
    const onHand = kioskStock.reduce((s, r) => s + (r.stock_on_hand ?? 0), 0);
    const reserved = kioskStock.reduce((s, r) => s + (r.stock_reserved ?? 0), 0);
    console.log(`  stock_on_hand total (kiosk_products): ${onHand}`);
    console.log(`  stock_reserved total (kiosk_products): ${reserved}`);
  }

  const ticketRevenue = await sumColumn("tickets", "price_paid", {
    payment_status: "confirmed",
  });
  console.log(
    `  price_paid confirmado (tickets): $${ticketRevenue.error ? ticketRevenue.error : ticketRevenue.sum}`,
  );

  const { data: kioskPaid } = await admin
    .from("kiosk_orders")
    .select("total_amount")
    .eq("payment_status", "paid");
  const kioskRevenue = (kioskPaid ?? []).reduce(
    (s, r) => s + (Number(r.total_amount) || 0),
    0,
  );
  console.log(`  total_amount pagado (kiosk_orders): $${kioskRevenue}`);

  const { data: ticketStatus } = await admin.from("tickets").select("ticket_status");
  if (ticketStatus?.length) {
    const byStatus = {};
    for (const t of ticketStatus) {
      byStatus[t.ticket_status] = (byStatus[t.ticket_status] ?? 0) + 1;
    }
    console.log("\n--- Tickets por estado ---");
    for (const [st, n] of Object.entries(byStatus)) {
      console.log(`  ${st}: ${n}`);
    }
  }

  const { data: loyaltyBySource } = await admin
    .from("loyalty_transactions")
    .select("source_type, transaction_type");
  if (loyaltyBySource?.length) {
    const map = {};
    for (const row of loyaltyBySource) {
      const key = `${row.transaction_type}/${row.source_type}`;
      map[key] = (map[key] ?? 0) + 1;
    }
    console.log("\n--- Fidelización por tipo/origen ---");
    for (const [k, n] of Object.entries(map).sort()) {
      console.log(`  ${k}: ${n}`);
    }
  }

  const { data: events } = await admin.from("events").select("id, name, slug, status");
  console.log(`\n--- Eventos conservados (${events?.length ?? 0}) ---`);
  for (const e of events ?? []) {
    console.log(`  · ${e.name} (${e.slug}) — ${e.status}`);
  }

  console.log("\n=== Fin auditoría (sin modificaciones) ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
