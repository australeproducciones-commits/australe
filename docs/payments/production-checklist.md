# Checklist — Producción Mercado Pago

## Antes de habilitar pagos reales

- [ ] Pruebas completas en Preview con credenciales **test**
- [ ] Webhook test validado (firma + idempotencia)
- [ ] `npm run lint`, `typecheck`, `build` OK
- [ ] Migración `20260710180000_payment_infrastructure.sql` aplicada en prod (GitHub Actions)
- [ ] Deploy Vercel production con código actual

## Configuración Production (Vercel)

- [ ] `MERCADOPAGO_ACCESS_TOKEN` (producción)
- [ ] `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` (producción)
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` (producción)
- [ ] `MERCADOPAGO_ENVIRONMENT=production`
- [ ] `MERCADOPAGO_ENABLED=false` inicialmente
- [ ] `NEXT_PUBLIC_SITE_URL=https://australeproducciones.com`

## Webhook productivo

- [ ] URL: `https://australeproducciones.com/api/webhooks/mercadopago`
- [ ] Tópico: `payment`
- [ ] Activar solo tras deploy verificado

## Compra controlada

- [ ] Importe bajo, compra real
- [ ] Confirmar pedido, stock, puntos
- [ ] Reenviar webhook → sin duplicar
- [ ] Habilitar `MERCADOPAGO_ENABLED=true`
- [ ] Monitorear primeras ventas

## Reembolso controlado (opcional)

Solo si está autorizado. Manual en panel MP o futura automatización.
