-- =============================================================================
-- Australe Producciones · Audiencia de eventos + gestión económica
-- =============================================================================

-- Audiencia y cierre de gestión en eventos
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS financial_management_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS financial_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS financial_closed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_audience_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_audience_check CHECK (
    audience IN ('public', 'community')
  );

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_financial_management_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_financial_management_status_check CHECK (
    financial_management_status IN ('open', 'closed')
  );

COMMENT ON COLUMN public.events.audience IS
  'public = visible para todos; community = solo miembros activos de la comunidad';

CREATE INDEX IF NOT EXISTS idx_events_audience_status
  ON public.events (status, audience);

-- Catálogo de categorías de gasto
CREATE TABLE IF NOT EXISTS public.event_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_expense_categories_name_unique UNIQUE (name)
);

COMMENT ON TABLE public.event_expense_categories IS
  'Categorías reutilizables para gastos de eventos';

INSERT INTO public.event_expense_categories (name, sort_order)
VALUES
  ('Artistas', 10),
  ('Sonido', 20),
  ('Iluminación', 30),
  ('Alquiler del lugar', 40),
  ('Publicidad', 50),
  ('Diseño', 60),
  ('Impresión', 70),
  ('Seguridad', 80),
  ('Personal', 90),
  ('Transporte', 100),
  ('Catering', 110),
  ('Bebidas', 120),
  ('Comidas', 130),
  ('Técnica', 140),
  ('Impuestos', 150),
  ('Comisiones', 160),
  ('Plataforma de pago', 170),
  ('Limpieza', 180),
  ('Alojamiento', 190),
  ('Otros', 200)
ON CONFLICT (name) DO NOTHING;

-- Gastos por evento
CREATE TABLE IF NOT EXISTS public.event_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.event_expense_categories (id) ON DELETE SET NULL,
  concept text NOT NULL,
  description text,
  provider text,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit_price numeric(12, 2),
  expense_date date,
  due_date date,
  status text NOT NULL DEFAULT 'estimated',
  payment_method text,
  receipt_number text,
  internal_note text,
  amount_paid numeric(12, 2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_expenses_concept_not_empty CHECK (btrim(concept) <> ''),
  CONSTRAINT event_expenses_amount_check CHECK (amount >= 0),
  CONSTRAINT event_expenses_quantity_check CHECK (quantity > 0),
  CONSTRAINT event_expenses_amount_paid_check CHECK (amount_paid >= 0),
  CONSTRAINT event_expenses_amount_paid_lte_amount_check CHECK (amount_paid <= amount),
  CONSTRAINT event_expenses_status_check CHECK (
    status IN ('estimated', 'pending', 'partial', 'paid', 'cancelled')
  )
);

COMMENT ON TABLE public.event_expenses IS
  'Gastos asociados a un evento (estimados, pendientes o pagados)';

CREATE INDEX IF NOT EXISTS idx_event_expenses_event_id
  ON public.event_expenses (event_id);

CREATE INDEX IF NOT EXISTS idx_event_expenses_status
  ON public.event_expenses (event_id, status);

-- Pagos parciales de gastos
CREATE TABLE IF NOT EXISTS public.event_expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.event_expenses (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_method text,
  receipt_number text,
  note text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_expense_payments_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_event_expense_payments_expense_id
  ON public.event_expense_payments (expense_id);

-- Otros ingresos por evento
CREATE TABLE IF NOT EXISTS public.event_other_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  concept text NOT NULL,
  category text,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  income_date date,
  status text NOT NULL DEFAULT 'expected',
  note text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_other_income_concept_not_empty CHECK (btrim(concept) <> ''),
  CONSTRAINT event_other_income_amount_check CHECK (amount >= 0),
  CONSTRAINT event_other_income_status_check CHECK (
    status IN ('expected', 'pending', 'collected', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_event_other_income_event_id
  ON public.event_other_income (event_id);

-- Triggers updated_at (reutiliza update_updated_at_column existente en el proyecto)
DROP TRIGGER IF EXISTS set_event_expenses_updated_at ON public.event_expenses;
CREATE TRIGGER set_event_expenses_updated_at
  BEFORE UPDATE ON public.event_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_event_other_income_updated_at ON public.event_other_income;
CREATE TRIGGER set_event_other_income_updated_at
  BEFORE UPDATE ON public.event_other_income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.event_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_other_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_expense_categories_admin_all ON public.event_expense_categories;
CREATE POLICY event_expense_categories_admin_all
  ON public.event_expense_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS event_expense_categories_select_authenticated ON public.event_expense_categories;
CREATE POLICY event_expense_categories_select_authenticated
  ON public.event_expense_categories FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS event_expenses_admin_all ON public.event_expenses;
CREATE POLICY event_expenses_admin_all
  ON public.event_expenses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS event_expense_payments_admin_all ON public.event_expense_payments;
CREATE POLICY event_expense_payments_admin_all
  ON public.event_expense_payments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS event_other_income_admin_all ON public.event_other_income;
CREATE POLICY event_other_income_admin_all
  ON public.event_other_income FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.event_expense_categories TO authenticated;
GRANT ALL ON public.event_expenses TO authenticated;
GRANT ALL ON public.event_expense_payments TO authenticated;
GRANT ALL ON public.event_other_income TO authenticated;
