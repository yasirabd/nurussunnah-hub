-- ============================================================
-- MIGRATION 037: Simpan folder Drive sementara pendaftaran
--   Dokumen diupload ke GOOGLE_DRIVE_TEMP saat submit; folder-nya
--   dipindahkan ke folder dokumen pegawai saat validasi.
-- ============================================================

alter table public.employee_registrations
  add column if not exists drive_folder_id text;
