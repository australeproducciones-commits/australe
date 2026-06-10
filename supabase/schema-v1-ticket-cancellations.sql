-- =============================================================================
-- Australe Producciones · Cancelación atómica de entradas V1
-- Ejecutar manualmente en Supabase → SQL Editor.
-- Requiere: schema-v1.sql, schema-v1-profile-functions.sql,
--           schema-v1-policies.sql, schema-v1-ticket-reservations.sql
-- No crea datos de prueba ni modifica policies RLS existentes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Función: cancelar o marcar vencida una entrada (stock + ticket en una tx)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_ticket(
  p_ticket_id uuid,
  p_cancel_reason text DEFAULT NULL,
  p_mark_as_expired boolean DEFAULT false
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ticket public.tickets;
  v_ticket_type public.ticket_types;
  v_reason text;
  v_release_stock boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'cancel_ticket: usuario no autenticado';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'cancel_ticket: solo administradores pueden cancelar entradas';
  END IF;

  SELECT *
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cancel_ticket: entrada no encontrada';
  END IF;

  IF v_ticket.ticket_status = 'used' THEN
    RAISE EXCEPTION 'cancel_ticket: la entrada ya fue usada';
  END IF;

  IF v_ticket.ticket_status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'cancel_ticket: la entrada ya fue cancelada o vencida';
  END IF;

  v_release_stock := v_ticket.ticket_status IN ('reserved', 'valid');

  IF v_release_stock AND v_ticket.ticket_type_id IS NOT NULL THEN
    SELECT *
    INTO v_ticket_type
    FROM public.ticket_types
    WHERE id = v_ticket.ticket_type_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.ticket_types
      SET stock_sold = GREATEST(0, stock_sold - 1)
      WHERE id = v_ticket.ticket_type_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'cancel_ticket: no se pudo liberar stock';
      END IF;
    END IF;
    -- Si ticket_type_id apunta a un tipo eliminado, se cancela el ticket sin
    -- tocar stock (evita bloquear la operación admin en entradas huérfanas).
  END IF;

  v_reason := NULLIF(btrim(p_cancel_reason), '');

  IF v_reason IS NULL THEN
    IF p_mark_as_expired THEN
      v_reason := 'Reserva vencida';
    ELSE
      v_reason := 'Cancelada por administrador';
    END IF;
  END IF;

  UPDATE public.tickets
  SET
    payment_status = 'cancelled',
    ticket_status = CASE
      WHEN p_mark_as_expired THEN 'expired'
      ELSE 'cancelled'
    END,
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancel_reason = v_reason
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

COMMENT ON FUNCTION public.cancel_ticket(uuid, text, boolean) IS
  'Cancelación admin atómica: bloquea ticket y ticket_type (FOR UPDATE), libera stock_sold una sola vez si estaba reserved/valid, actualiza ticket. Evita doble liberación.';

-- -----------------------------------------------------------------------------
-- B) Permisos de ejecución (solo usuarios autenticados)
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.cancel_ticket(uuid, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cancel_ticket(uuid, text, boolean) TO authenticated;
