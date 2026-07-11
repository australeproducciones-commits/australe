"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import type { StoreHeroActionResult, StoreHeroSettingsInput } from "@/lib/store/settings/types";
import {
  storeHeroSettingsToPayload,
  validateStoreHeroSettingsInput,
} from "@/lib/store/settings/utils";
import { CACHE_TAGS } from "@/lib/supabase/cacheTags";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";

async function requireAdminAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para realizar esta acción." as const };
  }

  return { supabase, profile };
}

function revalidateStoreHero() {
  revalidatePath(ROUTES.tienda);
  revalidatePath(ROUTES.adminConfiguracionTiendaHero);
  updateTag(CACHE_TAGS.storeSettings);
}

export async function updateStoreHeroSettingsAction(
  input: StoreHeroSettingsInput,
): Promise<StoreHeroActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error ?? "No tenés permiso para realizar esta acción." };
  }

  const validationError = validateStoreHeroSettingsInput(input);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const payload = storeHeroSettingsToPayload(input);

  const { error } = await auth.supabase.from("store_settings").upsert({
    id: 1,
    ...payload,
    updated_at: new Date().toISOString(),
    updated_by: auth.profile.id,
  });

  if (error) {
    return { ok: false, message: "No se pudo guardar la configuración del Hero." };
  }

  revalidateStoreHero();
  return { ok: true };
}
