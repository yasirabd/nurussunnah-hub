-- Keep role predicate helpers executable for authenticated users because RLS policies call them.
-- Revoke only helper RPCs that the app does not call directly, plus anon access for scoped monitoring.

REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) FROM public;

REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM public;

REVOKE EXECUTE ON FUNCTION public.can_review_work_statement(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_review_work_statement(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_review_work_statement(UUID) FROM public;
