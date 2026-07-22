import { timingSafeEqual } from "node:crypto";

/**
 * Comparación resistente a timing attacks para CRON_SECRET.
 */
export function isValidCronSecret(
  configured: string | undefined,
  provided: string | null | undefined,
): boolean {
  if (!configured || !provided) {
    return false;
  }

  const expected = Buffer.from(configured, "utf8");
  const actual = Buffer.from(provided, "utf8");

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
