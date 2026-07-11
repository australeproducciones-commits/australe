import {
  isEventCommerceEligible,
  isEventStoreAssociationActive,
} from "@/lib/store/channels";
import type {
  EventStoreProduct,
  EventStoreSettings,
  StoreProduct,
  StoreProductVariant,
} from "@/lib/store/types";
import {
  getStoreStockAvailable,
  isStoreProductPubliclyAvailable,
  resolveStoreUnitPrice,
} from "@/lib/store/utils";
import type { Event } from "@/lib/events/types";

export type StoreChannelChipId =
  | "tienda"
  | "eventos"
  | "solo-evento"
  | "comunidad"
  | "tienda-eventos"
  | "sin-canal"
  | "agotado"
  | "inactivo";

export type StoreChannelChip = {
  id: StoreChannelChipId;
  label: string;
};

export type StoreProductChannelState = {
  chips: StoreChannelChip[];
  summary: string;
  warnings: string[];
  hasActiveStoreChannel: boolean;
  hasActiveEventChannel: boolean;
  activeAssociationCount: number;
  availableStock: number;
};

type AssociationWithEvent = EventStoreProduct & {
  event?: Pick<
    Event,
    "id" | "name" | "slug" | "status" | "event_date" | "event_end_date" | "start_time" | "end_time"
  > | null;
};

export function countAvailableStock(
  product: Pick<StoreProduct, "track_stock" | "stock_total" | "stock_reserved">,
  variants: StoreProductVariant[],
): number {
  const activeVariants = variants.filter((v) => v.is_active);

  if (activeVariants.length > 0) {
    return activeVariants.reduce((sum, variant) => {
      return sum + (getStoreStockAvailable(product, variant) ?? 0);
    }, 0);
  }

  return getStoreStockAvailable(product) ?? 0;
}

export function computeStoreProductChannelState(input: {
  product: StoreProduct;
  variants: StoreProductVariant[];
  associations: AssociationWithEvent[];
  settingsByEventId?: Map<string, EventStoreSettings>;
}): StoreProductChannelState {
  const { product, variants, associations } = input;
  const warnings: string[] = [];
  const chips: StoreChannelChip[] = [];
  const activeVariants = variants.filter((v) => v.is_active);
  const availableStock = countAvailableStock(product, variants);

  const activeAssociations = associations.filter((row) =>
    isEventStoreAssociationActive(row),
  );
  const commerceEligibleAssociations = activeAssociations.filter((row) =>
    row.event ? isEventCommerceEligible(row.event) : false,
  );

  const publiclyAvailable = isStoreProductPubliclyAvailable(product);
  const inStore =
    publiclyAvailable && product.show_in_store && !product.community_only;
  const inStoreCommunity =
    publiclyAvailable && product.show_in_store && product.community_only;
  const inEvents = commerceEligibleAssociations.length > 0;
  const hasActiveStoreChannel = inStore || inStoreCommunity;
  const hasActiveEventChannel = inEvents;

  if (!product.is_active || product.status !== "active") {
    chips.push({ id: "inactivo", label: "Inactivo" });
  } else if (!hasActiveStoreChannel && !hasActiveEventChannel) {
    chips.push({ id: "sin-canal", label: "Sin canal" });
  } else {
    if (inStore) {
      chips.push({ id: "tienda", label: "Tienda" });
    }
    if (inStoreCommunity) {
      chips.push({ id: "comunidad", label: "Comunidad" });
    }
    if (inEvents) {
      const count = commerceEligibleAssociations.length;
      chips.push({
        id: product.show_in_store ? "tienda-eventos" : "solo-evento",
        label: product.show_in_store
          ? count === 1
            ? "Tienda + 1 evento"
            : `Tienda + ${count} eventos`
          : count === 1
            ? "Solo evento"
            : `${count} eventos`,
      });
    }
  }

  if (product.track_stock && availableStock <= 0 && publiclyAvailable) {
    chips.push({ id: "agotado", label: "Agotado" });
  }

  if (product.is_active && product.status === "active") {
    if (!hasActiveStoreChannel && !hasActiveEventChannel) {
      warnings.push("Producto activo pero sin canal de venta visible.");
    }
    if (!product.show_in_store && activeAssociations.length === 0) {
      warnings.push("No aparece en tienda y no tiene asociaciones configuradas.");
    }
    if (!product.show_in_store && activeAssociations.length > 0 && !inEvents) {
      warnings.push("Solo tiene asociaciones vencidas o en eventos no comerciables.");
    }
    if (activeVariants.length === 0 && variants.length > 0) {
      warnings.push("Tiene variantes pero ninguna está activa.");
    }
    if (product.community_only && product.community_price == null) {
      warnings.push("Es solo comunidad pero no tiene precio comunidad definido.");
    }
    if (product.track_stock && availableStock <= 0) {
      warnings.push("Sin stock disponible para venta.");
    }
    if (variants.length > 0 && product.stock_total > 0) {
      warnings.push(
        "El producto tiene variantes: el stock público se calcula desde las variantes, no desde el stock total del producto.",
      );
    }
  }

  for (const row of associations) {
    if (!row.event) {
      continue;
    }
    if (!isEventCommerceEligible(row.event)) {
      warnings.push(`Evento finalizado o no comerciable: ${row.event.name}.`);
    }
  }

  let summary = "Sin canal activo";
  if (chips.some((c) => c.id === "inactivo")) {
    summary = "Inactivo o archivado";
  } else if (chips.some((c) => c.id === "agotado") && chips.length === 1) {
    summary = "Agotado";
  } else if (hasActiveStoreChannel && hasActiveEventChannel) {
    summary = "Tienda general y eventos";
  } else if (hasActiveStoreChannel) {
    summary = product.community_only ? "Solo comunidad en tienda" : "Tienda general";
  } else if (hasActiveEventChannel) {
    summary = "Solo eventos";
  }

  return {
    chips,
    summary,
    warnings,
    hasActiveStoreChannel,
    hasActiveEventChannel,
    activeAssociationCount: commerceEligibleAssociations.length,
    availableStock,
  };
}

export type StorePricePreviewRow = {
  label: string;
  amount: number;
};

export function buildStorePricePreview(input: {
  product: StoreProduct;
  variant?: StoreProductVariant | null;
  association?: EventStoreProduct | null;
}): StorePricePreviewRow[] {
  const { product, variant, association } = input;

  return [
    {
      label: "Público general",
      amount: resolveStoreUnitPrice(product, variant ?? null, null, false),
    },
    {
      label: "Miembro comunidad (tienda)",
      amount: resolveStoreUnitPrice(product, variant ?? null, null, true),
    },
    {
      label: "Público en evento",
      amount: resolveStoreUnitPrice(product, variant ?? null, association ?? null, false),
    },
    {
      label: "Miembro en evento",
      amount: resolveStoreUnitPrice(product, variant ?? null, association ?? null, true),
    },
  ];
}
