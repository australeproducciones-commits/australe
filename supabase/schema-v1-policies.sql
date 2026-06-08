-- =============================================================================
-- Australe Producciones · RLS Policies V1
-- Ejecutar manualmente en Supabase → SQL Editor.
-- Requiere: schema-v1.sql y schema-v1-profile-functions.sql.
-- No incluye datos de prueba ni service_role key.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Funciones helper de rol
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_cashier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'cashier';
$$;

CREATE OR REPLACE FUNCTION public.is_door()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'door';
$$;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'customer';
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin', 'cashier', 'door');
$$;

COMMENT ON FUNCTION public.current_user_role() IS
  'Devuelve el rol del usuario autenticado activo, o NULL si no hay sesión/profile';

-- -----------------------------------------------------------------------------
-- B) GRANTs base (RLS restringe filas; columnas sensibles revocadas abajo)
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- anon: solo lectura pública de catálogo
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.ticket_types TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.event_products TO anon;

-- authenticated: permisos de tabla (RLS aplica por policy)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;

GRANT SELECT ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;

GRANT SELECT ON public.ticket_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_types TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT DELETE ON public.tickets TO authenticated;

GRANT SELECT ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

GRANT SELECT ON public.event_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_products TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.kiosk_orders TO authenticated;
GRANT DELETE ON public.kiosk_orders TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.kiosk_order_items TO authenticated;
GRANT DELETE ON public.kiosk_order_items TO authenticated;

GRANT SELECT, INSERT ON public.cash_closures TO authenticated;
GRANT DELETE ON public.cash_closures TO authenticated;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- Columnas sensibles: usuarios no pueden cambiar role/is_active ni campos críticos de comunidad
REVOKE UPDATE (role, is_active) ON public.profiles FROM authenticated;
REVOKE UPDATE (status, community_code, profile_id) ON public.community_members FROM authenticated;
REVOKE UPDATE ON public.event_products FROM authenticated;
GRANT UPDATE (stock_current) ON public.event_products TO authenticated;

-- Helper functions
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_cashier() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_door() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- C) profiles
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_admin_all
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

COMMENT ON TABLE public.profiles IS
  'RLS: admin todo; usuario solo SELECT/UPDATE propio (role/is_active vía REVOKE columnas)';

-- -----------------------------------------------------------------------------
-- D) community_members
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS community_members_admin_all ON public.community_members;
DROP POLICY IF EXISTS community_members_select_own ON public.community_members;
DROP POLICY IF EXISTS community_members_insert_own ON public.community_members;
DROP POLICY IF EXISTS community_members_update_own ON public.community_members;
DROP POLICY IF EXISTS community_members_select_cashier ON public.community_members;

CREATE POLICY community_members_admin_all
  ON public.community_members
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY community_members_select_own
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY community_members_insert_own
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY community_members_update_own
  ON public.community_members
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY community_members_select_cashier
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

COMMENT ON TABLE public.community_members IS
  'RLS: admin todo; usuario CRUD propio; cashier SELECT; status/code vía REVOKE columnas';

-- -----------------------------------------------------------------------------
-- E) events
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS events_select_public_published ON public.events;
DROP POLICY IF EXISTS events_admin_all ON public.events;
DROP POLICY IF EXISTS events_select_staff ON public.events;

CREATE POLICY events_select_public_published
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY events_admin_all
  ON public.events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY events_select_staff
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

COMMENT ON TABLE public.events IS
  'RLS: público SELECT published; staff SELECT todos; admin todo';

-- -----------------------------------------------------------------------------
-- F) ticket_types
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS ticket_types_select_public_active ON public.ticket_types;
DROP POLICY IF EXISTS ticket_types_admin_all ON public.ticket_types;
DROP POLICY IF EXISTS ticket_types_select_staff ON public.ticket_types;

CREATE POLICY ticket_types_select_public_active
  ON public.ticket_types
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = ticket_types.event_id
        AND e.status = 'published'
    )
  );

CREATE POLICY ticket_types_admin_all
  ON public.ticket_types
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY ticket_types_select_staff
  ON public.ticket_types
  FOR SELECT
  TO authenticated
  USING (public.is_cashier() OR public.is_door());

COMMENT ON TABLE public.ticket_types IS
  'RLS: público SELECT activos de eventos publicados; staff SELECT; admin todo';

-- -----------------------------------------------------------------------------
-- G) tickets
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS tickets_admin_all ON public.tickets;
DROP POLICY IF EXISTS tickets_select_customer_own ON public.tickets;
DROP POLICY IF EXISTS tickets_insert_customer_web ON public.tickets;
DROP POLICY IF EXISTS tickets_cashier_select ON public.tickets;
DROP POLICY IF EXISTS tickets_cashier_insert ON public.tickets;
DROP POLICY IF EXISTS tickets_cashier_update ON public.tickets;
DROP POLICY IF EXISTS tickets_door_select ON public.tickets;
DROP POLICY IF EXISTS tickets_door_update_mark_used ON public.tickets;

CREATE POLICY tickets_admin_all
  ON public.tickets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tickets_select_customer_own
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    public.is_customer()
    AND community_member_id IN (
      SELECT cm.id
      FROM public.community_members cm
      WHERE cm.profile_id = auth.uid()
    )
  );

CREATE POLICY tickets_insert_customer_web
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_customer()
    AND sales_channel = 'web'
    AND payment_status = 'pending'
    AND ticket_status = 'reserved'
  );

CREATE POLICY tickets_cashier_select
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY tickets_cashier_insert
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY tickets_cashier_update
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

CREATE POLICY tickets_door_select
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (public.is_door());

CREATE POLICY tickets_door_update_mark_used
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_door() AND ticket_status = 'valid')
  WITH CHECK (
    public.is_door()
    AND ticket_status = 'used'
    AND used_by = auth.uid()
    AND used_at IS NOT NULL
  );

COMMENT ON TABLE public.tickets IS
  'RLS: sin acceso público; customer/cashier/door/admin según rol; validar más en server actions';

-- -----------------------------------------------------------------------------
-- H) products
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS products_select_public_active ON public.products;
DROP POLICY IF EXISTS products_admin_all ON public.products;
DROP POLICY IF EXISTS products_select_cashier ON public.products;
DROP POLICY IF EXISTS products_select_customer ON public.products;

CREATE POLICY products_select_public_active
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY products_admin_all
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY products_select_cashier
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY products_select_customer
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.is_customer() AND is_active = true);

COMMENT ON TABLE public.products IS
  'RLS: público SELECT activos; cashier/customer SELECT; admin todo';

-- -----------------------------------------------------------------------------
-- I) event_products
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS event_products_select_public_visible ON public.event_products;
DROP POLICY IF EXISTS event_products_admin_all ON public.event_products;
DROP POLICY IF EXISTS event_products_select_cashier ON public.event_products;
DROP POLICY IF EXISTS event_products_update_cashier_stock ON public.event_products;
DROP POLICY IF EXISTS event_products_select_customer ON public.event_products;

CREATE POLICY event_products_select_public_visible
  ON public.event_products
  FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true
    AND is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_products.event_id
        AND e.status = 'published'
    )
  );

CREATE POLICY event_products_admin_all
  ON public.event_products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY event_products_select_cashier
  ON public.event_products
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY event_products_update_cashier_stock
  ON public.event_products
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

CREATE POLICY event_products_select_customer
  ON public.event_products
  FOR SELECT
  TO authenticated
  USING (
    public.is_customer()
    AND is_visible = true
    AND is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_products.event_id
        AND e.status = 'published'
    )
  );

COMMENT ON TABLE public.event_products IS
  'RLS: público SELECT lista precios; cashier UPDATE stock_current; admin todo';

-- -----------------------------------------------------------------------------
-- J) kiosk_orders
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS kiosk_orders_admin_all ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_select_customer_own ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_insert_customer_own ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_select ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_insert ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_update ON public.kiosk_orders;

CREATE POLICY kiosk_orders_admin_all
  ON public.kiosk_orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY kiosk_orders_select_customer_own
  ON public.kiosk_orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_customer()
    AND customer_profile_id = auth.uid()
  );

CREATE POLICY kiosk_orders_insert_customer_own
  ON public.kiosk_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_customer()
    AND customer_profile_id = auth.uid()
  );

CREATE POLICY kiosk_orders_cashier_select
  ON public.kiosk_orders
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY kiosk_orders_cashier_insert
  ON public.kiosk_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY kiosk_orders_cashier_update
  ON public.kiosk_orders
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

COMMENT ON TABLE public.kiosk_orders IS
  'RLS: customer solo pedidos propios; cashier operación; sin acceso público';

-- -----------------------------------------------------------------------------
-- K) kiosk_order_items
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS kiosk_order_items_admin_all ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_select_customer_own ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_insert_customer_own ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_select ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_insert ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_update ON public.kiosk_order_items;

CREATE POLICY kiosk_order_items_admin_all
  ON public.kiosk_order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY kiosk_order_items_select_customer_own
  ON public.kiosk_order_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_customer()
    AND EXISTS (
      SELECT 1
      FROM public.kiosk_orders ko
      WHERE ko.id = kiosk_order_items.order_id
        AND ko.customer_profile_id = auth.uid()
    )
  );

CREATE POLICY kiosk_order_items_insert_customer_own
  ON public.kiosk_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_customer()
    AND EXISTS (
      SELECT 1
      FROM public.kiosk_orders ko
      WHERE ko.id = kiosk_order_items.order_id
        AND ko.customer_profile_id = auth.uid()
    )
  );

CREATE POLICY kiosk_order_items_cashier_select
  ON public.kiosk_order_items
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY kiosk_order_items_cashier_insert
  ON public.kiosk_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY kiosk_order_items_cashier_update
  ON public.kiosk_order_items
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

COMMENT ON TABLE public.kiosk_order_items IS
  'RLS: items ligados a pedidos propios (customer) o operación cashier';

-- -----------------------------------------------------------------------------
-- L) cash_closures
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS cash_closures_admin_all ON public.cash_closures;
DROP POLICY IF EXISTS cash_closures_cashier_select ON public.cash_closures;
DROP POLICY IF EXISTS cash_closures_cashier_insert ON public.cash_closures;

CREATE POLICY cash_closures_admin_all
  ON public.cash_closures
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY cash_closures_cashier_select
  ON public.cash_closures
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY cash_closures_cashier_insert
  ON public.cash_closures
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

COMMENT ON TABLE public.cash_closures IS
  'RLS: admin todo; cashier SELECT/INSERT; customer y door sin acceso';

-- -----------------------------------------------------------------------------
-- M) audit_logs
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_logs_admin_all ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_staff_insert_own ON public.audit_logs;

CREATE POLICY audit_logs_admin_all
  ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY audit_logs_staff_insert_own
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff()
    AND user_id = auth.uid()
  );

COMMENT ON TABLE public.audit_logs IS
  'RLS: admin SELECT/INSERT; staff INSERT propio; sin lectura para otros roles';
