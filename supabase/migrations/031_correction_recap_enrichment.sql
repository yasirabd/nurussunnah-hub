-- ============================================================
-- 031: Rekap koreksi presensi diperkaya (pegawai aktif, tahun aktif)
-- ============================================================

-- Rekap koreksi per JENIS KOREKSI
CREATE OR REPLACE FUNCTION public.correction_recap_by_kind_active_year()
RETURNS TABLE(correction_kind attendance_correction_kind_enum, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT c.correction_kind, COUNT(*)::BIGINT
  FROM public.attendance_corrections c
  JOIN public.academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = c.user_id AND p.active_status = 'AKTIF'
  WHERE is_hrd() OR is_admin()
  GROUP BY c.correction_kind
  ORDER BY 2 DESC;
$$;

-- Rekap koreksi per UNIT
CREATE OR REPLACE FUNCTION public.correction_recap_by_unit_active_year()
RETURNS TABLE(unit_name TEXT, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT COALESCE(u.name, '(Tanpa Unit)'), COUNT(*)::BIGINT
  FROM public.attendance_corrections c
  JOIN public.academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = c.user_id AND p.active_status = 'AKTIF'
  LEFT JOIN public.units u ON u.id = c.unit_id
  WHERE is_hrd() OR is_admin()
  GROUP BY u.name
  ORDER BY 2 DESC;
$$;

-- Statistik ringkas koreksi (total + jumlah pegawai unik)
CREATE OR REPLACE FUNCTION public.correction_recap_stats_active_year()
RETURNS TABLE(total_requests BIGINT, distinct_employees BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT COUNT(*)::BIGINT, COUNT(DISTINCT c.user_id)::BIGINT
  FROM public.attendance_corrections c
  JOIN public.academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = c.user_id AND p.active_status = 'AKTIF'
  WHERE is_hrd() OR is_admin();
$$;

REVOKE EXECUTE ON FUNCTION public.correction_recap_by_kind_active_year() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.correction_recap_by_unit_active_year() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.correction_recap_stats_active_year() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.correction_recap_by_kind_active_year() TO authenticated;
GRANT EXECUTE ON FUNCTION public.correction_recap_by_unit_active_year() TO authenticated;
GRANT EXECUTE ON FUNCTION public.correction_recap_stats_active_year() TO authenticated;
