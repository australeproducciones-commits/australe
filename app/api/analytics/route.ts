import { createClient } from "@/lib/supabase/server";
import type { AnalyticsTrackPayload } from "@/lib/analytics/types";
import { NextResponse } from "next/server";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "event_view",
  "ticket_click",
  "purchase_started",
  "purchase_completed",
  "reservation_started",
  "reservation_completed",
  "consumption_view",
  "consumption_purchase_started",
  "consumption_purchase_completed",
]);

export async function POST(request: Request) {
  let body: AnalyticsTrackPayload;

  try {
    body = (await request.json()) as AnalyticsTrackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.event_name || !ALLOWED_EVENTS.has(body.event_name)) {
    return NextResponse.json({ error: "Invalid event_name" }, { status: 400 });
  }

  if (!body.page_path?.trim() || !body.session_id?.trim() || !body.visitor_id?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const userAgent = request.headers.get("user-agent");

  const { error } = await supabase.from("analytics_events").insert({
    event_name: body.event_name,
    page_path: body.page_path.slice(0, 500),
    event_id: body.event_id ?? null,
    ticket_type_id: body.ticket_type_id ?? null,
    session_id: body.session_id.slice(0, 100),
    visitor_id: body.visitor_id.slice(0, 100),
    referrer: body.referrer?.slice(0, 500) ?? null,
    user_agent: userAgent?.slice(0, 500) ?? null,
    metadata: body.metadata ?? {},
  });

  if (error) {
    console.error("analytics insert:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
