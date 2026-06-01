-- ============================================================
-- FASE 2 PERFORMANCE: Cover frequently used foreign keys
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_units_organization_id
  ON public.units(organization_id);

CREATE INDEX IF NOT EXISTS idx_user_unit_assignments_unit_id
  ON public.user_unit_assignments(unit_id);

CREATE INDEX IF NOT EXISTS idx_user_unit_assignments_academic_year_id
  ON public.user_unit_assignments(academic_year_id);

CREATE INDEX IF NOT EXISTS idx_position_histories_user_id
  ON public.position_histories(user_id);

CREATE INDEX IF NOT EXISTS idx_position_histories_unit_id
  ON public.position_histories(unit_id);

CREATE INDEX IF NOT EXISTS idx_statement_reviews_work_statement_id
  ON public.statement_reviews(work_statement_id);

CREATE INDEX IF NOT EXISTS idx_statement_reviews_reviewer_id
  ON public.statement_reviews(reviewer_id);
