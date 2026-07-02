-- ============================================================
-- 029: Modul Koreksi Presensi + Tabel Presensi
-- ============================================================

DO $$ BEGIN
  CREATE TYPE attendance_correction_status_enum AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_correction_kind_enum AS ENUM ('LUPA_TAP', 'KARTU_TERTINGGAL', 'KARTU_HILANG_RUSAK', 'KENDALA_SISTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_time_scope_enum AS ENUM ('MASUK', 'PULANG', 'KEDUANYA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABEL: attendance_records (baru; sistem presensi minimal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  check_in         TIMESTAMPTZ,
  check_out        TIMESTAMPTZ,
  source           TEXT NOT NULL DEFAULT 'DEVICE',
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_records_unique_day UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON public.attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_year ON public.attendance_records(academic_year_id);

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABEL: attendance_corrections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  unit_id            UUID REFERENCES public.units(id) ON DELETE SET NULL,
  event_date         DATE NOT NULL,
  correction_kind    attendance_correction_kind_enum NOT NULL,
  time_scope         attendance_time_scope_enum NOT NULL,
  reason             TEXT NOT NULL,
  status             attendance_correction_status_enum NOT NULL DEFAULT 'MENUNGGU',
  admin_note         TEXT,
  reviewed_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_correction_attachments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_correction_id UUID NOT NULL REFERENCES public.attendance_corrections(id) ON DELETE CASCADE,
  drive_file_id            TEXT NOT NULL,
  drive_view_link          TEXT NOT NULL,
  file_name                TEXT NOT NULL,
  mime_type                TEXT NOT NULL,
  uploaded_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_corrections_user ON public.attendance_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_att_corrections_unit ON public.attendance_corrections(unit_id);
CREATE INDEX IF NOT EXISTS idx_att_corrections_year ON public.attendance_corrections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_att_corrections_status ON public.attendance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_att_correction_att_parent ON public.attendance_correction_attachments(attendance_correction_id);

DROP TRIGGER IF EXISTS trg_att_corrections_updated_at ON public.attendance_corrections;
CREATE TRIGGER trg_att_corrections_updated_at
  BEFORE UPDATE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_attachments ENABLE ROW LEVEL SECURITY;

-- attendance_records
DROP POLICY IF EXISTS "attendance_records_select_self" ON public.attendance_records;
CREATE POLICY "attendance_records_select_self" ON public.attendance_records
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "attendance_records_select_hrd_admin" ON public.attendance_records;
CREATE POLICY "attendance_records_select_hrd_admin" ON public.attendance_records
FOR SELECT USING (is_hrd() OR is_admin());

DROP POLICY IF EXISTS "attendance_records_write_hrd_admin" ON public.attendance_records;
CREATE POLICY "attendance_records_write_hrd_admin" ON public.attendance_records
FOR ALL USING (is_hrd() OR is_admin()) WITH CHECK (is_hrd() OR is_admin());

DROP POLICY IF EXISTS "attendance_records_select_kepala_unit" ON public.attendance_records;
CREATE POLICY "attendance_records_select_kepala_unit" ON public.attendance_records
FOR SELECT USING (
  is_kepala_unit()
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id = attendance_records.user_id
      AND target.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
  )
);

-- attendance_corrections
DROP POLICY IF EXISTS "att_corrections_select_self" ON public.attendance_corrections;
CREATE POLICY "att_corrections_select_self" ON public.attendance_corrections
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "att_corrections_insert_self" ON public.attendance_corrections;
CREATE POLICY "att_corrections_insert_self" ON public.attendance_corrections
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "att_corrections_select_hrd_admin" ON public.attendance_corrections;
CREATE POLICY "att_corrections_select_hrd_admin" ON public.attendance_corrections
FOR SELECT USING (is_hrd() OR is_admin());

DROP POLICY IF EXISTS "att_corrections_write_hrd_admin" ON public.attendance_corrections;
CREATE POLICY "att_corrections_write_hrd_admin" ON public.attendance_corrections
FOR UPDATE USING (is_hrd() OR is_admin()) WITH CHECK (is_hrd() OR is_admin());

DROP POLICY IF EXISTS "att_corrections_select_kepala_unit" ON public.attendance_corrections;
CREATE POLICY "att_corrections_select_kepala_unit" ON public.attendance_corrections
FOR SELECT USING (
  is_kepala_unit()
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id = attendance_corrections.user_id
      AND target.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
  )
);

-- attachments (mengikuti parent)
DROP POLICY IF EXISTS "att_correction_att_select_self" ON public.attendance_correction_attachments;
CREATE POLICY "att_correction_att_select_self" ON public.attendance_correction_attachments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.attendance_corrections c WHERE c.id = attendance_correction_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "att_correction_att_insert_self" ON public.attendance_correction_attachments;
CREATE POLICY "att_correction_att_insert_self" ON public.attendance_correction_attachments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.attendance_corrections c WHERE c.id = attendance_correction_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "att_correction_att_select_hrd_admin" ON public.attendance_correction_attachments;
CREATE POLICY "att_correction_att_select_hrd_admin" ON public.attendance_correction_attachments
FOR SELECT USING (is_hrd() OR is_admin());

GRANT SELECT ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance_corrections TO authenticated;
GRANT SELECT, INSERT ON public.attendance_correction_attachments TO authenticated;

-- ============================================================
-- RPC: submit_attendance_correction
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_attendance_correction(
  p_event_date      DATE,
  p_correction_kind attendance_correction_kind_enum,
  p_time_scope      attendance_time_scope_enum,
  p_reason          TEXT
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
  IF v_user IS NULL THEN RAISE EXCEPTION 'Tidak terautentikasi'; END IF;
  SELECT home_unit_id INTO v_unit FROM public.profiles WHERE id = v_user;
  SELECT id INTO v_year FROM public.academic_years WHERE is_active = true LIMIT 1;

  INSERT INTO public.attendance_corrections (
    user_id, academic_year_id, unit_id, event_date, correction_kind, time_scope, reason
  ) VALUES (
    v_user, v_year, v_unit, p_event_date, p_correction_kind, p_time_scope, p_reason
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- RPC: review_attendance_correction (approve -> upsert attendance_records)
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
    SELECT id INTO v_year FROM public.academic_years WHERE is_active = true LIMIT 1;
    INSERT INTO public.attendance_records (user_id, date, check_in, check_out, source, academic_year_id, note)
    VALUES (
      v_rec.user_id, v_rec.event_date,
      CASE WHEN v_rec.time_scope IN ('MASUK', 'KEDUANYA') THEN (v_rec.event_date::timestamptz) ELSE NULL END,
      CASE WHEN v_rec.time_scope IN ('PULANG', 'KEDUANYA') THEN (v_rec.event_date::timestamptz) ELSE NULL END,
      'CORRECTION', v_year, 'Koreksi presensi #' || v_rec.id
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      check_in  = COALESCE(public.attendance_records.check_in, EXCLUDED.check_in),
      check_out = COALESCE(public.attendance_records.check_out, EXCLUDED.check_out),
      source    = 'CORRECTION',
      note      = COALESCE(public.attendance_records.note, EXCLUDED.note),
      updated_at = now();
  END IF;
END;
$$;

-- RPC: counter koreksi pegawai (tahun aktif)
CREATE OR REPLACE FUNCTION public.my_correction_summary_active_year()
RETURNS TABLE(correction_kind attendance_correction_kind_enum, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT c.correction_kind, COUNT(*)::BIGINT
  FROM public.attendance_corrections c
  JOIN public.academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = true
  WHERE c.user_id = auth.uid()
  GROUP BY c.correction_kind
  ORDER BY 2 DESC;
$$;

-- RPC: rekap per pegawai unit (tahun aktif)
CREATE OR REPLACE FUNCTION public.unit_correction_counts_active_year()
RETURNS TABLE(user_id UUID, full_name TEXT, employee_no TEXT, unit_name TEXT, total_corrections BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT p.id, p.full_name, p.employee_no, u.name,
         COUNT(c.id) FILTER (WHERE ay.is_active = true)::BIGINT
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  LEFT JOIN public.attendance_corrections c ON c.user_id = p.id
  LEFT JOIN public.academic_years ay ON ay.id = c.academic_year_id
  WHERE (is_hrd() OR is_admin() OR (
    is_kepala_unit() AND p.home_unit_id IN (
      SELECT unit_id FROM public.user_unit_assignments
      WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
    )
  ))
  GROUP BY p.id, p.full_name, p.employee_no, u.name
  ORDER BY 5 DESC, p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_attendance_correction(DATE, attendance_correction_kind_enum, attendance_time_scope_enum, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.review_attendance_correction(UUID, attendance_correction_status_enum, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_correction_summary_active_year() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unit_correction_counts_active_year() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_attendance_correction(DATE, attendance_correction_kind_enum, attendance_time_scope_enum, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_attendance_correction(UUID, attendance_correction_status_enum, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_correction_summary_active_year() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unit_correction_counts_active_year() TO authenticated;
