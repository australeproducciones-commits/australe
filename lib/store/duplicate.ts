import { slugifyName } from "@/lib/events/utils";
import type {
  AdminStoreProductListItem,
  StoreProductVariant,
  StoreVariantInput,
} from "@/lib/store/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DUPLICATE_NAME_PREFIX = "Copia de ";

export function buildDuplicateProductDraft(
  source: AdminStoreProductListItem,
): AdminStoreProductListItem {
  const duplicateName = `${DUPLICATE_NAME_PREFIX}${source.name}`;

  return {
    ...source,
    id: `draft-${source.id}`,
    name: duplicateName,
    slug: "",
    sku: null,
    stock_reserved: 0,
    stock_sold: 0,
    status: source.status === "archived" ? "draft" : source.status,
    variants: source.variants.map((variant) => buildDuplicateVariantDraft(variant)),
    associations: [],
    channel: {
      ...source.channel,
      activeAssociationCount: 0,
    },
  };
}

export function buildDuplicateVariantDraft(
  variant: StoreProductVariant,
): StoreProductVariant {
  return {
    ...variant,
    id: `draft-${variant.id}`,
    product_id: `draft-${variant.product_id}`,
    sku: null,
    stock_reserved: 0,
    stock_sold: 0,
  };
}

export function variantDraftToInput(variant: StoreProductVariant): StoreVariantInput {
  return {
    name: variant.name,
    sku: null,
    size: variant.size,
    color: variant.color,
    model: variant.model,
    price_override: variant.price_override,
    community_price_override: variant.community_price_override,
    stock_total: Math.max(0, variant.stock_total),
    is_active: variant.is_active,
    sort_order: variant.sort_order,
  };
}

export async function resolveUniqueStoreProductSlug(
  supabase: SupabaseClient,
  name: string,
  preferredSlug?: string | null,
): Promise<string> {
  const base = slugifyName(preferredSlug?.trim() || name) || `producto-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const { data } = await supabase
      .from("store_products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return `${base}-${Date.now()}`;
}

export function mapStoreProductInsertError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") {
    if (error.message?.includes("sku")) {
      return "Ya existe un producto con ese SKU.";
    }
    if (error.message?.includes("slug")) {
      return "Ya existe un producto con ese slug.";
    }
    return "Ya existe un producto con datos duplicados (slug o SKU).";
  }

  return "No se pudo crear el producto.";
}
