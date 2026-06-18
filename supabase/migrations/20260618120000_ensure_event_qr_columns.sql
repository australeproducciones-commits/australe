-- =============================================================================
-- Asegurar columnas QR de ventas en events (schema cache / PostgREST)
-- Idempotente: seguro si 20260612120000_event_sales_qr ya fue aplicada parcialmente.
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sales_qr_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_qr_code text,
  ADD COLUMN IF NOT EXISTS sales_qr_url text,
  ADD COLUMN IF NOT EXISTS qr_sell_tickets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_products_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_show_price_list boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_sell_products boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.sales_qr_enabled IS
  'QR de ventas activo para el evento';

COMMENT ON COLUMN public.events.sales_qr_code IS
  'Código corto único para /venta/e/[code]';

COMMENT ON COLUMN public.events.sales_qr_url IS
  'Ruta pública del QR de ventas, ej. /venta/e/ABC12345';

COMMENT ON COLUMN public.events.qr_sell_tickets IS
  'Permite vender entradas mediante el QR del evento';

COMMENT ON COLUMN public.events.qr_products_enabled IS
  'Habilita la venta de productos o consumiciones mediante QR para este evento';

COMMENT ON COLUMN public.events.qr_show_price_list IS
  'Muestra lista de precios de consumiciones en la página pública del QR';

COMMENT ON COLUMN public.events.qr_sell_products IS
  'Permite vender consumiciones mediante el QR del evento';

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_sales_qr_code_unique
  ON public.events (sales_qr_code)
  WHERE sales_qr_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';
