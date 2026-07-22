import { NextResponse } from "next/server";
import { isValidCronSecret } from "@/lib/community/giveaways/cron-auth";

function extractProjectRef(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Diagnóstico seguro del entorno (Preview/staging). Requiere CRON_SECRET.
 * No expone URLs completas, claves ni tokens.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : request.headers.get("x-cron-secret");

  if (!isValidCronSecret(cronSecret, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    vercel_environment: process.env.VERCEL_ENV ?? "unknown",
    git_branch:
      process.env.VERCEL_GIT_COMMIT_REF ??
      process.env.VERCEL_GIT_BRANCH ??
      null,
    git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    supabase_project_ref: extractProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL),
    service_role_configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cron_secret_configured: Boolean(cronSecret),
  });
}
