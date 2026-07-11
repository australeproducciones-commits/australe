import { DEFAULT_STORE_HERO_SETTINGS } from "@/lib/store/settings/constants";
import type { StoreHeroSettings } from "@/lib/store/settings/types";
import { mergeStoreHeroSettings } from "@/lib/store/settings/utils";
import { CACHE_TAGS } from "@/lib/supabase/cacheTags";
import { createPublicClient } from "@/lib/supabase/public";
import { withQueryTimeout } from "@/lib/supabase/queryTimeout";
import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const STORE_HERO_COLUMNS =
  "hero_enabled, hero_eyebrow, hero_title, hero_description, hero_desktop_image_url, hero_mobile_image_url, hero_desktop_image_alt, hero_mobile_image_alt, hero_primary_button_label, hero_primary_button_url, hero_secondary_button_label, hero_secondary_button_url, hero_badge_enabled, hero_badge_text, hero_footer_text";

async function fetchStoreHeroSettingsUncached(): Promise<StoreHeroSettings> {
  const supabase = createPublicClient();

  const { data, error } = await withQueryTimeout("getStoreHeroSettings", (signal) =>
    supabase
      .from("store_settings")
      .select(STORE_HERO_COLUMNS)
      .eq("id", 1)
      .abortSignal(signal)
      .maybeSingle(),
  );

  if (error || !data) {
    return { ...DEFAULT_STORE_HERO_SETTINGS };
  }

  return mergeStoreHeroSettings(data as Partial<StoreHeroSettings>);
}

const getStoreHeroSettingsCached = unstable_cache(
  fetchStoreHeroSettingsUncached,
  ["public-store-hero-settings"],
  { revalidate: 120, tags: [CACHE_TAGS.storeSettings] },
);

export async function getStoreHeroSettings(): Promise<StoreHeroSettings> {
  return getStoreHeroSettingsCached();
}

export async function getStoreHeroSettingsForAdmin(): Promise<StoreHeroSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_settings")
    .select(STORE_HERO_COLUMNS)
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_STORE_HERO_SETTINGS };
  }

  return mergeStoreHeroSettings(data as Partial<StoreHeroSettings>);
}
