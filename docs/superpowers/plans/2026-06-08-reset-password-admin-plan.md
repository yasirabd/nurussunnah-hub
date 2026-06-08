# Reset Password Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah fitur reset password ke default `bismillahns` untuk pegawai, hanya oleh Admin, dari halaman Direktori Pegawai.

**Architecture:** Server action di actions.ts memanggil Supabase Admin API untuk update password auth user + set must_change_password=true. UI pakai AlertDialog konsisten dengan DeactivateDialog yang sudah ada.

**Tech Stack:** Next.js, Supabase Admin API, shadcn/ui AlertDialog, lucide-react

---

### Task 1: Tambah `resetPasswordAction` di actions.ts

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Tambah server action `resetPasswordAction`**
  - Export async function `resetPasswordAction(formData: FormData)`
  - Validasi caller punya role ADMIN via supabase client
  - Baca `userId` dari formData
  - Panggil `createAdminClient().auth.admin.updateUserById(userId, { password: DEFAULT_EMPLOYEE_PASSWORD })`
  - Update `profiles` set `must_change_password = true`
  - Redirect ke `/dashboard/employees?success=...`

### Task 2: Tambah `ResetPasswordDialog` di employee-directory-table.tsx

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Tambah component `ResetPasswordDialog`**
  - Import `KeyRound` dari lucide-react
  - Import `resetPasswordAction` dari ./actions
  - Buat komponen dialog dengan AlertDialog pattern (sama seperti DeactivateDialog)
  - Trigger: Button variant ghost dengan ikon KeyRound
  - Form di dalam AlertDialogContent: hidden input name="id"
  - Hanya muncul di kolom Aksi jika prop `canResetPassword` true

- [ ] **Step 2: Update `EmployeeDirectoryTableProps` dan rendering**
  - Tambah `canResetPassword: boolean` ke props
  - Render `ResetPasswordDialog` di kolom Aksi jika `canResetPassword`

### Task 3: Pass `canResetPassword` dari page.tsx

**Files:**
- Modify: `src/app/dashboard/employees/page.tsx`

- [ ] **Step 1: Pass prop `canResetPassword={context.isAdmin}`**
  - Tambah `canResetPassword={context.isAdmin}` ke `EmployeeDirectoryTable`

### Task 4: Build & verify

- [ ] **Step 1: Build check**
  - Run `npm run build` untuk verifikasi tidak ada error
