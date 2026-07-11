# Pagos — Australe Producciones

Integración genérica de pagos reutilizable. En la Etapa 3 solo cobra pedidos de **Tienda** (`store_orders`).

## Módulos

| Módulo | Estado |
| --- | --- |
| Tienda (`store`) | Mercado Pago Checkout Pro |
| Entradas | Futuro |
| Kiosco | Fuera de alcance |
| Consumisiones | Futuro |

## Arquitectura

```
Checkout Tienda → API preferencia → Mercado Pago
                        ↓
              payment_transactions
                        ↓
Webhook MP → firma HMAC → consulta Payment API → reconcile_store_order_payment (RPC)
```

Archivos principales:

- `lib/payments/service.ts` — fachada
- `lib/payments/providers/mercadopago.ts` — adaptador REST
- `lib/payments/reconciliation.ts` — conciliación + webhook events
- `lib/payments/signature.ts` — validación `x-signature`

## Variables de entorno

Ver `.env.example`. Configurar en **Vercel** (Preview y Production por separado).

## Documentación

- [Mercado Pago Checkout Pro](./mercadopago-checkout-pro.md)
- [Webhooks](./webhooks.md)
- [Pruebas](./testing.md)
- [Checklist producción](./production-checklist.md)
- [Respuesta ante incidentes](./incident-response.md)

## Medios de pago

Reserva de stock: **30 minutos**. Se excluyen medios offline (`ticket`, `atm`) en la preferencia.

## Pagos tardíos

Si el pago se aprueba después de expirar la reserva, el pedido pasa a `payment_review` sin confirmar stock automáticamente.
