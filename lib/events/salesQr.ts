import type { Event, EventFormInput } from "@/lib/events/types";
import { ROUTES } from "@/lib/constants/routes";

const SALES_QR_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const SALES_QR_CODE_LENGTH = 8;

export type SalesQrPayload = {
  sales_qr_enabled: boolean;
  sales_qr_code: string | null;
  sales_qr_url: string | null;
  qr_sell_tickets: boolean;
  qr_products_enabled: boolean;
  qr_show_price_list: boolean;
  qr_sell_products: boolean;
};

export function generateSalesQrCode(): string {
  const bytes = new Uint8Array(SALES_QR_CODE_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => {
    return SALES_QR_ALPHABET[byte % SALES_QR_ALPHABET.length];
  }).join("");
}

export function buildSalesQrUrl(code: string): string {
  return ROUTES.ventaEvento(code);
}

export function resolveSalesQrPayload(
  input: Pick<
    EventFormInput,
    | "qr_sell_tickets"
    | "qr_products_enabled"
    | "qr_show_price_list"
    | "qr_sell_products"
  >,
  existing?: Pick<Event, "sales_qr_code" | "sales_qr_url"> | null,
): SalesQrPayload {
  const qrSellTickets = input.qr_sell_tickets;
  const qrProductsEnabled = input.qr_products_enabled;
  const salesQrEnabled = qrSellTickets || qrProductsEnabled;

  if (!salesQrEnabled) {
    return {
      sales_qr_enabled: false,
      sales_qr_code: existing?.sales_qr_code ?? null,
      sales_qr_url: existing?.sales_qr_code
        ? buildSalesQrUrl(existing.sales_qr_code)
        : (existing?.sales_qr_url ?? null),
      qr_sell_tickets: false,
      qr_products_enabled: false,
      qr_show_price_list: false,
      qr_sell_products: false,
    };
  }

  const qrShowPriceList = qrProductsEnabled ? input.qr_show_price_list : false;
  const qrSellProducts = qrProductsEnabled ? input.qr_sell_products : false;

  const salesQrCode = existing?.sales_qr_code?.trim() || generateSalesQrCode();

  return {
    sales_qr_enabled: true,
    sales_qr_code: salesQrCode,
    sales_qr_url: buildSalesQrUrl(salesQrCode),
    qr_sell_tickets: qrSellTickets,
    qr_products_enabled: qrProductsEnabled,
    qr_show_price_list: qrShowPriceList,
    qr_sell_products: qrSellProducts,
  };
}

export function getAbsoluteSalesQrUrl(path: string, origin?: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base =
    origin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "";

  if (!base) {
    return path;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
