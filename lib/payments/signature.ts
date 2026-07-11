import { createHmac, timingSafeEqual } from "node:crypto";

type ParsedSignature = {
  ts: string | null;
  v1: string | null;
};

export function parseMercadoPagoSignatureHeader(
  header: string | null,
): ParsedSignature {
  if (!header) {
    return { ts: null, v1: null };
  }

  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (!key || value === undefined) {
      continue;
    }
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (trimmedKey === "ts") {
      ts = trimmedValue;
    } else if (trimmedKey === "v1") {
      v1 = trimmedValue;
    }
  }

  return { ts, v1 };
}

export function buildMercadoPagoManifest(input: {
  dataId: string | null;
  requestId: string | null;
  ts: string | null;
}): string {
  const parts: string[] = [];

  if (input.dataId) {
    const normalizedId = /^[a-z0-9]+$/i.test(input.dataId)
      ? input.dataId.toLowerCase()
      : input.dataId;
    parts.push(`id:${normalizedId}`);
  }

  if (input.requestId) {
    parts.push(`request-id:${input.requestId}`);
  }

  if (input.ts) {
    parts.push(`ts:${input.ts}`);
  }

  return parts.length > 0 ? `${parts.join(";")};` : "";
}

export function computeMercadoPagoSignature(
  manifest: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

export function verifyMercadoPagoSignature(input: {
  dataId: string | null;
  requestId: string | null;
  signatureHeader: string | null;
  secret: string;
}): { valid: boolean; error?: string } {
  if (!input.secret) {
    return { valid: false, error: "missing_secret" };
  }

  const { ts, v1 } = parseMercadoPagoSignatureHeader(input.signatureHeader);
  if (!v1) {
    return { valid: false, error: "missing_v1" };
  }

  const manifest = buildMercadoPagoManifest({
    dataId: input.dataId,
    requestId: input.requestId,
    ts,
  });

  if (!manifest) {
    return { valid: false, error: "empty_manifest" };
  }

  const expected = computeMercadoPagoSignature(manifest, input.secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(v1, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { valid: false, error: "signature_mismatch" };
  }

  const valid = timingSafeEqual(expectedBuffer, receivedBuffer);
  return valid ? { valid: true } : { valid: false, error: "signature_mismatch" };
}
