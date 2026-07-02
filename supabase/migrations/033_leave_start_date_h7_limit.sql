-- ============================================================
-- 033: Leave start date limited to today through H+7
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_leave_request(
  p_start_date       DATE,
  p_end_date         DATE,
  p_leave_category   TEXT,
  p_leave_time_type  leave_time_type_enum,
  p_reason           TEXT,
  p_unit_head_approved BOOLEAN,
  p_no_evidence_ack  BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_unit   UUID;
  v_year   UUID;
  v_id     UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;
  IF p_unit_head_approved IS NOT TRUE THEN
    RAISE EXCEPTION 'Izin kepala unit wajib diperoleh terlebih dahulu';
  END IF;
  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Tanggal izin tidak boleh sebelum hari ini';
  END IF;
  IF p_start_date > CURRENT_DATE + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Tanggal mulai izin maksimal H+7 dari hari ini';
  END IF;
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Tanggal selesai tidak boleh sebelum tanggal mulai';
  END IF;

  SELECT home_unit_id INTO v_unit FROM public.profiles WHERE id = v_user;
  SELECT id INTO v_year FROM public.academic_years WHERE is_active = true LIMIT 1;

  INSERT INTO public.leave_requests (
    user_id, academic_year_id, unit_id, start_date, end_date,
    leave_category, leave_time_type, reason, unit_head_approved, no_evidence_ack
  ) VALUES (
    v_user, v_year, v_unit, p_start_date, p_end_date,
    p_leave_category, p_leave_time_type, p_reason, p_unit_head_approved, COALESCE(p_no_evidence_ack, false)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
