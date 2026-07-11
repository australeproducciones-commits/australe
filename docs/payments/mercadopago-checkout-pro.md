# Mercado Pago Checkout Pro — Tienda

## Flujo

1. Usuario reserva pedido (`create_store_order`).
2. `POST /api/store/payments/mercadopago/preference` crea o reutiliza preferencia.
3. Redirección a `init_point` de Mercado Pago.
4. MP notifica `POST /api/webhooks/mercadopago?data.id={payment_id}`.
5. Servidor valida firma, consulta `/v1/payments/{id}` y ejecuta `reconcile_store_order_payment`.

## Preferencia

- Moneda: **ARS**
- `external_reference`: `store:{order_uuid}`
- `metadata`: `module`, `order_id`, `order_number`
- `expiration_date_to`: alineado a `reserved_until`
- `notification_url`: `{SITE_URL}/api/webhooks/mercadopago`
- `back_urls`: `/tienda/pago/exito|pendiente|error?pedido={order_number}`

## Seguridad

- Importes calculados en servidor desde `store_order_items`.
- No se aceptan montos del navegador.
- `MERCADOPAGO_ENABLED=false` bloquea preferencias en backend.
- Access Token y Webhook Secret solo en servidor.

## Feature flag

| Entorno | Recomendación |
| --- | --- |
| Preview | `MERCADOPAGO_ENABLED=true` + credenciales **test** |
| Production | `false` hasta compra controlada, luego `true` |

## Reembolsos

No hay reembolso automático en esta etapa. El webhook concilia `refunded` y revierte puntos/stock vía `cancel_store_order`. Reembolso manual en panel MP si corresponde.
