import type { StoreHeroSettings, StoreHeroSettingsInput } from "@/lib/store/settings/types";
import { DEFAULT_STORE_HERO_SETTINGS } from "@/lib/store/settings/constants";

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeStoreHeroImageUrl(value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value);
  if (!trimmed) {
    return null;
  }
  if (!isValidHttpUrl(trimmed)) {
    return null;
  }
  return trimmed;
}

export function normalizeStoreHeroButtonUrl(value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value);
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (isValidHttpUrl(trimmed)) {
    return trimmed;
  }
  return null;
}

export function mergeStoreHeroSettings(
  row: Partial<StoreHeroSettings> | null | undefined,
): StoreHeroSettings {
  const base = DEFAULT_STORE_HERO_SETTINGS;
  if (!row) {
    return { ...base };
  }

  return {
    hero_enabled: row.hero_enabled ?? base.hero_enabled,
    hero_eyebrow: trimOrNull(row.hero_eyebrow) ?? base.hero_eyebrow,
    hero_title: trimOrNull(row.hero_title) ?? base.hero_title,
    hero_description: trimOrNull(row.hero_description) ?? base.hero_description,
    hero_desktop_image_url: normalizeStoreHeroImageUrl(row.hero_desktop_image_url),
    hero_mobile_image_url: normalizeStoreHeroImageUrl(row.hero_mobile_image_url),
    hero_desktop_image_alt:
      trimOrNull(row.hero_desktop_image_alt) ?? base.hero_desktop_image_alt,
    hero_mobile_image_alt:
      trimOrNull(row.hero_mobile_image_alt) ?? base.hero_mobile_image_alt,
    hero_primary_button_label:
      trimOrNull(row.hero_primary_button_label) ?? base.hero_primary_button_label,
    hero_primary_button_url:
      normalizeStoreHeroButtonUrl(row.hero_primary_button_url) ??
      base.hero_primary_button_url,
    hero_secondary_button_label: trimOrNull(row.hero_secondary_button_label),
    hero_secondary_button_url: normalizeStoreHeroButtonUrl(row.hero_secondary_button_url),
    hero_badge_enabled: row.hero_badge_enabled ?? base.hero_badge_enabled,
    hero_badge_text: trimOrNull(row.hero_badge_text),
    hero_footer_text: trimOrNull(row.hero_footer_text),
  };
}

export function validateStoreHeroSettingsInput(
  input: StoreHeroSettingsInput,
): string | null {
  if (!input.hero_primary_button_label.trim()) {
    return "El botón principal necesita un texto.";
  }
  if (!normalizeStoreHeroButtonUrl(input.hero_primary_button_url)) {
    return "El enlace del botón principal no es válido.";
  }
  if (input.hero_secondary_button_label?.trim()) {
    if (!normalizeStoreHeroButtonUrl(input.hero_secondary_button_url)) {
      return "El enlace del botón secundario no es válido.";
    }
  }
  if (input.hero_desktop_image_url && !normalizeStoreHeroImageUrl(input.hero_desktop_image_url)) {
    return "La URL de imagen de escritorio no es válida.";
  }
  if (input.hero_mobile_image_url && !normalizeStoreHeroImageUrl(input.hero_mobile_image_url)) {
    return "La URL de imagen móvil no es válida.";
  }
  if (input.hero_badge_enabled && !input.hero_badge_text?.trim()) {
    return "La etiqueta flotante necesita texto cuando está activa.";
  }
  return null;
}

export function storeHeroSettingsToPayload(input: StoreHeroSettingsInput) {
  const secondaryLabel = trimOrNull(input.hero_secondary_button_label);
  return {
    hero_enabled: input.hero_enabled,
    hero_eyebrow: trimOrNull(input.hero_eyebrow),
    hero_title: trimOrNull(input.hero_title),
    hero_description: trimOrNull(input.hero_description),
    hero_desktop_image_url: normalizeStoreHeroImageUrl(input.hero_desktop_image_url),
    hero_mobile_image_url: normalizeStoreHeroImageUrl(input.hero_mobile_image_url),
    hero_desktop_image_alt: trimOrNull(input.hero_desktop_image_alt),
    hero_mobile_image_alt: trimOrNull(input.hero_mobile_image_alt),
    hero_primary_button_label: trimOrNull(input.hero_primary_button_label),
    hero_primary_button_url: normalizeStoreHeroButtonUrl(input.hero_primary_button_url),
    hero_secondary_button_label: secondaryLabel,
    hero_secondary_button_url: secondaryLabel
      ? normalizeStoreHeroButtonUrl(input.hero_secondary_button_url)
      : null,
    hero_badge_enabled: input.hero_badge_enabled,
    hero_badge_text: input.hero_badge_enabled ? trimOrNull(input.hero_badge_text) : null,
    hero_footer_text: trimOrNull(input.hero_footer_text),
  };
}
