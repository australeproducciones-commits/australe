# Supabase · Australe Producciones

Esquema SQL y migraciones del proyecto. La configuración del cliente Next.js está en `lib/supabase/`.

## Orden de ejecución (V1)

Aplicá los scripts **en este orden** desde **SQL Editor** en el panel de Supabase:

| Paso | Archivo | Qué hace |
|------|---------|----------|
| 1 | [`schema-v1.sql`](./schema-v1.sql) | Tablas, índices, RLS (sin policies), triggers `updated_at` |
| 2 | [`schema-v1-profile-functions.sql`](./schema-v1-profile-functions.sql) | Función `ensure_profile()` para crear/completar perfil desde la app |
| 3 | [`schema-v1-policies.sql`](./schema-v1-policies.sql) | Helpers de rol + policies RLS + GRANTs |
| 4 | [`schema-v1-ticket-reservations.sql`](./schema-v1-ticket-reservations.sql) | Función `reserve_tickets()` para reserva atómica con control de stock |
| 5 | [`schema-v1-ticket-cancellations.sql`](./schema-v1-ticket-cancellations.sql) | Función `cancel_ticket()` para cancelación/vencimiento atómico con liberación de stock |
| 6 | [`schema-v1-ticket-user-link.sql`](./schema-v1-ticket-user-link.sql) | Columna `user_id` en tickets, policy RLS y `reserve_tickets` con vínculo al usuario |
| 7 | [`migrations/20260610190000_event_kiosk_foundation.sql`](./migrations/20260610190000_event_kiosk_foundation.sql) | **ETAPA C.1** — Kiosco / preventa de consumisiones (catálogo, stock por evento, órdenes) |
| 8 | [`migrations/20260611120000_manual_kiosk_order.sql`](./migrations/20260611120000_manual_kiosk_order.sql) | **ETAPA C.2.2** — RPC `create_manual_kiosk_order` (venta manual admin/caja) |
| 9 | [`migrations/20260611140000_manage_kiosk_orders.sql`](./migrations/20260611140000_manage_kiosk_orders.sql) | **ETAPA C.2.3** — Gestión de órdenes (pagar, lista, entregar, cancelar) |
| 10 | [`migrations/20260611170000_public_kiosk_order.sql`](./migrations/20260611170000_public_kiosk_order.sql) | **ETAPA C.3.1** — Preventa pública de consumisiones (`create_public_kiosk_order`) |
| 11 | [`migrations/20260611190000_public_kiosk_order_ticket_link.sql`](./migrations/20260611190000_public_kiosk_order_ticket_link.sql) | **ETAPA C.3.2** — Preventa pública vinculada a entrada (`create_public_kiosk_order_linked`) |

> Los scripts 2–11 son re-ejecutables (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, `ADD COLUMN IF NOT EXISTS`, `IF NOT EXISTS`). El script 1 solo en proyecto limpio.

### Estrategia de perfiles en V1

En **Supabase hosted**, no es posible crear triggers sobre `auth.users` con el rol del SQL Editor. Si intentás ejecutar `schema-v1-auth.sql`, podés recibir:

```
ERROR: 42501: must be owner of relation users
```

**Para V1 usamos creación de profile desde la app** después del signup/login, llamando a `public.ensure_profile()` vía RPC. No ejecutes `schema-v1-auth.sql` si aparece ese error.

## Esquema V1 — `schema-v1.sql`

Define la columna vertebral de la base de datos: perfiles, comunidad, eventos, entradas, productos, pedidos de kiosco, cierres de caja y auditoría.

### Cómo aplicarlo

1. Abrí el [panel de Supabase](https://supabase.com/dashboard) del proyecto.
2. Andá a **SQL Editor → New query**.
3. Copiá y pegá el contenido completo de `schema-v1.sql`.
4. Ejecutá la query (**Run**).
5. Verificá en **Table Editor** que las 11 tablas existan.

### Qué incluye V1

| Incluido | Detalle |
|----------|---------|
| Extensión | `pgcrypto` |
| Función | `update_updated_at_column()` |
| Tablas | 11 tablas con FKs y `CHECK` constraints |
| Índices | Consultas frecuentes por slug, estado, evento, QR, etc. |
| RLS | Activado en todas las tablas |
| Policies | Definidas en `schema-v1-policies.sql` |
| Datos | **Sin seeds** ni datos de prueba |

## Profile functions V1 — `schema-v1-profile-functions.sql`

Alternativa compatible con Supabase hosted. No toca `auth.users`.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| Función | `public.ensure_profile(p_full_name, p_whatsapp)` |
| Seguridad | `SECURITY DEFINER`, `SET search_path = public` |
| Auth | Usa `auth.uid()`; falla si el usuario no está autenticado |
| Insert | Crea profile con `role = 'customer'`, `is_active = true` |
| Update | Si ya existe, solo completa `full_name`/`whatsapp` vacíos |
| Inmutable | No modifica `role` ni `is_active` en perfiles existentes |
| Retorno | Devuelve la fila `public.profiles` |
| Permisos | `GRANT EXECUTE` a rol `authenticated` |

### Uso desde la app (etapa posterior)

Tras signup o login exitoso, el frontend llamará:

```ts
await supabase.rpc("ensure_profile", {
  p_full_name: "Nombre",
  p_whatsapp: "+54...",
});
```

## Policies V1 — `schema-v1-policies.sql`

Policies RLS base por rol. Requiere scripts 1 y 2 ejecutados.

### Funciones helper

| Función | Descripción |
|---------|-------------|
| `current_user_role()` | Rol del profile activo (`auth.uid()`), o `NULL` |
| `is_admin()` | `role = 'admin'` |
| `is_cashier()` | `role = 'cashier'` |
| `is_door()` | `role = 'door'` |
| `is_customer()` | `role = 'customer'` |
| `is_staff()` | `admin`, `cashier` o `door` |

Todas: `STABLE`, `SECURITY DEFINER`, `SET search_path = public`.

### GRANTs

| Rol | Permisos |
|-----|----------|
| `anon` | `SELECT` en `events`, `ticket_types`, `products`, `event_products` (solo filas que pasen RLS pública) |
| `authenticated` | Permisos de tabla según policies; columnas sensibles revocadas |

**REVOKE por columnas (authenticated):**

- `profiles`: no puede `UPDATE` de `role`, `is_active`
- `community_members`: no puede `UPDATE` de `status`, `community_code`, `profile_id`
- `event_products`: solo `UPDATE` de `stock_current` (cashier vía policy)

### Resumen de policies por tabla

| Tabla | Acceso |
|-------|--------|
| `profiles` | Admin todo; usuario SELECT/UPDATE propio |
| `community_members` | Admin todo; usuario CRUD propio; cashier SELECT |
| `events` | Público SELECT `published`; staff SELECT todos; admin todo |
| `ticket_types` | Público SELECT activos de eventos publicados; staff SELECT; admin todo |
| `tickets` | Sin acceso público; customer/cashier/door/admin según rol |
| `products` | Público SELECT activos; cashier/customer SELECT; admin todo |
| `event_products` | Público SELECT visible+activo de publicados; cashier stock; admin todo |
| `kiosk_orders` | Customer pedidos propios; cashier operación; admin todo |
| `kiosk_order_items` | Customer items de pedidos propios; cashier operación; admin todo |
| `cash_closures` | Admin todo; cashier SELECT/INSERT |
| `audit_logs` | Admin SELECT/INSERT; staff INSERT propio |

### Lectura pública permitida

Solo catálogo público:

- Eventos con `status = 'published'`
- `ticket_types` activos de eventos publicados
- `products` activos
- `event_products` visibles y activos de eventos publicados (lista de precios)

**No hay acceso público** a `profiles`, `tickets`, `kiosk_orders`, `cash_closures` ni `audit_logs`.

## Ticket reservations V1 — `schema-v1-ticket-reservations.sql`

Reserva web atómica con control de stock. Requiere scripts 1, 2 y 3 ejecutados.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| Función | `public.reserve_tickets(p_event_id, p_ticket_type_id, p_quantity, p_buyer_name, p_buyer_whatsapp, p_buyer_dni)` |
| Retorno | `SETOF public.tickets` (array de filas creadas, ideal para `supabase.rpc`) |
| Transacción | `SELECT ... FOR UPDATE` en `ticket_types`, incremento de `stock_sold` e inserts en `tickets` |
| Anti-sobreventa | Bloqueo de fila + validación de stock antes de incrementar |
| Seguridad | `SECURITY DEFINER`, `SET search_path = public` |
| Auth | Requiere `auth.uid()`; sin `EXECUTE` para `anon` |
| Validaciones | Evento publicado, venta interna, tipo activo, ventana de venta, máximo por compra, stock |

### Uso desde la app (etapa posterior)

Reemplaza la reserva manual desde server actions (insert directo en `tickets` + intento de `UPDATE` en `ticket_types`, que fallaba por RLS para clientes).

```ts
const { data, error } = await supabase.rpc("reserve_tickets", {
  p_event_id: eventId,
  p_ticket_type_id: ticketTypeId,
  p_quantity: 2,
  p_buyer_name: "Nombre Apellido",
  p_buyer_whatsapp: "+54...",
  p_buyer_dni: "12345678",
});
// data: Ticket[] con las filas creadas
```

### Errores esperados (`RAISE EXCEPTION`)

| Mensaje | Causa |
|---------|-------|
| `usuario no autenticado` | Sin sesión |
| `cantidad inválida` | `p_quantity <= 0` |
| `comprador requerido` | `p_buyer_name` vacío |
| `evento no disponible` | Evento inexistente o no `published` |
| `venta interna no habilitada` | `ticket_sale_mode` no es `internal` ni `both` |
| `tipo de entrada no disponible` | Tipo inexistente, inactivo o de otro evento |
| `venta fuera de fecha` | Fuera de `sale_start_at` / `sale_end_at` |
| `supera máximo por compra` | Cantidad mayor a `max_per_order` |
| `stock insuficiente` | Sin cupo en `stock_total - stock_sold` |

## Ticket cancellations V1 — `schema-v1-ticket-cancellations.sql`

Cancelación o vencimiento admin atómico con liberación de stock. Requiere scripts 1–4 ejecutados.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| Función | `public.cancel_ticket(p_ticket_id, p_cancel_reason, p_mark_as_expired)` |
| Retorno | `public.tickets` (fila actualizada, ideal para `supabase.rpc`) |
| Transacción | `SELECT ... FOR UPDATE` en `tickets` y `ticket_types`, decremento de `stock_sold` y update del ticket |
| Anti-doble-liberación | Si el ticket ya está `cancelled` o `expired`, falla sin tocar stock |
| Liberación de stock | Solo si el ticket estaba en `reserved` o `valid` |
| Seguridad | `SECURITY DEFINER`, validación interna con `is_admin()` |
| Auth | Requiere `auth.uid()`; sin `EXECUTE` para `anon` |

### Uso desde la app

Reemplaza cancelación manual (update en `tickets` + `decrementStockSold` desde server action).

```ts
// Cancelar
await supabase.rpc("cancel_ticket", {
  p_ticket_id: ticketId,
  p_cancel_reason: "Motivo opcional",
  p_mark_as_expired: false,
});

// Marcar vencida
await supabase.rpc("cancel_ticket", {
  p_ticket_id: ticketId,
  p_cancel_reason: "Reserva vencida",
  p_mark_as_expired: true,
});
```

### Errores esperados (`RAISE EXCEPTION`)

| Mensaje | Causa |
|---------|-------|
| `usuario no autenticado` | Sin sesión |
| `solo administradores pueden cancelar entradas` | Usuario no admin |
| `entrada no encontrada` | `p_ticket_id` inexistente |
| `la entrada ya fue usada` | `ticket_status = used` |
| `la entrada ya fue cancelada o vencida` | Evita doble liberación de stock |
| `no se pudo liberar stock` | Fallo al actualizar `ticket_types` |

### Nota sobre tipos de entrada eliminados

Si `ticket_type_id` apunta a un tipo ya eliminado, la función **cancela el ticket igual** pero **no intenta descontar stock** (entrada huérfana). Esto evita bloquear operaciones admin.

## Ticket user link V1 — `schema-v1-ticket-user-link.sql`

Vincula entradas al usuario autenticado para **Mi Cuenta**. Requiere scripts 1–5 ejecutados.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| Columna | `tickets.user_id` → `auth.users(id)` ON DELETE SET NULL |
| Índice | `idx_tickets_user_id` |
| Policy | `tickets_select_own_user_id` — customer ve tickets con `user_id = auth.uid()` |
| Función | `reserve_tickets()` actualizada: guarda `user_id` y `community_member_id` (si existe membresía) |

### Mi Cuenta

Tras ejecutar este script, las reservas nuevas aparecen en `/mi-cuenta` sin depender solo de `community_member_id`. Entradas anteriores sin `user_id` no se muestran hasta re-reservar o migrar datos manualmente.

### Diagnóstico: ventas/entradas vacías

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Admin ventas vacío pero hay reservas en BD | Consulta fallaba al pedir columna `user_id` inexistente | Ejecutar script 6; el frontend ya no incluye `user_id` en el SELECT base |
| Mi Cuenta vacío tras reservar | `user_id` NULL en tickets o script 6 no ejecutado | Ejecutar script 6 y volver a reservar con usuario **customer** |
| Reserva “éxito” sin tickets | RPC `reserve_tickets` no desplegada o devolvió 0 filas | Ejecutar scripts 4 y 6 en SQL Editor |
| Cliente no ve tickets viejos | Reservados antes de script 6 | Re-reservar o asignar `user_id` manualmente en admin |

### Advertencias de seguridad (reforzar en server actions/backend)

Las policies RLS son la primera línea de defensa. En V1, estas operaciones **deben validarse también en server actions** o funciones `SECURITY DEFINER`:

1. **Tickets customer INSERT** — usar `reserve_tickets()` en lugar de insert directo; la policy RLS sigue aplicando si se inserta manualmente, pero no valida stock ni precios.
2. **Tickets admin cancel** — usar `cancel_ticket()` en lugar de update manual + decremento de `stock_sold`; evita doble liberación de stock.
3. **Tickets customer SELECT** — vía `user_id = auth.uid()` (script 6) y/o `community_member_id` ligado al profile.
4. **Tickets door UPDATE** — solo transición `valid → used`; validar `qr_token` y evento en backend.
5. **Tickets cashier** — policies amplias; validar montos, métodos de pago y stock en server actions.
6. **Kiosk orders customer** — validar totales, items y stock en backend; RLS no recalcula precios.
7. **Community_members INSERT** — `community_code` debe generarse server-side, no desde el cliente.
8. **Cash_closures cashier INSERT** — totales deben calcularse server-side, no confiar en el cliente.
9. **ensure_profile** — sigue siendo el único camino seguro para crear profiles en V1 (`SECURITY DEFINER`).

## ETAPA C.1 — Kiosco / preventa de consumisiones

Script: [`migrations/20260610190000_event_kiosk_foundation.sql`](./migrations/20260610190000_event_kiosk_foundation.sql)

Requiere scripts 1–3 ejecutados (`schema-v1.sql`, profile functions, policies).

### Qué hace

| Incluido | Detalle |
|----------|---------|
| Tablas nuevas | `kiosk_products`, `event_kiosk_settings`, `event_kiosk_products` |
| Órdenes C.1 | Reemplaza `kiosk_orders` / `kiosk_order_items` del schema V1 inicial (legacy ligado a `event_products`) |
| Triggers | `updated_at`, generación de `order_code`, recálculo de `total_amount` |
| RPC | `reserve_event_kiosk_stock`, `release_event_kiosk_stock`, `recalculate_kiosk_order_total` |
| RLS | Admin CRUD; cashier operación en órdenes; catálogo público **solo lectura** preparado para C.3 |

> `products` / `event_products` del schema V1 **no se modifican** (lista de precios legacy).

### Tablas

| Tabla | Propósito |
|-------|-----------|
| `kiosk_products` | Catálogo maestro de consumisiones |
| `event_kiosk_settings` | Preventa / venta manual habilitada por evento |
| `event_kiosk_products` | Producto + precio + stock por evento |
| `kiosk_orders` | Orden de compra (comprador, pago, retiro) |
| `kiosk_order_items` | Ítems con nombre y precio congelados |

### Stock (`event_kiosk_products`)

- `stock_total = NULL` → stock ilimitado o no controlado en V1.
- `stock_sold` → unidades vendidas/reservadas en órdenes válidas (se actualiza vía RPC en C.2+).

### Estados

**`payment_status`:** `pending`, `paid`, `cancelled`, `refunded`

**`pickup_status`:** `pending`, `ready`, `delivered`, `cancelled`

**`source`:** `admin`, `public`, `manual`

### Seguridad / alcance C.1

- **Sin checkout público** ni policies de INSERT customer en órdenes (se implementará en **C.3**).
- SELECT público de catálogo solo si `presale_enabled = true` y evento `published`.
- Validar totales, stock y pagos en server actions / RPC (no confiar solo en RLS).

### Helpers TypeScript

- `lib/kiosk/types.ts` — tipos y estados
- `lib/kiosk/utils.ts` — labels, formato de dinero/stock
- `lib/kiosk/queries.ts` — lecturas admin
- `lib/kiosk/actions.ts` — CRUD inicial admin (sin venta manual aún)

## ETAPA C.2.2 — Venta manual admin

Script: [`migrations/20260611120000_manual_kiosk_order.sql`](./migrations/20260611120000_manual_kiosk_order.sql)

Requiere script 7 (`event_kiosk_foundation`) ejecutado.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| RPC | `public.create_manual_kiosk_order(...)` |
| Auth | `SECURITY DEFINER`; requiere `is_admin()` o `is_cashier()` |
| Transacción | Bloqueo `FOR UPDATE` en productos, creación de orden + ítems + `stock_sold` |
| Origen | `source = manual` |
| Pago inicial | `pending` o `paid` (si `paid`, setea `paid_at`) |
| Retiro inicial | `pickup_status = pending` |
| Retorno | `order_id`, `order_code`, `total_amount` |

### Stock

Por cada ítem vendido, la RPC incrementa `event_kiosk_products.stock_sold` dentro de la misma transacción, validando `stock_total` si no es `NULL`.

El `total_amount` de la orden se recalcula vía trigger existente al insertar `kiosk_order_items`.

### Uso desde la app

```ts
await supabase.rpc("create_manual_kiosk_order", {
  p_event_id: eventId,
  p_buyer_name: "Nombre",
  p_buyer_whatsapp: "+54...",
  p_buyer_dni: null,
  p_buyer_email: null,
  p_ticket_id: null,
  p_payment_status: "paid",
  p_notes: null,
  p_items: [
    { event_kiosk_product_id: "...", quantity: 2 },
  ],
});
```

Server action: `createManualKioskOrderAction` en `lib/kiosk/actions.ts`.

UI: botón **Nueva venta manual** en `/admin/eventos/[id]/kiosco`.

### Alcance

- Venta manual desde admin/caja: **sí** (C.2.2).
- Preventa pública separada: **sí** (C.3.1).
- Compra junto con entrada: **pendiente C.3.2**.

## ETAPA C.2.3 — Gestión de órdenes de kiosco

Script: [`migrations/20260611140000_manage_kiosk_orders.sql`](./migrations/20260611140000_manage_kiosk_orders.sql)

Requiere scripts 7 y 8 ejecutados.

### RPCs

| RPC | Qué hace |
|-----|----------|
| `mark_kiosk_order_paid` | `pending` → `paid`, setea `paid_at` |
| `mark_kiosk_order_ready` | `pickup_status` → `ready` |
| `mark_kiosk_order_delivered` | Exige `paid`; setea `delivered` + `delivered_at` |
| `cancel_kiosk_order` | Cancela pago y retiro; libera `stock_sold` de ítems |

### Reglas

- **Cancelación idempotente:** si ya está cancelada, no libera stock de nuevo.
- **Entregada no se cancela:** `pickup_status = delivered` rechaza cancelación.
- **Entregar exige pago:** `payment_status` debe ser `paid`.
- **Stock:** al cancelar, resta `quantity` de `stock_sold` por ítem (mínimo 0).

### Estados iniciales (venta manual C.2.2)

| Campo | Valor típico |
|-------|----------------|
| `source` | `manual` |
| `payment_status` | `pending` o `paid` |
| `pickup_status` | `pending` |

### UI

`/admin/eventos/[id]/kiosco` — acciones por orden, filtros, búsqueda y modal de cancelación.

### Alcance

- Gestión operativa admin/caja: **sí** (C.2.3).
- Preventa pública separada: **sí** (C.3.1).
- Compra junto con entrada: **pendiente C.3.2**.

## ETAPA C.3.1 — Preventa pública de consumisiones separada

Script: [`migrations/20260611170000_public_kiosk_order.sql`](./migrations/20260611170000_public_kiosk_order.sql)

Requiere scripts 7–9 ejecutados.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| RPC | `public.create_public_kiosk_order(...)` |
| Auth | `SECURITY DEFINER`; `GRANT EXECUTE` a `anon` y `authenticated` |
| Validación interna | Evento `published`, `presale_enabled`, productos disponibles, stock |
| Origen | `source = public` |
| Pago inicial | `payment_status = pending` |
| Retiro inicial | `pickup_status = pending` |
| Entrada | `ticket_id = null` (reserva separada de entradas) |
| Retorno | `order_id`, `order_code`, `total_amount` |

### Seguridad

- El público **no** tiene SELECT amplio sobre `kiosk_orders`.
- La confirmación post-reserva usa la respuesta de la RPC / server action, no una query pública a órdenes ajenas.
- No hay cancelación ni modificación pública de órdenes.

### UI pública

`app/(public)/eventos/[slug]/page.tsx` — sección **Preventa de consumisiones** cuando `presale_enabled` y hay productos vendibles.

Componente: `components/kiosk/PublicEventKioskSection.tsx`

Query: `getPublicEventKiosk(eventId)` en `lib/kiosk/queries.ts`

Action: `createPublicKioskOrderAction` en `lib/kiosk/actions.ts`

### Admin

Las órdenes `source = public` aparecen en `/admin/eventos/[id]/kiosco` con las mismas acciones de gestión (pagar, lista, entregar, cancelar).

### Alcance

- Preventa pública separada de entradas: **sí** (C.3.1).
- Compra junto con entrada: **sí** (C.3.2).
- Pago online: **no** (fuera de alcance).

## ETAPA C.3.2 — Consumisiones junto con entradas

Script: [`migrations/20260611190000_public_kiosk_order_ticket_link.sql`](./migrations/20260611190000_public_kiosk_order_ticket_link.sql)

Requiere scripts 7–10 ejecutados.

### Qué incluye

| Incluido | Detalle |
|----------|---------|
| RPC nueva | `public.create_public_kiosk_order_linked(...)` |
| `ticket_id` | Opcional; si viene, valida que pertenezca al mismo evento |
| Vínculo | En flujo combinado se asocia al **primer ticket** creado en la reserva |
| Origen | `source = public` |
| Estados iniciales | `payment_status = pending`, `pickup_status = pending` |

### Flujo en la app

1. El visitante reserva entradas en `/eventos/[slug]/entradas` (flujo existente).
2. Si `presale_enabled` y hay productos vendibles, puede sumar consumisiones opcionales.
3. `reserveTicketsAction` crea entradas vía `reserve_tickets` y luego llama `create_public_kiosk_order_linked` si hay ítems de kiosco.
4. Si falla el kiosco pero las entradas ya se crearon, se muestra aviso parcial sin ocultar la reserva de entradas.

### Varias entradas

Si el comprador reserva más de una entrada, `kiosk_orders.ticket_id` apunta al **primer ticket** generado (referencia operativa en admin).

### C.3.1 separada

La preventa independiente en `/eventos/[slug]` (`PublicEventKioskSection`) sigue usando `create_public_kiosk_order` sin `ticket_id`.

### Admin

Órdenes del flujo combinado: `source = public` + badge **Con entrada** cuando `ticket_id` no es null.

### Alcance

- Consumisiones junto con entradas: **sí** (C.3.2).
- Pago online: **no** (pendiente etapa futura).

## ETAPA C.3.3 — Confirmación pública

Sin migración SQL nueva. Mejora de UI en la app.

### Qué muestra la confirmación

| Flujo | Componente | Contenido |
|-------|------------|-----------|
| Entradas (+ kiosco opcional) | `TicketReservationSuccess` | Evento, comprador, entradas con QR, consumisiones, totales, instrucciones |
| Preventa separada | `PublicKioskOrderSuccess` | Código KIO, productos, estados pago/retiro pendiente, instrucciones |

### Error parcial de kiosco (C.3.2)

Si las entradas se crearon pero falló el kiosco, la confirmación muestra alerta amarilla y enlace a `#preventa-consumisiones` en la página del evento. La reserva de entradas **no se oculta**.

### Alcance

- Confirmación pública mejorada: **sí** (C.3.3).
- C.3.1 preventa separada: **sí** (mismo estilo visual).
- C.3.2 flujo combinado: **sí**.
- Pago online: **no** (pendiente).

## Auth V1 — `schema-v1-auth.sql` (no recomendado en hosted)

> **Advertencia:** este archivo intenta crear un trigger `AFTER INSERT` sobre `auth.users`. En **Supabase hosted** suele fallar con `ERROR 42501: must be owner of relation users`.

**No ejecutar** si aparece el error 42501. Usar `schema-v1-profile-functions.sql` en su lugar.

## Próximas etapas

1. Ejecutar `schema-v1-policies.sql` en SQL Editor.
2. Regenerar tipos TypeScript:

   ```bash
   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
   ```

3. **Login** en `/login` con Supabase Auth + llamada a `ensure_profile`.
4. **Middleware** para refresco de sesión y protección de rutas.
5. Server actions para operaciones sensibles (venta entradas, pedidos, cierre caja).

## Seguridad

- No commitear `.env.local` ni claves reales.
- No usar `service_role` en el frontend.
- Las policies RLS + validación server-side son obligatorias antes de producción.
