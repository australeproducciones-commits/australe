# Guía administrativa — Tienda

## Productos

1. Ir a **Admin → Tienda → Productos**
2. Crear producto con precio público y opcional comunidad
3. Activar y marcar destacado si corresponde
4. Cargar variantes desde SQL o futura UI de variantes

## Asociar a evento

1. En configuración del evento (SQL o panel evento):
   - `event_store_settings.merchandising_enabled = true`
   - Insertar en `event_store_products`
2. Personalizar `badge_text` (default: MERCH DISPONIBLE)

## Pedidos

1. **Admin → Tienda → Pedidos**
2. Confirmar pago manual tras verificar transferencia/efectivo
3. Marcar **Listo** cuando el pedido esté preparado
4. **Retiros**: buscar por código STO- / pickup code y entregar

## Stock

- Ajustes vía RPC `store_adjust_stock` (motivo obligatorio)
- Historial en **Admin → Tienda → Stock**

## Puntos comunidad

Activar en base de datos:

```sql
UPDATE community_settings SET store_points_enabled = true WHERE id = 1;
```
