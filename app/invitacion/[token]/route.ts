import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/constants/routes";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const admin = createAdminClient();

  const { data: invitation, error: fetchError } = await admin
    .from("community_event_invitations")
    .select("id, event_id, cancelled_at")
    .eq("public_token", token)
    .maybeSingle();

  if (fetchError || !invitation || invitation.cancelled_at) {
    return NextResponse.redirect(new URL(ROUTES.eventos, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  }

  try {
    await admin.rpc("record_community_invitation_open", { p_token: token });
  } catch (error) {
    console.error("record_community_invitation_open:", error);
  }

  const { data: event } = await admin
    .from("events")
    .select("slug")
    .eq("id", invitation.event_id)
    .maybeSingle();

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const destination = event?.slug
    ? `${base}${ROUTES.evento(event.slug)}`
    : `${base}${ROUTES.eventos}`;

  return NextResponse.redirect(destination);
}
