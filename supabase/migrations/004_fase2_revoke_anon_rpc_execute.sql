-- ============================================================
-- FASE 2 SECURITY: Restrict exposed SECURITY DEFINER functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.can_review_work_statement(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_work_statement(UUID, JSONB, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_work_statement_draft(UUID, JSONB, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_work_statement(UUID, review_action_enum, TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_hrd() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_kepala_unit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
  END IF;
END $$;
