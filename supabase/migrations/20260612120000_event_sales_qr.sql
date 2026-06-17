-- =============================================================================
-- QR de ventas por evento
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sales_qr_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_qr_code text,
  ADD COLUMN IF NOT EXISTS sales_qr_url text,
  ADD COLUMN IF NOT EXISTS qr_sell_tickets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_products_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_show_price_list boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_sell_products boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_sales_qr_code_unique
  ON public.events (sales_qr_code)
  WHERE sales_qr_code IS NOT NULL;

COMMENT ON COLUMN public.events.sales_qr_enabled IS
  'QR de ventas activo para el evento';

COMMENT ON COLUMN public.events.sales_qr_code IS
  'Código corto único para /venta/e/[code]';

COMMENT ON COLUMN public.events.sales_qr_url IS
  'Ruta pública del QR de ventas, ej. /venta/e/ABC12345';
