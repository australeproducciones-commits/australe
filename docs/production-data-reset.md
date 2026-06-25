# Reset completo — vaciar eventos y productos de prueba

> **Estado (2026-06-24):** Reset ejecutado y validado. RPC eliminada del remoto.
> Herramientas destructivas **neutralizadas** (`.disabled`). Ver `docs/production-wipe-security-closure.md`.

Operación **única** que eliminó todos los eventos, productos, transacciones y estadísticas de prueba para empezar a cargar datos reales desde cero. **No** hace `db reset`.

## Auditoría activa (read-only)

```bash
node scripts/audit-production-data.mjs
```

## Validación técnica manual (no forma parte del flujo habitual)

```bash
POST_RESET_FLOW_TEST=true POST_RESET_FLOW_TEST_NAME=POST-RESET-ADMIN-FLOW-TEST \
  node scripts/validate-post-reset-admin-flow.mjs
```

**Login manual pendiente de confirmación por el usuario en navegador.**

## Seguridad (cierre)

- RPC `reset_production_transactional_data` **eliminada** del remoto
- Comando npm `reset:production-data` **no existe** en `package.json`
- **No** agregar `ALLOW_PRODUCTION_RESET`, `RESET_CONFIRMATION`, `RESET_ALL_LOYALTY` ni flags de validación a Vercel
- Scripts destructivos archivados como `.disabled` en `scripts/archive/production-wipe/`
- Cualquier repetición futura requiere revisión específica; **no** copiar este procedimiento automáticamente

## Configuración conservada

- `profiles`, `auth.users`, roles
- `site_settings`, `partners`, `advertising_campaigns`
- `community_settings`, `community_levels`
- `event_expense_categories`, `kiosk_product_categories`

## Histórico — orden de eliminación (FK)

1. `advertising_impressions`, `analytics_events`
2. Fidelización (según opción)
3. `community_event_invitations`
4. Finanzas por evento
5. `kiosk_product_stock_movements` ← RESTRICT en `kiosk_products`
6. `kiosk_order_items` ← RESTRICT en `event_kiosk_products`
7. `kiosk_orders`, `tickets`, `cash_closures`
8. Config por evento (`event_streams`, `event_staff`, `event_kiosk_products`, …)
9. `ticket_types`, `events`
10. `kiosk_products`

Definición histórica de la RPC: `scripts/archive/production-wipe/reset_production_transactional_data.sql.disabled`
