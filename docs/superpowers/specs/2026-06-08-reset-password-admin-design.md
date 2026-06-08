# Reset Password ke Default (Admin Only) — Design Spec

**Date:** 2026-06-08
**Feature:** Admin dapat me-reset password pegawai ke default `bismillahns` dari halaman Direktori Pegawai.

## Problem
Tidak ada mekanisme untuk admin mereset password pegawai yang lupa atau bermasalah. Reset harus dilakukan langsung di Supabase dashboard.

## Solution
Tambah tombol reset password di kolom Aksi pada tabel Direktori Pegawai. Hanya Admin yang bisa melakukan aksi ini.

## Detail Implementation

### 1. Server Action: `resetPasswordAction`
File: `src/app/dashboard/employees/actions.ts`

- Validasi caller ADMIN (bukan HRD, bukan KEPALA_UNIT)
- Panggil `createAdminClient().auth.admin.updateUserById(userId, { password: DEFAULT_EMPLOYEE_PASSWORD })`
- Update `profiles` set `must_change_password = true`
- Redirect ke `/dashboard/employees?success=Password+...+berhasil+di-reset`

### 2. UI Component: `ResetPasswordDialog`
File: `src/app/dashboard/employees/employee-directory-table.tsx`

- AlertDialog trigger di kolom Aksi, pakai ikon KeyRound atau Lock dari lucide-react
- Hanya tampil jika `canResetPassword` (ADMIN) true
- Dialog konfirmasi: "Reset password [full_name] ke default?"
- Submit server action via form hidden input

### 3. Prop baru: `canResetPassword`
File: `src/app/dashboard/employees/page.tsx`

- Dilempar ke EmployeeDirectoryTable: canResetPassword={context.isAdmin}
- Ditambahkan ke EmployeeDirectoryTableProps

### 4. Security
- Server action cek role ADMIN. Kalau bukan redirect /dashboard
- Password default bismillahns sudah ada sebagai konstanta DEFAULT_EMPLOYEE_PASSWORD
- Gunakan Admin API (service_role key) untuk update password auth user
- Set must_change_password=true employee diminta ganti password saat login

## Files Changed
1. src/app/dashboard/employees/actions.ts tambah resetPasswordAction
2. src/app/dashboard/employees/employee-directory-table.tsx tambah ResetPasswordDialog + prop
3. src/app/dashboard/employees/page.tsx pass canResetPassword prop

## Not Changed
- Tidak perlu rubah routing, schema DB, atau lib files
