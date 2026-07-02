-- ============================================================
-- 028: Modul Izin Pegawai (leave_requests)
-- Menggantikan Google Form perizinan.
-- ============================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE leave_request_status_enum AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'PERLU_REVISI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_time_type_enum AS ENUM ('SEHARIAN_PENUH', 'DATANG_TERLAMBAT', 'PULANG_LEBIH_AWAL', 'SEBAGIAN_JAM_KERJA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABEL: leave_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  unit_id            UUID REFERENCES public.units(id) ON DELETE SET NULL,
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  leave_category     TEXT NOT NULL,
  leave_time_type    leave_time_type_enum NOT NULL,
  reason             TEXT NOT NULL,
  unit_head_approved BOOLEAN NOT NULL DEFAULT false,
  no_evidence_ack    BOOLEAN NOT NULL DEFAULT false,
  status             leave_request_status_enum NOT NULL DEFAULT 'MENUNGGU',
  admin_note         TEXT,
  reviewed_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_valid_period CHECK (end_date >= start_date),
  CONSTRAINT leave_requests_unit_head_required CHECK (unit_head_approved = true)
);

-- ============================================================
-- TABEL: leave_request_attachments (metadata Google Drive)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE leave_attachment_kind_enum AS ENUM ('BUKTI_IZIN', 'SS_KEPALA_UNIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.leave_request_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  kind             leave_attachment_kind_enum NOT NULL,
  drive_file_id    TEXT NOT NULL,
  drive_view_link  TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_unit_id ON public.leave_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_academic_year ON public.leave_requests(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_attachments_request ON public.leave_request_attachments(leave_request_id);

-- UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_request_attachments ENABLE ROW LEVEL SECURITY;

-- leave_requests: pegawai lihat miliknya
DROP POLICY IF EXISTS "leave_requests_select_self" ON public.leave_requests;
CREATE POLICY "leave_requests_select_self" ON public.leave_requests
FOR SELECT USING (user_id = auth.uid());

-- pegawai insert miliknya sendiri (status awal MENUNGGU)
DROP POLICY IF EXISTS "leave_requests_insert_self" ON public.leave_requests;
CREATE POLICY "leave_requests_insert_self" ON public.leave_requests
FOR INSERT WITH CHECK (user_id = auth.uid());

-- HRD/ADMIN lihat & kelola semua
DROP POLICY IF EXISTS "leave_requests_select_hrd_admin" ON public.leave_requests;
CREATE POLICY "leave_requests_select_hrd_admin" ON public.leave_requests
FOR SELECT USING (is_hrd() OR is_admin());

DROP POLICY IF EXISTS "leave_requests_write_hrd_admin" ON public.leave_requests;
CREATE POLICY "leave_requests_write_hrd_admin" ON public.leave_requests
FOR UPDATE USING (is_hrd() OR is_admin()) WITH CHECK (is_hrd() OR is_admin());

-- Kepala Unit: lihat izin pegawai unit HOME-nya (read-only)
DROP POLICY IF EXISTS "leave_requests_select_kepala_unit" ON public.leave_requests;
CREATE POLICY "leave_requests_select_kepala_unit" ON public.leave_requests
FOR SELECT USING (
  is_kepala_unit()
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id = leave_requests.user_id
      AND target.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid()
          AND assignment_type = 'HOME'
          AND unit_id IS NOT NULL
      )
  )
);

-- attachments: mengikuti akses parent leave_requests
DROP POLICY IF EXISTS "leave_attachments_select_self" ON public.leave_request_attachments;
CREATE POLICY "leave_attachments_select_self" ON public.leave_request_attachments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leave_requests lr WHERE lr.id = leave_request_id AND lr.user_id = auth.uid())
);

DROP POLICY IF EXISTS "leave_attachments_insert_self" ON public.leave_request_attachments;
CREATE POLICY "leave_attachments_insert_self" ON public.leave_request_attachments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leave_requests lr WHERE lr.id = leave_request_id AND lr.user_id = auth.uid())
);

DROP POLICY IF EXISTS "leave_attachments_select_hrd_admin" ON public.leave_request_attachments;
CREATE POLICY "leave_attachments_select_hrd_admin" ON public.leave_request_attachments
FOR SELECT USING (is_hrd() OR is_admin());

DROP POLICY IF EXISTS "leave_attachments_select_kepala_unit" ON public.leave_request_attachments;
CREATE POLICY "leave_attachments_select_kepala_unit" ON public.leave_request_attachments
FOR SELECT USING (
  is_kepala_unit()
  AND EXISTS (
    SELECT 1 FROM public.leave_requests lr
    JOIN public.profiles target ON target.id = lr.user_id
    WHERE lr.id = leave_request_id
      AND target.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
  )
);

GRANT SELECT, INSERT ON public.leave_requests TO authenticated;
GRANT UPDATE ON public.leave_requests TO authenticated;
GRANT SELECT, INSERT ON public.leave_request_attachments TO authenticated;

-- ============================================================
-- RPC: submit_leave_request (transaksional, security definer)
-- Mengembalikan id pengajuan agar server action bisa lampirkan bukti.
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

-- RPC: review_leave_request (HRD/ADMIN set status)
CREATE OR REPLACE FUNCTION public.review_leave_request(
  p_id     UUID,
  p_status leave_request_status_enum,
  p_note   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_hrd() OR is_admin()) THEN
    RAISE EXCEPTION 'Hanya HRD/ADMIN yang dapat memvalidasi';
  END IF;
  UPDATE public.leave_requests
  SET status = p_status,
      admin_note = p_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_id;
END;
$$;

-- RPC: counter izin pegawai (tahun pelajaran aktif) - per jenis
CREATE OR REPLACE FUNCTION public.my_leave_summary_active_year()
RETURNS TABLE(leave_category TEXT, total BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lr.leave_category, COUNT(*)::BIGINT
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  WHERE lr.user_id = auth.uid()
  GROUP BY lr.leave_category
  ORDER BY 2 DESC;
$$;

-- RPC: rekap per pegawai unit kepala unit (tahun pelajaran aktif)
CREATE OR REPLACE FUNCTION public.unit_leave_counts_active_year()
RETURNS TABLE(user_id UUID, full_name TEXT, employee_no TEXT, unit_name TEXT, total_leaves BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.full_name, p.employee_no, u.name,
         COUNT(lr.id) FILTER (WHERE ay.is_active = true)::BIGINT
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  LEFT JOIN public.leave_requests lr ON lr.user_id = p.id
  LEFT JOIN public.academic_years ay ON ay.id = lr.academic_year_id
  WHERE (is_hrd() OR is_admin() OR (
    is_kepala_unit() AND p.home_unit_id IN (
      SELECT unit_id FROM public.user_unit_assignments
      WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
    )
  ))
  GROUP BY p.id, p.full_name, p.employee_no, u.name
  ORDER BY 5 DESC, p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_leave_request(DATE, DATE, TEXT, leave_time_type_enum, TEXT, BOOLEAN, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.review_leave_request(UUID, leave_request_status_enum, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_leave_summary_active_year() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unit_leave_counts_active_year() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_leave_request(DATE, DATE, TEXT, leave_time_type_enum, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_leave_request(UUID, leave_request_status_enum, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_leave_summary_active_year() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unit_leave_counts_active_year() TO authenticated;
