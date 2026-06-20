import { ROUTES } from "@/lib/constants/routes";

const RETURN_TO_PARAM = "returnTo";

export function sanitizeReturnTo(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const trimmed = path.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return null;
  }

  return trimmed;
}

export function buildLoginUrl(returnTo?: string | null): string {
  const safePath = sanitizeReturnTo(returnTo);

  if (!safePath) {
    return ROUTES.login;
  }

  const params = new URLSearchParams();
  params.set(RETURN_TO_PARAM, safePath);
  return `${ROUTES.login}?${params.toString()}`;
}

export function getReturnToFromSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): string | null {
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get(RETURN_TO_PARAM)
      : searchParams[RETURN_TO_PARAM];

  if (Array.isArray(raw)) {
    return sanitizeReturnTo(raw[0]);
  }

  return sanitizeReturnTo(raw ?? null);
}

export const POST_LOGIN_AD_SESSION_KEY = "australe:post-login-ad";
