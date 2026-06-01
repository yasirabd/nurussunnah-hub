-- ============================================================
-- FASE 3 SECURITY: Revoke anon execute from feedback RPC
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_feedback_targets(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_received_feedback_anonymous(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_feedback_identified(UUID) FROM anon;
