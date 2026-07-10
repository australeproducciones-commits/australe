# Seguridad — Tienda

## RLS

- Público: solo lectura de productos activos/publicados
- Pedidos: sin INSERT/UPDATE directo desde cliente
- Operaciones críticas vía RPC `SECURITY DEFINER`

## RPCs revocadas a anon/authenticated

- `store_reserve_stock`, `store_confirm_sale`
- `award_loyalty_points_for_store_order`
- `reverse_loyalty_points_for_store_order`

## Retiros

- Staff requiere `staff_has_event_access(pickup_event_id)` o admin
- Token de retiro almacenado como hash SHA-256
- Entrega idempotente (`status = delivered` → no-op)

## QR

El QR de retiro debe codificar un token opaco; no incluir datos sensibles del cliente.
