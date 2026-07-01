-- ============================================================
-- MIGRATION 027: Drop unused intake date columns
-- proposed_start_date & start_date_note hanya untuk konfirmasi
-- kesiapan bekerja, tidak perlu disimpan sebagai data pegawai.
-- ============================================================

alter table public.employee_intake
  drop column if exists proposed_start_date,
  drop column if exists start_date_note;
