# Bulk Import Pegawai — Design Spec

**Date**: 2026-06-06
**Status**: Draft
**Author**: Codex

## 1. Tujuan

Menyediakan fitur import massal data pegawai dari file Excel `.xlsx` untuk kebutuhan satu-kali migrasi data (482 pegawai) oleh Super Admin.

## 2. Audience & Akses

- **Akses**: hanya user dengan role `ADMIN` atau `HRD`
- **Entry point**: tombol "Import Massal" di halaman `/dashboard/employees` (sejajar dengan "Tambah Pegawai")

## 3. Alur User (3-Step Wizard)

### Step 1 — Upload
- Dropzone / file picker untuk file `.xlsx`
- Validasi: format file, max 5MB
- Setelah file dipilih → parse client-side (tampilkan preview)
- Button "Lanjutkan"

### Step 2 — Preview
- Tabel read-only dengan kolom preview
- Highlight baris per status: ✅ valid, ⚠️ peringatan, ❌ skip
- Summary card: Total baris | Akan di-import | Akan di-skip
- Informasi kegagalan tiap baris (contoh: "Unit 'KB-TK' tidak ditemukan")
- Button "Kembali" & "Lanjutkan ke Import"

### Step 3 — Konfirmasi & Hasil
- Konfirmasi final: "Import N pegawai?" + button "Import" & "Batal"
- Loading state dengan progress
- Redirect ke `/dashboard/employees` + query param `?bulk_result=...`
- Session flash message: "Berhasil mengimport X pegawai. Y dilewati."

## 4. Mapping Kolom Excel → Database

| Excel Column | DB Field | Transformasi |
|---|---|---|
| NAMA | `profiles.full_name` | trim |
| NIY | `profiles.employee_no` | uppercase, no spaces, fallback generate jika kosong |
| STATUS AKTIF | `profiles.active_status` | "Aktif" → `AKTIF`, "Nonaktif" → `NONAKTIF`, default `AKTIF` |
| JENIS KELAMIN | `profiles.gender` | "Laki-Laki" → `L`, "Perempuan" → `P` |
| STATUS PERKAWINAN | `profiles.marital_status` | |
| TEMPAT LAHIR | `profiles.birth_place` | |
| TANGGAL LAHIR | `profiles.birth_date` | parse date string |
| IJAZAH TERAKHIR | `profiles.last_education` | |
| ALAMAT KTP | `profiles.address_ktp` | |
| ALAMAT DOMISILI | `profiles.address_domicile` | fallback ke ALAMAT KTP jika kosong |
| HANDPHONE | `profiles.phone` | |
| EMAIL | `profiles.email` | lowercase |
| FACEBOOK | `profiles.facebook` | |
| TWITTER | `profiles.twitter` | |
| INSTAGRAM | `profiles.instagram` | |
| STATUS KEPEGAWAIAN | `profiles.employee_status` | mapping: PTY→`TETAP`, Honorer→`HONORER`, dll. Default `TETAP` |
| UNIT | `profiles.home_unit_id` | lookup by `units.name` insensitif |

**JABATAN**: diabaikan (per agreement).

## 5. Aturan Bisnis

1. **Skip jika**: NIY kosong ATAU unit tidak match dengan tabel `units` ATAU email sudah terdaftar
2. **Email fallback**: jika kolom EMAIL kosong, generate dari `employee_no@ns-school.sch.id`
3. **Role default**: semua pegawai import mendapat role `PEGAWAI`
4. **Password**: `bismillahns`, `must_change_password: true`
5. **Auth**: create via admin client dengan `email_confirm: true`
6. **Home assignment**: buat `user_unit_assignments` dengan HOME di unit yang cocok, untuk active academic year
7. **Employee leaves**: tidak dihandle di import awal ini

## 6. Arsitektur Teknis

### Rute
- `src/app/dashboard/employees/import/page.tsx` — halaman wizard
- Server action: `importBulkEmployeesAction(formData)` di `src/app/dashboard/employees/actions.ts`

### Komponen
- `ImportWizardClient.tsx` — client component untuk wizard state, upload, preview, confirm
- `ImportPreviewTable.tsx` — tabel pratinjau data

### Library
- `xlsx` (SheetJS) — parse Excel di server-side (akan diinstall via npm)
- `@/lib/supabase/admin` — admin auth client
- `@/lib/supabase/server` — server client untuk DB queries

### Processing Logic (di Server Action)
```
for each row:
  if invalid (no NIY, no unit match, email exists) → record skip, continue
  create auth user (admin auth admin.createUser)
  insert profile row
  insert user_role PEGAWAI
  sync home assignment (user_unit_assignments + active year)
  increment success counter
return { total, success, skipped }
```

### Security
- Guard role: ADMIN/HRD di page & action
- Validasi server-side: file type, ukuran, format
- Skip baris tidak valid, jangan rollback baris lain
- Batas: max 5MB file

## 7. Daftar File yang Dibuat/Diubah

| File | Action |
|---|---|
| `src/app/dashboard/employees/import/page.tsx` | Create — server component shell |
| `src/app/dashboard/employees/_components/import-wizard-client.tsx` | Create — client wizard component |
| `src/app/dashboard/employees/_components/import-preview-table.tsx` | Create — preview table |
| `src/app/dashboard/employees/actions.ts` | Modify — tambah server action `importBulkEmployeesAction` |
| `src/app/dashboard/employees/page.tsx` | Modify — tambah tombol "Import Massal" |
| `package.json` | Modify — tambah dep `xlsx` |
