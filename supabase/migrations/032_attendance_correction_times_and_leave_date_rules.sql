-- ============================================================
-- 032: Requested attendance correction times + leave date rule
-- ============================================================

ALTER TABLE public.attendance_corrections
  ADD COLUMN IF NOT EXISTS requested_check_in time,
  ADD COLUMN IF NOT EXISTS requested_check_out time;

-- Izin tidak boleh diajukan untuk tanggal lampau, tetapi boleh mendadak hari ini.
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

-- Koreksi presensi hanya untuk tanggal hari ini dan wajib menyertakan waktu sesuai scope.
CREATE OR REPLACE FUNCTION public.submit_attendance_correction(
  p_event_date      DATE,
  p_correction_kind attendance_correction_kind_enum,
  p_time_scope      attendance_time_scope_enum,
  p_reason          TEXT,
  p_requested_check_in time DEFAULT NULL,
  p_requested_check_out time DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_unit UUID;
  v_year UUID;
  v_id   UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;
  IF p_event_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Tanggal kejadian hanya boleh hari ini';
  END IF;
  IF p_time_scope IN ('MASUK', 'KEDUANYA') AND p_requested_check_in IS NULL THEN
    RAISE EXCEPTION 'Waktu masuk wajib diisi';
  END IF;
  IF p_time_scope IN ('PULANG', 'KEDUANYA') AND p_requested_check_out IS NULL THEN
    RAISE EXCEPTION 'Waktu pulang wajib diisi';
  END IF;

  SELECT home_unit_id INTO v_unit FROM public.profiles WHERE id = v_user;
  SELECT id INTO v_year FROM public.academic_years WHERE is_active = true LIMIT 1;

  INSERT INTO public.attendance_corrections (
    user_id, academic_year_id, unit_id, event_date, correction_kind, time_scope,
    reason, requested_check_in, requested_check_out
  ) VALUES (
    v_user, v_year, v_unit, p_event_date, p_correction_kind, p_time_scope,
    p_reason, p_requested_check_in, p_requested_check_out
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Saat koreksi disetujui, attendance_records memakai waktu yang diajukan pegawai.
CREATE OR REPLACE FUNCTION public.review_attendance_correction(
  p_id     UUID,
  p_status attendance_correction_status_enum,
  p_note   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec   public.attendance_corrections%ROWTYPE;
  v_year  UUID;
  v_check_in timestamptz;
  v_check_out timestamptz;
BEGIN
  IF NOT (is_hrd() OR is_admin()) THEN
    RAISE EXCEPTION 'Hanya HRD/ADMIN yang dapat memvalidasi';
  END IF;

  UPDATE public.attendance_corrections
  SET status = p_status, admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_id
  RETURNING * INTO v_rec;

  IF v_rec.id IS NULL THEN
    RAISE EXCEPTION 'Pengajuan tidak ditemukan';
  END IF;

  IF p_status = 'DISETUJUI' THEN
    IF v_rec.time_scope IN ('MASUK', 'KEDUANYA') AND v_rec.requested_check_in IS NULL THEN
      RAISE EXCEPTION 'Waktu masuk belum tersedia';
    END IF;
    IF v_rec.time_scope IN ('PULANG', 'KEDUANYA') AND v_rec.requested_check_out IS NULL THEN
      RAISE EXCEPTION 'Waktu pulang belum tersedia';
    END IF;

    v_check_in := CASE
      WHEN v_rec.time_scope IN ('MASUK', 'KEDUANYA')
      THEN ((v_rec.event_date + v_rec.requested_check_in)::timestamp AT TIME ZONE 'Asia/Jakarta')
      ELSE NULL
    END;
    v_check_out := CASE
      WHEN v_rec.time_scope IN ('PULANG', 'KEDUANYA')
      THEN ((v_rec.event_date + v_rec.requested_check_out)::timestamp AT TIME ZONE 'Asia/Jakarta')
      ELSE NULL
    END;

    SELECT id INTO v_year FROM public.academic_years WHERE is_active = true LIMIT 1;

    INSERT INTO public.attendance_records (user_id, date, check_in, check_out, source, academic_year_id, note)
    VALUES (
      v_rec.user_id, v_rec.event_date, v_check_in, v_check_out,
      'CORRECTION', v_year, 'Koreksi presensi #' || v_rec.id
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      check_in  = CASE
        WHEN v_rec.time_scope IN ('MASUK', 'KEDUANYA') THEN EXCLUDED.check_in
        ELSE public.attendance_records.check_in
      END,
      check_out = CASE
        WHEN v_rec.time_scope IN ('PULANG', 'KEDUANYA') THEN EXCLUDED.check_out
        ELSE public.attendance_records.check_out
      END,
      source    = 'CORRECTION',
      note      = EXCLUDED.note,
      updated_at = now();
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_attendance_correction(DATE, attendance_correction_kind_enum, attendance_time_scope_enum, TEXT, time, time) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_attendance_correction(DATE, attendance_correction_kind_enum, attendance_time_scope_enum, TEXT, time, time) TO authenticated;
