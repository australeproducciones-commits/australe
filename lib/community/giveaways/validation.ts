import type { GiveawayFormInput } from "@/lib/community/giveaways/types";
import { slugifyGiveawayName } from "@/lib/community/giveaways/utils";

const BLOCKED_IMAGE_URL_PROTOCOLS = /^(javascript|data|file|vbscript):/i;

/**
 * Valida image_url en servidor. Acepta https, http o rutas internas (/...).
 */
export function validateGiveawayImageUrl(
  imageUrl: string | null | undefined,
): string | null {
  if (imageUrl == null || imageUrl.trim() === "") {
    return null;
  }

  const value = imageUrl.trim();

  if (BLOCKED_IMAGE_URL_PROTOCOLS.test(value)) {
    return "La URL de imagen usa un protocolo no permitido.";
  }

  if (value.startsWith("/")) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "La URL de imagen no es válida.";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "La URL de imagen debe usar http o https.";
  }

  return null;
}

export function validateGiveawayForm(input: GiveawayFormInput): string | null {
  if (!input.name?.trim()) return "El nombre es obligatorio.";
  if (!input.prize_description?.trim()) return "La descripción del premio es obligatoria.";
  if (!input.slug?.trim()) return "El slug es obligatorio.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    return "El slug solo puede contener letras minúsculas, números y guiones.";
  }
  if ((input.winner_count ?? 1) < 1) return "Debe haber al menos un ganador.";
  if ((input.alternate_count ?? 0) < 0) return "Los suplentes no pueden ser negativos.";
  if ((input.points_cost ?? 0) < 0) return "El costo en puntos no puede ser negativo.";
  if (input.entry_type === "points" && (input.points_cost ?? 0) <= 0) {
    return "Los sorteos por puntos requieren un costo mayor a cero.";
  }
  if (input.starts_at && input.closes_at) {
    if (new Date(input.starts_at) > new Date(input.closes_at)) {
      return "La fecha de inicio debe ser anterior al cierre.";
    }
  }
  if (input.closes_at && input.draw_at) {
    if (new Date(input.closes_at) > new Date(input.draw_at)) {
      return "El sorteo debe programarse después del cierre.";
    }
  }

  const imageError = validateGiveawayImageUrl(input.image_url);
  if (imageError) return imageError;

  return null;
}

export function buildGiveawaySlug(name: string, existingSlug?: string): string {
  if (existingSlug?.trim()) return existingSlug.trim();
  return slugifyGiveawayName(name);
}

export function canEditEssentialRules(hasActiveEntries: boolean): boolean {
  return !hasActiveEntries;
}
