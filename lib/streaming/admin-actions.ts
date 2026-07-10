"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { mendozaDatetimeLocalToIso } from "@/lib/streaming/datetime";
import {
  emptyToNull,
  parseStreamFormData,
  validateStreamInput,
} from "@/lib/streaming/utils";
import type { StreamActionResult } from "@/lib/streaming/types";
import { STREAM_STATUS } from "@/lib/streaming/types";
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

function revalidateStreamPaths(eventSlug?: string) {
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.enVivo);
  revalidatePath(ROUTES.eventos);
  if (eventSlug) {
    revalidatePath(ROUTES.evento(eventSlug));
    revalidatePath(ROUTES.eventoEnVivo(eventSlug));
  }
}

function buildPayload(
  input: ReturnType<typeof parseStreamFormData>,
  createdBy?: string,
) {
  return {
    title: emptyToNull(input.title),
    subtitle: emptyToNull(input.subtitle),
    is_enabled: input.is_enabled,
    status: input.status,
    provider: input.provider,
    stream_url: emptyToNull(input.stream_url),
    starts_at: mendozaDatetimeLocalToIso(input.starts_at),
    ends_at: mendozaDatetimeLocalToIso(input.ends_at),
    access_type: "free" as const,
    stream_banner_url: emptyToNull(input.stream_banner_url),
    stream_banner_mobile_url: emptyToNull(input.stream_banner_mobile_url),
    home_featured: input.home_featured,
    home_order: input.home_order,
    show_on_streaming_page: input.show_on_streaming_page,
    show_on_event_page: input.show_on_event_page,
    button_label: emptyToNull(input.button_label),
    created_by: createdBy ?? null,
  };
}

export async function saveEventStreamAction(
  eventId: string,
  eventSlug: string,
  _prev: StreamActionResult,
  formData: FormData,
): Promise<StreamActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const streamId = String(formData.get("stream_id") ?? "").trim() || undefined;
  const input = parseStreamFormData(formData);
  const validationError = validateStreamInput(input);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const payload = buildPayload(input, streamId ? undefined : auth.profile.id);

  if (streamId) {
    const { created_by, ...updatePayload } = payload;
    void created_by;
    const { error } = await auth.supabase
      .from("event_streams")
      .update(updatePayload)
      .eq("id", streamId)
      .eq("event_id", eventId);

    if (error) {
      console.error("saveEventStreamAction update:", error.message);
      return { ok: false, message: error.message };
    }

    revalidateStreamPaths(eventSlug);
    return { ok: true, message: "Transmisión actualizada.", streamId };
  }

  const { data, error } = await auth.supabase
    .from("event_streams")
    .insert({ ...payload, event_id: eventId })
    .select("id")
    .single();

  if (error || !data) {
    console.error("saveEventStreamAction insert:", error?.message);
    return { ok: false, message: error?.message ?? "No se pudo crear la transmisión." };
  }

  revalidateStreamPaths(eventSlug);
  return { ok: true, message: "Transmisión creada.", streamId: data.id };
}

export async function deleteEventStreamAction(
  streamId: string,
  eventSlug: string,
): Promise<StreamActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const { error } = await auth.supabase
    .from("event_streams")
    .delete()
    .eq("id", streamId);

  if (error) {
    console.error("deleteEventStreamAction:", error.message);
    return { ok: false, message: error.message };
  }

  revalidateStreamPaths(eventSlug);
  return { ok: true, message: "Transmisión eliminada." };
}

export async function toggleEventStreamEnabledAction(
  streamId: string,
  eventSlug: string,
  enabled: boolean,
): Promise<StreamActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const { data: current } = await auth.supabase
    .from("event_streams")
    .select("status")
    .eq("id", streamId)
    .maybeSingle();

  if (!current) {
    return { ok: false, message: "Transmisión no encontrada." };
  }

  const { error } = await auth.supabase
    .from("event_streams")
    .update({
      is_enabled: enabled,
      status: enabled ? current.status : STREAM_STATUS.DRAFT,
    })
    .eq("id", streamId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateStreamPaths(eventSlug);
  return { ok: true, message: enabled ? "Streaming habilitado." : "Streaming deshabilitado." };
}
