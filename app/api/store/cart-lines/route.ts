import { NextResponse } from "next/server";

import { getPublicStoreCartLineDetails } from "@/lib/store/queries";
import { isStoreUuid } from "@/lib/store/utils";

type CartLineRequestItem = {
  productId: string;
  variantId: string | null;
};

function sanitizeItems(
  raw: unknown,
): { items: CartLineRequestItem[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "Solicitud inválida." };
  }

  if (raw.length > 50) {
    return { error: "Demasiados ítems." };
  }

  const items: CartLineRequestItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const productId = (entry as CartLineRequestItem).productId;
    const variantId = (entry as CartLineRequestItem).variantId ?? null;

    if (typeof productId !== "string" || !isStoreUuid(productId)) {
      continue;
    }

    if (variantId !== null && (typeof variantId !== "string" || !isStoreUuid(variantId))) {
      continue;
    }

    items.push({ productId, variantId });
  }

  return { items };
}

export async function POST(request: Request) {
  let body: { items?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = sanitizeItems(body.items ?? []);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.items.length === 0) {
    return NextResponse.json({ lines: [] });
  }

  const lines = await getPublicStoreCartLineDetails(parsed.items);
  return NextResponse.json({ lines });
}
