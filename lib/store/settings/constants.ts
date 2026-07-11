import { ROUTES } from "@/lib/constants/routes";
import type { StoreHeroSettings } from "@/lib/store/settings/types";

export const DEFAULT_STORE_HERO_SETTINGS: StoreHeroSettings = {
  hero_enabled: true,
  hero_eyebrow: "TIENDA OFICIAL",
  hero_title: "Llevá Australe con vos",
  hero_description:
    "Merchandising oficial para quienes no solo viven el evento, sino que forman parte de él.",
  hero_desktop_image_url: null,
  hero_mobile_image_url: null,
  hero_desktop_image_alt: "Campaña de merchandising oficial Australe",
  hero_mobile_image_alt: "Campaña de merchandising oficial Australe",
  hero_primary_button_label: "Ver la colección",
  hero_primary_button_url: `${ROUTES.tienda}#catalogo`,
  hero_secondary_button_label: "Explorar novedades",
  hero_secondary_button_url: `${ROUTES.tienda}#destacados`,
  hero_badge_enabled: true,
  hero_badge_text: "MERCH OFICIAL",
  hero_footer_text: "Diseños oficiales · Ediciones limitadas · Comunidad Australe",
};
