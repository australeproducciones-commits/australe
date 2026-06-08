# Supabase · Australe Producciones

Configuración base del cliente Supabase para Next.js App Router.

## Variables de entorno

Copiá `.env.example` a `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

Completá los valores desde el panel de Supabase → **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública `anon`

> No uses la `service_role` key en el frontend ni en código expuesto al cliente.

## Clientes

| Archivo       | Uso                                              |
|---------------|--------------------------------------------------|
| `client.ts`   | Client Components y código del navegador         |
| `server.ts`   | Server Components, Server Actions y Route Handlers |
| `types.ts`    | Tipos de la base de datos (placeholder por ahora) |

### Navegador (Client Component)

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

### Servidor (Server Component / Action)

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
```

## Tipos de base de datos

Cuando exista el esquema en Supabase, regenerá los tipos:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
```

## Próximas etapas (fuera de este alcance)

- Middleware para refresco de sesión
- Autenticación y roles
- Políticas RLS en Supabase
