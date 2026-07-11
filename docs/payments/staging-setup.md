# Staging — pagos híbridos Australe

Entorno **completamente separado** de producción (`vfmzabiyqmsnlpesfman`).

## Tipo de staging elegido

**Proyecto Supabase independiente** (`australe-staging-hybrid`).

Supabase Branching no está disponible sin conectar GitHub al proyecto de producción.

## Creación automática (GitHub Actions)

Workflow: `.github/workflows/staging-hybrid-payments.yml`

```bash
gh workflow run staging-hybrid-payments.yml --ref feat/store-hybrid-payments -R australeproducciones-commits/australe
```

Pasos del workflow:

1. Provisionar o reutilizar proyecto `australe-staging-hybrid`
2. Aplicar `schema-v1*.sql` + todas las migraciones en `supabase/migrations/`
3. Habilitar `pg_cron` con job `expire_store_reservations_every_5m` (`*/5 * * * *`)
4. Seed de usuarios y productos de prueba
5. Verificar esquema, grants y RPC
6. E2E integración de pago manual

### Secrets de GitHub requeridos

| Secret | Obligatorio | Uso |
|--------|-------------|-----|
| `SUPABASE_ACCESS_TOKEN` | Sí | Management API |
| `STAGING_SUPABASE_PROJECT_ID` | Tras 1.er run | Ref del proyecto staging |
| `STAGING_SUPABASE_DB_PASSWORD` | Tras 1.er run | Password DB staging |

**Nunca** usar `SUPABASE_PROJECT_ID` de producción como destino.

## Creación manual local

1. Copiar `.env.staging.example` → `.env.staging.local`
2. Crear proyecto en [Supabase Dashboard](https://supabase.com/dashboard) o ejecutar:

```bash
export SUPABASE_ACCESS_TOKEN=...
node scripts/staging/provision-staging-project.mjs
```

3. Bootstrap:

```bash
export STAGING_SUPABASE_PROJECT_ID=...
export STAGING_SUPABASE_DB_PASSWORD=...
bash scripts/staging/apply-bootstrap.sh
```

4. Seed y pruebas:

```bash
source .env.staging.local  # o export manual
node scripts/staging/seed-hybrid-fixtures.mjs
node scripts/staging/verify-staging-schema.mjs
node scripts/staging/e2e-hybrid-payments.mjs
```

## Expiración de reservas (30 min)

**Mecanismo principal:** `pg_cron` cada 5 minutos.

```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname = 'expire_store_reservations_every_5m';
```

**Respaldo:** `GET /api/cron/expire-store-reservations` con `CRON_SECRET` (Vercel cron diario en Hobby — no usar como único mecanismo).

## Vercel Preview — rama `feat/store-hybrid-payments`

En [Vercel Dashboard](https://vercel.com) → proyecto **australe** → Settings → Environment Variables:

1. Agregar variables con scope **Preview**
2. En "Git Branch", seleccionar solo `feat/store-hybrid-payments`
3. **No** modificar variables Production

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key staging |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role staging |
| `NEXT_PUBLIC_SITE_URL` | URL estable del Preview |
| `MERCADOPAGO_ENABLED` | `false` |
| `STORE_MANUAL_PAYMENT_ENABLED` | `true` |
| `MERCADOPAGO_ENVIRONMENT` | `test` |
| `CRON_SECRET` | Secreto para cron de respaldo |

**No cargar** `MERCADOPAGO_ACCESS_TOKEN` ni `MERCADOPAGO_WEBHOOK_SECRET` en esta etapa.

### URL estable (opcional)

Settings → Domains → agregar subdominio preview, por ejemplo:

```text
staging.australeproducciones.com
```

Asignar a la rama `feat/store-hybrid-payments`.

## Usuarios de prueba (seed)

Emails con patrón `*+{STAGING_SEED_TAG}@staging.australe.invalid`:

- `admin+…` — administrador
- `cajero+…` — cajero (`staff_all_events: true`)
- `cliente+…` — cliente con membresía comunidad

Contraseña: derivada del tag (ver workflow, no documentar en Git).

## Validación de aislamiento

Tras configurar Preview:

1. Crear pedido en staging
2. Confirmar que **no** aparece en producción (`vfmzabiyqmsnlpesfman`)
3. Comparar project ref en URL Supabase

## Próximo paso: Mercado Pago sandbox

Solo después de validar:

- pg_cron `*/5`
- pago manual E2E
- concurrencia e idempotencia
- puntos y stock únicos

Cargar credenciales **test** en Preview y configurar webhook público.
