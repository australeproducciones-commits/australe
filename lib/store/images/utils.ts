export const STORE_PRODUCT_IMAGE_BUCKET = "store-products";
export const STORE_PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const STORE_PRODUCT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isSafeStoreProductImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractStoreProductImagePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${STORE_PRODUCT_IMAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export function storeProductImageExtension(mimeType: string): string | null {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  return null;
}

export function sanitizeStoreProductSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
