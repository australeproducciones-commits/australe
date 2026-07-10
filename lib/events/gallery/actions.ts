"use server";

import { randomUUID } from "node:crypto";
import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { canHaveGallery } from "@/lib/events/contentRules";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import type { GalleryActionResult } from "@/lib/events/gallery/types";
import {
  GALLERY_IMAGE_BUCKET,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_MIME_TYPES,
  isSafeGalleryImageUrl,
  parseGalleryVideoInput,
} from "@/lib/events/gallery/utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/supabase/cacheTags";

async function requireAdminGalleryAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para administrar la galería." as const };
  }

  return { supabase, profile };
}

function revalidateGalleryPaths(eventSlug?: string) {
  revalidatePath(ROUTES.galerias);
  updateTag(CACHE_TAGS.publishedEvents);
  updateTag(CACHE_TAGS.eventGalleries);

  if (eventSlug) {
    revalidatePath(ROUTES.galeria(eventSlug));
  }
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${GALLERY_IMAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export async function uploadGalleryImageAction(
  eventId: string,
  formData: FormData,
): Promise<GalleryActionResult> {
  const auth = await requireAdminGalleryAction();
  if ("error" in auth) return { success: false, error: auth.error };

  const event = await getEventByIdForAdmin(eventId);
  if (!event) return { success: false, error: "Evento no encontrado." };
  if (!canHaveGallery(event)) {
    return { success: false, error: "Las promociones no admiten galería." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Seleccioná una imagen válida." };
  }

  if (!GALLERY_IMAGE_MIME_TYPES.has(file.type)) {
    return { success: false, error: "Formato no permitido. Usá JPG, PNG o WebP." };
  }

  if (file.size > GALLERY_IMAGE_MAX_BYTES) {
    return { success: false, error: "La imagen supera el tamaño máximo de 5 MB." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${eventId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await auth.supabase.storage
    .from(GALLERY_IMAGE_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("uploadGalleryImageAction:", uploadError);
    return { success: false, error: "No se pudo subir la imagen." };
  }

  const { data: publicData } = auth.supabase.storage
    .from(GALLERY_IMAGE_BUCKET)
    .getPublicUrl(objectPath);

  const caption = String(formData.get("caption") ?? "").trim() || null;
  const sortOrder = Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;

  const { data, error } = await auth.supabase
    .from("event_gallery_items")
    .insert({
      event_id: eventId,
      media_type: "image",
      media_url: publicData.publicUrl,
      thumbnail_url: publicData.publicUrl,
      caption,
      sort_order: sortOrder,
      is_published: formData.get("is_published") === "on",
      created_by: auth.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    await auth.supabase.storage.from(GALLERY_IMAGE_BUCKET).remove([objectPath]);
    return { success: false, error: "No se pudo registrar la imagen." };
  }

  revalidateGalleryPaths(event.slug);
  return { success: true, itemId: data.id };
}

export async function addGalleryVideoAction(
  eventId: string,
  formData: FormData,
): Promise<GalleryActionResult> {
  const auth = await requireAdminGalleryAction();
  if ("error" in auth) return { success: false, error: auth.error };

  const event = await getEventByIdForAdmin(eventId);
  if (!event) return { success: false, error: "Evento no encontrado." };
  if (!canHaveGallery(event)) {
    return { success: false, error: "Las promociones no admiten galería." };
  }

  const mediaType = String(formData.get("media_type") ?? "");
  if (mediaType !== "youtube" && mediaType !== "vimeo") {
    return { success: false, error: "Tipo de video no válido." };
  }

  const parsed = parseGalleryVideoInput(
    mediaType,
    String(formData.get("video_input") ?? ""),
  );

  if (!parsed) {
    return { success: false, error: "URL o identificador de video no válido." };
  }

  const caption = String(formData.get("caption") ?? "").trim() || null;
  const sortOrder = Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;

  const { data, error } = await auth.supabase
    .from("event_gallery_items")
    .insert({
      event_id: eventId,
      media_type: parsed.mediaType,
      media_url: parsed.mediaUrl,
      thumbnail_url: parsed.thumbnailUrl,
      caption,
      sort_order: sortOrder,
      is_published: formData.get("is_published") === "on",
      created_by: auth.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "No se pudo agregar el video." };
  }

  revalidateGalleryPaths(event.slug);
  return { success: true, itemId: data.id };
}

export async function updateGalleryItemAction(
  itemId: string,
  formData: FormData,
): Promise<GalleryActionResult> {
  const auth = await requireAdminGalleryAction();
  if ("error" in auth) return { success: false, error: auth.error };

  const caption = String(formData.get("caption") ?? "").trim() || null;
  const sortOrder = Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;
  const isPublished = formData.get("is_published") === "on";

  const { data, error } = await auth.supabase
    .from("event_gallery_items")
    .update({
      caption,
      sort_order: sortOrder,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("event_id, events!inner(slug)")
    .single();

  if (error || !data) {
    return { success: false, error: "No se pudo actualizar el contenido." };
  }

  const slug = (data as { events: { slug: string } }).events.slug;
  revalidateGalleryPaths(slug);
  return { success: true, itemId };
}

export async function deleteGalleryItemAction(
  itemId: string,
): Promise<GalleryActionResult> {
  const auth = await requireAdminGalleryAction();
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: item, error: fetchError } = await auth.supabase
    .from("event_gallery_items")
    .select("id, media_type, media_url, event_id, events!inner(slug)")
    .eq("id", itemId)
    .maybeSingle();

  if (fetchError || !item) {
    return { success: false, error: "Contenido no encontrado." };
  }

  const slug = (item as { events: { slug: string } }).events.slug;

  const { error } = await auth.supabase
    .from("event_gallery_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { success: false, error: "No se pudo eliminar el contenido." };
  }

  if (item.media_type === "image" && isSafeGalleryImageUrl(item.media_url)) {
    const path = extractStoragePath(item.media_url);
    if (path?.startsWith(`${item.event_id}/`)) {
      await auth.supabase.storage.from(GALLERY_IMAGE_BUCKET).remove([path]);
    }
  }

  revalidateGalleryPaths(slug);
  return { success: true, itemId };
}
