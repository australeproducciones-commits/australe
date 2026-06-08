# Supabase · Australe Producciones

Esquema SQL y migraciones del proyecto. La configuración del cliente Next.js está en `lib/supabase/`.

## Orden de ejecución (V1)

Aplicá los scripts **en este orden** desde **SQL Editor** en el panel de Supabase:

| Paso | Archivo | Qué hace |
|------|---------|----------|
| 1 | [`schema-v1.sql`](./schema-v1.sql) | Tablas, índices, RLS (sin policies), triggers `updated_at` |
| 2 | [`schema-v1-profile-functions.sql`](./schema-v1-profile-functions.sql) | Función `ensure_profile()` para crear/completar perfil desde la app |
| 3 | [`schema-v1-policies.sql`](./schema-v1-policies.sql) | Helpers de rol + policies RLS + GRANTs |
| 4 | *(pendiente)* Frontend | Login que llama `ensure_profile` tras signup/login |

> Los scripts 2 y 3 son re-ejecutables (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`). El script 1 solo en proyecto limpio.

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

### Advertencias de seguridad (reforzar en server actions/backend)

Las policies RLS son la primera línea de defensa. En V1, estas operaciones **deben validarse también en server actions** o funciones `SECURITY DEFINER`:

1. **Tickets customer INSERT** — RLS exige `sales_channel=web`, `payment_status=pending`, `ticket_status=reserved`, pero no valida stock, precios ni `qr_token` único.
2. **Tickets customer SELECT** — solo vía `community_member_id` ligado al profile; entradas sin membresía no serán visibles hasta ampliar la policy o usar RPC.
3. **Tickets door UPDATE** — solo transición `valid → used`; validar `qr_token` y evento en backend.
4. **Tickets cashier** — policies amplias; validar montos, métodos de pago y stock en server actions.
5. **Kiosk orders customer** — validar totales, items y stock en backend; RLS no recalcula precios.
6. **Community_members INSERT** — `community_code` debe generarse server-side, no desde el cliente.
7. **Cash_closures cashier INSERT** — totales deben calcularse server-side, no confiar en el cliente.
8. **ensure_profile** — sigue siendo el único camino seguro para crear profiles en V1 (`SECURITY DEFINER`).

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
