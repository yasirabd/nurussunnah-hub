-- Backfill profile home unit from active-year HOME assignment.
WITH active_year AS (
  SELECT id
  FROM public.academic_years
  WHERE is_active = true
  ORDER BY start_date DESC
  LIMIT 1
), preferred_home AS (
  SELECT DISTINCT ON (uua.user_id)
    uua.user_id,
    uua.unit_id
  FROM public.user_unit_assignments uua
  JOIN active_year ay ON ay.id = uua.academic_year_id
  WHERE uua.assignment_type = 'HOME'
  ORDER BY uua.user_id, uua.created_at DESC
)
UPDATE public.profiles p
SET home_unit_id = preferred_home.unit_id
FROM preferred_home
WHERE p.id = preferred_home.user_id
  AND p.home_unit_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_feedback_targets(p_academic_year_id UUID)
RETURNS TABLE (
  receiver_user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  unit_code TEXT,
  rating INTEGER,
  feedback_text TEXT,
  is_completed BOOLEAN,
  feedback_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_profile AS (
    SELECT p.id, p.home_unit_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.employee_status <> 'PENSIUN'
  ), my_units AS (
    SELECT DISTINCT uua.unit_id
    FROM public.user_unit_assignments uua
    JOIN my_profile mp ON mp.id = uua.user_id
    WHERE uua.assignment_type = 'HOME'
      AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    UNION
    SELECT home_unit_id
    FROM my_profile
    WHERE home_unit_id IS NOT NULL
  ), target_units AS (
    SELECT DISTINCT ON (p.id)
      p.id AS user_id,
      COALESCE(home_assignment.unit_id, p.home_unit_id) AS unit_id
    FROM public.profiles p
    LEFT JOIN public.user_unit_assignments home_assignment
      ON home_assignment.user_id = p.id
     AND home_assignment.assignment_type = 'HOME'
     AND (home_assignment.academic_year_id = p_academic_year_id OR home_assignment.academic_year_id IS NULL)
    WHERE p.is_active = true
      AND p.employee_status <> 'PENSIUN'
    ORDER BY p.id, home_assignment.academic_year_id NULLS LAST, home_assignment.created_at DESC
  )
  SELECT
    target.id AS receiver_user_id,
    target.full_name,
    target.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    pf.rating,
    pf.feedback_text,
    COALESCE(pf.is_completed, false) AS is_completed,
    pf.id AS feedback_id
  FROM public.profiles target
  JOIN target_units target_unit ON target_unit.user_id = target.id
  JOIN my_units my_unit ON my_unit.unit_id = target_unit.unit_id
  LEFT JOIN public.units u ON u.id = target_unit.unit_id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = auth.uid()
   AND pf.receiver_user_id = target.id
  WHERE target.id <> auth.uid()
    AND target.is_active = true
    AND target.employee_status <> 'PENSIUN'
  ORDER BY u.code, target.full_name;
$$;

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
    SELECT uua.unit_id
    FROM public.user_unit_assignments uua
    WHERE uua.user_id = auth.uid()
      AND uua.assignment_type = 'HOME'
      AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    UNION
    SELECT p.home_unit_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.home_unit_id IS NOT NULL
  ), effective_profiles AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.full_name,
      p.employee_no,
      COALESCE(home_assignment.unit_id, p.home_unit_id) AS unit_id
    FROM public.profiles p
    LEFT JOIN public.user_unit_assignments home_assignment
      ON home_assignment.user_id = p.id
     AND home_assignment.assignment_type = 'HOME'
     AND (home_assignment.academic_year_id = p_academic_year_id OR home_assignment.academic_year_id IS NULL)
    WHERE p.is_active = true
      AND p.employee_status <> 'PENSIUN'
    ORDER BY p.id, home_assignment.academic_year_id NULLS LAST, home_assignment.created_at DESC
  )
  SELECT
    giver.id AS user_id,
    giver.full_name,
    giver.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    COUNT(receiver.id)::INTEGER AS target_count,
    COUNT(pf.id)::INTEGER AS completed_count,
    (COUNT(receiver.id) = COUNT(pf.id)) AS is_complete
  FROM effective_profiles giver
  LEFT JOIN public.units u ON u.id = giver.unit_id
  LEFT JOIN effective_profiles receiver
    ON receiver.unit_id = giver.unit_id
   AND receiver.id <> giver.id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = giver.id
   AND pf.receiver_user_id = receiver.id
   AND pf.is_completed = true
  WHERE public.is_hrd()
     OR public.is_admin()
     OR (public.is_kepala_unit() AND giver.unit_id IN (SELECT unit_id FROM my_units))
  GROUP BY giver.id, giver.full_name, giver.employee_no, u.name, u.code
  ORDER BY u.code, giver.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_targets(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_feedback_targets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) TO authenticated;
