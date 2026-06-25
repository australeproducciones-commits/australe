import {
  INSTAGRAM_URL,
} from "@/lib/constants/routes";
import type {
  AdvertisingCampaign,
  AdvertisingFrequency,
  Partner,
  SiteSettings,
} from "@/lib/site/types";
import { CACHE_TAGS } from "@/lib/supabase/cacheTags";
import { createPublicClient } from "@/lib/supabase/public";
import { withQueryTimeout } from "@/lib/supabase/queryTimeout";
import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const SITE_SETTINGS_COLUMNS =
  "contact_email, contact_phone, contact_whatsapp, contact_location, instagram_url";

const PARTNER_COLUMNS =
  "id, name, description, image_url, destination_url, label, is_active, starts_at, ends_at, sort_order, open_in_new_tab, view_count, click_count";

export const EMPTY_SITE_SETTINGS: SiteSettings = {
  contact_email: null,
  contact_phone: null,
  contact_whatsapp: null,
  contact_location: null,
  instagram_url: INSTAGRAM_URL,
};

async function fetchSiteSettingsUncached(): Promise<SiteSettings> {
  const supabase = createPublicClient();

  const { data, error } = await withQueryTimeout("getSiteSettings", (signal) =>
    supabase
      .from("site_settings")
      .select(SITE_SETTINGS_COLUMNS)
      .eq("id", 1)
      .abortSignal(signal)
      .maybeSingle(),
  );

  if (error || !data) {
    return EMPTY_SITE_SETTINGS;
  }

  return {
    contact_email: data.contact_email ?? null,
    contact_phone: data.contact_phone ?? null,
    contact_whatsapp: data.contact_whatsapp ?? null,
    contact_location: data.contact_location ?? null,
    instagram_url: data.instagram_url ?? INSTAGRAM_URL,
  };
}

const getSiteSettingsCached = unstable_cache(
  fetchSiteSettingsUncached,
  ["public-site-settings"],
  { revalidate: 300, tags: [CACHE_TAGS.siteSettings] },
);

export async function getSiteSettings(): Promise<SiteSettings> {
  return getSiteSettingsCached();
}

function isPartnerCurrentlyActive(partner: Partner, now = Date.now()): boolean {
  if (!partner.is_active) {
    return false;
  }

  if (partner.starts_at && Date.parse(partner.starts_at) > now) {
    return false;
  }

  if (partner.ends_at && Date.parse(partner.ends_at) <= now) {
    return false;
  }

  return true;
}

async function fetchActivePartnersUncached(): Promise<Partner[]> {
  const supabase = createPublicClient();

  const { data, error } = await withQueryTimeout("getActivePartners", (signal) =>
    supabase
      .from("partners")
      .select(PARTNER_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .abortSignal(signal),
  );

  if (error || !data) {
    return [];
  }

  return (data as Partner[]).filter((partner) => isPartnerCurrentlyActive(partner));
}

const getActivePartnersCached = unstable_cache(
  fetchActivePartnersUncached,
  ["public-active-partners"],
  { revalidate: 300, tags: [CACHE_TAGS.partners] },
);

export async function getActivePartners(): Promise<Partner[]> {
  return getActivePartnersCached();
}

export async function getAllPartnersForAdmin(): Promise<Partner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("partners")
    .select(PARTNER_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Partner[];
}

export async function getAllAdvertisingCampaignsForAdmin(): Promise<
  AdvertisingCampaign[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advertising_campaigns")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    internal_name: row.internal_name,
    title: row.title,
    body: row.body,
    image_url: row.image_url,
    button_label: row.button_label,
    destination_url: row.destination_url,
    is_active: row.is_active,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    priority: row.priority,
    frequency: row.frequency as AdvertisingFrequency,
    open_in_new_tab: row.open_in_new_tab,
    view_count: row.view_count,
    click_count: row.click_count,
    dismiss_count: row.dismiss_count,
  }));
}

function isCampaignCurrentlyActive(
  campaign: {
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
  },
  now = Date.now(),
): boolean {
  if (!campaign.is_active) {
    return false;
  }

  if (campaign.starts_at && Date.parse(campaign.starts_at) > now) {
    return false;
  }

  if (campaign.ends_at && Date.parse(campaign.ends_at) <= now) {
    return false;
  }

  return true;
}

export async function getActiveAdvertisingCampaignsForUser(
  userId: string,
): Promise<
  Array<{
    id: string;
    title: string | null;
    body: string | null;
    image_url: string | null;
    button_label: string | null;
    destination_url: string | null;
    frequency: string;
    open_in_new_tab: boolean;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advertising_campaigns")
    .select(
      "id, title, body, image_url, button_label, destination_url, frequency, open_in_new_tab, is_active, starts_at, ends_at, priority",
    )
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const active = data.filter((row) => isCampaignCurrentlyActive(row));

  if (active.length === 0) {
    return [];
  }

  const { data: impressions } = await supabase
    .from("advertising_impressions")
    .select("campaign_id, viewed_at, clicked_at, dismissed_at")
    .eq("user_id", userId)
    .in(
      "campaign_id",
      active.map((row) => row.id),
    );

  const impressionMap = new Map(
    (impressions ?? []).map((row) => [row.campaign_id, row]),
  );

  return active.filter((campaign) => {
    const impression = impressionMap.get(campaign.id);

    switch (campaign.frequency) {
      case "always_after_login":
        return true;
      case "once_per_user":
        return !impression?.viewed_at;
      case "once_per_campaign":
        return !impression?.viewed_at;
      case "once_per_session":
      default:
        return true;
    }
  });
}

export function buildWhatsappUrl(raw: string, message?: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const base = `https://wa.me/${digits}`;
  const trimmedMessage = message?.trim();
  if (trimmedMessage) {
    return `${base}?text=${encodeURIComponent(trimmedMessage)}`;
  }
  return base;
}

/** Mensaje precargado para la CTA de partners en el footer público. */
export const FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE =
  "Hola, vi la sección “Empresas que nos acompañan” en la página de Australe Producciones. Me gustaría conocer las opciones para formar parte y acompañarlos en sus próximos eventos.";
