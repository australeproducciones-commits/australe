import type { GiveawayFormInput } from "@/lib/community/giveaways/types";
import { slugifyGiveawayName } from "@/lib/community/giveaways/utils";

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
  return null;
}

export function buildGiveawaySlug(name: string, existingSlug?: string): string {
  if (existingSlug?.trim()) return existingSlug.trim();
  return slugifyGiveawayName(name);
}

export function canEditEssentialRules(hasActiveEntries: boolean): boolean {
  return !hasActiveEntries;
}
