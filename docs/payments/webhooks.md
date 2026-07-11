# Webhooks Mercado Pago

## URL

- Producción: `https://australeproducciones.com/api/webhooks/mercadopago`
- Preview: `https://{preview}.vercel.app/api/webhooks/mercadopago`

Configurar en [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) → Webhooks → `payment`.

**No activar en producción hasta desplegar la ruta.**

## Validación de firma

Headers:

- `x-signature`: `ts={timestamp},v1={hmac}`
- `x-request-id`: idempotencia

Query: `data.id` = payment ID

Manifest:

```
id:{data.id};request-id:{x-request-id};ts:{ts};
```

HMAC-SHA256 con `MERCADOPAGO_WEBHOOK_SECRET`. Comparación timing-safe.

Implementación: `lib/payments/signature.ts`

## Procesamiento

1. Rechazar firma inválida → `401`
2. Registrar en `payment_webhook_events` (idempotente por `request_id`)
3. Responder rápido
4. Consultar pago en API MP (no confiar en body)
5. Conciliar con `reconcile_store_order_payment`

## Logs

No registrar firma, secret ni headers completos. No guardar payloads con PII innecesaria.
