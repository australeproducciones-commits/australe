"use server";

import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require";
import { ROUTES } from "@/lib/constants/routes";
import {
  extractStoreProductImagePath,
  STORE_PRODUCT_IMAGE_BUCKET,
  STORE_PRODUCT_IMAGE_MAX_BYTES,
  STORE_PRODUCT_IMAGE_MIME_TYPES,
  storeProductImageExtension,
} from "@/lib/store/images/utils";
import type { StoreActionResult } from "@/lib/store/types";
import { revalidatePath } from "next/cache";

function revalidateStoreProductPaths() {
  revalidatePath(ROUTES.tienda);
  revalidatePath(ROUTES.adminTienda);
  revalidatePath(ROUTES.adminTiendaProductos);
}

function validateImageFile(file: File): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return "Seleccioná una imagen válida.";
  }
  if (!STORE_PRODUCT_IMAGE_MIME_TYPES.has(file.type)) {
    return "Formato no permitido. Usá JPG, PNG o WebP.";
  }
  if (file.size > STORE_PRODUCT_IMAGE_MAX_BYTES) {
    return "La imagen supera el tamaño máximo de 5 MB.";
  }
  return null;
}

export async function uploadStoreProductImageAction(
  productId: string | null,
  formData: FormData,
): Promise<StoreActionResult & { url?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Seleccioná una imagen válida." };
  }

  const validationError = validateImageFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const ext = storeProductImageExtension(file.type);
  if (!ext) {
    return { success: false, error: "Formato no permitido." };
  }

  const folder = productId?.trim() || "drafts";
  const objectPath = `${folder}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await auth.supabase.storage
    .from(STORE_PRODUCT_IMAGE_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("uploadStoreProductImageAction:", uploadError.message);
    return { success: false, error: "No se pudo subir la imagen." };
  }

  const { data: publicData } = auth.supabase.storage
    .from(STORE_PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(objectPath);

  revalidateStoreProductPaths();
  return { success: true, url: publicData.publicUrl };
}

export async function removeStoreProductImageFromStorageAction(
  publicUrl: string,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const path = extractStoreProductImagePath(publicUrl);
  if (!path) {
    return { success: false, error: "URL de imagen no válida." };
  }

  const { error } = await auth.supabase.storage
    .from(STORE_PRODUCT_IMAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.error("removeStoreProductImageFromStorageAction:", error.message);
    return { success: false, error: "No se pudo eliminar la imagen." };
  }

  return { success: true };
}
