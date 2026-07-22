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

## RLS

- Sorteos públicos visibles en estados publicados.
- Entries: usuario ve solo las propias; admin ve todas.
- Winners: públicos cuando el sorteo está `drawn`; usuario ve los propios.
- Audit logs: solo admin (lectura).

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

Variable: `CRON_SECRET` en `.env.local` / entorno.

Acciones: activar programados, cerrar vencidos, expirar premios no reclamados.

**Activación en Vercel:** configurar cron manualmente; no se incluye `vercel.json` automático.

## Integraciones automáticas

Hooks seguros (try/catch, no bloquean pagos):

- `lib/ticket-sales/actions.ts` → tras `awardLoyaltyPointsForTicket`
- `lib/community/loyalty/store.ts` → tras `awardLoyaltyPointsForStoreOrder`

Servicio: `processAutomaticGiveawayEntries()`.

## Pruebas

```bash
node scripts/validate-community-giveaways.mjs
psql $DATABASE_URL -f scripts/validate-community-giveaways-security.sql
```

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
