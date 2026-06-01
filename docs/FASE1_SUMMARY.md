# Fase 1 - Foundation: Selesai

**Tanggal selesai awal:** 7 Mei 2026  
**Diverifikasi ulang:** 17 Mei 2026  
**Status:** Selesai dieksekusi di Supabase live

---

## Ringkasan Eksekusi

### Database dan Backend

- Supabase project `nurussunnah-hub` (`nqepqnjgcovahpcqtdjg`).
- Region: `ap-southeast-1`.
- 11 tabel foundation tersedia.
- RLS aktif.
- Security hardening sudah tercatat di Supabase live.
- Dummy data sudah tersedia: 12 pegawai, 17 role assignments, 13 unit assignments, 12 position histories.

### Frontend

- Next.js 16.2.5 + TypeScript.
- shadcn/ui v4 (base-ui) + Tailwind CSS v4.
- Auth pages: login, forgot password, callback.
- Dashboard dengan role-based navigation.
- Profile page dengan data pribadi, riwayat jabatan, dan penugasan unit.
- UI/UX Fase 1 sudah dirapikan pada 17 Mei 2026.

---

## Database Schema

| Tabel | Rows live | Keterangan |
|-------|-----------|------------|
| `organizations` | 1 | Yayasan Islam Nurus Sunnah |
| `units` | 6 | YAYASAN, TK, SD, SMP, MA, SMA |
| `profiles` | 12 | Data pegawai dummy |
| `user_roles` | 17 | Role assignments |
| `academic_years` | 1 | TA aktif |
| `user_unit_assignments` | 13 | HOME dan TEACHING assignments |
| `position_histories` | 12 | Riwayat jabatan |
| `work_statements` | 0 | Ada di schema, tetapi modul UI diabaikan di repo ini |
| `statement_reviews` | 0 | Ada di schema, tetapi modul UI diabaikan di repo ini |
| `peer_feedbacks` | 0 | Siap untuk scope feedback |
| `audit_logs` | 0 | Audit trail |

---

## Migration Live

Supabase live mencatat migration:

- `20260507035853_fase1_foundation`
- `20260507035923_fase1_rls`
- `20260507040719_fase1_security_hardening`
- `20260507084256_seed_step1_auth_users`
- `20260507084329_seed_step2_identities`
- `20260507084440_seed_step3_profiles`
- `20260507084508_seed_step4_roles_positions_assignments`

Catatan: folder `supabase/migrations` lokal saat ini baru berisi `001_fase1_foundation.sql` dan `002_fase1_rls.sql`. Migration hardening dan seed live perlu diekspor atau direkonstruksi ke repo sebelum perubahan database berikutnya.

---

## Akun Dummy

Semua akun dummy menggunakan password: `bismillahns`.

| NIY | Nama | Email | Role |
|-----|------|-------|------|
| ADM001 | Ahmad Fauzi | admin@nurussunnah.sch.id | ADMIN, HRD |
| HRD001 | Siti Rahmawati | hrd@nurussunnah.sch.id | HRD |
| SD001 | Hasan Basri | kepsek.sd@nurussunnah.sch.id | KEPALA_UNIT |
| SMP001 | Abdul Karim | kepsek.smp@nurussunnah.sch.id | KEPALA_UNIT |
| MA001 | Zainul Arifin | kepsek.ma@nurussunnah.sch.id | KEPALA_UNIT |
| SMA001 | Ridwan Kamali | kepsek.sma@nurussunnah.sch.id | KEPALA_UNIT |
| SD002 | Aminah Putri Dewi | guru.sd1@nurussunnah.sch.id | PEGAWAI |
| SD003 | Muhammad Rizki | guru.sd2@nurussunnah.sch.id | PEGAWAI |
| SMP002 | Fatimah Az-Zahra | guru.smp1@nurussunnah.sch.id | PEGAWAI |
| MA002 | Umar Farouq | guru.ma1@nurussunnah.sch.id | PEGAWAI |
| TK001 | Khadijah Nur | guru.tk1@nurussunnah.sch.id | PEGAWAI |
| SMA002 | Nurul Hidayah | guru.sma1@nurussunnah.sch.id | PEGAWAI |

---

## Fitur Aktif di Repo Ini

### Authentication

- Login dengan email atau NIY.
- Password visibility toggle.
- Forgot password UI.
- Auth callback route.
- Session guard via middleware.

### Dashboard

- Role-based sidebar navigation.
- Mobile navigation di header.
- User profile display.
- Feedback dan profil summary cards.
- Logout.

### Profile Page

- Data pribadi.
- Riwayat jabatan.
- Unit assignments.
- Role badges.

---

## Surat Pernyataan Kerja

Modul Surat Pernyataan Kerja sudah selesai dikembangkan pada project terpisah. Untuk repo ini, modul tersebut diabaikan sementara:

- Menu sidebar dihapus.
- Card dashboard dihapus.
- Query dashboard ke `work_statements` dihapus.
- Route placeholder `/dashboard/work-statements` dihapus.

Schema `work_statements` dan `statement_reviews` tetap ada di database live karena sudah menjadi bagian dari foundation schema.

---

## Scope Berikutnya

### Feedback Wajib

- Generator target feedback.
- Form rating dan komentar.
- Dashboard progress feedback.
- Report agregat untuk HRD.

### Data Master dan Operasional

- CRUD pegawai.
- CRUD tahun pelajaran.
- CRUD unit dan organisasi.
- Avatar upload.
- Export data.

### Hardening dan Deployment

- Email service.
- Audit log viewer.
- Security review.
- Deployment production.
