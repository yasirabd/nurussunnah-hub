-- ============================================================
-- FASE 2 SECURITY: Remove PUBLIC execute grants from SECURITY DEFINER functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.can_review_work_statement(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.submit_work_statement(UUID, JSONB, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.save_work_statement_draft(UUID, JSONB, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.review_work_statement(UUID, review_action_enum, TEXT) FROM public;

REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_hrd() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_kepala_unit() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.can_review_work_statement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_work_statement(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_work_statement_draft(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_work_statement(UUID, review_action_enum, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hrd() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kepala_unit() TO authenticated;
