import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const cronHeader = request.headers.get("x-cron-secret");
  return cronHeader === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("expire_store_reservations");

    if (error) {
      console.error("expire-store-reservations cron:", error.message);
      return NextResponse.json({ error: "No se pudo expirar reservas." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      expired_count: data ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("expire-store-reservations cron:", message);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
