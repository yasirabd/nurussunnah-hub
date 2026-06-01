-- Allow every Kepala Unit to update active position rows for employees in their own unit scope.
-- Application code only updates position_name; RLS constrains which rows are mutable.
CREATE POLICY "positions_update_kepala_unit_current"
ON public.position_histories
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_kepala_unit())
  AND is_current = true
  AND user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.home_unit_id IN (
      SELECT scoped_units.unit_id
      FROM (
        SELECT uua.unit_id
        FROM public.user_unit_assignments uua
        WHERE uua.user_id = (SELECT auth.uid())
          AND uua.assignment_type = 'HOME'
        UNION
        SELECT self_profile.home_unit_id
        FROM public.profiles self_profile
        WHERE self_profile.id = (SELECT auth.uid())
          AND self_profile.home_unit_id IS NOT NULL
      ) scoped_units
    )
  )
)
WITH CHECK (
  (SELECT public.is_kepala_unit())
  AND is_current = true
  AND user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.home_unit_id IN (
      SELECT scoped_units.unit_id
      FROM (
        SELECT uua.unit_id
        FROM public.user_unit_assignments uua
        WHERE uua.user_id = (SELECT auth.uid())
          AND uua.assignment_type = 'HOME'
        UNION
        SELECT self_profile.home_unit_id
        FROM public.profiles self_profile
        WHERE self_profile.id = (SELECT auth.uid())
          AND self_profile.home_unit_id IS NOT NULL
      ) scoped_units
    )
  )
);
