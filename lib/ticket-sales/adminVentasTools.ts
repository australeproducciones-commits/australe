import {
  formatTimeUntilEvent,
  getEventStartDateTime,
  type EventVentasDashboard,
} from "@/lib/ticket-sales/eventVentasStats";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
  type TicketWithTypeName,
} from "@/lib/ticket-sales/types";
import {
  isReservationExpired,
  SALES_CHANNEL_LABELS,
  TICKET_PAYMENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-sales/utils";

export const VENTAS_STATUS_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "confirmed", label: "Confirmadas" },
  { id: "reserved", label: "Reservadas" },
  { id: "used", label: "Usadas" },
  { id: "cancelled", label: "Canceladas" },
  { id: "expired", label: "Vencidas" },
] as const;

export type VentasStatusFilter = (typeof VENTAS_STATUS_FILTERS)[number]["id"];

export type VentasAlert = {
  id: "pending" | "expired-reservations" | "upcoming-event";
  label: string;
  tone: "amber" | "red" | "sky";
  filter?: VentasStatusFilter;
};

function isConfirmedSaleTicket(ticket: TicketWithTypeName): boolean {
  return (
    (ticket.ticket_status === TICKET_STATUS.VALID ||
      ticket.ticket_status === TICKET_STATUS.USED) &&
    ticket.payment_status === TICKET_PAYMENT_STATUS.CONFIRMED
  );
}

export function ticketMatchesStatusFilter(
  ticket: TicketWithTypeName,
  filter: VentasStatusFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "confirmed":
      return ticket.ticket_status === TICKET_STATUS.VALID;
    case "reserved":
      return ticket.ticket_status === TICKET_STATUS.RESERVED;
    case "used":
      return ticket.ticket_status === TICKET_STATUS.USED;
    case "cancelled":
      return ticket.ticket_status === TICKET_STATUS.CANCELLED;
    case "expired":
      return ticket.ticket_status === TICKET_STATUS.EXPIRED;
    default:
      return true;
  }
}

export function ticketMatchesSearch(
  ticket: TicketWithTypeName,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const compactQuery = normalized.replace(/\s+/g, "");
  const fields = [
    ticket.buyer_name,
    ticket.buyer_whatsapp,
    ticket.buyer_dni,
    ticket.qr_token,
    ticket.id,
  ];

  return fields.some((field) => {
    if (!field) {
      return false;
    }

    const value = field.toLowerCase();
    return (
      value.includes(normalized) ||
      value.replace(/\s+/g, "").includes(compactQuery)
    );
  });
}

export function filterVentasTickets(
  tickets: TicketWithTypeName[],
  filter: VentasStatusFilter,
  searchQuery: string,
): TicketWithTypeName[] {
  return tickets.filter(
    (ticket) =>
      ticketMatchesStatusFilter(ticket, filter) &&
      ticketMatchesSearch(ticket, searchQuery),
  );
}

export function countTicketsByVentasFilter(
  tickets: TicketWithTypeName[],
  filter: VentasStatusFilter,
): number {
  return tickets.filter((ticket) => ticketMatchesStatusFilter(ticket, filter))
    .length;
}

export function computeVentasAlerts(
  tickets: TicketWithTypeName[],
  eventDate: string,
  startTime: string | null,
): VentasAlert[] {
  const alerts: VentasAlert[] = [];

  const pendingReservations = tickets.filter(
    (ticket) =>
      ticket.ticket_status === TICKET_STATUS.RESERVED &&
      ticket.payment_status === TICKET_PAYMENT_STATUS.PENDING,
  );

  const expiredUnprocessed = pendingReservations.filter((ticket) =>
    isReservationExpired(ticket.reservation_expires_at),
  );

  if (pendingReservations.length > 0) {
    alerts.push({
      id: "pending",
      label: `${pendingReservations.length} reserva${pendingReservations.length === 1 ? "" : "s"} pendiente${pendingReservations.length === 1 ? "" : "s"} de pago`,
      tone: "amber",
      filter: "reserved",
    });
  }

  if (expiredUnprocessed.length > 0) {
    alerts.push({
      id: "expired-reservations",
      label: `${expiredUnprocessed.length} reserva${expiredUnprocessed.length === 1 ? "" : "s"} vencida${expiredUnprocessed.length === 1 ? "" : "s"} sin procesar`,
      tone: "red",
      filter: "reserved",
    });
  }

  const { label, isPast } = formatTimeUntilEvent(eventDate, startTime);
  const start = getEventStartDateTime(eventDate, startTime);
  const daysUntil = (start.getTime() - Date.now()) / 86_400_000;

  if (!isPast && daysUntil <= 7) {
    alerts.push({
      id: "upcoming-event",
      label: `Evento próximo · faltan ${label}`,
      tone: "sky",
    });
  }

  return alerts;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function rowsToCsv(rows: string[][]): string {
  const bom = "\uFEFF";
  return (
    bom +
    rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")
  );
}

function downloadCsv(filename: string, rows: string[][]): void {
  const content = rowsToCsv(rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slugifyFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function formatExportDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function exportConfirmedSalesCsv(
  tickets: TicketWithTypeName[],
  eventName: string,
): void {
  const confirmed = tickets.filter(isConfirmedSaleTicket);
  const rows: string[][] = [
    [
      "ID",
      "Tipo",
      "Comprador",
      "Contacto",
      "DNI",
      "Precio",
      "Estado",
      "Pago",
      "Canal",
      "QR",
      "Creada",
      "Usada",
    ],
    ...confirmed.map((ticket) => [
      ticket.id,
      ticket.ticket_type_name ?? "",
      ticket.buyer_name,
      ticket.buyer_whatsapp ?? "",
      ticket.buyer_dni ?? "",
      String(ticket.price_paid),
      TICKET_STATUS_LABELS[ticket.ticket_status],
      TICKET_PAYMENT_STATUS_LABELS[ticket.payment_status],
      SALES_CHANNEL_LABELS[ticket.sales_channel],
      ticket.qr_token,
      formatExportDate(ticket.created_at),
      formatExportDate(ticket.used_at),
    ]),
  ];

  downloadCsv(
    `${slugifyFilename(eventName) || "evento"}-ventas-confirmadas.csv`,
    rows,
  );
}

export function exportReservationsCsv(
  tickets: TicketWithTypeName[],
  eventName: string,
): void {
  const reservations = tickets.filter(
    (ticket) => ticket.ticket_status === TICKET_STATUS.RESERVED,
  );
  const rows: string[][] = [
    [
      "ID",
      "Tipo",
      "Comprador",
      "Contacto",
      "DNI",
      "Precio",
      "Pago",
      "Vence",
      "QR",
      "Creada",
    ],
    ...reservations.map((ticket) => [
      ticket.id,
      ticket.ticket_type_name ?? "",
      ticket.buyer_name,
      ticket.buyer_whatsapp ?? "",
      ticket.buyer_dni ?? "",
      String(ticket.price_paid),
      TICKET_PAYMENT_STATUS_LABELS[ticket.payment_status],
      formatExportDate(ticket.reservation_expires_at),
      ticket.qr_token,
      formatExportDate(ticket.created_at),
    ]),
  ];

  downloadCsv(
    `${slugifyFilename(eventName) || "evento"}-reservas.csv`,
    rows,
  );
}

export function exportTypeSummaryCsv(
  dashboard: EventVentasDashboard,
  eventName: string,
): void {
  const rows: string[][] = [
    ["Tipo", "Total", "Confirmadas", "Recaudación"],
    ...dashboard.byType.map((row) => [
      row.typeName,
      String(row.total),
      String(row.confirmed),
      String(row.revenue),
    ]),
  ];

  downloadCsv(
    `${slugifyFilename(eventName) || "evento"}-resumen-por-tipo.csv`,
    rows,
  );
}
