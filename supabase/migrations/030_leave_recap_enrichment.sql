-- ============================================================
-- 030: Rekap izin diperkaya + filter pegawai aktif
-- ============================================================

-- Update: hitung izin per pegawai HANYA untuk pegawai AKTIF
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
  WHERE p.active_status = 'AKTIF'
    AND (is_hrd() OR is_admin() OR (
      is_kepala_unit() AND p.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
    ))
  GROUP BY p.id, p.full_name, p.employee_no, u.name
  ORDER BY 5 DESC, p.full_name;
$$;

-- Update: koreksi presensi per pegawai HANYA pegawai AKTIF
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
  WHERE p.active_status = 'AKTIF'
    AND (is_hrd() OR is_admin() OR (
      is_kepala_unit() AND p.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
    ))
  GROUP BY p.id, p.full_name, p.employee_no, u.name
  ORDER BY 5 DESC, p.full_name;
$$;

-- ============================================================
-- Rekap izin per JENIS IZIN (tahun aktif, pegawai aktif) - HRD/ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_recap_by_category_active_year()
RETURNS TABLE(leave_category TEXT, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT lr.leave_category, COUNT(*)::BIGINT
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = lr.user_id AND p.active_status = 'AKTIF'
  WHERE is_hrd() OR is_admin()
  GROUP BY lr.leave_category
  ORDER BY 2 DESC;
$$;

-- Rekap izin per UNIT (tahun aktif, pegawai aktif) - HRD/ADMIN
CREATE OR REPLACE FUNCTION public.leave_recap_by_unit_active_year()
RETURNS TABLE(unit_name TEXT, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT COALESCE(u.name, '(Tanpa Unit)'), COUNT(*)::BIGINT
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = lr.user_id AND p.active_status = 'AKTIF'
  LEFT JOIN public.units u ON u.id = lr.unit_id
  WHERE is_hrd() OR is_admin()
  GROUP BY u.name
  ORDER BY 2 DESC;
$$;

-- Statistik ringkas izin (total pengajuan + rata-rata durasi hari) - HRD/ADMIN
CREATE OR REPLACE FUNCTION public.leave_recap_stats_active_year()
RETURNS TABLE(total_requests BIGINT, avg_duration_days NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT,
    ROUND(AVG((lr.end_date - lr.start_date) + 1)::NUMERIC, 1)
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = lr.user_id AND p.active_status = 'AKTIF'
  WHERE is_hrd() OR is_admin();
$$;

REVOKE EXECUTE ON FUNCTION public.leave_recap_by_category_active_year() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leave_recap_by_unit_active_year() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leave_recap_stats_active_year() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.leave_recap_by_category_active_year() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_recap_by_unit_active_year() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_recap_stats_active_year() TO authenticated;
