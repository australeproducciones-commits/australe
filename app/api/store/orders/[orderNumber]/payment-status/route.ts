import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { orderNumber } = await context.params;
  const normalized = orderNumber.trim().toUpperCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("store_orders")
    .select("id, order_number, status, payment_status, payment_provider, payment_reference, paid_at, reserved_until, user_id")
    .eq("order_number", normalized)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  if (order.user_id && order.user_id !== user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: transactions } = await admin
    .from("payment_transactions")
    .select("id, status, status_detail, amount, currency, provider_payment_id, provider_preference_id, approved_at, updated_at")
    .eq("order_id", order.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    order: {
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentProvider: order.payment_provider,
      paymentReference: order.payment_reference,
      paidAt: order.paid_at,
      reservedUntil: order.reserved_until,
    },
    transactions: transactions ?? [],
  });
}
