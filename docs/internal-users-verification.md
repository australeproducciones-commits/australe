# Verificación de usuarios internos

Guía para probar roles **Administrador**, **Cajero** y **Portero** sin incluir credenciales en el repositorio.

## Creación recomendada (flujo real)

1. Iniciar sesión como **Administrador** en `/login`.
2. Ir a `/admin/usuarios` → **Agregar usuario**.
3. Crear tres usuarios de prueba:

| Rol | Nombre sugerido | Configuración |
|-----|-----------------|---------------|
| Administrador | Admin QA | Rol Administrador, activo |
| Cajero | Cajero QA | Rol Cajero, activo, eventos según escenario |
| Portero | Portero QA | Rol Portero, activo, eventos según escenario |

4. Usar **Enviar acceso / recuperación** desde la ficha del usuario para definir contraseña.

## Escenarios de asignación por evento

### Cajero global
- `profiles.role = cashier`
- `staff_all_events = true`
- Resultado: ve todos los eventos en `/admin/cajero`.

### Cajero restringido
- `staff_all_events = false`
- Filas en `event_staff` con `role = cashier`, `is_active = true`.
- Resultado: solo esos eventos en el panel.

### Portero global / restringido
- Igual que cajero, con `role = door`.

### Asignación incoherente (debe fallar)
- `profiles.role = cashier` + `event_staff.role = door` → sin acceso al evento.

### Usuario inactivo
- `profiles.is_active = false` → redirección a `/mi-cuenta`, sin panel interno.

## Casos obligatorios

| # | Rol | Acción esperada |
|---|-----|-----------------|
| 1 | Admin | Accede a `/admin`, `/admin/usuarios`, `/admin/cajero`, `/admin/puerta` |
| 2 | Cajero | Login → `/admin/cajero`; bloqueado en `/admin/usuarios` y `/admin/puerta` |
| 3 | Portero | Login → `/admin/puerta`; bloqueado en `/admin/usuarios` y `/admin/cajero` |
| 4 | Customer | Bloqueado en rutas `/admin/*` |
| 5 | Inactivo | Tratado como customer; sin acceso interno |
| 6–7 | Staff restringido | Solo eventos asignados en el panel |
| 8 | Manipulación URL | `?evento=<uuid-no-asignado>` no selecciona evento ajeno |
| 9–10 | Último admin / autoedición | Acciones bloqueadas en módulo Usuarios |

## Rutas compatibles

- `/cajero` → redirige a `/admin/cajero`
- `/portero` → redirige a `/admin/puerta`

## Script local opcional

Si necesitás automatizar en entorno local, usá variables de entorno (nunca en Git):

```bash
# Ejemplo conceptual — no ejecutar en CI ni deploy
export SUPABASE_SERVICE_ROLE_KEY="..."
export TEST_ADMIN_EMAIL="..."
export TEST_ADMIN_PASSWORD="..."
# Invocar createInternalUserAction vía panel admin preferentemente.
```

No sobrescribir usuarios existentes sin confirmación explícita.
