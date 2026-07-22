# Módulo de sorteos de Comunidad

Documentación técnica del módulo de sorteos exclusivos para miembros de Comunidad Australe.

## Arquitectura

- **Base de datos:** tablas `community_giveaways`, `community_giveaway_entries`, `community_giveaway_winners`, `community_giveaway_audit_logs`.
- **Lógica crítica:** RPCs PostgreSQL `SECURITY DEFINER` invocadas desde servidor con `createAdminClient()` (`service_role`).
- **App:** `lib/community/giveaways/` + rutas públicas y admin.
- **Mantenimiento:** `GET /api/cron/community-giveaways` → `maintain_community_giveaways()`.

## Estados del sorteo

`draft` → `scheduled` → `active` → `closed` → `drawn` | `cancelled`

## Tipos de participación

`free`, `points`, `ticket`, `attendance`, `store_purchase`, `automatic`, `mixed`

## Tablas y relaciones

- `community_giveaways` 1—N `community_giveaway_entries`
- `community_giveaways` 1—N `community_giveaway_winners`
- `community_giveaways` 1—N `community_giveaway_audit_logs`
- `community_giveaway_entries` → `profiles`, `community_members`, `loyalty_transactions`
- `community_giveaway_winners` → `profiles`, `community_giveaway_entries`

## RPCs

| RPC | Acceso | Uso |
|-----|--------|-----|
| `enter_community_giveaway` | `authenticated` (+ validación `auth.uid`) | Participación free/points |
| `claim_community_giveaway_prize` | `authenticated` | Reclamo de premio |
| `create_automatic_giveaway_entry` | `service_role` | Ticket / tienda |
| `cancel_community_giveaway` | `service_role` | Cancelación + reintegro |
| `disqualify_community_giveaway_entry` | `service_role` | Descalificación admin |
| `draw_community_giveaway` | `service_role` | Ejecución del sorteo |
| `activate_community_giveaway_alternate` | `service_role` | Activar suplente |
| `maintain_community_giveaways` | `service_role` | Cron |
| `get_public_community_giveaway_results` | `anon`, `authenticated` | Resultados públicos sanitizados |

## RLS

- Sorteos públicos visibles en estados publicados.
- Entries: usuario ve solo las propias; admin vía `service_role`.
- Winners: usuario ve solo los propios; resultados públicos vía RPC sanitizada.
- Audit logs: solo `service_role` / servidor admin.

## Privacidad de ganadores

La tabla `community_giveaway_winners` **no** es legible en su totalidad por clientes. Los resultados públicos se obtienen exclusivamente con:

```sql
SELECT * FROM get_public_community_giveaway_results('slug-del-sorteo');
```

Columnas devueltas (sin `user_id`, email, teléfono ni metadata):

- `display_name` — generado en servidor (`Diego R.`, `María G.`, `Miembro #A7F4`)
- `winner_type`, `position`, `status_public`
- `selected_at`, `claimed_at`
- `verification_code` — solo para el ganador principal (posición 1)
- Metadatos del sorteo: `giveaway_name`, `drawn_at`, `participant_count`, `total_chances`

## Algoritmo de sorteo y verificación

1. `FOR UPDATE` en la fila del sorteo (una sola ejecución válida).
2. Semilla generada en la transacción: `encode(gen_random_bytes(32), 'hex')` — **no** provista por el cliente.
3. Cada chance recibe clave única: `md5(entry_id || chance_index || draw_seed)`.
4. Se excluyen entries `cancelled`, `disqualified`, `refunded`.
5. Sin duplicados de usuario salvo `allow_duplicate_winners = true`.
6. Segunda ejecución retorna `{ already_drawn: true }`.
7. Se almacena `md5(draw_seed)` en auditoría como identificador de trazabilidad interna.

**Limitación:** sin publicar la semilla original, el hash **no** constituye una prueba criptográfica reproducible para terceros. Es un identificador de auditoría interna, no verificación pública completa.

## Validación de `image_url`

El servidor valida URLs con `validateGiveawayImageUrl()`:

- Acepta: `https://`, `http://`, rutas internas `/...`
- Rechaza: `javascript:`, `data:`, `file:`, `vbscript:`

## Cron y seguridad

```http
GET /api/cron/community-giveaways
Authorization: Bearer <CRON_SECRET>
```

- Comparación con `crypto.timingSafeEqual()` (resistente a timing attacks).
- Rechaza si `CRON_SECRET` no está configurado.
- El cron **no** ejecuta sorteos automáticamente; solo mantenimiento (activar, cerrar, expirar premios).

## Staging y E2E

**No ejecutar E2E contra producción.**

1. Crear o identificar proyecto Supabase de staging (branch, proyecto separado o local).
2. Copiar `.env.staging.local.example` → `.env.staging.local` (ignorado por Git).
3. Verificar `EXPECTED_SUPABASE_PROJECT_REF` coincide con la URL.
4. Aplicar solo migraciones de sorteos:

```bash
supabase db push
# o aplicar manualmente:
# 20260722000000_community_giveaways_foundation.sql
# 20260722000100_community_giveaways_rpc.sql
# 20260722000200_community_giveaways_security_hardening.sql
```

5. Auditoría SQL:

```bash
psql $DATABASE_URL -f scripts/validate-community-giveaways-security.sql
```

6. E2E (requiere `ALLOW_GIVEAWAY_E2E=true`):

```bash
npm run validate:community-giveaways
```

7. Build en worktree limpio:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Variables de build: usar credenciales de staging en `.env.local` **solo dentro del worktree**, verificando el project ref antes de copiar.

## Pruebas

```bash
node scripts/validate-community-giveaways-cron.mjs
node scripts/validate-community-giveaways.mjs
psql $DATABASE_URL -f scripts/validate-community-giveaways-security.sql
```

## Idempotencia

- Participación: `giveaway:{id}:user:{user_id}:request:{request_id}`
- Reintegro: `giveaway_refund:{giveaway_id}:entry:{entry_id}`
- Automática: `giveaway:{giveaway_id}:{source_type}:{source_reference_id}`

## Flujo de participación con puntos

1. `enterGiveawayAction` → `enterCommunityGiveaway` (service)
2. RPC bloquea sorteo y cuenta de puntos (`FOR UPDATE`)
3. Descuenta puntos + `loyalty_transactions`
4. Crea entry + auditoría
5. Retorna chances finales

## Flujo de participación gratuita

Igual que puntos pero sin débito; aplica `level_bonus_config` desde servidor.

## Cancelación y reintegro

`cancel_community_giveaway` marca `cancelled`, revierte puntos por entry con `points_transaction_id`, marca entries `refunded`, idempotente en reintegros.

## Ejecución del sorteo

`draw_community_giveaway`:

1. `FOR UPDATE` en el sorteo
2. Expande chances por `entry_quantity`
3. Ordena con `md5(entry_id || chance_index || draw_seed)` donde `draw_seed = encode(gen_random_bytes(32), 'hex')`
4. Selecciona ganadores/suplentes evitando duplicados salvo `allow_duplicate_winners`
5. Genera `verification_code` único `GV-...`
6. Estado `drawn` + auditoría

La segunda ejecución retorna `{ already_drawn: true }`.

Ver sección **Algoritmo de sorteo y verificación** para detalles y limitaciones.

## Concurrencia

El lock `FOR UPDATE` en la fila del sorteo garantiza una sola ejecución válida.

## Rutas públicas

- `/comunidad/sorteos`
- `/comunidad/sorteos/[slug]`

## Rutas admin

- `/admin/comunidad/sorteos`
- `/admin/comunidad/sorteos/nuevo`
- `/admin/comunidad/sorteos/[id]`
- `/admin/comunidad/sorteos/[id]/participantes`
- `/admin/comunidad/sorteos/[id]/resultado`
- `/admin/comunidad/sorteos/[id]/auditoria`

## Cron

```http
GET /api/cron/community-giveaways
Authorization: Bearer <CRON_SECRET>
```

Variable: `CRON_SECRET` en `.env.staging.local` / entorno de staging.

Acciones: activar programados, cerrar vencidos, expirar premios no reclamados. **No ejecuta sorteos.**

**Activación en Vercel:** configurar cron manualmente; no se incluye `vercel.json` automático.

## Integraciones automáticas

Hooks seguros (try/catch, no bloquean pagos):

- `lib/ticket-sales/actions.ts` → tras `awardLoyaltyPointsForTicket`
- `lib/community/loyalty/store.ts` → tras `awardLoyaltyPointsForStoreOrder`

Servicio: `processAutomaticGiveawayEntries()`.

## Pruebas

Ver sección **Staging y E2E** arriba.

## Seed de prueba

```bash
psql $DATABASE_URL -f scripts/seed-community-giveaway-demo.sql
```

Solo entornos seguros. Slug: `sorteo-comunidad-australe-demo`.

## Rollback no destructivo

1. Desactivar cron
2. Cancelar sorteos activos con reintegro
3. Ocultar rutas/nav (deploy revert)
4. Las migraciones son aditivas; no eliminar tablas en producción sin plan explícito

## Integraciones pendientes (v2)

- QR de evento
- Referidos
- Notificaciones email/WhatsApp dedicadas
- Upload de banner (reutilizar patrón `lib/store/images/`)
