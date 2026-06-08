# Supabase · Australe Producciones

Esquema SQL y migraciones del proyecto. La configuración del cliente Next.js está en `lib/supabase/`.

## Orden de ejecución (V1)

Aplicá los scripts **en este orden** desde **SQL Editor** en el panel de Supabase:

| Paso | Archivo | Qué hace |
|------|---------|----------|
| 1 | [`schema-v1.sql`](./schema-v1.sql) | Tablas, índices, RLS (sin policies), triggers `updated_at` |
| 2 | [`schema-v1-profile-functions.sql`](./schema-v1-profile-functions.sql) | Función `ensure_profile()` para crear/completar perfil desde la app |
| 3 | *(pendiente)* [`schema-v1-policies.sql`](./schema-v1-policies.sql) | Policies RLS por rol |
| 4 | *(pendiente)* Frontend | Login que llama `ensure_profile` tras signup/login |

> Ejecutá cada script una sola vez en un proyecto limpio. Si algún objeto ya existe, la ejecución puede fallar.

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
| Policies | **No incluidas** — la app no tendrá acceso hasta definirlas |
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

### Cómo aplicarlo

1. Confirmá que `schema-v1.sql` ya fue ejecutado.
2. **SQL Editor → New query**.
3. Copiá y pegá el contenido de `schema-v1-profile-functions.sql`.
4. Ejecutá la query (**Run**).
5. Verificá en **Database → Functions** que exista `ensure_profile`.

### Uso desde la app (etapa posterior)

Tras signup o login exitoso, el frontend llamará:

```ts
await supabase.rpc("ensure_profile", {
  p_full_name: "Nombre",
  p_whatsapp: "+54...",
});
```

## Auth V1 — `schema-v1-auth.sql` (no recomendado en hosted)

> **Advertencia:** este archivo intenta crear un trigger `AFTER INSERT` sobre `auth.users`. En **Supabase hosted** suele fallar con `ERROR 42501: must be owner of relation users` porque el rol del SQL Editor no es owner de esa tabla.

| Incluido | Detalle |
|----------|---------|
| Función | `public.handle_new_user()` con `SECURITY DEFINER` |
| Trigger | `on_auth_user_created` en `auth.users` |
| Estado | **Deprecado para V1 hosted** — conservado solo como referencia |

**No ejecutar** si aparece el error 42501. Usar `schema-v1-profile-functions.sql` en su lugar.

## Próximas etapas

1. **Policies RLS** (`schema-v1-policies.sql`) por rol (`admin`, `cashier`, `door`, `customer`).
2. Regenerar tipos TypeScript:

   ```bash
   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
   ```

3. **Login** en `/login` con Supabase Auth + llamada a `ensure_profile`.
4. **Middleware** para refresco de sesión y protección de rutas.
5. Conectar el frontend a las tablas (eventos, entradas, comunidad, etc.).

## Seguridad

- No commitear `.env.local` ni claves reales.
- No usar `service_role` en el frontend.
- Las policies RLS son obligatorias antes de exponer datos en producción.
