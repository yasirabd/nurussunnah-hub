-- ============================================================
-- MIGRATION 025: Feedback archive selection and June submit lock
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_feedback_submission_open()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta')) = 6;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.academic_years ay
    WHERE ay.id = p_academic_year_id
      AND ay.is_active = true
  ) THEN
    RAISE EXCEPTION 'Feedback hanya dapat diisi untuk tahun pelajaran aktif.';
  END IF;

  IF NOT public.is_feedback_submission_open() THEN
    RAISE EXCEPTION 'Pengisian feedback hanya dibuka pada bulan Juni.';
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

REVOKE EXECUTE ON FUNCTION public.is_feedback_submission_open() FROM public;
REVOKE EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) FROM public;

GRANT EXECUTE ON FUNCTION public.is_feedback_submission_open() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) TO authenticated;
