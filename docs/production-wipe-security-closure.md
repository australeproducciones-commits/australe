# Cierre de seguridad — reset de producción

**Fecha:** 2026-06-24  
**Proyecto:** Supabase remoto (producción Australe)  
**Estado:** Reset validado · RPC destructiva eliminada · herramientas neutralizadas

## Resumen

Operación **única** para eliminar datos de prueba antes de cargar eventos reales.
La configuración global se conservó; datos transaccionales quedaron en cero (`events=0`).

## Permisos verificados (antes del DROP)

Consulta: `scripts/sql/verify_reset_rpc_permissions.sql`

| Rol | `can_execute` |
|-----|---------------|
| `anon` | **false** |
| `authenticated` | **false** |
| `service_role` | true (esperado para uso único) |
| `postgres` | true |

`REVOKE ALL … FROM PUBLIC` aplicado en la definición original de la RPC.

Post-DROP la misma consulta devuelve **0 filas** (función inexistente).

## RPC eliminada

```sql
DROP FUNCTION IF EXISTS public.reset_production_transactional_data(boolean, boolean);
```

Aplicado en remoto. Verificación (`scripts/sql/verify_reset_rpc_absent.sql`): **0 filas**.

Referencia documental del DROP: `scripts/sql/teardown_reset_rpc.sql` (no re-ejecutar).

## Herramientas retiradas / neutralizadas

| Elemento | Estado |
|----------|--------|
| Comando npm `reset:production-data` | **No existe** en `package.json` |
| `reset-production-data.ts` | Archivado como `.disabled` |
| `reset_production_transactional_data.sql` | Archivado como `.disabled` |
| `smoke-test-post-reset.mjs` | Archivado como `.disabled` (INSERT/DELETE) |
| Variables `ALLOW_PRODUCTION_RESET`, `RESET_CONFIRMATION`, `RESET_ALL_LOYALTY` | **No** en Vercel |

## Scripts activos seguros

### Read-only

```bash
node scripts/audit-production-data.mjs
```

Inspección de permisos / ausencia RPC:

```bash
npx supabase db query --linked -f scripts/sql/verify_reset_rpc_permissions.sql
npx supabase db query --linked -f scripts/sql/verify_reset_rpc_absent.sql
```

### Validación técnica manual (flags obligatorios)

```bash
POST_RESET_FLOW_TEST=true POST_RESET_FLOW_TEST_NAME=POST-RESET-ADMIN-FLOW-TEST \
  node scripts/validate-post-reset-admin-flow.mjs
```

No agregar esos flags a Vercel. No forma parte del flujo habitual.

## Login manual

Verificado por HTTP sin sesión:

- `GET /login` → 200
- `GET /admin/eventos` sin sesión → 307 hacia login

**Login manual pendiente de confirmación por el usuario en navegador** (credenciales no automatizables).

## Datos conservados tras reset

- `profiles`, `auth.users`, roles
- `site_settings`, `partners`, `advertising_campaigns`
- `community_settings`, `community_levels`
- `event_expense_categories`, `kiosk_product_categories`

## Datos en cero (listo para carga real)

Eventos, productos, transacciones, analítica, fidelización transaccional — ver `docs/production-wipe-dry-run-report.txt`.

## Repetición futura

Cualquier vaciado similar requiere **revisión de seguridad explícita**.
No restaurar automáticamente la RPC ni los scripts `.disabled` sin aprobación.
