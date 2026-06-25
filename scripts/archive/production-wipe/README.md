# Archivo — reset de producción (uso único, completado)

El vaciado de datos de prueba se ejecutó y validó el **2026-06-24**.
La RPC `reset_production_transactional_data` fue **eliminada** del proyecto Supabase remoto.

## No usar en producción

Estos archivos quedan **neutralizados** (extensión `.disabled`) como referencia histórica únicamente.
**No** restaurar ni ejecutar sin una revisión de seguridad explícita.

## Auditoría activa (read-only, flujo permitido)

```bash
node scripts/audit-production-data.mjs
```

## Validación técnica manual (requiere flags explícitos)

```bash
POST_RESET_FLOW_TEST=true POST_RESET_FLOW_TEST_NAME=POST-RESET-ADMIN-FLOW-TEST \
  node scripts/validate-post-reset-admin-flow.mjs
```

No agregar `POST_RESET_FLOW_TEST` ni `POST_RESET_FLOW_TEST_NAME` a Vercel.

## Contenido archivado (no ejecutable)

| Archivo | Descripción |
|---------|-------------|
| `reset-production-data.ts.disabled` | Orquestador histórico (dry-run / reset real) |
| `reset_production_transactional_data.sql.disabled` | Definición RPC ya eliminada en remoto |
| `smoke-test-post-reset.mjs.disabled` | Smoke test con INSERT/DELETE — archivado |

## Seguridad

- No existe comando `reset:production-data` en `package.json`
- No agregar `ALLOW_PRODUCTION_RESET`, `RESET_CONFIRMATION` ni `RESET_ALL_LOYALTY` a Vercel
- Login manual pendiente de confirmación por el usuario en navegador

Ver `docs/production-wipe-security-closure.md`.
