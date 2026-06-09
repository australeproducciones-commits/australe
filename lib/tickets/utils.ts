import type { TicketType, TicketTypeFormInput } from "@/lib/tickets/types";

export function formatTicketPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getStockAvailable(ticketType: TicketType): number | null {
  if (ticketType.stock_total === null) {
    return null;
  }

  return Math.max(0, ticketType.stock_total - ticketType.stock_sold);
}

export function getStockAvailableLabel(ticketType: TicketType): string {
  const available = getStockAvailable(ticketType);

  if (available === null) {
    return "Ilimitado";
  }

  return String(available);
}

export function parseTicketTypeFormData(formData: FormData): TicketTypeFormInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    public_price: String(formData.get("public_price") ?? "").trim(),
    community_price: String(formData.get("community_price") ?? "").trim(),
    stock_total: String(formData.get("stock_total") ?? "").trim(),
    max_per_order: String(formData.get("max_per_order") ?? "10").trim(),
    sale_start_at: String(formData.get("sale_start_at") ?? "").trim(),
    sale_end_at: String(formData.get("sale_end_at") ?? "").trim(),
    is_active: formData.get("is_active") === "on",
    sort_order: String(formData.get("sort_order") ?? "0").trim(),
  };
}

export function validateTicketTypeForm(input: TicketTypeFormInput): string | null {
  if (!input.name) {
    return "El nombre es obligatorio.";
  }

  const publicPrice = Number(input.public_price);
  if (Number.isNaN(publicPrice) || publicPrice < 0) {
    return "El precio público debe ser mayor o igual a 0.";
  }

  const communityPrice = Number(input.community_price);
  if (Number.isNaN(communityPrice) || communityPrice < 0) {
    return "El precio comunidad debe ser mayor o igual a 0.";
  }

  if (input.stock_total) {
    const stockTotal = Number(input.stock_total);
    if (Number.isNaN(stockTotal) || stockTotal < 0) {
      return "El stock total debe ser mayor o igual a 0.";
    }
  }

  const maxPerOrder = Number(input.max_per_order);
  if (Number.isNaN(maxPerOrder) || maxPerOrder <= 0) {
    return "El máximo por compra debe ser mayor a 0.";
  }

  const sortOrder = Number(input.sort_order);
  if (Number.isNaN(sortOrder) || sortOrder < 0) {
    return "El orden debe ser mayor o igual a 0.";
  }

  if (input.sale_start_at && input.sale_end_at) {
    const start = new Date(input.sale_start_at);
    const end = new Date(input.sale_end_at);

    if (end <= start) {
      return "El fin de venta debe ser posterior al inicio de venta.";
    }
  }

  return null;
}

export function ticketTypeFormToPayload(
  input: TicketTypeFormInput,
  eventId: string,
) {
  return {
    event_id: eventId,
    name: input.name,
    description: input.description || null,
    public_price: Number(input.public_price),
    community_price: Number(input.community_price),
    stock_total: input.stock_total ? Number(input.stock_total) : null,
    max_per_order: Number(input.max_per_order),
    sale_start_at: input.sale_start_at
      ? new Date(input.sale_start_at).toISOString()
      : null,
    sale_end_at: input.sale_end_at
      ? new Date(input.sale_end_at).toISOString()
      : null,
    is_active: input.is_active,
    sort_order: Number(input.sort_order),
  };
}

export function ticketTypeToFormInput(ticketType: TicketType): TicketTypeFormInput {
  return {
    name: ticketType.name,
    description: ticketType.description ?? "",
    public_price: String(ticketType.public_price),
    community_price: String(ticketType.community_price),
    stock_total:
      ticketType.stock_total != null ? String(ticketType.stock_total) : "",
    max_per_order: String(ticketType.max_per_order),
    sale_start_at: toDatetimeLocalValue(ticketType.sale_start_at),
    sale_end_at: toDatetimeLocalValue(ticketType.sale_end_at),
    is_active: ticketType.is_active,
    sort_order: String(ticketType.sort_order),
  };
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getMinPublicPrice(ticketTypes: TicketType[]): number | null {
  const active = ticketTypes.filter((t) => t.is_active);

  if (active.length === 0) {
    return null;
  }

  return Math.min(...active.map((t) => t.public_price));
}
