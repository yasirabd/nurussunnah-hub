-- ============================================================
-- FASE 2 MIGRATION: Work Statement Workflow RPC
-- Nurussunnah Hub - Surat Pernyataan Kerja
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_review_work_statement(statement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM work_statements ws
    JOIN profiles employee ON employee.id = ws.user_id
    WHERE ws.id = statement_id
      AND (
        public.is_hrd()
        OR public.is_admin()
        OR (
          public.is_kepala_unit()
          AND COALESCE(employee.home_unit_id, '00000000-0000-0000-0000-000000000000'::UUID) IN (
            SELECT uua.unit_id
            FROM user_unit_assignments uua
            WHERE uua.user_id = auth.uid()
              AND uua.assignment_type = 'HOME'
              AND (
                uua.academic_year_id = ws.academic_year_id
                OR uua.academic_year_id IS NULL
              )
          )
          AND NOT EXISTS (
            SELECT 1
            FROM units unit_scope
            WHERE unit_scope.id = employee.home_unit_id
              AND unit_scope.code = 'YAYASAN'
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.submit_work_statement(
  p_academic_year_id UUID,
  p_content JSONB,
  p_signature_data TEXT
)
RETURNS work_statements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_statement work_statements;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(TRIM(p_signature_data), '') IS NULL THEN
    RAISE EXCEPTION 'Digital signature is required';
  END IF;

  SELECT * INTO current_statement
  FROM work_statements
  WHERE user_id = auth.uid()
    AND academic_year_id = p_academic_year_id
  FOR UPDATE;

  IF current_statement.id IS NULL THEN
    INSERT INTO work_statements (
      user_id,
      academic_year_id,
      status,
      content,
      signature_data,
      signed_at,
      submitted_at
    )
    VALUES (
      auth.uid(),
      p_academic_year_id,
      'SUBMITTED',
      COALESCE(p_content, '{}'::JSONB),
      p_signature_data,
      now(),
      now()
    )
    RETURNING * INTO current_statement;
  ELSE
    IF current_statement.status NOT IN ('DRAFT', 'REOPENED', 'REJECTED') THEN
      RAISE EXCEPTION 'Only draft, reopened, or rejected statements can be submitted';
    END IF;

    UPDATE work_statements
    SET status = 'SUBMITTED',
        content = COALESCE(p_content, '{}'::JSONB),
        signature_data = p_signature_data,
        signed_at = now(),
        submitted_at = now(),
        updated_at = now()
    WHERE id = current_statement.id
    RETURNING * INTO current_statement;
  END IF;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'SUBMIT_WORK_STATEMENT', 'work_statements', current_statement.id, to_jsonb(current_statement));

  RETURN current_statement;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_work_statement_draft(
  p_academic_year_id UUID,
  p_content JSONB,
  p_signature_data TEXT DEFAULT NULL
)
RETURNS work_statements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_statement work_statements;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO current_statement
  FROM work_statements
  WHERE user_id = auth.uid()
    AND academic_year_id = p_academic_year_id
  FOR UPDATE;

  IF current_statement.id IS NULL THEN
    INSERT INTO work_statements (user_id, academic_year_id, status, content, signature_data)
    VALUES (auth.uid(), p_academic_year_id, 'DRAFT', COALESCE(p_content, '{}'::JSONB), p_signature_data)
    RETURNING * INTO current_statement;
  ELSE
    IF current_statement.status NOT IN ('DRAFT', 'REOPENED', 'REJECTED') THEN
      RAISE EXCEPTION 'Only draft, reopened, or rejected statements can be edited';
    END IF;

    UPDATE work_statements
    SET content = COALESCE(p_content, '{}'::JSONB),
        signature_data = p_signature_data,
        updated_at = now()
    WHERE id = current_statement.id
    RETURNING * INTO current_statement;
  END IF;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'SAVE_WORK_STATEMENT_DRAFT', 'work_statements', current_statement.id, to_jsonb(current_statement));

  RETURN current_statement;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_work_statement(
  p_work_statement_id UUID,
  p_action review_action_enum,
  p_notes TEXT DEFAULT NULL
)
RETURNS work_statements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_statement work_statements;
  next_status work_statement_status_enum;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO current_statement
  FROM work_statements
  WHERE id = p_work_statement_id
  FOR UPDATE;

  IF current_statement.id IS NULL THEN
    RAISE EXCEPTION 'Work statement not found';
  END IF;

  IF NOT public.can_review_work_statement(p_work_statement_id) THEN
    RAISE EXCEPTION 'You are not allowed to review this statement';
  END IF;

  IF p_action = 'REVIEWED' THEN
    IF current_statement.status <> 'SUBMITTED' THEN
      RAISE EXCEPTION 'Only submitted statements can be marked reviewed';
    END IF;
    next_status := 'REVIEWED';
  ELSIF p_action = 'APPROVED' THEN
    IF current_statement.status NOT IN ('SUBMITTED', 'REVIEWED') THEN
      RAISE EXCEPTION 'Only submitted or reviewed statements can be approved';
    END IF;
    next_status := 'APPROVED';
  ELSIF p_action = 'REJECTED' THEN
    IF current_statement.status NOT IN ('SUBMITTED', 'REVIEWED') THEN
      RAISE EXCEPTION 'Only submitted or reviewed statements can be rejected';
    END IF;
    next_status := 'REJECTED';
  ELSIF p_action = 'REOPENED' THEN
    IF current_statement.status NOT IN ('APPROVED', 'REJECTED') THEN
      RAISE EXCEPTION 'Only approved or rejected statements can be reopened';
    END IF;
    next_status := 'REOPENED';
  ELSE
    RAISE EXCEPTION 'Unsupported review action';
  END IF;

  INSERT INTO statement_reviews (work_statement_id, reviewer_id, action, notes)
  VALUES (p_work_statement_id, auth.uid(), p_action, NULLIF(TRIM(COALESCE(p_notes, '')), ''));

  UPDATE work_statements
  SET status = next_status,
      updated_at = now()
  WHERE id = p_work_statement_id
  RETURNING * INTO current_statement;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'REVIEW_WORK_STATEMENT_' || p_action::TEXT, 'work_statements', current_statement.id, to_jsonb(current_statement));

  RETURN current_statement;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_review_work_statement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_work_statement(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_work_statement_draft(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_work_statement(UUID, review_action_enum, TEXT) TO authenticated;
