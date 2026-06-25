-- =============================================================================
-- Cierre de seguridad — DROP de RPC destructiva (uso único).
--
-- Estado: ya aplicado en Supabase remoto (2026-06-24).
-- NO ejecutar como migración recurrente, en CI ni en deploy automático.
-- La función reset_production_transactional_data ya no existe en remoto.
-- Este archivo se conserva solo como referencia documental del cierre aplicado.
-- =============================================================================

DROP FUNCTION IF EXISTS public.reset_production_transactional_data(boolean, boolean);
