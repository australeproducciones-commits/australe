# Respuesta ante incidentes — Pagos

## Pago aprobado, pedido en revisión

**Síntoma:** Cliente pagó pero pedido en `payment_review` (reserva expirada).

**Acción:**

1. Verificar pago en panel Mercado Pago
2. Confirmar stock disponible
3. Opciones: confirmar manualmente (`mark_store_order_paid`) tras reponer stock, o reembolsar en MP
4. No forzar confirmación automática sin stock

## Webhooks fallando

1. Verificar `MERCADOPAGO_WEBHOOK_SECRET` en Vercel
2. Revisar `payment_webhook_events` (admin)
3. Reconciliar manualmente desde `/admin/tienda/pedidos` → **Reconciliar MP**

## Doble acreditación de puntos

El RPC usa idempotency key `store_order:{id}:earn`. Si hay duplicado, revisar `loyalty_transactions`.

## Rotación de credenciales

1. Generar nuevo token/secret en panel MP
2. Actualizar Vercel (Preview primero, luego Production)
3. Actualizar webhook secret en MP
4. No commitear valores

## Contracargo (`charged_back`)

Pedido pasa a revisión. Contactar administración. No borrar datos.

## Contacto

Registrar incidente con: order_number, payment_id (parcial), timestamp, outcome de conciliación.
