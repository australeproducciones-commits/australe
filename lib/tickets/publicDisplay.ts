import type { TicketType } from "@/lib/tickets/types";
import {
  formatCommunityPriceLabel,
  formatTicketPrice,
  getStockAvailable,
  hasCommunityPrice,
} from "@/lib/tickets/utils";

export type PublicBadgeTone =
  | "featured"
  | "primary"
  | "neutral"
  | "success"
  | "warning"
  | "community";

export const LAST_TICKETS_THRESHOLD = 10;

export type PublicTicketAvailabilityStatus =
  | "coming_soon"
  | "available"
  | "last_tickets"
  | "sold_out"
  | "sale_ended"
  | "unavailable"
  | "free"
  | "reservation_required"
  | "community_only";

export type PublicTicketCategoryTag =
  | "preventa"
  | "general"
  | "comunidad"
  | "vip"
  | "mesas"
  | "promocion"
  | "gratuita";

export type PublicTicketTypeDisplay = {
  status: PublicTicketAvailabilityStatus;
  statusLabel: string;
  statusTone: PublicBadgeTone;
  canPurchase: boolean;
  buttonLabel: string;
  categoryTags: PublicTicketCategoryTag[];
  featured: boolean;
  stockTotal: number | null;
  stockSold: number;
  stockRemaining: number | null;
  saleStartLabel: string | null;
  saleEndLabel: null | string;
  publicPriceLabel: string;
  communityPriceLabel: string | null;
  slug: string;
};

const STATUS_LABELS: Record<PublicTicketAvailabilityStatus, string> = {
  coming_soon: "Próximamente",
  available: "Disponible",
  last_tickets: "Últimas entradas",
  sold_out: "Agotada",
  sale_ended: "Venta finalizada",
  unavailable: "No disponible",
  free: "Gratuita",
  reservation_required: "Requiere reserva",
  community_only: "Solo comunidad",
};

const STATUS_TONES: Record<PublicTicketAvailabilityStatus, PublicBadgeTone> = {
  coming_soon: "primary",
  available: "success",
  last_tickets: "warning",
  sold_out: "warning",
  sale_ended: "neutral",
  unavailable: "neutral",
  free: "success",
  reservation_required: "primary",
  community_only: "community",
};

export function getTicketTypePublicSlug(ticketType: TicketType): string {
  const fromName = ticketType.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return fromName || ticketType.id;
}

export function matchesTicketTypePublicSlug(
  ticketType: TicketType,
  value: string,
): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    ticketType.id === normalized ||
    getTicketTypePublicSlug(ticketType) === normalized
  );
}

export function inferTicketCategoryTags(
  ticketType: TicketType,
): PublicTicketCategoryTag[] {
  const name = ticketType.name.toLowerCase();
  const tags = new Set<PublicTicketCategoryTag>();

  if (name.includes("preventa")) {
    tags.add("preventa");
  }
  if (name.includes("general")) {
    tags.add("general");
  }
  if (name.includes("comunidad")) {
    tags.add("comunidad");
  }
  if (name.includes("vip")) {
    tags.add("vip");
  }
  if (name.includes("mesa")) {
    tags.add("mesas");
  }
  if (name.includes("promo") || name.includes("promoci")) {
    tags.add("promocion");
  }
  if (ticketType.public_price === 0) {
    tags.add("gratuita");
  }

  return [...tags];
}

function formatSaleDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function isCommunityOnlyEntry(
  ticketType: TicketType,
  categoryTags: PublicTicketCategoryTag[],
): boolean {
  if (!categoryTags.includes("comunidad")) {
    return false;
  }

  return (
    !categoryTags.includes("general") &&
    !categoryTags.includes("preventa") &&
    hasCommunityPrice(ticketType.community_price)
  );
}

function getPurchaseButtonLabel(
  ticketType: TicketType,
  status: PublicTicketAvailabilityStatus,
  categoryTags: PublicTicketCategoryTag[],
  canPurchase: boolean,
): string {
  if (!canPurchase) {
    return "No disponible";
  }

  if (status === "free" || status === "reservation_required") {
    return "Reservar entrada";
  }

  if (isCommunityOnlyEntry(ticketType, categoryTags)) {
    return "Acceder con comunidad";
  }

  if (categoryTags.includes("vip")) {
    return `Comprar ${ticketType.name}`;
  }

  return `Comprar ${ticketType.name}`;
}

export function getPublicTicketTypeDisplay(
  ticketType: TicketType,
  options?: { featured?: boolean; now?: Date },
): PublicTicketTypeDisplay {
  const now = options?.now ?? new Date();
  const categoryTags = inferTicketCategoryTags(ticketType);
  const stockRemaining = getStockAvailable(ticketType);
  const communityOnly = isCommunityOnlyEntry(ticketType, categoryTags);
  const isFree = ticketType.public_price === 0;

  let status: PublicTicketAvailabilityStatus = "available";
  let canPurchase = true;

  if (!ticketType.is_active) {
    status = "unavailable";
    canPurchase = false;
  } else if (ticketType.sale_start_at && now < new Date(ticketType.sale_start_at)) {
    status = "coming_soon";
    canPurchase = false;
  } else if (ticketType.sale_end_at && now > new Date(ticketType.sale_end_at)) {
    status = "sale_ended";
    canPurchase = false;
  } else if (stockRemaining !== null && stockRemaining <= 0) {
    status = "sold_out";
    canPurchase = false;
  } else if (isFree) {
    status = "free";
    canPurchase = true;
  } else if (communityOnly) {
    status = "community_only";
    canPurchase = true;
  } else if (stockRemaining !== null && stockRemaining <= LAST_TICKETS_THRESHOLD) {
    status = "last_tickets";
    canPurchase = true;
  } else {
    status = "available";
    canPurchase = true;
  }

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    statusTone: STATUS_TONES[status],
    canPurchase,
    buttonLabel: getPurchaseButtonLabel(
      ticketType,
      status,
      categoryTags,
      canPurchase,
    ),
    categoryTags,
    featured: options?.featured ?? false,
    stockTotal: ticketType.stock_total,
    stockSold: ticketType.stock_sold,
    stockRemaining,
    saleStartLabel: formatSaleDate(ticketType.sale_start_at),
    saleEndLabel: formatSaleDate(ticketType.sale_end_at),
    publicPriceLabel:
      ticketType.public_price === 0
        ? "Gratuita"
        : formatTicketPrice(ticketType.public_price),
    communityPriceLabel: formatCommunityPriceLabel(ticketType.community_price),
    slug: getTicketTypePublicSlug(ticketType),
  };
}

export function buildPublicTicketTypeDisplays(
  ticketTypes: TicketType[],
  now?: Date,
): PublicTicketTypeDisplay[] {
  const featuredId = ticketTypes.find((ticketType) => {
    const display = getPublicTicketTypeDisplay(ticketType, { now });
    return display.canPurchase;
  })?.id;

  return ticketTypes.map((ticketType) =>
    getPublicTicketTypeDisplay(ticketType, {
      now,
      featured: ticketType.id === featuredId,
    }),
  );
}

export type QuickNavItem = {
  id: string;
  label: string;
  ticketTypeId: string;
};

const QUICK_NAV_LABELS: Record<PublicTicketCategoryTag, string> = {
  preventa: "Preventa",
  general: "General",
  comunidad: "Comunidad",
  vip: "VIP",
  mesas: "Mesas",
  promocion: "Promociones",
  gratuita: "Gratuita",
};

export function buildTicketQuickNavItems(
  ticketTypes: TicketType[],
  displays: PublicTicketTypeDisplay[],
): QuickNavItem[] {
  const items: QuickNavItem[] = [];
  const seen = new Set<PublicTicketCategoryTag>();

  for (let index = 0; index < ticketTypes.length; index += 1) {
    const ticketType = ticketTypes[index]!;
    const display = displays[index]!;

    for (const tag of display.categoryTags) {
      if (seen.has(tag)) {
        continue;
      }

      seen.add(tag);
      items.push({
        id: tag,
        label: QUICK_NAV_LABELS[tag],
        ticketTypeId: ticketType.id,
      });
    }
  }

  return items;
}

export function getCategoryBadgeLabel(tag: PublicTicketCategoryTag): string {
  return QUICK_NAV_LABELS[tag];
}

export function getCategoryBadgeTone(
  tag: PublicTicketCategoryTag,
): PublicBadgeTone {
  switch (tag) {
    case "preventa":
      return "primary";
    case "comunidad":
      return "community";
    case "vip":
      return "featured";
    case "gratuita":
      return "success";
    case "promocion":
      return "warning";
    default:
      return "neutral";
  }
}
