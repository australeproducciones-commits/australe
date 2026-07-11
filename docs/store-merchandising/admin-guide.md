# Guía administrativa — Tienda

## Productos (hub central)

1. Ir a **Admin → Tienda → Productos**
2. Crear o editar un producto desde el formulario por pestañas:
   - **General**: datos, precios, visibilidad (`Mostrar en tienda`, solo comunidad)
   - **Imágenes**: principal y galería (Storage)
   - **Variantes**: talles, stock auditado vía ajustes con motivo
   - **Canales**: resumen derivado de tienda, eventos y stock
   - **Eventos**: asociaciones, precios por evento, retiro y vigencia
3. La configuración global del evento (badge, merchandising) se edita desde la pestaña Eventos del producto o desde el panel rápido en Admin → Evento.

## Asociar a evento

Desde la pestaña **Eventos** del producto:

1. Buscar y seleccionar el evento
2. Configurar precio override, retiro, vigencia y destacado
3. Activar merchandising del evento si aún no está habilitado

También podés asociar productos existentes desde **Admin → Evento** (vista rápida Merchandising).

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
