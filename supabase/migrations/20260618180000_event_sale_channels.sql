-- =============================================================================
-- Australe Producciones · Canales de venta independientes por evento
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sale_web_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS external_sale_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_sale_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_sale_message text;

COMMENT ON COLUMN public.events.sale_web_enabled IS
  'Compra directa mediante el sistema web de Australe';
COMMENT ON COLUMN public.events.external_sale_enabled IS
  'Botón hacia URL externa de venta';
COMMENT ON COLUMN public.events.sale_whatsapp_enabled IS
  'Contacto por WhatsApp para consultar o comprar';
COMMENT ON COLUMN public.events.reservation_enabled IS
  'Reserva con pago pendiente de confirmación';
COMMENT ON COLUMN public.events.whatsapp_sale_number IS
  'Número de WhatsApp para venta (solo dígitos, con código de país)';
COMMENT ON COLUMN public.events.whatsapp_sale_message IS
  'Mensaje inicial prellenado para WhatsApp';

-- Migrar ticket_sale_mode existente hacia los nuevos booleanos
UPDATE public.events
SET
  sale_web_enabled = ticket_sale_mode IN ('internal', 'both'),
  external_sale_enabled = ticket_sale_mode IN ('external', 'both'),
  reservation_enabled = ticket_sale_mode IN ('internal', 'both'),
  sale_whatsapp_enabled = false
WHERE ticket_sale_mode IS NOT NULL;

UPDATE public.events
SET
  sale_web_enabled = false,
  external_sale_enabled = false,
  reservation_enabled = false,
  sale_whatsapp_enabled = false
WHERE ticket_sale_mode = 'disabled';

-- Sincronizar ticket_sale_mode legacy para compatibilidad
UPDATE public.events
SET ticket_sale_mode = CASE
  WHEN NOT sale_web_enabled
    AND NOT external_sale_enabled
    AND NOT sale_whatsapp_enabled
    AND NOT reservation_enabled THEN 'disabled'
  WHEN external_sale_enabled
    AND NOT sale_web_enabled
    AND NOT reservation_enabled THEN 'external'
  WHEN external_sale_enabled
    AND (sale_web_enabled OR reservation_enabled) THEN 'both'
  ELSE 'internal'
END;

-- Actualizar reserve_tickets: permitir venta web o reserva
CREATE OR REPLACE FUNCTION public.reserve_tickets(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_whatsapp text DEFAULT NULL,
  p_buyer_dni text DEFAULT NULL
)
RETURNS SETOF public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_buyer_name text;
  v_event public.events;
  v_ticket_type public.ticket_types;
  v_ticket public.tickets;
  v_community_member_id uuid;
  v_available integer;
  v_expires_at timestamptz;
  v_i integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'reserve_tickets: usuario no autenticado';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'reserve_tickets: cantidad inválida';
  END IF;

  v_buyer_name := btrim(p_buyer_name);

  IF v_buyer_name IS NULL OR v_buyer_name = '' THEN
    RAISE EXCEPTION 'reserve_tickets: comprador requerido';
  END IF;

  SELECT cm.id
  INTO v_community_member_id
  FROM public.community_members cm
  WHERE cm.profile_id = v_user_id
  ORDER BY cm.created_at ASC
  LIMIT 1;

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserve_tickets: evento no disponible';
  END IF;

  IF v_event.status <> 'published' THEN
    RAISE EXCEPTION 'reserve_tickets: evento no disponible';
  END IF;

  IF NOT (v_event.sale_web_enabled OR v_event.reservation_enabled) THEN
    RAISE EXCEPTION 'reserve_tickets: venta interna no habilitada';
  END IF;

  SELECT *
  INTO v_ticket_type
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserve_tickets: tipo de entrada no disponible';
  END IF;

  IF v_ticket_type.event_id <> p_event_id THEN
    RAISE EXCEPTION 'reserve_tickets: tipo de entrada no disponible';
  END IF;

  IF v_ticket_type.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'reserve_tickets: tipo de entrada no disponible';
  END IF;

  IF v_ticket_type.sale_start_at IS NOT NULL AND now() < v_ticket_type.sale_start_at THEN
    RAISE EXCEPTION 'reserve_tickets: venta fuera de fecha';
  END IF;

  IF v_ticket_type.sale_end_at IS NOT NULL AND now() > v_ticket_type.sale_end_at THEN
    RAISE EXCEPTION 'reserve_tickets: venta fuera de fecha';
  END IF;

  IF p_quantity > v_ticket_type.max_per_order THEN
    RAISE EXCEPTION 'reserve_tickets: supera máximo por compra';
  END IF;

  IF v_ticket_type.stock_total IS NOT NULL THEN
    v_available := v_ticket_type.stock_total - v_ticket_type.stock_sold;

    IF v_available < p_quantity THEN
      RAISE EXCEPTION 'reserve_tickets: stock insuficiente';
    END IF;
  END IF;

  UPDATE public.ticket_types
  SET stock_sold = stock_sold + p_quantity
  WHERE id = p_ticket_type_id;

  v_expires_at := now() + interval '24 hours';

  FOR v_i IN 1..p_quantity LOOP
    INSERT INTO public.tickets (
      event_id,
      ticket_type_id,
      user_id,
      community_member_id,
      buyer_name,
      buyer_whatsapp,
      buyer_dni,
      qr_token,
      original_price,
      price_paid,
      discount_amount,
      payment_method,
      payment_status,
      ticket_status,
      sales_channel,
      reservation_expires_at
    )
    VALUES (
      p_event_id,
      p_ticket_type_id,
      v_user_id,
      v_community_member_id,
      v_buyer_name,
      NULLIF(btrim(p_buyer_whatsapp), ''),
      NULLIF(btrim(p_buyer_dni), ''),
      'aus-' || gen_random_uuid()::text,
      v_ticket_type.public_price,
      v_ticket_type.public_price,
      0,
      'pending',
      'pending',
      'reserved',
      'web',
      v_expires_at
    )
    RETURNING * INTO v_ticket;

    RETURN NEXT v_ticket;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.reserve_tickets(
  uuid,
  uuid,
  integer,
  text,
  text,
  text
) IS
  'Reserva atómica web: requiere sale_web_enabled o reservation_enabled.';
