# Deployment — Tienda

## Pre-requisitos

- Node >= 20
- Proyecto Supabase vinculado
- Variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Pasos

1. `npm ci`
2. `npm run lint && npm run typecheck && npm run build`
3. `node scripts/validate-store-module.mjs`
4. Aplicar migraciones: `npx supabase db push` (proyecto remoto correcto)
5. Push rama y deploy Vercel

## Post-deploy smoke tests

- `/tienda` carga catálogo
- Evento con merch muestra badge y sección
- `/admin/tienda` accesible solo admin
- Crear pedido de prueba en staging (no producción sin autorización)

## Limitación pagos

Mercado Pago automático no configurado. Documentar credenciales faltantes antes de habilitar checkout online.
