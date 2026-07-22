import type { GiveawayFormInput } from "@/lib/community/giveaways/types";
import {
  validateGiveawayForm,
  validateGiveawayImageUrl,
} from "@/lib/community/giveaways/validation";
import { SHORT_DESCRIPTION_MAX } from "@/lib/community/giveaways/form-ui";

export type GiveawayFormFieldErrors = Partial<
  Record<
    | "name"
    | "slug"
    | "prize_description"
    | "short_description"
    | "description"
    | "image_url"
    | "entry_type"
    | "points_cost"
    | "max_entries_per_user"
    | "winner_count"
    | "alternate_count"
    | "starts_at"
    | "closes_at"
    | "draw_at"
    | "claim_deadline"
    | "minimum_purchase_amount"
    | "terms_and_conditions"
    | "form",
    string
  >
>;

export function validateGiveawayFormFields(
  input: GiveawayFormInput,
): GiveawayFormFieldErrors {
  const errors: GiveawayFormFieldErrors = {};

  if (!input.name?.trim()) {
    errors.name = "El nombre del sorteo es obligatorio.";
  }

  if (!input.slug?.trim()) {
    errors.slug = "El slug es obligatorio.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    errors.slug =
      "El slug solo puede contener letras minúsculas, números y guiones.";
  }

  if (!input.prize_description?.trim()) {
    errors.prize_description = "Indicá qué recibirá el ganador.";
  }

  if (
    input.short_description &&
    input.short_description.length > SHORT_DESCRIPTION_MAX
  ) {
    errors.short_description = `Máximo ${SHORT_DESCRIPTION_MAX} caracteres.`;
  }

  const winnerCount = input.winner_count ?? 1;
  const alternateCount = input.alternate_count ?? 0;

  if (!Number.isInteger(winnerCount) || winnerCount < 1) {
    errors.winner_count = "Debe haber al menos un ganador.";
  } else if (winnerCount > 50) {
    errors.winner_count = "Revisá la cantidad de ganadores: parece muy alta.";
  }

  if (!Number.isInteger(alternateCount) || alternateCount < 0) {
    errors.alternate_count = "Los suplentes no pueden ser negativos.";
  } else if (alternateCount > 100) {
    errors.alternate_count = "Revisá la cantidad de suplentes: parece muy alta.";
  }

  if (input.allow_multiple_entries) {
    const maxEntries = input.max_entries_per_user;
    if (maxEntries == null || maxEntries < 1) {
      errors.max_entries_per_user =
        "Indicá el máximo de participaciones por usuario (mínimo 1).";
    }
  }

  const pointsCost = input.points_cost ?? 0;
  if (pointsCost < 0) {
    errors.points_cost = "El costo en puntos no puede ser negativo.";
  }

  if (
    (input.entry_type === "points" || input.entry_type === "mixed") &&
    pointsCost <= 0
  ) {
    errors.points_cost = "Indicá cuántos puntos cuesta cada participación.";
  }

  if (input.entry_type === "store_purchase") {
    const minimum = input.minimum_purchase_amount ?? 0;
    if (minimum <= 0) {
      errors.minimum_purchase_amount =
        "Indicá el importe mínimo de compra requerido.";
    }
  }

  const imageError = validateGiveawayImageUrl(input.image_url);
  if (imageError) {
    errors.image_url = imageError;
  }

  if (input.starts_at && input.closes_at) {
    if (new Date(input.starts_at) >= new Date(input.closes_at)) {
      errors.closes_at = "El cierre debe ser posterior al inicio.";
    }
  }

  if (input.closes_at && input.draw_at) {
    if (new Date(input.closes_at) >= new Date(input.draw_at)) {
      errors.draw_at = "El sorteo debe programarse después del cierre.";
    }
  }

  if (input.draw_at && input.claim_deadline) {
    if (new Date(input.draw_at) >= new Date(input.claim_deadline)) {
      errors.claim_deadline =
        "El límite de reclamo debe ser posterior al sorteo.";
    }
  }

  const serverError = validateGiveawayForm(input);
  if (serverError && !Object.keys(errors).length) {
    errors.form = serverError;
  }

  return errors;
}

export function hasGiveawayFormErrors(errors: GiveawayFormFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
