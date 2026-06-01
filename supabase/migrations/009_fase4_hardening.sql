-- ============================================================
-- FASE 4 MIGRATION: Hardening, Audit, RLS Performance
-- Nurussunnah Hub
-- ============================================================

-- ============================================================
-- 1. Audit log trigger for sensitive tables
-- ============================================================
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_record_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    changed_record_id := NEW.id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES ((SELECT auth.uid()), TG_OP, TG_TABLE_NAME, changed_record_id, to_jsonb(NEW));

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    changed_record_id := NEW.id;

    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
      VALUES ((SELECT auth.uid()), TG_OP, TG_TABLE_NAME, changed_record_id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    changed_record_id := OLD.id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES ((SELECT auth.uid()), TG_OP, TG_TABLE_NAME, changed_record_id, to_jsonb(OLD));

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM anon;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM authenticated;

DROP TRIGGER IF EXISTS trg_audit_organizations ON public.organizations;
CREATE TRIGGER trg_audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_units ON public.units;
CREATE TRIGGER trg_audit_units
  AFTER INSERT OR UPDATE OR DELETE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_academic_years ON public.academic_years;
CREATE TRIGGER trg_audit_academic_years
  AFTER INSERT OR UPDATE OR DELETE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_user_unit_assignments ON public.user_unit_assignments;
CREATE TRIGGER trg_audit_user_unit_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.user_unit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_position_histories ON public.position_histories;
CREATE TRIGGER trg_audit_position_histories
  AFTER INSERT OR UPDATE OR DELETE ON public.position_histories
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_work_statements ON public.work_statements;
CREATE TRIGGER trg_audit_work_statements
  AFTER INSERT OR UPDATE OR DELETE ON public.work_statements
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_statement_reviews ON public.statement_reviews;
CREATE TRIGGER trg_audit_statement_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.statement_reviews
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_peer_feedbacks ON public.peer_feedbacks;
CREATE TRIGGER trg_audit_peer_feedbacks
  AFTER INSERT OR UPDATE OR DELETE ON public.peer_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Audit logs are written by SECURITY DEFINER RPCs/triggers, not directly by clients.
DROP POLICY IF EXISTS "audit_insert_all" ON public.audit_logs;
CREATE POLICY "audit_insert_internal_only" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

ALTER POLICY "audit_select_admin_hrd" ON public.audit_logs
  TO authenticated
  USING ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));

-- ============================================================
-- 2. Restrict exposed internal helper functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
  END IF;
END;
$$;

-- ============================================================
-- 3. RLS initplan optimization and role scoping
-- ============================================================
ALTER POLICY "org_read_all" ON public.organizations
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "org_write_admin" ON public.organizations;
CREATE POLICY "org_insert_admin" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "org_update_admin" ON public.organizations
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "org_delete_admin" ON public.organizations
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

ALTER POLICY "units_read_all" ON public.units
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "units_write_admin" ON public.units;
CREATE POLICY "units_insert_admin" ON public.units
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "units_update_admin" ON public.units
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "units_delete_admin" ON public.units
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

ALTER POLICY "profiles_select_self" ON public.profiles
  TO authenticated
  USING (id = (SELECT auth.uid()));

ALTER POLICY "profiles_select_hrd_admin" ON public.profiles
  TO authenticated
  USING ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));

ALTER POLICY "profiles_select_kepala_unit" ON public.profiles
  TO authenticated
  USING (
    (SELECT public.is_kepala_unit())
    AND home_unit_id IN (
      SELECT unit_id
      FROM public.user_unit_assignments
      WHERE user_id = (SELECT auth.uid())
        AND assignment_type = 'HOME'
    )
  );

ALTER POLICY "profiles_update_self" ON public.profiles
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

ALTER POLICY "profiles_update_admin_hrd" ON public.profiles
  TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()))
  WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

ALTER POLICY "profiles_insert_admin" ON public.profiles
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

ALTER POLICY "user_roles_select_self" ON public.user_roles
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "user_roles_select_admin_hrd" ON public.user_roles
  TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

DROP POLICY IF EXISTS "user_roles_write_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

ALTER POLICY "assignments_select_self" ON public.user_unit_assignments
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "assignments_select_admin_hrd" ON public.user_unit_assignments
  TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

DROP POLICY IF EXISTS "assignments_write_admin_hrd" ON public.user_unit_assignments;
CREATE POLICY "assignments_insert_admin_hrd" ON public.user_unit_assignments
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "assignments_update_admin_hrd" ON public.user_unit_assignments
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd())) WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "assignments_delete_admin_hrd" ON public.user_unit_assignments
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

ALTER POLICY "academic_years_read_all" ON public.academic_years
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "academic_years_write_admin_hrd" ON public.academic_years;
CREATE POLICY "academic_years_insert_admin_hrd" ON public.academic_years
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "academic_years_update_admin_hrd" ON public.academic_years
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd())) WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "academic_years_delete_admin_hrd" ON public.academic_years
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

ALTER POLICY "work_statements_self" ON public.work_statements
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "work_statements_insert_self" ON public.work_statements
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "work_statements_update_self" ON public.work_statements
  TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status IN ('DRAFT', 'REOPENED'))
  WITH CHECK (user_id = (SELECT auth.uid()) AND status IN ('DRAFT', 'REOPENED'));

ALTER POLICY "work_statements_kepala_unit_read" ON public.work_statements
  TO authenticated
  USING (
    (SELECT public.is_kepala_unit())
    AND user_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.home_unit_id IN (
        SELECT unit_id
        FROM public.user_unit_assignments
        WHERE user_id = (SELECT auth.uid())
          AND assignment_type = 'HOME'
      )
    )
  );

DROP POLICY IF EXISTS "work_statements_hrd_all" ON public.work_statements;
CREATE POLICY "work_statements_select_hrd_admin" ON public.work_statements
  FOR SELECT TO authenticated USING ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));
CREATE POLICY "work_statements_insert_hrd_admin" ON public.work_statements
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));
CREATE POLICY "work_statements_update_hrd_admin" ON public.work_statements
  FOR UPDATE TO authenticated USING ((SELECT public.is_hrd()) OR (SELECT public.is_admin())) WITH CHECK ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));
CREATE POLICY "work_statements_delete_hrd_admin" ON public.work_statements
  FOR DELETE TO authenticated USING ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));

ALTER POLICY "reviews_read_owner_reviewer" ON public.statement_reviews
  TO authenticated
  USING (
    reviewer_id = (SELECT auth.uid())
    OR (SELECT public.is_hrd())
    OR (SELECT public.is_admin())
    OR work_statement_id IN (
      SELECT id
      FROM public.work_statements
      WHERE user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "reviews_insert_reviewer" ON public.statement_reviews
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND (
      (SELECT public.is_kepala_unit())
      OR (SELECT public.is_hrd())
      OR (SELECT public.is_admin())
    )
  );

ALTER POLICY "positions_self_read" ON public.position_histories
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "positions_admin_hrd_all" ON public.position_histories;
CREATE POLICY "positions_select_admin_hrd" ON public.position_histories
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "positions_insert_admin_hrd" ON public.position_histories
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "positions_update_admin_hrd" ON public.position_histories
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd())) WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));
CREATE POLICY "positions_delete_admin_hrd" ON public.position_histories
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()) OR (SELECT public.is_hrd()));

ALTER POLICY "positions_kepala_read" ON public.position_histories
  TO authenticated
  USING (
    (SELECT public.is_kepala_unit())
    AND user_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.home_unit_id IN (
        SELECT unit_id
        FROM public.user_unit_assignments
        WHERE user_id = (SELECT auth.uid())
          AND assignment_type = 'HOME'
      )
    )
  );

ALTER POLICY "feedback_giver_select" ON public.peer_feedbacks
  TO authenticated
  USING (giver_user_id = (SELECT auth.uid()));

ALTER POLICY "feedback_hrd_select_all" ON public.peer_feedbacks
  TO authenticated
  USING ((SELECT public.is_hrd()) OR (SELECT public.is_admin()));

ALTER POLICY "feedback_insert" ON public.peer_feedbacks
  TO authenticated
  WITH CHECK (
    giver_user_id = (SELECT auth.uid())
    AND giver_user_id <> receiver_user_id
  );

ALTER POLICY "feedback_update_giver" ON public.peer_feedbacks
  TO authenticated
  USING (
    giver_user_id = (SELECT auth.uid())
    AND is_completed = false
  )
  WITH CHECK (
    giver_user_id = (SELECT auth.uid())
    AND is_completed = false
  );

-- ============================================================
-- 4. Additional indexes for common hardening/monitoring paths
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_active_home_unit
  ON public.profiles(home_unit_id, is_active, employee_status);

CREATE INDEX IF NOT EXISTS idx_user_unit_assignments_user_type_year
  ON public.user_unit_assignments(user_id, assignment_type, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_work_statements_year_status
  ON public.work_statements(academic_year_id, status);

CREATE INDEX IF NOT EXISTS idx_statement_reviews_reviewer_created
  ON public.statement_reviews(reviewer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record_created
  ON public.audit_logs(table_name, record_id, created_at DESC);
