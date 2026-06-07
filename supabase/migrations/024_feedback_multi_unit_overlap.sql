-- ============================================================
-- MIGRATION 024: Fix feedback unit scope for multi-unit overlap
-- ============================================================

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
  ), employee_units AS (
    SELECT
      p.id AS user_id,
      COALESCE(uua.unit_id, p.home_unit_id) AS unit_id
    FROM public.profiles p
    LEFT JOIN public.user_unit_assignments uua
      ON uua.user_id = p.id
     AND uua.assignment_type = 'HOME'
     AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    WHERE p.active_status = 'AKTIF'
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    COUNT(DISTINCT tu.user_id)::INTEGER AS target_count,
    COUNT(DISTINCT pf.id)::INTEGER AS completed_count,
    (COUNT(DISTINCT tu.user_id) = COUNT(DISTINCT pf.id)) AS is_complete
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  JOIN employee_units pu ON pu.user_id = p.id
  LEFT JOIN employee_units tu ON tu.unit_id = pu.unit_id AND tu.user_id <> p.id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = p.id
   AND pf.receiver_user_id = tu.user_id
   AND pf.is_completed = true
  WHERE p.active_status = 'AKTIF'
    AND (
      public.is_hrd()
      OR public.is_admin()
      OR (
        public.is_kepala_unit()
        AND EXISTS (
          SELECT 1 FROM employee_units eu
          WHERE eu.user_id = p.id AND eu.unit_id IN (SELECT unit_id FROM my_units)
        )
      )
    )
  GROUP BY p.id, p.full_name, p.employee_no, u.name, u.code
  ORDER BY u.code, p.full_name;

$$;

REVOKE EXECUTE ON FUNCTION public.{name}(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.{name}(UUID) TO authenticated;

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
      AND p.active_status = 'AKTIF'
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
  )
  SELECT DISTINCT
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
  LEFT JOIN public.units u ON u.id = target.home_unit_id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = auth.uid()
   AND pf.receiver_user_id = target.id
  WHERE target.id <> auth.uid()
    AND target.active_status = 'AKTIF'
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_unit_assignments target_uua
        WHERE target_uua.user_id = target.id
          AND target_uua.assignment_type = 'HOME'
          AND (target_uua.academic_year_id = p_academic_year_id OR target_uua.academic_year_id IS NULL)
          AND target_uua.unit_id IN (SELECT unit_id FROM my_units)
      )
      OR
      target.home_unit_id IN (SELECT unit_id FROM my_units)
    )
  ORDER BY u.code, target.full_name;

$$;

REVOKE EXECUTE ON FUNCTION public.{name}(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.{name}(UUID) TO authenticated;
