# Tienda / Merchandising — Australe Producciones

Módulo de venta de merchandising oficial, **separado del kiosco de consumiciones**.

## Alcance

- Catálogo global y por evento
- Variantes (talle, color, modelo)
- Colecciones
- Carrito y checkout con reserva de stock (30 min)
- Panel admin `/admin/tienda`
- Badge **MERCH DISPONIBLE** en eventos con stock real
- Retiro por código + validación staff
- Puntos de comunidad (`store_points_enabled` en `community_settings`)

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/tienda` | Catálogo público |
| `/tienda/[slug]` | Detalle de producto |
| `/tienda/carrito` | Carrito |
| `/tienda/checkout` | Reserva de pedido |
| `/mi-cuenta/pedidos` | Pedidos del usuario |
| `/admin/tienda` | Panel administrativo |

## Dominios separados

| Kiosco | Tienda |
|--------|--------|
| Bebidas, comidas, consumiciones | Remeras, buzos, merch oficial |
| `kiosk_products` | `store_products` |
| `/admin/productos` (consumiciones) | `/admin/tienda` |

## Variables de entorno

Reutiliza las existentes de Supabase. Para pagos automáticos (futuro):

- Integración Mercado Pago: **no implementada** — flujo manual seguro habilitado
- `store_points_enabled` debe activarse en admin comunidad vía SQL o futura UI

## Migraciones

1. `20260710170000_store_merchandising_foundation.sql`
2. `20260710170100_store_stock_orders_rpc.sql`

Aplicar con Supabase CLI:

```bash
npx supabase db push
```

## Validación local

```bash
node scripts/validate-store-module.mjs
npm run lint
npm run typecheck
npm run build
```

Ver también: [architecture.md](./architecture.md), [admin-guide.md](./admin-guide.md), [security.md](./security.md), [deployment.md](./deployment.md), [test-report.md](./test-report.md).
