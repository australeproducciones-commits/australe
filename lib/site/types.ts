export type SiteSettings = {
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_location: string | null;
  instagram_url: string | null;
};

export type Partner = {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  destination_url: string | null;
  label: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  view_count: number;
  click_count: number;
};

export type PartnerInput = {
  name: string;
  description?: string | null;
  image_url: string;
  destination_url?: string | null;
  label?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
};

export type AdvertisingFrequency =
  | "once_per_session"
  | "once_per_user"
  | "once_per_campaign"
  | "always_after_login";

/** Frecuencia recomendada: una impresión por campaña y usuario (métricas reales sin repetición). */
export const DEFAULT_ADVERTISING_FREQUENCY: AdvertisingFrequency =
  "once_per_campaign";

export const ADVERTISING_FREQUENCY_OPTIONS: Array<{
  value: AdvertisingFrequency;
  label: string;
  recommended?: boolean;
}> = [
  {
    value: "once_per_campaign",
    label: "Una vez por campaña y usuario",
    recommended: true,
  },
  { value: "once_per_session", label: "Una vez por sesión" },
  { value: "once_per_user", label: "Una vez por usuario" },
  { value: "always_after_login", label: "Siempre después del login" },
];

export type AdvertisingCampaign = {
  id: string;
  internal_name: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  button_label: string | null;
  destination_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  frequency: AdvertisingFrequency;
  open_in_new_tab: boolean;
  view_count: number;
  click_count: number;
  dismiss_count: number;
  created_at: string;
};

export type AdvertisingCampaignInput = {
  internal_name: string;
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  button_label?: string | null;
  destination_url?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
  frequency: AdvertisingFrequency;
  open_in_new_tab: boolean;
};

export type SiteActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type PartnerActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

export type AdvertisingActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

export type ActiveAdvertisingCampaign = Pick<
  AdvertisingCampaign,
  | "id"
  | "title"
  | "body"
  | "image_url"
  | "button_label"
  | "destination_url"
  | "frequency"
  | "open_in_new_tab"
>;
