# Verificación manual — Etapa 1 seguridad (usuarios internos)

Ejecutar en Supabase SQL Editor o vía cliente autenticado. No aplicar en producción sin respaldo.

## CASO 1 — Cajero intenta `staff_all_events = true`

```sql
-- Sesión: usuario cashier autenticado
UPDATE public.profiles
SET staff_all_events = true
WHERE id = auth.uid();
```

**Esperado:** error de permisos (columna revocada).

## CASO 2 — Portero intenta `staff_all_events = true`

Igual que CASO 1 con rol `door`.

**Esperado:** rechazado.

## CASO 3 — Cajero Evento A consulta órdenes Evento B

Cajero con `staff_all_events = false` y asignación solo en Evento A.

```sql
SELECT * FROM public.kiosk_orders WHERE event_id = '<evento-b>';
```

**Esperado:** 0 filas (RLS).

## CASO 4 — Cajero Evento A crea venta en Evento A

```sql
SELECT * FROM public.create_manual_kiosk_order(
  '<evento-a>'::uuid,
  'Comprador prueba',
  NULL, NULL, NULL, NULL,
  'paid',
  NULL,
  '[{"event_kiosk_product_id":"<producto>","quantity":1}]'::jsonb
);
```

**Esperado:** orden creada.

## CASO 5 — Portero valida entrada Evento A

```sql
SELECT * FROM public.mark_ticket_used('<ticket-valido-evento-a>'::uuid);
```

**Esperado:** fila con `ticket_status = used`.

## CASO 6 — Portero valida entrada Evento B

Misma RPC con ticket de otro evento sin asignación.

**Esperado:** `mark_ticket_used: evento no autorizado`.

## CASO 7 — Doble validación simultánea

Dos sesiones `door` llaman `mark_ticket_used` al mismo ticket al mismo tiempo.

**Esperado:** una exitosa; la otra `entrada ya utilizada` (FOR UPDATE).

## CASO 8 — Customer llama `mark_ticket_used`

Sesión `customer`.

**Esperado:** `mark_ticket_used: permiso denegado`.

## CASO 9 — Interno inactivo con sesión abierta

Usuario con `is_active = false` intenta RPC kiosco o `mark_ticket_used`.

**Esperado:** `usuario inactivo` o `permiso denegado` (helpers `current_user_role()` devuelve NULL).

## CASO 10 — Admin opera cualquier evento

Admin crea venta manual y valida entrada en eventos distintos.

**Esperado:** permitido en todos.
