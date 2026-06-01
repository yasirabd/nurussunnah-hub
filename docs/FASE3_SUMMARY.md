# Fase 3 - Feedback Wajib: Selesai

**Tanggal selesai:** 18 Mei 2026  
**Status:** Selesai dieksekusi di repo lokal dan Supabase live

---

## Ringkasan Eksekusi

Fase 3 mengaktifkan modul Feedback Rekan Kerja sesuai `docs/prd.md`. Modul ini mencakup generator target feedback wajib, validasi satu feedback per pasangan pemberi-penerima per tahun pelajaran, tampilan anonim untuk penerima, dan monitoring HRD/Admin dengan identitas pemberi.

### Database dan Backend

- Tabel `peer_feedbacks` dari Fase 1 digunakan sebagai penyimpanan feedback.
- Policy lama `feedback_receiver_select` dihapus agar penerima tidak dapat membaca baris mentah yang berisi `giver_user_id`.
- RPC `get_received_feedback_anonymous` disediakan untuk penerima tanpa membuka identitas pemberi.
- RPC `get_feedback_identified` disediakan untuk HRD/Admin agar identitas pemberi dapat diaudit.
- RPC `get_feedback_targets` menghasilkan target feedback aktif sesuai cakupan unit relevan.
- RPC `submit_peer_feedback` melakukan validasi target, rating 1-5, larangan self-feedback, upsert unik, dan audit log.
- RPC `get_feedback_monitoring` menghasilkan progress completion per pegawai aktif.

### Frontend

- Route `/dashboard/feedback` diubah dari placeholder menjadi modul aktif.
- Pegawai melihat progress kewajiban feedback, daftar target, form rating/catatan, dan feedback masuk anonim.
- HRD/Admin melihat monitoring progress semua pegawai aktif dan tabel feedback teridentifikasi.
- Progress tracker memakai rasio target selesai terhadap total target.

---

## Aturan yang Sudah Diimplementasikan

| Aturan PRD | Status |
|------------|--------|
| Target feedback untuk rekan aktif dalam cakupan unit relevan | Selesai |
| Kepala Unit termasuk sebagai target jika aktif dalam unit terkait | Selesai |
| Maksimal 1 feedback per pasangan pemberi-penerima per tahun pelajaran | Selesai via unique constraint + upsert |
| Tidak boleh feedback untuk diri sendiri | Selesai |
| Pegawai non-aktif/pensiun tidak wajib | Selesai |
| Penerima tidak melihat identitas pemberi | Selesai via RPC anonim dan penghapusan policy receiver raw select |
| HRD/Admin dapat melihat identitas pemberi | Selesai |
| Progress completion per pegawai | Selesai |

---

## Migration Live

Supabase live mencatat migration Fase 3:

- `20260517230731_fase3_feedback_workflow`
- `20260517231156_fase3_revoke_anon_feedback_rpc`

Migration lokal yang merepresentasikan perubahan tersebut:

- `supabase/migrations/007_fase3_feedback_workflow.sql`
- `supabase/migrations/008_fase3_revoke_anon_feedback_rpc.sql`

---

## Route dan File Utama

| Path | Keterangan |
|------|------------|
| `/dashboard/feedback` | Form feedback wajib, feedback masuk anonim, monitoring HRD/Admin |
| `src/app/dashboard/feedback/actions.ts` | Server action submit feedback |
| `src/app/dashboard/feedback/page.tsx` | UI utama Fase 3 |
| `src/types/database.ts` | Tipe RPC feedback |

---

## Validasi

| Pemeriksaan | Status | Catatan |
|-------------|--------|---------|
| Supabase migration | Selesai | Migration Fase 3 berhasil diterapkan ke live |
| Route lokal | Lulus | `http://localhost:3000/dashboard/feedback` merespons 200 |
| TypeScript | Lulus | `npx.cmd tsc --noEmit` |
| Lint | Lulus dengan warning lama | `npm.cmd run lint`, warning pada file lama yang tidak disentuh |
| Build | Lulus | `.next/BUILD_ID` tersedia setelah build |
| Security advisor | Ada warning tersisa | Tidak ada warning anon feedback RPC; warning tersisa adalah `authenticated_security_definer_function_executable` untuk RPC yang memang dipanggil user login dan `auth_leaked_password_protection` |

---

## Row Count Live

| Tabel | Rows |
|-------|------|
| `peer_feedbacks` | 0 |
| `audit_logs` | 0 |

Belum ada data feedback karena user belum mengisi modul setelah deployment.

---

## Catatan Batasan

- Target feedback saat ini dihitung dari unit relevan user berdasarkan `user_unit_assignments` pada tahun pelajaran aktif dan fallback `profiles.home_unit_id`.
- Reminder otomatis belum dibuat; progress tracker tersedia untuk pemantauan manual HRD/Admin.
- Monitoring Kepala Unit khusus untuk progress unitnya belum dipisahkan; monitoring penuh saat ini untuk HRD/Admin.

---

## Scope Berikutnya

### Fase 4 - Hardening

- Audit log viewer.
- UAT lintas role untuk feedback anonim/identified.
- Optimasi RLS policy untuk warning `auth_rls_initplan` dan `multiple_permissive_policies`.
- Aktifkan leaked password protection di Supabase Auth.
