# Canales de venta — Etapa 1 (backend)

## Columna `show_in_store`

- `true`: el producto puede aparecer en `/tienda` (requiere `is_active`, `status=active`, stock y reglas de comunidad).
- `false`: solo visible vía asociación vigente en `event_store_products`.

Ocultar por completo: `is_active=false` o `status` en `inactive` / `draft` / `archived`.

## Funciones SQL centralizadas

| Función | Uso |
|---------|-----|
| `event_is_commerce_eligible(event_id)` | Evento publicado y dentro de ventana fecha/hora Mendoza |
| `event_store_association_is_active(assoc)` | Asociación activa y en vigencia |
| `store_viewer_is_community_member()` | Miembro comunidad activo (no suspendido) |
| `store_product_visible_in_general_catalog(product)` | Catálogo general con comunidad |

## Prioridad de precio (sin cambios)

1. Precio comunidad del evento  
2. Precio público del evento  
3. Precio comunidad general  
4. Precio público general  

Recalculado en servidor vía `store_resolve_unit_price`.

## Futuro (fuera de alcance)

Stock reservado por evento / depósitos separados por canal.
