-- ============================================================
-- 038: Day-based attendance correction recap
-- ============================================================

CREATE OR REPLACE FUNCTION public.unit_correction_day_recap_active_year(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  total_correction_days BIGINT,
  lupa_tap_days BIGINT,
  kartu_tertinggal_days BIGINT,
  kartu_hilang_rusak_days BIGINT,
  kendala_sistem_days BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.full_name,
    p.employee_no,
    u.name,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true)::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'LUPA_TAP')::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'KARTU_TERTINGGAL')::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'KARTU_HILANG_RUSAK')::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'KENDALA_SISTEM')::BIGINT
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  LEFT JOIN public.attendance_corrections c
    ON c.user_id = p.id
    AND (p_start_date IS NULL OR c.event_date >= p_start_date)
    AND (p_end_date IS NULL OR c.event_date <= p_end_date)
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

REVOKE EXECUTE ON FUNCTION public.unit_correction_day_recap_active_year(DATE, DATE) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.unit_correction_day_recap_active_year(DATE, DATE) TO authenticated;

