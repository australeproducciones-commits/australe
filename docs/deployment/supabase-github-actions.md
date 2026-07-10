# Supabase — migraciones vía GitHub Actions

Guía para aplicar migraciones de base de datos en **producción** sin prompts interactivos ni credenciales en `.env.local`.

## 1. Dónde cargar los secretos

En el repositorio de GitHub:

**Settings → Environments → production → Environment secrets**

(o **Settings → Secrets and variables → Actions**, si no usás environment; se recomienda `production`).

Cargá los secretos **una sola vez**. GitHub los cifra; no aparecen en logs ni en el código.

## 2. Nombres exactos de secretos

### Obligatorios para `db push`

| Secreto | Descripción |
|---------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token de Supabase (formato `sbp_...`) |
| `SUPABASE_DB_PASSWORD` | Contraseña de Postgres del proyecto |
| `SUPABASE_PROJECT_ID` | Ref del proyecto: `vfmzabiyqmsnlpesfman` |

### Obligatorios para validaciones post-migración

| Secreto | Descripción |
|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon del proyecto (misma que en Vercel) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (solo servidor / CI; nunca en el cliente) |

La URL pública se deriva automáticamente: `https://<SUPABASE_PROJECT_ID>.supabase.co`.

**No guardar** `SUPABASE_ACCESS_TOKEN` ni `SUPABASE_DB_PASSWORD` en `.env.local` del repo local.

## 3. Ejecutar el workflow manualmente

1. Mergeá el workflow a `main` (si aún no está).
2. Confirmá que los secretos del environment `production` están configurados.
3. En GitHub: **Actions → Supabase Production Migrations → Run workflow**.
4. Elegí la rama `main` y ejecutá.

El job `validate` corre siempre (también en PR). El job `migrate-production` solo corre con `workflow_dispatch` o push a `main` que toque migraciones/validadores.

## 4. Revisar logs sin exponer secretos

- GitHub enmascara valores de secretos en la salida del job.
- No habilitar `ACTIONS_STEP_DEBUG` en producción si puede filtrar contexto sensible.
- Los scripts `validate-store-*.mjs` y `verify-clics-products.mjs` no imprimen claves.
- Si un paso falla, revisá el mensaje de error del CLI o del script; no copies connection strings a issues públicos.

## 5. Si falla una migración

1. **No ejecutar** `supabase db reset` en producción.
2. Revisá el log del paso `Aplicar migraciones pendientes`.
3. Corregí con una **migración nueva aditiva** (no edites migraciones ya aplicadas en remoto).
4. Volvé a ejecutar el workflow con `workflow_dispatch`.
5. Si el fallo es de conexión, verificá token y contraseña en los secretos del environment.
6. Si el fallo es de validación post-migración, la DB puede estar actualizada pero el módulo requiere revisión manual antes de reintentar.

## 6. Prohibido en producción

- `supabase db reset`
- Reparar historial de migraciones a mano sin revisión
- Force push para “arreglar” migraciones
- Ejecutar SQL arbitrario desde fuentes externas en el workflow

## 7. Rotar token o contraseña

1. Generá un nuevo PAT en [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) o cambiá la contraseña en **Project Settings → Database**.
2. Actualizá el secreto correspondiente en **Environment → production**.
3. Ejecutá `workflow_dispatch` para verificar que `supabase link` y `db push` siguen funcionando.
4. Revocá el token o contraseña anterior cuando confirmes que el workflow pasó.

## Disparadores automáticos

Tras la primera ejecución manual exitosa, un **push a `main`** que modifique `supabase/migrations/**` o los scripts de validación listados en el workflow también disparará el pipeline (con migración a producción).

Los **pull requests** solo ejecutan el job `validate` (lint, typecheck, build, auditoría). **No** aplican migraciones ni usan secretos de producción.

## Migración Storage pendiente (referencia)

Si `20260710170300_store_products_storage.sql` sigue pendiente en remoto, configurá los secretos y ejecutá el workflow una vez. Luego verificá en los logs:

- `validate-store-storage.mjs` — bucket y controles básicos
- `verify-clics-products.mjs` — productos CLICS con imágenes HTTP 200

Para prueba completa de upload admin (RLS), usá localmente `node scripts/validate-store-storage-e2e.mjs` después de aplicar la migración.
