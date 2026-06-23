"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { slugifyName } from "@/lib/events/utils";
import { PRODUCT_UNITS } from "@/lib/products/constants";
import { canDeleteProduct } from "@/lib/products/queries";
import type {
  CategoryFormInput,
  ProductFormInput,
  ProductsActionResult,
  StockAdjustInput,
} from "@/lib/products/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdminProductsAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para realizar esta acción." as const };
  }

  return { supabase, profile };
}

function revalidateProductPaths() {
  revalidatePath(ROUTES.adminProductos);
  revalidatePath(ROUTES.adminEventos);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildUniqueSlug(base: string): string {
  const normalized = slugifyName(base);
  return normalized || `producto-${Date.now()}`;
}

function parseNonNegativeInt(value: number | undefined, fallback = 0): number {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

export async function createProductAction(
  input: ProductFormInput,
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  if (!input.category_id) {
    return { success: false, error: "La categoría es obligatoria." };
  }

  const unit = input.unit.trim();
  if (!unit || !PRODUCT_UNITS.includes(unit as (typeof PRODUCT_UNITS)[number])) {
    return { success: false, error: "Seleccioná una unidad de control válida." };
  }

  const initialStock = parseNonNegativeInt(input.initial_stock, 0);
  const lowStockThreshold =
    input.low_stock_threshold == null
      ? null
      : parseNonNegativeInt(input.low_stock_threshold, 0);

  const sku = normalizeOptionalText(input.sku ?? null);
  if (sku) {
    const { data: existing } = await auth.supabase
      .from("kiosk_products")
      .select("id")
      .ilike("sku", sku)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Ya existe un producto con ese código." };
    }
  }

  const slug = buildUniqueSlug(name);
  const { data, error } = await auth.supabase
    .from("kiosk_products")
    .insert({
      name,
      slug,
      description: normalizeOptionalText(input.description),
      image_url: normalizeOptionalText(input.image_url),
      sku,
      unit,
      category_id: input.category_id,
      stock_on_hand: initialStock,
      stock_reserved: 0,
      low_stock_threshold: lowStockThreshold,
      is_active: input.is_active ?? true,
      default_price: null,
      category: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createProductAction:", error.message);
    return { success: false, error: "No se pudo crear el producto." };
  }

  if (initialStock > 0) {
    await auth.supabase.rpc("record_kiosk_stock_movement", {
      p_product_id: data.id,
      p_movement_type: "initial_stock",
      p_quantity_delta: initialStock,
      p_previous_on_hand: 0,
      p_resulting_on_hand: initialStock,
      p_previous_reserved: 0,
      p_resulting_reserved: 0,
      p_reason: "Stock inicial",
    });
  }

  revalidateProductPaths();
  return { success: true, id: data.id };
}

export async function updateProductAction(
  productId: string,
  input: ProductFormInput,
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  if (!input.category_id) {
    return { success: false, error: "La categoría es obligatoria." };
  }

  const unit = input.unit.trim();
  if (!unit) {
    return { success: false, error: "La unidad es obligatoria." };
  }

  const sku = normalizeOptionalText(input.sku ?? null);
  if (sku) {
    const { data: existing } = await auth.supabase
      .from("kiosk_products")
      .select("id")
      .ilike("sku", sku)
      .neq("id", productId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Ya existe un producto con ese código." };
    }
  }

  const lowStockThreshold =
    input.low_stock_threshold == null
      ? null
      : parseNonNegativeInt(input.low_stock_threshold, 0);

  const { error } = await auth.supabase
    .from("kiosk_products")
    .update({
      name,
      description: normalizeOptionalText(input.description),
      image_url: normalizeOptionalText(input.image_url),
      sku,
      unit,
      category_id: input.category_id,
      low_stock_threshold: lowStockThreshold,
      is_active: input.is_active ?? true,
    })
    .eq("id", productId);

  if (error) {
    console.error("updateProductAction:", error.message);
    return { success: false, error: "No se pudo actualizar el producto." };
  }

  revalidateProductPaths();
  return { success: true, id: productId };
}

export async function toggleProductActiveAction(
  productId: string,
  isActive: boolean,
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const { error } = await auth.supabase
    .from("kiosk_products")
    .update({ is_active: isActive })
    .eq("id", productId);

  if (error) {
    return { success: false, error: "No se pudo cambiar el estado." };
  }

  revalidateProductPaths();
  return { success: true, id: productId };
}

export async function deleteProductAction(
  productId: string,
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const check = await canDeleteProduct(productId);
  if (!check.allowed) {
    return { success: false, error: check.reason ?? "No se puede eliminar." };
  }

  const { error } = await auth.supabase
    .from("kiosk_products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { success: false, error: "No se pudo eliminar el producto." };
  }

  revalidateProductPaths();
  return { success: true };
}

export async function adjustProductStockAction(
  productId: string,
  input: StockAdjustInput,
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const quantity = parseNonNegativeInt(input.quantity, 0);
  if (quantity <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a cero." };
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { success: false, error: "El motivo es obligatorio." };
  }

  const { error } = await auth.supabase.rpc("adjust_kiosk_product_stock", {
    p_product_id: productId,
    p_movement_type: input.movement_type,
    p_quantity: quantity,
    p_reason: reason,
  });

  if (error) {
    console.error("adjustProductStockAction:", error.message);
    if (error.message.includes("stock insuficiente")) {
      return { success: false, error: "Stock insuficiente para este ajuste." };
    }
    return { success: false, error: "No se pudo ajustar el stock." };
  }

  revalidateProductPaths();
  return { success: true, id: productId };
}

export async function upsertProductCategoryAction(
  input: CategoryFormInput & { id?: string },
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre de la categoría es obligatorio." };
  }

  const { data: duplicates } = await auth.supabase
    .from("kiosk_product_categories")
    .select("id")
    .ilike("name", name);

  const duplicate = (duplicates ?? []).find((row) => row.id !== input.id);
  if (duplicate) {
    return { success: false, error: "Ya existe una categoría con ese nombre." };
  }

  const payload = {
    name,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const { error } = await auth.supabase
      .from("kiosk_product_categories")
      .update(payload)
      .eq("id", input.id);

    if (error) {
      return { success: false, error: "No se pudo actualizar la categoría." };
    }

    revalidateProductPaths();
    return { success: true, id: input.id };
  }

  const { data, error } = await auth.supabase
    .from("kiosk_product_categories")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "No se pudo crear la categoría." };
  }

  revalidateProductPaths();
  return { success: true, id: data.id };
}

export async function deleteProductCategoryAction(
  categoryId: string,
): Promise<ProductsActionResult> {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return { success: false, error: auth.error as string };
  }

  const { count, error: countError } = await auth.supabase
    .from("kiosk_products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (countError) {
    return { success: false, error: "No se pudo verificar la categoría." };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: "No se puede eliminar una categoría utilizada. Desactivala.",
    };
  }

  const { error } = await auth.supabase
    .from("kiosk_product_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    return { success: false, error: "No se pudo eliminar la categoría." };
  }

  revalidateProductPaths();
  return { success: true };
}

export async function fetchProductStockMovementsAction(productId: string) {
  const auth = await requireAdminProductsAction();
  if ("error" in auth) {
    return {
      success: false as const,
      error: auth.error as string,
      movements: [],
    };
  }

  const { data, error } = await auth.supabase
    .from("kiosk_product_stock_movements")
    .select(
      "id, product_id, event_id, order_id, order_item_id, movement_type, quantity_delta, previous_stock_on_hand, resulting_stock_on_hand, previous_stock_reserved, resulting_stock_reserved, reason, created_by, created_at",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("fetchProductStockMovementsAction:", error.message);
    return {
      success: false as const,
      error: "No se pudo cargar el historial de movimientos.",
      movements: [],
    };
  }

  return {
    success: true as const,
    movements: data ?? [],
  };
}
