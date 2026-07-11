# Pruebas — Mercado Pago Tienda

## Validadores locales (sin credenciales)

```bash
node scripts/validate-mercadopago-unit.mjs
node scripts/validate-mercadopago-payments.mjs
node scripts/validate-store-module.mjs
```

## Credenciales test (Vercel Preview)

Cargar en Vercel → Settings → Environment Variables (Preview):

- `MERCADOPAGO_ACCESS_TOKEN` (test)
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` (test)
- `MERCADOPAGO_WEBHOOK_SECRET` (desde panel MP)
- `MERCADOPAGO_ENVIRONMENT=test`
- `MERCADOPAGO_ENABLED=true`

## Flujo E2E test

1. Crear pedido en `/tienda/checkout`
2. Clic en **Pagar con Mercado Pago**
3. Pagar con usuario/cuenta de prueba MP
4. Verificar webhook en logs Vercel
5. Confirmar pedido `paid`, stock y puntos
6. Reenviar webhook → sin duplicados

## Casos a cubrir

| Caso | Resultado esperado |
| --- | --- |
| Aprobado | `paid` / `confirmed` |
| Pendiente | `pending`, sin puntos |
| Rechazado | `failed`, reintento si reserva vigente |
| Webhook duplicado | idempotente |
| Monto distinto | `amount_mismatch` |
| Referencia distinta | `reference_mismatch` |
| Reserva expirada + aprobado | `payment_review` |
| Reembolsado | `refunded`, puntos revertidos |

## Limpieza

Eliminar solo pedidos TEST creados en la sesión de prueba. No usar `db reset`.
