#!/usr/bin/env node
/**
 * Seed idempotente para staging — pagos híbridos.
 * node scripts/staging/seed-hybrid-fixtures.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { assertNotProduction } from "./lib/guard.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.STAGING_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan URL / service role staging");
  process.exit(1);
}

assertNotProduction({ supabaseUrl: url, context: "seed" });

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RUN = process.env.STAGING_SEED_TAG ?? "hybrid-v1";
const PASSWORD = `Staging!${RUN}`;

const USERS = {
  admin: `admin+${RUN}@staging.australe.invalid`,
  cashier: `cajero+${RUN}@staging.australe.invalid`,
  customer: `cliente+${RUN}@staging.australe.invalid`,
};

async function ensureUser(email, role, fullName) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find((u) => u.email === email);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user.id;
  }

  await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      role,
      is_active: true,
      staff_all_events: true,
    },
    { onConflict: "id" },
  );

  return userId;
}

async function ensureCommunity(customerId) {
  await admin.from("community_settings").upsert(
    {
      id: 1,
      community_enabled: true,
      store_points_enabled: true,
      amount_per_point: 1000,
    },
    { onConflict: "id" },
  );

  const memberRow = {
    profile_id: customerId,
    full_name: "Cliente Staging",
    whatsapp: "+5491100000000",
    dni: `99${String(RUN).replace(/\W/g, "").slice(0, 6).padStart(6, "0")}`,
    birth_date: "1990-01-15",
    community_code: `STG${String(RUN).replace(/\W/g, "").slice(0, 12)}`.toUpperCase(),
    status: "active",
  };

  const { data: existingMember } = await admin
    .from("community_members")
    .select("id")
    .eq("profile_id", customerId)
    .maybeSingle();

  if (existingMember?.id) {
    await admin.from("community_members").update(memberRow).eq("id", existingMember.id);
  } else {
    await admin.from("community_members").insert(memberRow);
  }

  await admin.from("loyalty_accounts").upsert(
    { user_id: customerId, balance: 0 },
    { onConflict: "user_id" },
  );
}

async function upsertProduct(def) {
  const { data: existing } = await admin
    .from("store_products")
    .select("id")
    .eq("slug", def.slug)
    .maybeSingle();

  const payload = {
    name: def.name,
    slug: def.slug,
    category: "general",
    status: "active",
    is_active: true,
    show_in_store: true,
    public_price: def.public_price,
    community_price: def.community_price ?? null,
    stock_total: def.stock_total,
    stock_reserved: 0,
    stock_sold: 0,
    track_stock: true,
    short_description: def.short_description,
  };

  if (existing?.id) {
    await admin.from("store_products").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await admin.from("store_products").insert(payload).select("id").single();
  if (error) throw new Error(`product ${def.slug}: ${error.message}`);
  return data.id;
}

async function ensureVariants(productId, sizes, stockEach) {
  for (const size of sizes) {
    const { data: existing } = await admin
      .from("store_product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("size", size)
      .maybeSingle();

    const row = {
      product_id: productId,
      name: `Talle ${size}`,
      size,
      stock_total: stockEach,
      stock_reserved: 0,
      stock_sold: 0,
      is_active: true,
    };

    if (existing?.id) {
      await admin.from("store_product_variants").update(row).eq("id", existing.id);
    } else {
      await admin.from("store_product_variants").insert(row);
    }
  }
}

async function main() {
  const adminId = await ensureUser(USERS.admin, "admin", "Admin Staging");
  const cashierId = await ensureUser(USERS.cashier, "cashier", "Cajero Staging");
  const customerId = await ensureUser(USERS.customer, "customer", "Cliente Staging");

  await ensureCommunity(customerId);

  const mainId = await upsertProduct({
    slug: `staging-rem-${RUN}`,
    name: "Remera Staging Activa",
    public_price: 15000,
    community_price: 12000,
    stock_total: 50,
    short_description: "Producto de prueba staging",
  });
  await ensureVariants(mainId, ["S", "M"], 25);

  await upsertProduct({
    slug: `staging-low-${RUN}`,
    name: "Producto Stock Bajo",
    public_price: 5000,
    stock_total: 2,
    short_description: "Stock bajo",
  });

  await upsertProduct({
    slug: `staging-out-${RUN}`,
    name: "Producto Agotado",
    public_price: 3000,
    stock_total: 0,
    short_description: "Sin stock",
  });

  await upsertProduct({
    slug: `staging-community-${RUN}`,
    name: "Producto Comunidad",
    public_price: 20000,
    community_price: 15000,
    stock_total: 20,
    short_description: "Precio comunidad",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        run: RUN,
        users: USERS,
        password_hint: "ver STAGING_SEED_TAG en logs del workflow (no commitear)",
        product_slug: `staging-rem-${RUN}`,
        admin_id: adminId,
        cashier_id: cashierId,
        customer_id: customerId,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("seed-hybrid-fixtures:", err.message);
  process.exit(1);
});
