-- ============================================================
-- FASE 3 MIGRATION: Peer Feedback Workflow, Privacy, Monitoring
-- ============================================================

DROP POLICY IF EXISTS "feedback_receiver_select" ON public.peer_feedbacks;

CREATE OR REPLACE FUNCTION public.get_feedback_targets(p_academic_year_id UUID)
RETURNS TABLE (
  receiver_user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  unit_code TEXT,
  rating INTEGER,
  feedback_text TEXT,
  is_completed BOOLEAN,
  feedback_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_profile AS (
    SELECT p.id, p.home_unit_id
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.employee_status <> 'PENSIUN'
  ), relevant_units AS (
    SELECT DISTINCT uua.unit_id
    FROM user_unit_assignments uua
    JOIN my_profile mp ON mp.id = uua.user_id
    WHERE (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    UNION
    SELECT home_unit_id FROM my_profile WHERE home_unit_id IS NOT NULL
  )
  SELECT
    target.id AS receiver_user_id,
    target.full_name,
    target.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    pf.rating,
    pf.feedback_text,
    COALESCE(pf.is_completed, false) AS is_completed,
    pf.id AS feedback_id
  FROM profiles target
  JOIN relevant_units ru ON ru.unit_id = target.home_unit_id
  LEFT JOIN units u ON u.id = target.home_unit_id
  LEFT JOIN peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = auth.uid()
   AND pf.receiver_user_id = target.id
  WHERE target.id <> auth.uid()
    AND target.is_active = true
    AND target.employee_status <> 'PENSIUN'
  ORDER BY u.code, target.full_name;
$$;

CREATE OR REPLACE FUNCTION public.submit_peer_feedback(
  p_academic_year_id UUID,
  p_receiver_user_id UUID,
  p_rating INTEGER,
  p_feedback_text TEXT
)
RETURNS peer_feedbacks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_feedback peer_feedbacks;
  can_give BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_receiver_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Tidak boleh memberi feedback untuk diri sendiri';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating harus bernilai 1 sampai 5';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.get_feedback_targets(p_academic_year_id) target
    WHERE target.receiver_user_id = p_receiver_user_id
  ) INTO can_give;

  IF NOT can_give THEN
    RAISE EXCEPTION 'Target feedback tidak valid untuk cakupan unit Anda';
  END IF;

  INSERT INTO peer_feedbacks (
    academic_year_id,
    giver_user_id,
    receiver_user_id,
    rating,
    feedback_text,
    is_completed
  )
  VALUES (
    p_academic_year_id,
    auth.uid(),
    p_receiver_user_id,
    p_rating,
    NULLIF(TRIM(COALESCE(p_feedback_text, '')), ''),
    true
  )
  ON CONFLICT (academic_year_id, giver_user_id, receiver_user_id)
  DO UPDATE SET
    rating = excluded.rating,
    feedback_text = excluded.feedback_text,
    is_completed = true,
    updated_at = now()
  RETURNING * INTO saved_feedback;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'SUBMIT_PEER_FEEDBACK', 'peer_feedbacks', saved_feedback.id, to_jsonb(saved_feedback));

  RETURN saved_feedback;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_received_feedback_anonymous(p_academic_year_id UUID)
RETURNS TABLE (
  feedback_id UUID,
  rating INTEGER,
  feedback_text TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pf.id, pf.rating, pf.feedback_text, pf.created_at
  FROM peer_feedbacks pf
  WHERE pf.academic_year_id = p_academic_year_id
    AND pf.receiver_user_id = auth.uid()
    AND pf.is_completed = true
  ORDER BY pf.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_feedback_monitoring(p_academic_year_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  unit_code TEXT,
  target_count INTEGER,
  completed_count INTEGER,
  is_complete BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.full_name,
    p.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    COUNT(target.id)::INTEGER AS target_count,
    COUNT(pf.id)::INTEGER AS completed_count,
    (COUNT(target.id) = COUNT(pf.id)) AS is_complete
  FROM profiles p
  LEFT JOIN units u ON u.id = p.home_unit_id
  LEFT JOIN profiles target
    ON target.home_unit_id = p.home_unit_id
   AND target.id <> p.id
   AND target.is_active = true
   AND target.employee_status <> 'PENSIUN'
  LEFT JOIN peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = p.id
   AND pf.receiver_user_id = target.id
   AND pf.is_completed = true
  WHERE (public.is_hrd() OR public.is_admin())
    AND p.is_active = true
    AND p.employee_status <> 'PENSIUN'
  GROUP BY p.id, p.full_name, p.employee_no, u.name, u.code
  ORDER BY u.code, p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.get_feedback_identified(p_academic_year_id UUID)
RETURNS TABLE (
  feedback_id UUID,
  giver_user_id UUID,
  giver_name TEXT,
  receiver_user_id UUID,
  receiver_name TEXT,
  unit_name TEXT,
  unit_code TEXT,
  rating INTEGER,
  feedback_text TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pf.id AS feedback_id,
    pf.giver_user_id,
    giver.full_name AS giver_name,
    pf.receiver_user_id,
    receiver.full_name AS receiver_name,
    u.name AS unit_name,
    u.code AS unit_code,
    pf.rating,
    pf.feedback_text,
    pf.created_at
  FROM peer_feedbacks pf
  JOIN profiles giver ON giver.id = pf.giver_user_id
  JOIN profiles receiver ON receiver.id = pf.receiver_user_id
  LEFT JOIN units u ON u.id = receiver.home_unit_id
  WHERE (public.is_hrd() OR public.is_admin())
    AND pf.academic_year_id = p_academic_year_id
    AND pf.is_completed = true
  ORDER BY pf.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_targets(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_received_feedback_anonymous(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_feedback_identified(UUID) FROM public;

GRANT EXECUTE ON FUNCTION public.get_feedback_targets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_received_feedback_anonymous(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_monitoring(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_identified(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_peer_feedbacks_receiver
  ON public.peer_feedbacks(receiver_user_id);

CREATE INDEX IF NOT EXISTS idx_peer_feedbacks_completion
  ON public.peer_feedbacks(academic_year_id, giver_user_id, is_completed);
