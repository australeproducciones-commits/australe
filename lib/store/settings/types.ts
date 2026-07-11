export type StoreHeroSettings = {
  hero_enabled: boolean;
  hero_eyebrow: string;
  hero_title: string;
  hero_description: string;
  hero_desktop_image_url: string | null;
  hero_mobile_image_url: string | null;
  hero_desktop_image_alt: string | null;
  hero_mobile_image_alt: string | null;
  hero_primary_button_label: string;
  hero_primary_button_url: string;
  hero_secondary_button_label: string | null;
  hero_secondary_button_url: string | null;
  hero_badge_enabled: boolean;
  hero_badge_text: string | null;
  hero_footer_text: string | null;
};

export type StoreHeroSettingsInput = StoreHeroSettings;

export type StoreHeroActionResult =
  | { ok: true }
  | { ok: false; message: string };
