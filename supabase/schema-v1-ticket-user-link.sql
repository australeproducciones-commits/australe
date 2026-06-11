-- =============================================================================
-- Australe Producciones · Vinculación de tickets al usuario V1
-- Ejecutar manualmente en Supabase → SQL Editor.
-- Requiere: schema-v1.sql, schema-v1-profile-functions.sql,
--           schema-v1-policies.sql, schema-v1-ticket-reservations.sql
-- No crea datos de prueba.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Columna user_id en tickets
-- -----------------------------------------------------------------------------

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets (user_id);

COMMENT ON COLUMN public.tickets.user_id IS
  'Usuario autenticado que reservó/compró la entrada (auth.users.id).';

-- Entradas reservadas antes de este script quedan con user_id NULL y no aparecen
-- en Mi Cuenta hasta re-reservar o confirmar manualmente en admin.

-- -----------------------------------------------------------------------------
-- B) Policy RLS: usuario ve sus tickets por user_id
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS tickets_select_own_user_id ON public.tickets;

CREATE POLICY tickets_select_own_user_id
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    public.is_customer()
    AND user_id = auth.uid()
  );

COMMENT ON POLICY tickets_select_own_user_id ON public.tickets IS
  'Customer SELECT propios tickets vinculados por user_id.';

-- -----------------------------------------------------------------------------
-- C) Actualizar reserve_tickets: guardar user_id y community_member_id
-- -----------------------------------------------------------------------------

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

  IF v_event.ticket_sale_mode NOT IN ('internal', 'both') THEN
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
  'Reserva atómica web: vincula user_id y community_member_id, bloquea stock e inserta tickets.';
