#!/usr/bin/env node
/**
 * E2E Storage: admin puede subir/reemplazar/borrar; anon y customer no.
 * Crea usuarios y archivos TEST identificables; limpia al finalizar.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(root, ".env.local"), "utf8");
const get = (name) => {
  const line = envText.split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : "";
};

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET = "store-products";
const RUN = `STORAGE-E2E-${Date.now().toString(36)}`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const flows = [];

function flow(name, ok, note) {
  flows.push({ name, ok, note });
  console.log(`${ok ? "OK" : "FAIL"} | ${name} | ${note}`);
}

function tinyWebp() {
  return Buffer.from(
    "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=",
    "base64",
  );
}

const state = {
  adminUserId: null,
  customerUserId: null,
  testProductId: null,
  testPaths: [],
};

async function createUser(role) {
  const email = `${role}-${RUN}@storage-e2e.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${RUN} ${role}` },
  });
  if (error) throw new Error(error.message);

  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: `${RUN} ${role}`,
    role,
    is_active: true,
  });

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw new Error(signInError.message);

  return { id: data.user.id, client, session: session.session };
}

async function uploadWithClient(client, objectPath, upsert = false) {
  const { error } = await client.storage.from(BUCKET).upload(objectPath, tinyWebp(), {
    contentType: "image/webp",
    upsert,
  });
  return error;
}

async function removeWithClient(client, objectPath) {
  const { error } = await client.storage.from(BUCKET).remove([objectPath]);
  return error;
}

async function cleanup() {
  for (const path of state.testPaths) {
    await admin.storage.from(BUCKET).remove([path]);
  }

  if (state.testProductId) {
    await admin.from("store_product_variants").delete().eq("product_id", state.testProductId);
    await admin.from("store_products").delete().eq("id", state.testProductId);
  }

  for (const userId of [state.adminUserId, state.customerUserId].filter(Boolean)) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  console.log(`=== Storage E2E (${RUN}) ===\n`);

  const adminUser = await createUser("admin");
  state.adminUserId = adminUser.id;
  const customerUser = await createUser("customer");
  state.customerUserId = customerUser.id;

  const testPath = `__storage-tests__/TEST-storage-admin-${RUN}.webp`;
  state.testPaths.push(testPath);

  const customerUploadErr = await uploadWithClient(customerUser.client, testPath);
  flow(
    "Customer upload bloqueado",
    Boolean(customerUploadErr),
    customerUploadErr?.message ?? "subió sin error",
  );

  const adminUploadErr = await uploadWithClient(adminUser.client, testPath);
  flow(
    "Admin upload",
    !adminUploadErr,
    adminUploadErr?.message ?? "OK",
  );

  const replacePath = testPath;
  const adminReplaceErr = await uploadWithClient(
    adminUser.client,
    replacePath.replace(".webp", "-replaced.webp"),
    false,
  );
  const replacedPath = replacePath.replace(".webp", "-replaced.webp");
  if (!adminReplaceErr) state.testPaths.push(replacedPath);
  flow(
    "Admin upload reemplazo (nuevo objeto)",
    !adminReplaceErr,
    adminReplaceErr?.message ?? "OK",
  );

  const adminDeleteErr = await removeWithClient(adminUser.client, replacedPath);
  flow(
    "Admin delete TEST",
    !adminDeleteErr,
    adminDeleteErr?.message ?? "OK",
  );
  if (!adminDeleteErr) {
    state.testPaths = state.testPaths.filter((p) => p !== replacedPath);
  }

  const galleryPath = `__storage-tests__/TEST-storage-admin-gallery-${RUN}.webp`;
  state.testPaths.push(galleryPath);
  const galleryErr = await uploadWithClient(adminUser.client, galleryPath);
  flow("Admin galería upload", !galleryErr, galleryErr?.message ?? "OK");

  const { data: product, error: productError } = await admin
    .from("store_products")
    .insert({
      name: `${RUN} TEST Product`,
      slug: `${RUN.toLowerCase()}-test-product`,
      category: "general",
      description: "Producto temporal de validación storage.",
      short_description: "TEST storage",
      public_price: 1,
      community_price: null,
      main_image_url: null,
      gallery_urls: [],
      is_active: false,
      is_featured: false,
      community_only: false,
      track_stock: true,
      stock_total: 0,
      status: "inactive",
    })
    .select("id")
    .single();

  if (productError) throw productError;
  state.testProductId = product.id;

  const mainPath = `${product.id}/TEST-storage-admin-main-${RUN}.webp`;
  state.testPaths.push(mainPath);
  const mainUploadErr = await uploadWithClient(adminUser.client, mainPath);
  let mainUrl = null;
  if (!mainUploadErr) {
    mainUrl = admin.storage.from(BUCKET).getPublicUrl(mainPath).data.publicUrl;
    await admin
      .from("store_products")
      .update({ main_image_url: mainUrl, gallery_urls: [mainUrl] })
      .eq("id", product.id);
  }
  flow("Admin upload imagen principal producto TEST", !mainUploadErr, mainUploadErr?.message ?? "OK");

  if (mainUrl) {
    const head = await fetch(mainUrl, { method: "HEAD" });
    flow("Render público imagen TEST", head.ok, `HTTP ${head.status}`);
  }

  const galleryRemoveErr = await removeWithClient(adminUser.client, galleryPath);
  flow("Admin eliminar imagen galería TEST", !galleryRemoveErr, galleryRemoveErr?.message ?? "OK");
  if (!galleryRemoveErr) {
    state.testPaths = state.testPaths.filter((p) => p !== galleryPath);
  }

  await cleanup();
  flow("Limpieza TEST", true, "usuarios, producto y archivos eliminados");

  const failed = flows.filter((f) => !f.ok).length;
  console.log(`\n=== Fin: ${flows.length - failed}/${flows.length} OK ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch(async (error) => {
    console.error(error);
    await cleanup().catch(() => {});
    process.exit(1);
  });
