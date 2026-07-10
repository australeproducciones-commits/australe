# Test report — Tienda / Merchandising

| Prueba | Resultado | Observación |
|--------|-----------|-------------|
| validate-store-module.mjs | Pendiente CI | Estructura archivos + SQL |
| lint | Pendiente CI | eslint |
| typecheck | Pendiente CI | tsc --noEmit |
| build | Pendiente CI | next build |
| concurrencia stock | Manual/SQL | RPC con FOR UPDATE |
| RLS | Revisión migración | Políticas en foundation |
| badge evento | Implementado | `event_has_available_store_merch` |
| smoke local | Pendiente | Requiere migraciones aplicadas |
| smoke producción | Pendiente | Post deploy |

## Pruebas funcionales recomendadas

Ver checklist en spec del módulo. Ejecutar en staging tras `db push`.
