-- ============================================================
-- 039: Seragamkan nilai pendidikan terakhir
-- ============================================================
-- Aplikasi kini memakai satu daftar (src/lib/education.mjs):
--   SD/Sederajat, SMP/Sederajat, SMA/SMK/Sederajat, D1/D2/D3, D4/S1, S2, S3
-- Data lawas masih memakai nilai lama sehingga dropdown tampil kosong saat
-- pegawai mengedit profil. Migrasi ini memetakan nilai lama ke nilai baru.

UPDATE public.profiles
SET last_education = CASE last_education
  WHEN 'SMA/Sederajat' THEN 'SMA/SMK/Sederajat'
  WHEN 'SMK/Sederajat' THEN 'SMA/SMK/Sederajat'
  WHEN 'D1' THEN 'D1/D2/D3'
  WHEN 'D2' THEN 'D1/D2/D3'
  WHEN 'D3' THEN 'D1/D2/D3'
  WHEN 'D4' THEN 'D4/S1'
  WHEN 'S1' THEN 'D4/S1'
END
WHERE last_education IN ('SMA/Sederajat', 'SMK/Sederajat', 'D1', 'D2', 'D3', 'D4', 'S1');

UPDATE public.employee_registrations
SET last_education = CASE last_education
  WHEN 'SMA/Sederajat' THEN 'SMA/SMK/Sederajat'
  WHEN 'SMK/Sederajat' THEN 'SMA/SMK/Sederajat'
  WHEN 'D1' THEN 'D1/D2/D3'
  WHEN 'D2' THEN 'D1/D2/D3'
  WHEN 'D3' THEN 'D1/D2/D3'
  WHEN 'D4' THEN 'D4/S1'
  WHEN 'S1' THEN 'D4/S1'
END
WHERE last_education IN ('SMA/Sederajat', 'SMK/Sederajat', 'D1', 'D2', 'D3', 'D4', 'S1');
