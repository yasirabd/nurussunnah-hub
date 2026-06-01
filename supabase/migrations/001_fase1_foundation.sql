-- ============================================================
-- FASE 1 MIGRATION: Foundation Schema
-- Nurussunnah Hub — Sistem Pengelolaan Pegawai
-- ============================================================

-- ENUMS
CREATE TYPE employee_status_enum AS ENUM ('TETAP', 'TIDAK_TETAP', 'KONTRAK', 'HONORER', 'PENSIUN');
CREATE TYPE user_role_enum AS ENUM ('PEGAWAI', 'KEPALA_UNIT', 'HRD', 'ADMIN');
CREATE TYPE work_statement_status_enum AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED', 'REOPENED');
CREATE TYPE assignment_type_enum AS ENUM ('HOME', 'TEACHING');
CREATE TYPE review_action_enum AS ENUM ('REVIEWED', 'APPROVED', 'REJECTED', 'REOPENED');
CREATE TYPE gender_enum AS ENUM ('L', 'P');

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 2. UNITS
-- ============================================================
CREATE TABLE units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN DEFAULT true NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_no      TEXT NOT NULL UNIQUE,
  full_name        TEXT NOT NULL,
  gender           gender_enum NOT NULL,
  marital_status   TEXT,
  birth_place      TEXT,
  birth_date       DATE,
  last_education   TEXT,
  address_ktp      TEXT,
  address_domicile TEXT,
  phone            TEXT,
  email            TEXT NOT NULL,
  facebook         TEXT,
  twitter          TEXT,
  instagram        TEXT,
  home_unit_id     UUID REFERENCES units(id) ON DELETE SET NULL,
  employee_status  employee_status_enum DEFAULT 'TETAP' NOT NULL,
  is_active        BOOLEAN DEFAULT true NOT NULL,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT employee_no_no_spaces CHECK (employee_no NOT LIKE '% %')
);

-- ============================================================
-- 4. USER_ROLES (multi-role support)
-- ============================================================
CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role_enum NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- ============================================================
-- 5. ACADEMIC_YEARS
-- ============================================================
CREATE TABLE academic_years (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,  -- e.g., '2025/2026'
  start_date DATE NOT NULL,         -- 1 July
  end_date   DATE NOT NULL,         -- 30 June next year
  is_active  BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT valid_academic_year CHECK (end_date > start_date)
);

-- ============================================================
-- 6. USER_UNIT_ASSIGNMENTS (multi-unit, one HOME per year)
-- ============================================================
CREATE TABLE user_unit_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id          UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  assignment_type  assignment_type_enum NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, unit_id, assignment_type, academic_year_id)
);

-- ============================================================
-- 7. POSITION_HISTORIES
-- ============================================================
CREATE TABLE position_histories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_name TEXT NOT NULL,
  unit_id       UUID REFERENCES units(id) ON DELETE SET NULL,
  start_date    DATE NOT NULL,
  end_date      DATE,
  is_current    BOOLEAN DEFAULT false NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 8. WORK_STATEMENTS
-- ============================================================
CREATE TABLE work_statements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  status           work_statement_status_enum DEFAULT 'DRAFT' NOT NULL,
  content          JSONB DEFAULT '{}'::jsonb NOT NULL,
  signature_data   TEXT,
  signed_at        TIMESTAMPTZ,
  pdf_url          TEXT,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, academic_year_id)
);

-- ============================================================
-- 9. STATEMENT_REVIEWS
-- ============================================================
CREATE TABLE statement_reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_statement_id  UUID NOT NULL REFERENCES work_statements(id) ON DELETE CASCADE,
  reviewer_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action             review_action_enum NOT NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 10. PEER_FEEDBACKS
-- ============================================================
CREATE TABLE peer_feedbacks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  giver_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text    TEXT,
  is_completed     BOOLEAN DEFAULT false NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (academic_year_id, giver_user_id, receiver_user_id),
  CONSTRAINT no_self_feedback CHECK (giver_user_id <> receiver_user_id)
);

-- ============================================================
-- 11. AUDIT_LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_employee_no ON profiles(employee_no);
CREATE INDEX idx_profiles_home_unit_id ON profiles(home_unit_id);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_unit_assignments_user_id ON user_unit_assignments(user_id);
CREATE INDEX idx_work_statements_user_id ON work_statements(user_id);
CREATE INDEX idx_work_statements_academic_year_id ON work_statements(academic_year_id);
CREATE INDEX idx_work_statements_status ON work_statements(status);
CREATE INDEX idx_peer_feedbacks_giver ON peer_feedbacks(giver_user_id);
CREATE INDEX idx_peer_feedbacks_receiver ON peer_feedbacks(receiver_user_id);
CREATE INDEX idx_peer_feedbacks_academic_year ON peer_feedbacks(academic_year_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_statements_updated_at
  BEFORE UPDATE ON work_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_peer_feedbacks_updated_at
  BEFORE UPDATE ON peer_feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON NEW USER (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if metadata exists (batch import will handle this)
  IF NEW.raw_user_meta_data->>'employee_no' IS NOT NULL THEN
    INSERT INTO profiles (id, employee_no, full_name, gender, email)
    VALUES (
      NEW.id,
      regexp_replace(NEW.raw_user_meta_data->>'employee_no', '\s+', '', 'g'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      (COALESCE(NEW.raw_user_meta_data->>'gender', 'L'))::gender_enum,
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_roles()
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(role::TEXT)
  FROM user_roles
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_hrd()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'HRD'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_kepala_unit()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'KEPALA_UNIT'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- SEED DATA: Organization & Units
-- ============================================================
INSERT INTO organizations (id, name, description)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Yayasan Islam Nurus Sunnah',
  'Yayasan induk pengelola pendidikan Islam Nurus Sunnah'
);

INSERT INTO units (organization_id, name, code) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Yayasan',          'YAYASAN'),
  ('a0000000-0000-0000-0000-000000000001', 'TK Nurus Sunnah',  'TK'),
  ('a0000000-0000-0000-0000-000000000001', 'SD Nurus Sunnah',  'SD'),
  ('a0000000-0000-0000-0000-000000000001', 'SMP Nurus Sunnah', 'SMP'),
  ('a0000000-0000-0000-0000-000000000001', 'MA Nurus Sunnah',  'MA'),
  ('a0000000-0000-0000-0000-000000000001', 'SMA Nurus Sunnah', 'SMA');

-- Seed active academic year 2025/2026
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES ('2025/2026', '2025-07-01', '2026-06-30', true);
