import { NextResponse } from "next/server";
import { maintainCommunityGiveaways } from "@/lib/community/giveaways/service";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : request.headers.get("x-cron-secret");

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await maintainCommunityGiveaways();
  return NextResponse.json({ ok: true, ...result });
}
