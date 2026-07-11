#!/usr/bin/env bash
set -euo pipefail

# Aplica schema V1 + migraciones en proyecto STAGING (nunca producción).
# Uso (CI): STAGING_SUPABASE_PROJECT_ID=... STAGING_SUPABASE_DB_PASSWORD=... ./scripts/staging/apply-bootstrap.sh

PRODUCTION_REF="vfmzabiyqmsnlpesfman"
STAGING_REF="${STAGING_SUPABASE_PROJECT_ID:-}"

if [[ -z "$STAGING_REF" ]]; then
  echo "Falta STAGING_SUPABASE_PROJECT_ID"
  exit 1
fi

if [[ "$STAGING_REF" == "$PRODUCTION_REF" ]]; then
  echo "BLOQUEADO: destino es producción"
  exit 1
fi

if [[ -z "${STAGING_SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Falta STAGING_SUPABASE_DB_PASSWORD"
  exit 1
fi

echo "Staging ref: ${STAGING_REF:0:4}…${STAGING_REF: -4}"

supabase link --project-ref "$STAGING_REF" --password "$STAGING_SUPABASE_DB_PASSWORD" --yes

SCHEMA_FILES=(
  schema-v1.sql
  schema-v1-profile-functions.sql
  schema-v1-policies.sql
  schema-v1-ticket-reservations.sql
  schema-v1-ticket-cancellations.sql
  schema-v1-ticket-user-link.sql
)

DB_DIRECT="postgresql://postgres:${STAGING_SUPABASE_DB_PASSWORD}@db.${STAGING_REF}.supabase.co:5432/postgres"
DB_POOLER="postgresql://postgres.${STAGING_REF}:${STAGING_SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

run_psql() {
  local file="$1"
  if psql "$DB_DIRECT" -v ON_ERROR_STOP=1 -f "$file"; then
    return 0
  fi
  echo "Reintentando con pooler…"
  psql "$DB_POOLER" -v ON_ERROR_STOP=1 -f "$file"
}

for f in "${SCHEMA_FILES[@]}"; do
  if [[ -f "supabase/$f" ]]; then
    echo "=== Aplicando $f ==="
    run_psql "supabase/$f"
  fi
done

echo "=== Listar migraciones ==="
supabase migration list --linked

echo "=== Dry-run db push ==="
supabase db push --linked --dry-run

echo "=== Aplicando migraciones ==="
supabase db push --linked --yes

echo "=== pg_cron ==="
run_psql "scripts/staging/ensure-pg-cron.sql"

CRON_JSON=$(psql "$DB_DIRECT" -t -A -c "SELECT json_build_object('jobname', jobname, 'schedule', schedule) FROM cron.job WHERE jobname = 'expire_store_reservations_every_5m' LIMIT 1;" 2>/dev/null || true)
if [[ -n "$CRON_JSON" ]]; then
  echo "$CRON_JSON" > .staging-pg-cron.json
  echo "pg_cron job registrado"
else
  echo "ADVERTENCIA: no se pudo leer cron.job"
fi

echo "BOOTSTRAP_OK"
