-- Keep Kepala Unit scope consistent when assignment rows are incomplete but profile home_unit_id exists.
ALTER POLICY "profiles_select_kepala_unit" ON public.profiles
  TO authenticated
  USING (
    (SELECT public.is_kepala_unit())
    AND home_unit_id IN (
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
  );

ALTER POLICY "positions_kepala_read" ON public.position_histories
  TO authenticated
  USING (
    (SELECT public.is_kepala_unit())
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
