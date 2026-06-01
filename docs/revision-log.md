# Revision Log - Nurussunnah Hub

---

## 19 Mei 2026 - Eksekusi Fase 4

**Status:** SELESAI, sudah dieksekusi di repo lokal dan Supabase live.

Fase 4 dari `docs/prd.md` dieksekusi untuk hardening, audit logs, optimasi RLS, dan validasi deployment. Fokus fase ini adalah memperkuat auditability dan performa security policy tanpa mengubah alur UI yang sudah selesai pada fase sebelumnya.

### Hasil Eksekusi

| Area | Status | Catatan |
|------|--------|---------|
| Audit logs otomatis | Selesai | Trigger audit aktif untuk 10 tabel inti selain `audit_logs` |
| Proteksi audit logs | Selesai | Direct insert client ditutup; audit ditulis lewat trigger/RPC security definer |
| RLS performance | Selesai | Policy utama memakai `(SELECT auth.uid())`, `(SELECT auth.role())`, dan `(SELECT public.is_*)` |
| Role scoping | Selesai | Policy aplikasi dipersempit ke role `authenticated` |
| Policy write split | Selesai | Beberapa policy `FOR ALL` dipecah agar tidak ikut menambah policy SELECT |
| Internal functions | Selesai | Execute fungsi trigger/internal dicabut dari `PUBLIC`; `rls_auto_enable()` dicabut bila tersedia |
| Index hardening | Selesai | Index tambahan untuk monitoring, workflow, assignment, dan audit |
| Dokumentasi | Selesai | `docs/FASE4_SUMMARY.md` dibuat |

### Migration Supabase Live Tambahan

- `20260519011223_fase4_hardening`

### File Lokal Utama

- `supabase/migrations/009_fase4_hardening.sql`
- `docs/FASE4_SUMMARY.md`
- `docs/revision-log.md`

### Validasi

- `npm.cmd run lint` lulus dengan 8 warning lama di script/util yang tidak disentuh.
- `npx.cmd tsc --noEmit --incremental false` lulus.
- `npm.cmd run build` berhasil dan menghasilkan `.next/BUILD_ID`.
- Supabase migration `fase4_hardening` tercatat di live.
- Trigger audit `trg_audit_*` aktif untuk tabel inti.
- Supabase performance advisor tidak lagi menampilkan warning `auth_rls_initplan`.

### Catatan

Security advisor masih menampilkan warning `authenticated_security_definer_function_executable` untuk RPC workflow yang memang dipanggil user login, serta `auth_leaked_password_protection` yang perlu diaktifkan dari Supabase Auth dashboard. Performance advisor masih menampilkan beberapa `unused_index` dan `multiple_permissive_policies`; unused index tidak dihapus karena workload produksi belum cukup untuk menyimpulkan index tersebut benar-benar tidak dibutuhkan.

---

## 18 Mei 2026 - Eksekusi Fase 3

**Status:** SELESAI, sudah dieksekusi di repo lokal dan Supabase live.

Fase 3 dari `docs/prd.md` dieksekusi untuk modul Feedback Wajib. Modul feedback yang sebelumnya placeholder kini aktif dengan generator target, form feedback, progress tracker, tampilan anonim untuk penerima, dan monitoring HRD/Admin.

### Hasil Eksekusi

| Area | Status | Catatan |
|------|--------|---------|
| Generator target | Selesai | RPC `get_feedback_targets` menghasilkan rekan aktif dalam cakupan unit relevan |
| Submit feedback | Selesai | RPC `submit_peer_feedback` validasi target, rating, self-feedback, unique pair, dan audit log |
| Privasi penerima | Selesai | Policy receiver raw select dihapus; penerima memakai RPC anonim |
| Identitas untuk HRD | Selesai | RPC `get_feedback_identified` untuk HRD/Admin |
| Progress monitoring | Selesai | RPC `get_feedback_monitoring` dan UI monitoring HRD/Admin |
| UI Feedback | Selesai | Route `/dashboard/feedback` aktif |
| Dokumentasi | Selesai | `docs/FASE3_SUMMARY.md` dibuat |

### Migration Supabase Live Tambahan

- `20260517230731_fase3_feedback_workflow`
- `20260517231156_fase3_revoke_anon_feedback_rpc`

### File Lokal Utama

- `supabase/migrations/007_fase3_feedback_workflow.sql`
- `supabase/migrations/008_fase3_revoke_anon_feedback_rpc.sql`
- `src/app/dashboard/feedback/page.tsx`
- `src/app/dashboard/feedback/actions.ts`
- `src/types/database.ts`
- `docs/FASE3_SUMMARY.md`

### Validasi

- `npx.cmd tsc --noEmit` lulus.
- `npm.cmd run lint` lulus dengan warning lama di script/util yang tidak disentuh.
- `npm.cmd run build` menghasilkan `.next/BUILD_ID`.
- Route lokal `http://localhost:3000/dashboard/feedback` merespons 200.
- Supabase security advisor tidak lagi menampilkan warning anon untuk RPC feedback; warning tersisa adalah RPC `SECURITY DEFINER` yang memang dipanggil role `authenticated` dan `auth_leaked_password_protection`.

### Row Count Supabase Live

| Tabel | Rows |
|-------|------|
| `peer_feedbacks` | 0 |
| `audit_logs` | 0 |

### Catatan

Reminder otomatis belum dibuat. Monitoring Kepala Unit khusus unitnya juga belum dipisahkan; monitoring penuh saat ini tersedia untuk HRD/Admin.

---

## 18 Mei 2026 - Eksekusi Fase 2

**Status:** SELESAI, sudah dieksekusi di repo lokal dan Supabase live.

Fase 2 dari `docs/prd.md` dieksekusi untuk modul Surat Pernyataan Kerja dan Review. Catatan sebelumnya yang menyebut modul surat diabaikan di repo ini diperbarui: mulai revisi ini modul surat aktif kembali di repo ini.

### Hasil Eksekusi

| Area | Status | Catatan |
|------|--------|---------|
| Database workflow | Selesai | RPC draft, submit, review, approve, reject, reopen diterapkan di Supabase live |
| Security grant | Selesai | Execute grant untuk `anon` dan `PUBLIC` dicabut dari RPC sensitif |
| UI Surat | Selesai | Route `/dashboard/work-statements` aktif |
| Review panel | Selesai | Kepala Unit/HRD/Admin mendapat antrian review sesuai RLS dan RPC |
| Digital signature | Selesai awal | Typed signature + `signed_at` |
| PDF | Selesai awal | Route print/PDF untuk surat approved via browser print |
| Performance index | Selesai | FK index untuk `statement_reviews`, `user_unit_assignments`, `position_histories`, dan `units` |
| Dokumentasi | Selesai | `docs/FASE2_SUMMARY.md` dibuat |

### Migration Supabase Live Tambahan

- `20260517223957_fase2_work_statement_workflow`
- `20260517224559_fase2_revoke_anon_rpc_execute`
- `20260517224649_fase2_revoke_public_rpc_execute`
- `20260517224918_fase2_foreign_key_indexes`

### File Lokal Utama

- `supabase/migrations/003_fase2_work_statement_workflow.sql`
- `supabase/migrations/004_fase2_revoke_anon_rpc_execute.sql`
- `supabase/migrations/005_fase2_revoke_public_rpc_execute.sql`
- `supabase/migrations/006_fase2_foreign_key_indexes.sql`
- `src/app/dashboard/work-statements/page.tsx`
- `src/app/dashboard/work-statements/actions.ts`
- `src/app/dashboard/work-statements/[id]/print/page.tsx`
- `src/components/work-statements/print-button.tsx`
- `docs/FASE2_SUMMARY.md`

### Validasi

- `npm.cmd run lint` lulus dengan warning lama di script/util yang tidak disentuh.
- `npx.cmd tsc --noEmit` lulus.
- `npm.cmd run build` menghasilkan `.next/BUILD_ID`.
- Supabase security advisor tidak lagi menampilkan warning `anon_security_definer_function_executable` setelah revoke dari `PUBLIC`; warning yang tersisa adalah `authenticated_security_definer_function_executable` untuk RPC yang memang dipanggil user login dan `auth_leaked_password_protection`.
- Supabase performance advisor tidak lagi menampilkan FK tanpa index setelah migration index; warning RLS initplan dan multiple permissive policies masih menjadi scope hardening lanjutan.

### Catatan

PDF final saat ini memakai browser print/simpan PDF dan belum otomatis upload ke Supabase Storage, sehingga `work_statements.pdf_url` belum diisi oleh aplikasi.

---

## 17 Mei 2026 - Verifikasi Fase 1

**Status:** SELESAI, sudah dieksekusi di Supabase live.

Verifikasi dilakukan terhadap `docs/FASE1_SUMMARY.md`, Supabase project `nqepqnjgcovahpcqtdjg`, dan kondisi aplikasi lokal.

### Hasil Verifikasi

| Area | Status | Catatan |
|------|--------|---------|
| Database schema | Selesai | 11 tabel Fase 1 tersedia di Supabase live |
| RLS | Selesai | Migration `fase1_rls` sudah tercatat di Supabase |
| Security hardening | Selesai | Migration `fase1_security_hardening` sudah tercatat di Supabase live |
| Seed dummy pegawai | Selesai | 12 profiles, 17 roles, 13 unit assignments, 12 position histories |
| Aplikasi lokal | Valid | `npm.cmd run lint` lulus tanpa error, `npx.cmd tsc --noEmit` lulus |
| UI/UX Fase 1 | Diperbarui | Dashboard, auth layout, sidebar/header, profile view, card style, dan warning hydration extension browser sudah diperbaiki |
| Surat Pernyataan Kerja | External | Sudah dikembangkan di project terpisah; UI dan route placeholder di repo ini dihapus untuk sementara |

### Migration di Supabase Live

Supabase live mencatat migration berikut:

- `20260507035853_fase1_foundation`
- `20260507035923_fase1_rls`
- `20260507040719_fase1_security_hardening`
- `20260507084256_seed_step1_auth_users`
- `20260507084329_seed_step2_identities`
- `20260507084440_seed_step3_profiles`
- `20260507084508_seed_step4_roles_positions_assignments`

### Row Count Supabase Live

| Tabel | Rows |
|-------|------|
| `organizations` | 1 |
| `units` | 6 |
| `profiles` | 12 |
| `user_roles` | 17 |
| `academic_years` | 1 |
| `user_unit_assignments` | 13 |
| `position_histories` | 12 |
| `work_statements` | 0 |
| `statement_reviews` | 0 |
| `peer_feedbacks` | 0 |
| `audit_logs` | 0 |

### Catatan Repo Lokal

Folder `supabase/migrations` lokal saat verifikasi hanya berisi:

- `001_fase1_foundation.sql`
- `002_fase1_rls.sql`

Namun Supabase live sudah memiliki migration tambahan untuk security hardening dan seed data. Agar histori deployment bisa direproduksi dari repo, migration live tambahan perlu diekspor atau direkonstruksi ke folder `supabase/migrations` sebelum perubahan database berikutnya.

### Keputusan

Fase 1 dinyatakan selesai dieksekusi berdasarkan state Supabase live dan validasi aplikasi lokal. Modul Surat Pernyataan Kerja tidak dilanjutkan di repo ini karena sudah dikembangkan pada project terpisah. Project ini dapat lanjut ke scope non-surat, dengan catatan sinkronisasi migration lokal perlu dibereskan agar repo menjadi source of truth penuh.

---

## Fase 1 - Foundation

**Tanggal awal:** 7 Mei 2026  
**Status:** SELESAI - verified live pada 17 Mei 2026

### Ringkasan Teknis

| Komponen | Detail |
|----------|--------|
| Framework | Next.js 16.2.5 (App Router) + TypeScript |
| UI | shadcn/ui v4 (base-ui) + Tailwind CSS v4 |
| Backend | Supabase (`nqepqnjgcovahpcqtdjg`) - ap-southeast-1 |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | PostgreSQL - 11 tabel, RLS aktif |

### Aplikasi

| Route | Akses | Fitur |
|-------|-------|-------|
| `/auth/login` | Publik | Login email atau NIY + password, show/hide password |
| `/auth/forgot-password` | Publik | UI reset password |
| `/auth/callback` | Publik | Auth callback handler |
| `/dashboard` | Semua role | Greeting, feedback, profil cards |
| `/dashboard/profile` | Semua role | Data pribadi, riwayat jabatan, unit assignment |
| `/dashboard/feedback` | Semua role | Placeholder Fase 3 |
| `/dashboard/employees` | HRD/Admin/Kepala Unit | Placeholder |
| `/dashboard/academic-years` | HRD/Admin | Placeholder |
| `/dashboard/units` | Admin | Placeholder |

### Komponen Utama

- `AppSidebar` - navigasi role-based.
- `AppHeader` - mobile navigation, avatar, role badge, dropdown profil/logout.
- `DashboardContent` - status cards dan quick links manajemen.
- `ProfileView` - profil lengkap, histori jabatan, dan penugasan unit.

---

## Surat Pernyataan Kerja

**Status:** Aktif kembali mulai Fase 2 pada 18 Mei 2026.

Modul Surat Pernyataan Kerja sebelumnya sempat diabaikan di repo ini karena ada project terpisah. Mulai Fase 2, modul ini diaktifkan kembali di repo `nurussunnah-hub` dengan form surat, workflow review, approve/reject/reopen, tanda tangan digital, dan route print/PDF.

---

## Fase 3 - Feedback Wajib

**Status:** Selesai pada 18 Mei 2026.

Modul Feedback Wajib sudah aktif di `/dashboard/feedback` dengan generator target, constraint unik feedback, progress tracker, tampilan anonim untuk penerima, serta monitoring HRD/Admin yang menampilkan identitas pemberi.

---

## Fase 4 - Hardening & Deployment

**Status:** Selesai pada 19 Mei 2026.

Hardening Fase 4 sudah aktif dengan audit trigger otomatis, RLS initplan optimization, role scoping policy, dan index tambahan untuk jalur monitoring/audit.

---

## 1 Juni 2026 - Audit Repair Batch

**Status:** Sebagian selesai sesuai implementation plan.

### Hasil

| Area | Status | Catatan |
|------|--------|---------|
| Password reset | Selesai | Route `/auth/reset-password` ditambahkan dan middleware recovery diperbarui. |
| Settings Admin | Selesai | Route `/dashboard/settings` aktif sebagai hub Admin. |
| Profil self-edit | Selesai | Pegawai dapat mengubah field personal yang di-whitelist. |
| Employee admin editing | Selesai awal | HRD/Admin dapat mengubah data operasional dan role dari direktori. |
| PDF storage | Selesai awal | Bucket private `work-statement-pdfs` dan upload PDF approved ditambahkan. |
| Feedback monitoring Kepala Unit | Selesai awal | RPC scoped monitoring + reminder in-app ditambahkan. |
| RPC hardening | Parsial | Direct execute untuk helper non-policy dicabut; app-facing SECURITY DEFINER RPC tetap callable dengan validasi internal. |

### Catatan Security Advisor

Warning `anon_security_definer_function_executable` untuk `get_feedback_monitoring_scoped` sudah ditutup. Warning `authenticated_security_definer_function_executable` masih tersisa untuk RPC yang memang dipanggil aplikasi atau helper role yang dipakai RLS. Fungsi `is_admin`, `is_hrd`, dan `is_kepala_unit` tidak dicabut dari `authenticated` karena dipakai policy RLS dan pencabutan berisiko memutus akses tabel. `auth_leaked_password_protection` masih perlu diaktifkan dari Supabase Auth dashboard.
