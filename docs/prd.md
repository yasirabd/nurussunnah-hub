# Product Requirements Document (PRD) Final v1.2
## **Nurussunnah Hub** â€” Sistem Pengelolaan Pegawai Yayasan Islam Nurus Sunnah

**Versi:** 1.2 Final  
**Tanggal:** 6 Mei 2026  
**Status:** Final Approved for Build  
**Platform:** Web App Internal  
**Backend Stack:** Supabase (PostgreSQL, Auth, Storage, RLS)  
**Frontend Stack (Final):** Next.js + Tailwind CSS + **shadcn/ui**

---

## 1. Ringkasan Produk
Nurussunnah Hub adalah aplikasi web internal untuk pengelolaan pegawai di Yayasan Islam Nurus Sunnah. Sistem mendukung:
- pengelolaan data pegawai lintas unit,
- proses surat pernyataan kerja tahunan,
- review surat oleh atasan terkait,
- feedback antar rekan kerja dengan aturan wajib,
- monitoring SDM oleh HRD.

## 2. Tujuan Produk
1. Sentralisasi data pegawai di satu sistem.
2. Digitalisasi proses administrasi tahunan berbasis tahun pelajaran.
3. Peningkatan akurasi & kecepatan proses review surat.
4. Peningkatan budaya evaluasi internal melalui feedback terstruktur.
5. Keamanan akses data sesuai role.

## 3. Konteks Organisasi (Final)
1. **Yayasan** adalah entitas induk.
2. Unit sekolah di bawah yayasan: **TK, SD, SMP, MA, SMA**.
3. Terdapat pegawai:
   - yang terikat pada unit sekolah, dan
   - yang terikat langsung pada yayasan.
4. Pegawai dapat:
   - memiliki lebih dari 1 jabatan (contoh: HRD + Kepala Unit),
   - mengajar pada lebih dari 1 unit,
   - tetap memiliki 1 unit induk utama (`home_unit`).

## 4. Role & Kewenangan
## 4.1 Role Sistem
- Pegawai
- Kepala Unit
- HRD
- Admin Umum

> User dapat memiliki multi-role.

## 4.2 Aturan Akses Inti
- Identitas pemberi feedback hanya dapat dilihat oleh **HRD**.
- Kepala Unit melakukan review surat untuk pegawai unitnya.
- Pegawai scope Yayasan direview oleh HRD.

## 5. Ruang Lingkup Fitur (In Scope)

1. Login (email/NIY) + logout.
2. Forgot password via email.
3. Profil pegawai.
4. Direktori pegawai per unit.
5. Manajemen tahun pelajaran.
6. Surat Pernyataan Kerja:
   - draft,
   - submit,
   - review,
   - approve/reject,
   - reopen.
7. Generate PDF surat.
8. Tanda tangan digital pegawai.
9. Feedback rekan kerja wajib.
10. Dashboard monitoring untuk HRD/Admin/Kepala Unit sesuai role.

## 6. Aturan Bisnis Final

## 6.1 Tahun Pelajaran
- Menggunakan tahun pelajaran, bukan tahun kalender.
- Contoh: `2025/2026` = **1 Juli 2025 â€“ 30 Juni 2026**.
- Tidak ada perpindahan unit selama tahun pelajaran berjalan.

## 6.2 Status Pegawai
Kategori resmi:
1. Pegawai Tetap
2. Pegawai Tidak Tetap
3. Kontrak
4. Honorer
5. Pensiun

Aturan kewajiban feedback:
- hanya pegawai **aktif** di tahun pelajaran berjalan yang wajib mengisi,
- pegawai non-aktif/pensiun tidak wajib.

## 6.3 NIY / employee_no
- Disimpan tanpa spasi.
- Wajib unik.
- Contoh normalisasi:  
  `195808 200207 11 001` â†’ `19580820020711001`.

## 6.4 Email
- Email wajib terisi.
- Forgot password dikirim ke email terdaftar.

## 6.5 Feedback Rekan Kerja
- Wajib isi feedback untuk seluruh rekan **aktif** dalam cakupan unit yang relevan.
- Termasuk Kepala Unit sebagai target feedback.
- Maksimal 1 feedback per pasangan pemberiâ†’penerima per tahun pelajaran.
- Tidak boleh feedback untuk diri sendiri.
- Penerima tidak melihat identitas pemberi.
- HRD dapat melihat identitas pemberi.

## 6.6 Surat Pernyataan Kerja
Workflow status:
`draft â†’ submitted â†’ reviewed â†’ approved/rejected â†’ reopened (opsional) â†’ resubmitted`

Reviewer:
- Pegawai unit: Kepala Unit.
- Pegawai scope yayasan: HRD.

Legalitas:
- Dokumen legal melalui tanda tangan digital masing-masing guru/pegawai.

## 7. Kebutuhan Fungsional

## 7.1 Auth & Session
- Login via email/password atau NIY/password.
- Forgot password via email.
- Session management aman + logout.

## 7.2 Master Data
- Kelola organisasi, unit, tahun pelajaran.
- Kelola data user, role, status aktif.

## 7.3 Profil Pegawai
- Lihat data diri.
- Ubah data personal tertentu.
- Field administratif hanya admin/HRD.

## 7.4 Histori Jabatan
- Simpan histori jabatan lengkap.
- Mendukung multi-jabatan aktif sesuai penetapan yayasan.

## 7.5 Penugasan Unit
- Menyimpan unit induk.
- Menyimpan unit mengajar tambahan.

## 7.6 Surat Tahunan
- Form surat per periode.
- Draft/submit/review/reopen.
- Generate PDF final.
- Simpan metadata tanda tangan digital.

## 7.7 Feedback
- Generator target feedback wajib.
- Validasi one-feedback-per-target.
- Progress completion per pegawai.
- Tampilan anonim untuk penerima.
- Tampilan identified untuk HRD.

## 8. Kebutuhan Non-Fungsional
1. **Security:** RLS aktif di semua tabel sensitif.
2. **Performance:** target < 3 detik untuk alur utama.
3. **Availability:** target uptime 99%.
4. **Auditability:** log aktivitas penting.
5. **Usability:** UI modern, konsisten, mudah dipahami.
6. **Responsiveness:** optimal desktop/tablet/mobile.

## 9. Arsitektur Teknis (Final)

## 9.1 Frontend (Wajib)
- **Next.js**
- **Tailwind CSS**
- **shadcn/ui** (wajib sebagai UI component system)

## 9.2 Backend
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage (PDF dokumen)
- RPC/Edge Function untuk logic kritikal

## 9.3 Komponen UI (shadcn/ui)
Seluruh komponen inti wajib memakai shadcn/ui:
- Button, Input, Form, Select, Dialog, Drawer
- Table/DataTable wrapper
- Badge, Card, Tabs, Dropdown
- Toast/Alert
- Skeleton/loading state

## 10. Desain Data Konseptual

## 10.1 Tabel Inti
1. `organizations`
2. `units`
3. `profiles`
4. `user_roles`
5. `user_unit_assignments`
6. `academic_years`
7. `work_statements`
8. `statement_reviews`
9. `position_histories`
10. `peer_feedbacks`
11. `audit_logs`

## 10.2 Aturan Struktur Penting
- `profiles.employee_no` unique no-space.
- `profiles.email` not null.
- `user_roles` mendukung multi-role.
- `user_unit_assignments` mendukung multi-unit dengan satu `HOME`.
- `peer_feedbacks` unique `(academic_year_id, giver_user_id, receiver_user_id)`.
- `giver_user_id <> receiver_user_id`.

## 11. RLS & Privasi (High-Level)
1. Pegawai: akses sesuai diri sendiri + unit terkait.
2. Kepala Unit: review surat untuk unitnya.
3. HRD: akses monitoring lintas unit + identitas pemberi feedback.
4. Admin Umum: kelola data master, tanpa akses identitas feedback kecuali juga punya role HRD.

## 12. Integrasi Data Existing (Google Sheet)

## 12.1 Sumber Data
Kolom sumber:
`NO, NAMA, STATUS AKTIF, NIY, JENIS KELAMIN, STATUS PERKAWINAN, TEMPAT LAHIR, TANGGAL LAHIR, JABATAN, IJAZAH TERAKHIR, UNIT, ALAMAT KTP, ALAMAT DOMISILI, HANDPHONE, EMAIL, FACEBOOK, TWITTER, INSTAGRAM`

## 12.2 Rule Import
- Normalisasi NIY tanpa spasi.
- Email wajib valid.
- Mapping status aktif -> `profiles.active_status`.
- Mapping unit ke master unit.
- Error rows masuk laporan validasi untuk perbaikan.

## 12.3 Alur Import
1. Export CSV.
2. Import staging.
3. Validasi + transform.
4. Upsert final.
5. Aktivasi akun auth.

## 13. UI/UX Guidelines (Final)
1. Design modern, bersih, profesional.
2. Konsisten dengan design tokens Tailwind + shadcn/ui.
3. Dashboard role-based.
4. Alur formulir sederhana dengan validasi jelas.
5. Progress tracker untuk kewajiban feedback.
6. State lengkap: empty/loading/error/success.

## 14. KPI Keberhasilan
1. â‰¥90% pegawai aktif berhasil login.
2. â‰¥85% surat submitted sebelum deadline.
3. â‰¥95% feedback wajib selesai per tahun pelajaran.
4. Waktu generate PDF < 10 detik.
5. Error submit form < 2%.

## 15. Roadmap Implementasi

## Fase 1 â€” Foundation
- Setup project (Next.js + Tailwind + shadcn/ui + Supabase).
- Master data organisasi/unit/profile.
- Import data awal.

## Fase 2 â€” Surat & Review
- Form surat + workflow review.
- Approve/reject/reopen.
- Digital signature + PDF.

## Fase 3 â€” Feedback Wajib
- Generator target feedback.
- Constraint unik feedback.
- HRD monitoring panel.

## Fase 4 â€” Hardening
- Audit logs.
- UAT lintas role.
- Optimasi performa + keamanan.

## 16. Risiko & Mitigasi
1. Data awal tidak bersih â†’ staging + validator + correction batch.
2. Salah akses data sensitif â†’ uji RLS ketat per role.
3. Keterlambatan isi feedback wajib â†’ progress tracker + reminder.
4. Kompleksitas multi-role/multi-unit â†’ matrix role final + test scenario QA.

## 17. Definition of Done (DoD)
PRD dinyatakan tercapai jika:
1. Semua fitur in-scope berjalan.
2. Workflow surat + review + reopen berfungsi.
3. Feedback wajib tervalidasi untuk seluruh target aktif.
4. Identitas pemberi feedback hanya HRD yang dapat melihat.
5. Login email/NIY + forgot password via email berfungsi.
6. `employee_no` tersimpan tanpa spasi dan unik.
7. Histori jabatan berjalan.
8. UI konsisten menggunakan **shadcn/ui**.

## 18. Final Coverage Checklist
âœ… Yayasan sebagai induk + pegawai yayasan langsung.  
âœ… Tahun pelajaran (1 Juliâ€“30 Juni).  
âœ… Status pegawai 5 kategori.  
âœ… Multi-jabatan dan multi-unit assignment dengan unit induk.  
âœ… Tidak ada perpindahan unit di tengah tahun pelajaran.  
âœ… Review surat oleh Kepala Unit/HRD sesuai scope.  
âœ… Reopen setelah approved diperbolehkan.  
âœ… Legalitas: tanda tangan digital pegawai.  
âœ… Feedback wajib ke seluruh rekan aktif, satu kali per rekan.  
âœ… Identitas pemberi feedback hanya HRD.  
âœ… Login email/NIY, email wajib, forgot password email.  
âœ… NIY tanpa spasi & unik.  
âœ… UI framework final: **shadcn/ui**.
