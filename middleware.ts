import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/getProfile";
import {
  getEffectiveRole,
  requiresAuthCheck,
  resolveMiddlewareRedirect,
} from "@/lib/auth/routeAccess";
import { ROLES, type Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  const pathname = request.nextUrl.pathname;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    await supabase.auth.signOut({ scope: "global" });
  }

  if (!requiresAuthCheck(pathname)) {
    return supabaseResponse;
  }

  const isAuthenticated = !!user && !authError;
  let role: Role = ROLES.CUSTOMER;

  if (isAuthenticated) {
    const profile = await getProfile(supabase);
    role = getEffectiveRole(profile);
  }

  const redirectPath = resolveMiddlewareRedirect(pathname, {
    isAuthenticated,
    role,
    returnTo: request.nextUrl.searchParams.get("returnTo"),
  });

  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone();
    if (redirectPath.startsWith("/login")) {
      redirectUrl.pathname = ROUTES.login;
      redirectUrl.search = redirectPath.includes("?")
        ? redirectPath.slice(redirectPath.indexOf("?"))
        : "";
    } else {
      redirectUrl.pathname = redirectPath;
      redirectUrl.search = "";
    }
    const redirectResponse = NextResponse.redirect(redirectUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
