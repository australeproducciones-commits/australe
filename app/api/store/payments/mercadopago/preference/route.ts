import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/payments/rate-limit";
import { createStoreMercadoPagoPreference } from "@/lib/payments/store";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rateKey = user?.id ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  const rate = checkRateLimit(`mp-preference:${rateKey}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un momento." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  let body: { orderId?: string; pickupCode?: string };
  try {
    body = (await request.json()) as { orderId?: string; pickupCode?: string };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "Falta orderId." }, { status: 400 });
  }

  const result = await createStoreMercadoPagoPreference({
    orderId: body.orderId,
    pickupCode: body.pickupCode,
  });

  if (!result.success) {
    const status =
      result.code === "forbidden"
        ? 403
        : result.code === "not_found"
          ? 404
          : result.code === "disabled" || result.code === "not_configured"
            ? 503
            : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    initPoint: result.initPoint,
    preferenceId: result.preferenceId,
  });
}
