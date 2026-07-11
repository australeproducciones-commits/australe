export type MercadoPagoEnvironment = "test" | "production";

function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value === "1" || value.toLowerCase() === "true";
}

export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.VERCEL_URL?.replace(/\/$/, "");

  if (!url) {
    return "https://australeproducciones.com";
  }

  if (url.startsWith("http")) {
    return url;
  }

  return `https://${url}`;
}

export function isMercadoPagoEnabled(): boolean {
  return parseBoolean(process.env.MERCADOPAGO_ENABLED, false);
}

export function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? "";
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? "";
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "";
  const environment = (process.env.MERCADOPAGO_ENVIRONMENT?.trim() ??
    "test") as MercadoPagoEnvironment;

  return {
    accessToken,
    publicKey,
    webhookSecret,
    environment,
    isConfigured: accessToken.length > 0 && webhookSecret.length > 0,
    isEnabled: isMercadoPagoEnabled(),
  };
}

export function assertMercadoPagoConfigured(): void {
  const config = getMercadoPagoConfig();
  if (!config.isEnabled) {
    throw new Error("Mercado Pago deshabilitado por configuración.");
  }
  if (!config.accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en el servidor.");
  }
}

export function buildStoreExternalReference(orderId: string): string {
  return `store:${orderId}`;
}

export function parseStoreExternalReference(
  externalReference: string | null | undefined,
): string | null {
  if (!externalReference) {
    return null;
  }
  if (externalReference.startsWith("store:")) {
    return externalReference.slice("store:".length);
  }
  return null;
}
