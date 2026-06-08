# Supabase · Australe Producciones

Esquema SQL y migraciones del proyecto. La configuración del cliente Next.js está en `lib/supabase/`.

## Esquema V1

Archivo: [`schema-v1.sql`](./schema-v1.sql)

Define la columna vertebral de la base de datos: perfiles, comunidad, eventos, entradas, productos, pedidos de kiosco, cierres de caja y auditoría.

### Cómo aplicarlo

1. Abrí el [panel de Supabase](https://supabase.com/dashboard) del proyecto.
2. Andá a **SQL Editor → New query**.
3. Copiá y pegá el contenido completo de `schema-v1.sql`.
4. Ejecutá la query (**Run**).
5. Verificá en **Table Editor** que las 11 tablas existan.

> Ejecutá el script una sola vez en un proyecto limpio. Si alguna tabla ya existe, la ejecución fallará.

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

### Después de aplicar el esquema

1. **Policies RLS** por rol (`admin`, `cashier`, `door`, `customer`).
2. **Trigger o función** para crear `profiles` al registrarse en `auth.users`.
3. Regenerar tipos TypeScript:

   ```bash
   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
   ```

4. Conectar el frontend a las tablas (eventos, entradas, comunidad, etc.).

### Seguridad

- No commitear `.env.local` ni claves reales.
- No usar `service_role` en el frontend.
- Las policies RLS son obligatorias antes de exponer datos en producción.
