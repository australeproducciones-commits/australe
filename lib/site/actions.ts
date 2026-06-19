"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getActiveAdvertisingCampaignsForUser } from "@/lib/site/queries";
import type {
  AdvertisingActionResult,
  AdvertisingCampaignInput,
  PartnerActionResult,
  PartnerInput,
  SiteActionResult,
  SiteSettings,
} from "@/lib/site/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdminAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para realizar esta acción." as const };
  }

  return { supabase, profile };
}

function revalidatePublicSite() {
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.eventos);
}

export async function updateSiteSettingsAction(
  input: SiteSettings,
): Promise<SiteActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error ?? "No tenés permiso para realizar esta acción." };
  }

  const { supabase, profile } = auth;

  const { error } = await supabase.from("site_settings").upsert({
    id: 1,
    contact_email: input.contact_email?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    contact_whatsapp: input.contact_whatsapp?.trim() || null,
    contact_location: input.contact_location?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  });

  if (error) {
    return { ok: false, message: "No se pudo guardar la configuración." };
  }

  revalidatePublicSite();
  return { ok: true };
}

export async function savePartnerAction(
  input: PartnerInput,
  partnerId?: string,
): Promise<PartnerActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error ?? "No tenés permiso para realizar esta acción." };
  }

  if (!input.name.trim() || !input.image_url.trim()) {
    return { ok: false, message: "Nombre e imagen son obligatorios." };
  }

  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    image_url: input.image_url.trim(),
    destination_url: input.destination_url?.trim() || null,
    label: input.label?.trim() || null,
    is_active: input.is_active,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    sort_order: input.sort_order,
    open_in_new_tab: input.open_in_new_tab,
    updated_at: new Date().toISOString(),
    created_by: auth.profile.id,
  };

  const { data, error } = partnerId
    ? await auth.supabase
        .from("partners")
        .update(payload)
        .eq("id", partnerId)
        .select("id")
        .maybeSingle()
    : await auth.supabase.from("partners").insert(payload).select("id").maybeSingle();

  if (error || !data) {
    return { ok: false, message: "No se pudo guardar el partner." };
  }

  revalidatePublicSite();
  return { ok: true, id: data.id };
}

export async function deletePartnerAction(partnerId: string): Promise<SiteActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error ?? "No tenés permiso para realizar esta acción." };
  }

  const { error } = await auth.supabase.from("partners").delete().eq("id", partnerId);

  if (error) {
    return { ok: false, message: "No se pudo eliminar el partner." };
  }

  revalidatePublicSite();
  return { ok: true };
}

export async function saveAdvertisingCampaignAction(
  input: AdvertisingCampaignInput,
  campaignId?: string,
): Promise<AdvertisingActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error ?? "No tenés permiso para realizar esta acción." };
  }

  if (!input.internal_name.trim()) {
    return { ok: false, message: "El nombre interno es obligatorio." };
  }

  const payload = {
    internal_name: input.internal_name.trim(),
    title: input.title?.trim() || null,
    body: input.body?.trim() || null,
    image_url: input.image_url?.trim() || null,
    button_label: input.button_label?.trim() || null,
    destination_url: input.destination_url?.trim() || null,
    is_active: input.is_active,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    priority: input.priority,
    frequency: input.frequency,
    open_in_new_tab: input.open_in_new_tab,
    updated_at: new Date().toISOString(),
    created_by: auth.profile.id,
  };

  const { data, error } = campaignId
    ? await auth.supabase
        .from("advertising_campaigns")
        .update(payload)
        .eq("id", campaignId)
        .select("id")
        .maybeSingle()
    : await auth.supabase
        .from("advertising_campaigns")
        .insert(payload)
        .select("id")
        .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "No se pudo guardar la campaña." };
  }

  return { ok: true, id: data.id };
}

export async function deleteAdvertisingCampaignAction(
  campaignId: string,
): Promise<SiteActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error ?? "No tenés permiso para realizar esta acción." };
  }

  const { error } = await auth.supabase
    .from("advertising_campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) {
    return { ok: false, message: "No se pudo eliminar la campaña." };
  }

  return { ok: true };
}

export async function recordPartnerViewAction(partnerId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_partner_view_count", { p_partner_id: partnerId });
}

export async function recordPartnerClickAction(partnerId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_partner_click_count", { p_partner_id: partnerId });
}

export async function fetchPostLoginAdvertisingAction(): Promise<{
  campaign: {
    id: string;
    title: string | null;
    body: string | null;
    image_url: string | null;
    button_label: string | null;
    destination_url: string | null;
    frequency: string;
    open_in_new_tab: boolean;
  } | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return { campaign: null };
  }

  const campaigns = await getActiveAdvertisingCampaignsForUser(profile.id);

  return { campaign: campaigns[0] ?? null };
}

export async function recordAdvertisingViewAction(
  campaignId: string,
  frequency: string,
): Promise<void> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return;
  }

  await supabase.rpc("increment_advertising_view_count", {
    p_campaign_id: campaignId,
  });

  if (frequency === "once_per_session") {
    return;
  }

  await supabase.from("advertising_impressions").upsert(
    {
      campaign_id: campaignId,
      user_id: profile.id,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id,user_id" },
  );
}

export async function recordAdvertisingClickAction(campaignId: string): Promise<void> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return;
  }

  await supabase.rpc("increment_advertising_click_count", {
    p_campaign_id: campaignId,
  });

  await supabase
    .from("advertising_impressions")
    .upsert(
      {
        campaign_id: campaignId,
        user_id: profile.id,
        clicked_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,user_id" },
    );
}

export async function recordAdvertisingDismissAction(campaignId: string): Promise<void> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return;
  }

  await supabase.rpc("increment_advertising_dismiss_count", {
    p_campaign_id: campaignId,
  });

  await supabase
    .from("advertising_impressions")
    .upsert(
      {
        campaign_id: campaignId,
        user_id: profile.id,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,user_id" },
    );
}
