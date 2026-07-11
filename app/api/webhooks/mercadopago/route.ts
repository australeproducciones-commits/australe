import { NextResponse } from "next/server";

import {
  completeWebhookEvent,
  hashWebhookPayload,
  registerWebhookEvent,
} from "@/lib/payments/reconciliation";
import { paymentService } from "@/lib/payments/service";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const rawBody = await request.text();
  const payloadHash = hashWebhookPayload(rawBody || `${dataId ?? ""}:${topic ?? ""}`);

  const validation = paymentService.validateWebhook({
    dataId,
    requestId,
    signatureHeader,
  });

  if (!validation.valid) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let eventId: string | null = null;
  try {
    const registered = await registerWebhookEvent({
      provider: paymentService.provider.MERCADOPAGO,
      requestId,
      topic,
      resourceId: dataId,
      payloadHash,
    });

    eventId = registered.eventId;

    if (registered.isDuplicate && registered.processingStatus === "processed") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  } catch (error) {
    console.error("registerWebhookEvent:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "No se pudo registrar el evento." }, { status: 500 });
  }

  if (!dataId) {
    if (eventId) {
      await completeWebhookEvent(eventId, "ignored", "missing_data_id");
    }
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await paymentService.reconcileMercadoPagoPayment(dataId);
    if (eventId) {
      await completeWebhookEvent(eventId, "processed");
    }
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (error) {
    console.error("webhook reconcile:", error instanceof Error ? error.message : error);
    if (eventId) {
      await completeWebhookEvent(eventId, "failed", "reconcile_error");
    }
    return NextResponse.json({ error: "Error al procesar el pago." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (!dataId) {
    return NextResponse.json({ ok: true, message: "Mercado Pago webhook endpoint" });
  }

  const payloadHash = hashWebhookPayload(`${dataId}:${topic ?? ""}`);

  try {
    await registerWebhookEvent({
      provider: paymentService.provider.MERCADOPAGO,
      requestId: request.headers.get("x-request-id"),
      topic,
      resourceId: dataId,
      payloadHash,
    });
  } catch {
    // Ignorar errores en ping de validación
  }

  return NextResponse.json({ ok: true });
}
