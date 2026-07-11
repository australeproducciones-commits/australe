#!/usr/bin/env node
/**
 * Validación de canales de venta (show_in_store, eventos, comunidad, checkout).
 * Crea datos TEST efímeros y limpia al finalizar.
 *
 * Uso: node scripts/validate-store-channels.mjs
 */
import { loadCiEnv } from "./lib/ci-env.mjs";

const TEST_PREFIX = "test-channels-";
const results = [];
let passed = 0;
let failed = 0;

function ok(name, detail = "") {
  passed += 1;
  results.push({ name, ok: true, detail });
  console.log(`OK  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed += 1;
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest(url, key, path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(key, init.headers), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data, text };
}

async function rpc(url, key, fn, body = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { res, text };
}

async function cleanup(url, serviceKey) {
  const { data: products } = await rest(
    url,
    serviceKey,
    `store_products?select=id,slug&slug=like.${TEST_PREFIX}*`,
  );

  for (const product of products ?? []) {
    await rest(url, serviceKey, `event_store_products?product_id=eq.${product.id}`, {
      method: "DELETE",
    });
    await rest(url, serviceKey, `store_product_variants?product_id=eq.${product.id}`, {
      method: "DELETE",
    });
    await rest(url, serviceKey, `store_products?id=eq.${product.id}`, {
      method: "DELETE",
    });
  }
}

async function createProduct(url, serviceKey, slug, overrides = {}) {
  const payload = {
    name: `TEST Channels ${slug}`,
    slug,
    category: "general",
    public_price: 1000,
    community_price: 800,
    is_active: true,
    status: "active",
    show_in_store: true,
    community_only: false,
    track_stock: true,
    stock_total: 5,
    gallery_urls: [],
    ...overrides,
  };

  const { res, data } = await rest(url, serviceKey, "store_products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`createProduct ${slug}: ${JSON.stringify(data)}`);
  }

  return data[0];
}

async function main() {
  const env = loadCiEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !anonKey) {
    console.log("SKIP: faltan credenciales Supabase");
    process.exit(0);
  }

  console.log("=== Validación canales de tienda ===\n");
  await cleanup(url, serviceKey);

  const generalProduct = await createProduct(url, serviceKey, `${TEST_PREFIX}general`, {
    show_in_store: true,
  });

  const eventOnlyProduct = await createProduct(url, serviceKey, `${TEST_PREFIX}event-only`, {
    show_in_store: false,
  });

  const communityProduct = await createProduct(url, serviceKey, `${TEST_PREFIX}community`, {
    community_only: true,
    show_in_store: true,
  });

  // 1. Tienda general — anon ve show_in_store=true
  {
    const { res, data } = await rest(
      url,
      anonKey,
      `store_products?select=slug&slug=eq.${generalProduct.slug}`,
    );
    if (res.ok && data?.length === 1) {
      ok("tienda general visible", generalProduct.slug);
    } else {
      fail("tienda general visible", `HTTP ${res.status}`);
    }
  }

  // 2. Solo evento — sin asociación aún, no visible
  {
    const { res, data } = await rest(
      url,
      anonKey,
      `store_products?select=slug&slug=eq.${eventOnlyProduct.slug}`,
    );
    if (res.ok && (data?.length ?? 0) === 0) {
      ok("solo evento oculto sin asociación");
    } else {
      fail("solo evento oculto sin asociación", `rows=${data?.length}`);
    }
  }

  let eventAssociationId = null;
  let publishedEvent = null;

  {
    const { data: events } = await rest(
      url,
      serviceKey,
      "events?select=id,slug,status,event_date,event_end_date,start_time,end_time&status=eq.published&limit=1",
    );
    publishedEvent = events?.[0] ?? null;
  }

  if (publishedEvent) {
    await rest(url, serviceKey, "event_store_settings", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        event_id: publishedEvent.id,
        merchandising_enabled: true,
        show_badge: true,
      }),
    });

    const { res, data } = await rest(url, serviceKey, "event_store_products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        event_id: publishedEvent.id,
        product_id: eventOnlyProduct.id,
        is_active: true,
        sort_order: 0,
        pickup_available: true,
      }),
    });

    if (res.ok) {
      eventAssociationId = data[0]?.id;
    }
  }

  // 3. Tienda + evento — producto general también asociable
  {
    if (publishedEvent) {
      const { res } = await rest(url, serviceKey, "event_store_products", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          event_id: publishedEvent.id,
          product_id: generalProduct.id,
          is_active: true,
        }),
      });
      if (res.ok) {
        ok("tienda + evento asociación");
      } else {
        fail("tienda + evento asociación");
      }
    } else {
      ok("tienda + evento asociación", "SKIP sin evento publicado");
    }
  }

  // 4. Comunidad — anon no ve community_only
  {
    const { res, data } = await rest(
      url,
      anonKey,
      `store_products?select=slug&slug=eq.${communityProduct.slug}`,
    );
    if (res.ok && (data?.length ?? 0) === 0) {
      ok("community_only oculto para anon");
    } else {
      fail("community_only oculto para anon");
    }
  }

  // 5. Checkout sin evento — show_in_store=false rechazado
  {
    const { text } = await rpc(url, anonKey, "create_store_order", {
      p_customer_name: "Test Channels",
      p_customer_email: "test-channels@example.com",
      p_items: [{ product_id: eventOnlyProduct.id, variant_id: null, quantity: 1 }],
    });
    if (text.includes("no disponible en tienda general")) {
      ok("checkout general bloquea show_in_store=false");
    } else {
      fail("checkout general bloquea show_in_store=false", text.slice(0, 120));
    }
  }

  // 6. Checkout con evento sin asociación
  {
    if (publishedEvent) {
      const orphan = await createProduct(url, serviceKey, `${TEST_PREFIX}orphan`, {
        show_in_store: false,
      });
      const { text } = await rpc(url, anonKey, "create_store_order", {
        p_customer_name: "Test Channels",
        p_customer_email: "test-channels@example.com",
        p_event_id: publishedEvent.id,
        p_items: [{ product_id: orphan.id, variant_id: null, quantity: 1 }],
      });
      if (text.includes("no asociado al evento")) {
        ok("checkout evento sin asociación rechazado");
      } else {
        fail("checkout evento sin asociación rechazado", text.slice(0, 120));
      }
      await rest(url, serviceKey, `store_products?id=eq.${orphan.id}`, {
        method: "DELETE",
      });
    } else {
      ok("checkout evento sin asociación rechazado", "SKIP sin evento");
    }
  }

  // 7. Asociación vencida
  {
    if (publishedEvent && eventAssociationId) {
      const past = new Date(Date.now() - 86_400_000).toISOString();
      await rest(url, serviceKey, `event_store_products?id=eq.${eventAssociationId}`, {
        method: "PATCH",
        body: JSON.stringify({ ends_at: past }),
      });

      const { res, data } = await rest(
        url,
        anonKey,
        `event_store_products?select=id&product_id=eq.${eventOnlyProduct.id}&event_id=eq.${publishedEvent.id}`,
      );

      if (res.ok && (data?.length ?? 0) === 0) {
        ok("asociación vencida no visible vía RLS");
      } else {
        fail("asociación vencida no visible vía RLS");
      }

      const { text } = await rpc(url, anonKey, "create_store_order", {
        p_customer_name: "Test Channels",
        p_customer_email: "test-channels@example.com",
        p_event_id: publishedEvent.id,
        p_items: [{ product_id: eventOnlyProduct.id, variant_id: null, quantity: 1 }],
      });

      if (text.includes("no asociado al evento")) {
        ok("checkout rechaza asociación vencida");
      } else {
        fail("checkout rechaza asociación vencida", text.slice(0, 120));
      }
    } else {
      ok("asociación vencida", "SKIP sin evento/asociación");
      ok("checkout rechaza asociación vencida", "SKIP");
    }
  }

  // 8. Stock compartido — reserva desde evento reduce stock general
  {
    const shared = await createProduct(url, serviceKey, `${TEST_PREFIX}shared-stock`, {
      show_in_store: true,
      stock_total: 3,
    });

    if (publishedEvent) {
      await rest(url, serviceKey, "event_store_products", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          event_id: publishedEvent.id,
          product_id: shared.id,
          is_active: true,
          ends_at: null,
        }),
      });

      const order = await rpc(url, anonKey, "create_store_order", {
        p_customer_name: "Test Stock",
        p_customer_email: "test-stock@example.com",
        p_event_id: publishedEvent.id,
        p_items: [{ product_id: shared.id, variant_id: null, quantity: 1 }],
      });

      const { data: after } = await rest(
        url,
        serviceKey,
        `store_products?select=stock_reserved&id=eq.${shared.id}`,
      );

      if (order.text.includes("order_id") && after?.[0]?.stock_reserved === 1) {
        ok("stock compartido reservado desde evento");
      } else {
        fail("stock compartido reservado desde evento", order.text.slice(0, 120));
      }
    } else {
      ok("stock compartido", "SKIP sin evento publicado");
    }
  }

  // Columna show_in_store existe
  {
    const { res, data } = await rest(
      url,
      serviceKey,
      `store_products?select=show_in_store&slug=eq.${generalProduct.slug}`,
    );
    if (res.ok && data?.[0]?.show_in_store === true) {
      ok("columna show_in_store presente");
    } else {
      fail("columna show_in_store presente");
    }
  }

  await cleanup(url, serviceKey);

  console.log(`\n=== Resumen: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
