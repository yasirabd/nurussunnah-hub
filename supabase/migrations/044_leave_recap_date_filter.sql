-- Keep the no-argument reports compatible; date-filtered reports use these overloads.
CREATE OR REPLACE FUNCTION public.unit_leave_counts_active_year(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(user_id UUID, full_name TEXT, employee_no TEXT, unit_name TEXT, total_leaves BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT p.id, p.full_name, p.employee_no, u.name,
         COUNT(lr.id) FILTER (WHERE ay.is_active = true)::BIGINT
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  LEFT JOIN public.leave_requests lr ON lr.user_id = p.id
    AND lr.start_date <= p_end_date AND lr.end_date >= p_start_date
  LEFT JOIN public.academic_years ay ON ay.id = lr.academic_year_id
  WHERE p.active_status = 'AKTIF'
    AND p_start_date <= p_end_date
    AND (is_hrd() OR is_admin() OR (
      is_kepala_unit() AND p.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
    ))
  GROUP BY p.id, p.full_name, p.employee_no, u.name
  ORDER BY 5 DESC, p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.leave_recap_by_category_active_year(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(leave_category TEXT, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT lr.leave_category, COUNT(*)::BIGINT
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = lr.user_id AND p.active_status = 'AKTIF'
  WHERE (is_hrd() OR is_admin())
    AND p_start_date <= p_end_date
    AND lr.start_date <= p_end_date AND lr.end_date >= p_start_date
  GROUP BY lr.leave_category
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION public.leave_recap_by_unit_active_year(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(unit_name TEXT, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT COALESCE(u.name, '(Tanpa Unit)'), COUNT(*)::BIGINT
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = lr.user_id AND p.active_status = 'AKTIF'
  LEFT JOIN public.units u ON u.id = lr.unit_id
  WHERE (is_hrd() OR is_admin())
    AND p_start_date <= p_end_date
    AND lr.start_date <= p_end_date AND lr.end_date >= p_start_date
  GROUP BY u.name
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION public.leave_recap_stats_active_year(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(total_requests BIGINT, avg_duration_days NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT COUNT(*)::BIGINT,
         ROUND(AVG((lr.end_date - lr.start_date) + 1)::NUMERIC, 1)
  FROM public.leave_requests lr
  JOIN public.academic_years ay ON ay.id = lr.academic_year_id AND ay.is_active = true
  JOIN public.profiles p ON p.id = lr.user_id AND p.active_status = 'AKTIF'
  WHERE (is_hrd() OR is_admin())
    AND p_start_date <= p_end_date
    AND lr.start_date <= p_end_date AND lr.end_date >= p_start_date;
$$;

REVOKE EXECUTE ON FUNCTION public.unit_leave_counts_active_year(DATE, DATE) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leave_recap_by_category_active_year(DATE, DATE) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leave_recap_by_unit_active_year(DATE, DATE) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leave_recap_stats_active_year(DATE, DATE) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.unit_leave_counts_active_year(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_recap_by_category_active_year(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_recap_by_unit_active_year(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_recap_stats_active_year(DATE, DATE) TO authenticated;
