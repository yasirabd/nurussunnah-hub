CREATE OR REPLACE FUNCTION public.get_feedback_monitoring_scoped(p_academic_year_id UUID)
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
  WITH my_units AS (
    SELECT unit_id
    FROM user_unit_assignments
    WHERE user_id = auth.uid()
      AND assignment_type = 'HOME'
      AND academic_year_id = p_academic_year_id
  )
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
  WHERE p.is_active = true
    AND p.employee_status <> 'PENSIUN'
    AND (
      public.is_hrd()
      OR public.is_admin()
      OR (public.is_kepala_unit() AND p.home_unit_id IN (SELECT unit_id FROM my_units))
    )
  GROUP BY p.id, p.full_name, p.employee_no, u.name, u.code
  ORDER BY u.code, p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) TO authenticated;
