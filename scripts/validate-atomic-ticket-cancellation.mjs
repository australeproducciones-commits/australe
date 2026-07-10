/**
 * Validación ETAPA H1 — cancelación atómica cancel_ticket + reverso loyalty.
 * Uso: node scripts/validate-atomic-ticket-cancellation.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
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

const RUN_ID = Date.now().toString(36);
const PREFIX = `H1-CANCEL-${RUN_ID}`;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;

const state = {
  authUserIds: [],
  eventIds: [],
  ticketTypeIds: [],
  ticketIds: [],
  adminClient: null,
  customerId: null,
};

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function bad(name, detail = "") {
  failed++;
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

async function createAdminClient() {
  const email = `admin_${RUN_ID}@h1-cancel-test.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createAdmin: ${error.message}`);
  state.authUserIds.push(data.user.id);
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: "H1 Admin",
    role: "admin",
    is_active: true,
  });
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(signErr.message);
  state.adminClient = client;
  return client;
}

async function createCustomer() {
  const email = `customer_${RUN_ID}@h1-cancel-test.invalid`;
  const password = `Tst!${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createCustomer: ${error.message}`);
  state.authUserIds.push(data.user.id);
  state.customerId = data.user.id;
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: "H1 Customer",
    role: "customer",
    is_active: true,
  });
  await admin.rpc("ensure_loyalty_account", { p_user_id: data.user.id });
  return data.user.id;
}

async function createFixtureEvent() {
  const slug = `${PREFIX}-event-${randomUUID().slice(0, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const { data: event, error } = await admin
    .from("events")
    .insert({
      name: `${PREFIX} evento`,
      slug,
      event_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: "published",
      audience: "public",
      financial_management_status: "open",
      ticket_sale_mode: "internal",
      sale_web_enabled: false,
      external_sale_enabled: false,
      sale_whatsapp_enabled: false,
      reservation_enabled: false,
      is_featured: false,
      home_order: 0,
      sales_qr_enabled: false,
      qr_sell_tickets: false,
      qr_products_enabled: false,
      qr_show_price_list: false,
      qr_sell_products: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  state.eventIds.push(event.id);

  const { data: ticketType, error: ttErr } = await admin
    .from("ticket_types")
    .insert({
      event_id: event.id,
      name: `${PREFIX} tipo`,
      public_price: 15000,
      community_price: 15000,
      stock_total: 50,
      stock_sold: 0,
      is_active: true,
    })
    .select("id")
    .single();
  if (ttErr) throw new Error(ttErr.message);
  state.ticketTypeIds.push(ticketType.id);
  return { event, ticketType };
}

async function createTicket(userId, withPoints = true) {
  const { event, ticketType } = await createFixtureEvent();
  await admin.from("ticket_types").update({ stock_sold: 1 }).eq("id", ticketType.id);

  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({
      event_id: event.id,
      ticket_type_id: ticketType.id,
      user_id: userId,
      buyer_name: `${PREFIX} buyer`,
      qr_token: `qr-${RUN_ID}-${randomUUID().slice(0, 8)}`,
      original_price: 15000,
      price_paid: 15000,
      discount_amount: 0,
      payment_method: "transfer",
      payment_status: "confirmed",
      ticket_status: "valid",
      sales_channel: "web",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  state.ticketIds.push(ticket.id);

  if (withPoints && userId) {
    const { error: awardErr } = await admin.rpc("award_loyalty_points_for_ticket", {
      p_ticket_id: ticket.id,
    });
    if (awardErr) throw new Error(awardErr.message);
  }

  return ticket;
}

async function cancelAsAdmin(ticketId, reason = "H1 test") {
  return state.adminClient.rpc("cancel_ticket", {
    p_ticket_id: ticketId,
    p_cancel_reason: reason,
    p_mark_as_expired: false,
  });
}

async function countReversals(ticketId) {
  const { count } = await admin
    .from("loyalty_transactions")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", `ticket:${ticketId}:reversal`);
  return count ?? 0;
}

async function getBalance(userId) {
  const { data } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function sumLedgerPoints(userId) {
  const { data } = await admin
    .from("loyalty_transactions")
    .select("points")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0);
}

async function cleanup() {
  console.log("\n--- Limpieza ---");
  for (const ticketId of state.ticketIds) {
    await admin
      .from("loyalty_transactions")
      .delete()
      .or(`source_id.eq.${ticketId},idempotency_key.like.ticket:${ticketId}%`);
    await admin.from("tickets").delete().eq("id", ticketId);
  }
  for (const ttId of state.ticketTypeIds) {
    await admin.from("ticket_types").delete().eq("id", ttId);
  }
  for (const eventId of state.eventIds) {
    await admin.from("events").delete().eq("id", eventId);
  }
  for (const userId of state.authUserIds) {
    await admin.from("loyalty_transactions").delete().eq("user_id", userId);
    await admin.from("loyalty_accounts").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .ilike("slug", `%${PREFIX.toLowerCase()}%`);
  if ((count ?? 0) === 0) ok("cleanup completo");
  else bad("cleanup completo", `eventos residuales=${count}`);
}

async function main() {
  console.log(`\n=== H1 validate atomic ticket cancellation (${RUN_ID}) ===\n`);

  try {
    await createAdminClient();
    const userId = await createCustomer();

    const ticket = await createTicket(userId, true);
    const balanceBefore = (await getBalance(userId))?.points_balance ?? 0;
    const reversalsBefore = await countReversals(ticket.id);
    const txBefore = (
      await admin
        .from("loyalty_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
    ).count;

    if (balanceBefore === 15 && reversalsBefore === 0) {
      ok("fixture con puntos otorgados", `saldo=${balanceBefore}`);
    } else {
      bad("fixture con puntos", `saldo=${balanceBefore}, rev=${reversalsBefore}`);
    }

    const cancel1 = await cancelAsAdmin(ticket.id, "Cancelación H1");
    if (!cancel1.error) ok("admin cancela entrada válida");
    else bad("admin cancela entrada válida", cancel1.error.message);

    const { data: ticketRow } = await admin
      .from("tickets")
      .select("ticket_status, payment_status")
      .eq("id", ticket.id)
      .single();
    if (ticketRow?.ticket_status === "cancelled") ok("ticket queda cancelado");
    else bad("ticket queda cancelado", ticketRow?.ticket_status);

    const balanceAfter1 = (await getBalance(userId))?.points_balance ?? -1;
    const reversalsAfter1 = await countReversals(ticket.id);
    if (balanceAfter1 === 0 && reversalsAfter1 === 1) {
      ok("puntos revertidos una sola vez", `saldo=${balanceAfter1}, reversos=${reversalsAfter1}`);
    } else {
      bad("reverso único", `saldo=${balanceAfter1}, reversos=${reversalsAfter1}`);
    }

    const cancel2 = await cancelAsAdmin(ticket.id, "Segunda cancelación");
    if (!cancel2.error) ok("segunda cancelación idempotente (sin error RPC)");
    else bad("segunda cancelación", cancel2.error.message);

    const reversalsAfter2 = await countReversals(ticket.id);
    const balanceAfter2 = (await getBalance(userId))?.points_balance ?? -1;
    if (reversalsAfter2 === 1 && balanceAfter2 === 0) {
      ok("segunda cancelación no duplica reverso");
    } else {
      bad("idempotencia segunda cancelación", `rev=${reversalsAfter2}, saldo=${balanceAfter2}`);
    }

    const ticketConcurrent = await createTicket(userId, true);
    const [cA, cB] = await Promise.all([
      cancelAsAdmin(ticketConcurrent.id, "concurrent A"),
      cancelAsAdmin(ticketConcurrent.id, "concurrent B"),
    ]);
    const concurrentErrors = [cA.error?.message, cB.error?.message].filter(Boolean);
    const concurrentOk = (!cA.error || cA.data) && (!cB.error || cB.data);
    const revConcurrent = await countReversals(ticketConcurrent.id);
    if (concurrentOk && revConcurrent === 1) {
      ok("concurrencia — un solo reverso", `rev=${revConcurrent}`);
    } else {
      bad("concurrencia", `rev=${revConcurrent}, errors=${concurrentErrors.join(" | ")}`);
    }

    const ticketNoPoints = await createTicket(null, false);
    const cancelNoPts = await cancelAsAdmin(ticketNoPoints.id);
    const revNoPts = await countReversals(ticketNoPoints.id);
    if (!cancelNoPts.error && revNoPts === 0) ok("ticket sin puntos cancela sin reverso");
    else bad("ticket sin puntos", cancelNoPts.error?.message ?? `rev=${revNoPts}`);

    const ledgerSum = await sumLedgerPoints(userId);
    const finalBalance = (await getBalance(userId))?.points_balance ?? 0;
    if (ledgerSum === finalBalance && finalBalance >= 0) {
      ok("ledger coincide con saldo", `sum=${ledgerSum}, balance=${finalBalance}`);
    } else {
      bad("ledger vs saldo", `sum=${ledgerSum}, balance=${finalBalance}`);
    }

    if (finalBalance >= 0) ok("sin saldos negativos incorrectos");
    else bad("saldos negativos", String(finalBalance));

    const fakeId = "00000000-0000-4000-8000-000000000099";
    const missing = await cancelAsAdmin(fakeId);
    if (missing.error?.message?.includes("no encontrada")) ok("ticket inexistente — error controlado");
    else bad("ticket inexistente", missing.error?.message ?? "sin error");

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonErr } = await anon.rpc("cancel_ticket", {
      p_ticket_id: fakeId,
      p_cancel_reason: "hack",
      p_mark_as_expired: false,
    });
    if (anonErr?.message?.toLowerCase().includes("no autenticado")) ok("anon no puede cancelar");
    else bad("anon no puede cancelar", anonErr?.message ?? "sin error");

    const custClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const custEmail = `cust2_${RUN_ID}@h1-cancel-test.invalid`;
    const custPass = `Tst!${randomUUID().slice(0, 12)}`;
    const { data: custAuth } = await admin.auth.admin.createUser({
      email: custEmail,
      password: custPass,
      email_confirm: true,
    });
    state.authUserIds.push(custAuth.user.id);
    await admin.from("profiles").upsert({
      id: custAuth.user.id,
      role: "customer",
      is_active: true,
    });
    await custClient.auth.signInWithPassword({ email: custEmail, password: custPass });
    const { error: custErr } = await custClient.rpc("cancel_ticket", {
      p_ticket_id: fakeId,
      p_cancel_reason: "hack",
      p_mark_as_expired: false,
    });
    if (custErr?.message?.toLowerCase().includes("administradores")) ok("customer no admin no puede cancelar");
    else bad("customer no admin", custErr?.message ?? "sin error");

    const ticketFail = await createTicket(userId, true);
    await admin.rpc("adjust_loyalty_points", {
      p_user_id: userId,
      p_points: -15,
      p_reason: `${PREFIX} gastar puntos`,
      p_admin_id: state.authUserIds[0],
    });
    const failCancel = await cancelAsAdmin(ticketFail.id);
    const { data: failRow } = await admin
      .from("tickets")
      .select("ticket_status")
      .eq("id", ticketFail.id)
      .single();
    if (
      failCancel.error?.message?.includes("LOYALTY_POINTS_ALREADY_SPENT") &&
      failRow?.ticket_status === "valid"
    ) {
      ok("fallo atómico — ticket no cancelado si reverso imposible");
    } else {
      bad(
        "fallo atómico",
        `status=${failRow?.ticket_status}, err=${failCancel.error?.message}`,
      );
    }

    void txBefore;
    void balanceBefore;
    void reversalsBefore;
  } finally {
    await cleanup();
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
