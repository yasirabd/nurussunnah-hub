-- ============================================================
-- FASE 1 MIGRATION: Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years      ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_statements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_histories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_feedbacks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS: Public read, Admin write
-- ============================================================
CREATE POLICY "org_read_all" ON organizations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_write_admin" ON organizations
  FOR ALL USING (is_admin());

-- ============================================================
-- UNITS: Public read (authenticated), Admin write
-- ============================================================
CREATE POLICY "units_read_all" ON units
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "units_write_admin" ON units
  FOR ALL USING (is_admin());

-- ============================================================
-- PROFILES
-- ============================================================
-- Pegawai bisa baca profil diri sendiri
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (id = auth.uid());

-- HRD & Admin bisa baca semua profil
CREATE POLICY "profiles_select_hrd_admin" ON profiles
  FOR SELECT USING (is_hrd() OR is_admin());

-- Kepala Unit bisa baca profil pegawai di unitnya
CREATE POLICY "profiles_select_kepala_unit" ON profiles
  FOR SELECT USING (
    is_kepala_unit() AND
    home_unit_id IN (
      SELECT unit_id FROM user_unit_assignments
      WHERE user_id = auth.uid() AND assignment_type = 'HOME'
    )
  );

-- Pegawai bisa update field personal diri sendiri (non-admin fields)
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin & HRD bisa update semua
CREATE POLICY "profiles_update_admin_hrd" ON profiles
  FOR UPDATE USING (is_admin() OR is_hrd());

-- Admin bisa insert (batch import)
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin() OR is_hrd());

-- ============================================================
-- USER_ROLES
-- ============================================================
CREATE POLICY "user_roles_select_self" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin_hrd" ON user_roles
  FOR SELECT USING (is_admin() OR is_hrd());

CREATE POLICY "user_roles_write_admin" ON user_roles
  FOR ALL USING (is_admin());

-- ============================================================
-- USER_UNIT_ASSIGNMENTS
-- ============================================================
CREATE POLICY "assignments_select_self" ON user_unit_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "assignments_select_admin_hrd" ON user_unit_assignments
  FOR SELECT USING (is_admin() OR is_hrd());

CREATE POLICY "assignments_write_admin_hrd" ON user_unit_assignments
  FOR ALL USING (is_admin() OR is_hrd());

-- ============================================================
-- ACADEMIC_YEARS: All read, Admin/HRD write
-- ============================================================
CREATE POLICY "academic_years_read_all" ON academic_years
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "academic_years_write_admin_hrd" ON academic_years
  FOR ALL USING (is_admin() OR is_hrd());

-- ============================================================
-- WORK_STATEMENTS
-- ============================================================
-- Pegawai: baca + tulis milik sendiri
CREATE POLICY "work_statements_self" ON work_statements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "work_statements_insert_self" ON work_statements
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "work_statements_update_self" ON work_statements
  FOR UPDATE USING (
    user_id = auth.uid() AND status IN ('DRAFT', 'REOPENED')
  );

-- Kepala Unit: baca surat pegawai di unitnya
CREATE POLICY "work_statements_kepala_unit_read" ON work_statements
  FOR SELECT USING (
    is_kepala_unit() AND
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.home_unit_id IN (
        SELECT unit_id FROM user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME'
      )
    )
  );

-- HRD: baca semua + update status
CREATE POLICY "work_statements_hrd_all" ON work_statements
  FOR ALL USING (is_hrd() OR is_admin());

-- ============================================================
-- STATEMENT_REVIEWS
-- ============================================================
CREATE POLICY "reviews_read_owner_reviewer" ON statement_reviews
  FOR SELECT USING (
    reviewer_id = auth.uid()
    OR is_hrd()
    OR is_admin()
    OR work_statement_id IN (
      SELECT id FROM work_statements WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "reviews_insert_reviewer" ON statement_reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND (is_kepala_unit() OR is_hrd() OR is_admin())
  );

-- ============================================================
-- POSITION_HISTORIES
-- ============================================================
CREATE POLICY "positions_self_read" ON position_histories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "positions_admin_hrd_all" ON position_histories
  FOR ALL USING (is_admin() OR is_hrd());

CREATE POLICY "positions_kepala_read" ON position_histories
  FOR SELECT USING (
    is_kepala_unit() AND
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.home_unit_id IN (
        SELECT unit_id FROM user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME'
      )
    )
  );

-- ============================================================
-- PEER_FEEDBACKS
-- Aturan: Penerima tidak melihat identitas pemberi, HRD bisa lihat semua
-- ============================================================

-- Pemberi bisa baca feedback yang dia buat
CREATE POLICY "feedback_giver_select" ON peer_feedbacks
  FOR SELECT USING (giver_user_id = auth.uid());

-- Penerima bisa baca feedback untuknya TAPI tanpa giver info
-- (di query level, SELECT hanya kolom non-identitas)
CREATE POLICY "feedback_receiver_select" ON peer_feedbacks
  FOR SELECT USING (receiver_user_id = auth.uid());

-- HRD bisa lihat semua (termasuk identitas pemberi)
CREATE POLICY "feedback_hrd_select_all" ON peer_feedbacks
  FOR SELECT USING (is_hrd() OR is_admin());

-- Pemberi bisa insert feedback untuk orang lain
CREATE POLICY "feedback_insert" ON peer_feedbacks
  FOR INSERT WITH CHECK (
    giver_user_id = auth.uid()
    AND giver_user_id <> receiver_user_id
  );

-- Pemberi bisa update feedbacknya selama belum completed
CREATE POLICY "feedback_update_giver" ON peer_feedbacks
  FOR UPDATE USING (
    giver_user_id = auth.uid() AND is_completed = false
  );

-- ============================================================
-- AUDIT_LOGS: Insert all, Select HRD/Admin only
-- ============================================================
CREATE POLICY "audit_insert_all" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "audit_select_admin_hrd" ON audit_logs
  FOR SELECT USING (is_hrd() OR is_admin());
