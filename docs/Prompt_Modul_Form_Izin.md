# Prompt: Modul Form Izin Pegawai — hub.nurussunnah.com

Gunakan prompt di bawah ini untuk AI coding assistant (Claude Code, Cursor, dll) yang mengerjakan aplikasi `hub.nurussunnah.com`.

---

## PROMPT

Saya sedang mengembangkan aplikasi internal `hub.nurussunnah.com` untuk Yayasan Islam Nurus Sunnah. Saya ingin membangun **modul Form Izin Pegawai** yang menggantikan Google Form yang selama ini dipakai. Modul ini KHUSUS untuk pengajuan izin tidak masuk/terlambat/pulang awal — TIDAK termasuk koreksi presensi (kartu lupa/hilang, dll), karena itu modul terpisah.

### 0. Stack & Arsitektur yang Sudah Ada (WAJIB diikuti)
Aplikasi ini sudah berjalan dengan stack berikut — sesuaikan seluruh implementasi dengannya, jangan memperkenalkan stack baru:
- **Framework**: Next.js 16 (App Router, Server Actions) + React 19 + TypeScript.
- **Database & Auth**: Supabase (Postgres + Row Level Security + Supabase Auth). `employee_id` = `auth.uid()`.
- **UI**: shadcn/ui + Radix + Tailwind v4, form pakai `react-hook-form` + `zod`, notifikasi UI pakai `sonner`.
- **Export**: library `xlsx` (sudah dipakai di modul Feedback untuk export Excel).
- **Deploy**: Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`). Perhatikan runtime edge/worker — hindari dependency Node berat; untuk Google Drive gunakan pemanggilan REST API + JWT service account via `fetch`, bukan library Node yang tidak kompatibel dengan Worker.

**Data master pegawai sudah ada di tabel `profiles`** (bukan tabel bernama "pegawai"):
- Nama Lengkap → `profiles.full_name`
- Nomor WhatsApp → `profiles.phone`
- Unit → `profiles.home_unit_id` (FK ke `units`, ambil `units.name`)
- Nomor pegawai → `profiles.employee_no`

**Role sudah ada** via enum `user_role_enum`: `PEGAWAI`, `KEPALA_UNIT`, `HRD`, `ADMIN` (multi-role, tabel `user_roles`). Tersedia helper RLS `is_hrd()`, `is_admin()`, `is_kepala_unit()`, dan trigger `update_updated_at_column()`. Scope Kepala Unit ke pegawai unitnya mengikuti pola migration `020_employee_leaves.sql` (cocokkan `profiles.home_unit_id` dengan `user_unit_assignments` bertipe `HOME` milik kepala unit). Tahun pelajaran aktif dibaca dari `academic_years WHERE is_active`.

### 1. Konteks & Alur Bisnis
Alur perizinan saat ini:
1. Pegawai mengumpulkan **bukti izin** (foto/dokumen, misal surat sakit dari dokter).
2. Pegawai meminta izin ke **Kepala Unit** via chat WhatsApp, lalu screenshot percakapan sebagai bukti persetujuan.
3. Pegawai **submit form** izin di aplikasi, lengkap dengan data dan bukti-bukti.
4. **Yayasan (admin/HR)** melakukan **validasi** dari data yang masuk. Hasil validasi harus bisa dilihat oleh Kepala Unit terkait.

Buat modul yang mendukung alur ini end-to-end, termasuk dashboard validasi untuk admin/HR dan tampilan status untuk Kepala Unit.

### 1a. Struktur Menu & Tab (mengikuti pola sidebar existing)
Tambahkan **satu menu sidebar** "Izin Pegawai" di `/dashboard/leave-requests` (tampil untuk semua role). Di dalamnya gunakan **tab** yang di-gate per role, mengikuti pola `getVisibleNavItems` di `src/components/layout/app-sidebar.tsx`:
- Tab **Ajukan Izin** — semua role (form auto-fill dari profil).
- Tab **Izin Saya** — semua role (riwayat sendiri + counter tahun pelajaran aktif, lihat poin 8).
- Tab **Unit Saya** — hanya `KEPALA_UNIT` (read-only izin pegawai unitnya + jumlah izin per pegawai, lihat poin 8).
- Tab **Validasi** — hanya `HRD`/`ADMIN` (approve/reject/revisi + catatan admin).
- Tab **Rekap** — hanya `HRD`/`ADMIN` (agregat + export Excel).

### 2. Data Pegawai Sudah Tersedia di Aplikasi
Field **Nama Lengkap**, **Unit**, dan **Nomor WhatsApp** SUDAH ADA di `profiles` (bukan input manual). Saat pegawai login dan membuka Form Izin, ketiga field ini harus:
- Otomatis terisi (auto-fill/read-only) dari data akun pegawai yang sedang login, ATAU
- Ditampilkan sebagai info profil ringkas di atas form (non-editable), dengan link "Bukan Anda?" atau "Update data" yang mengarah ke halaman profil, bukan diedit langsung di form ini.

Jangan buat field input teks bebas untuk ketiganya. Form Izin cukup mengambil `employee_id` (= `auth.uid()`) dari sesi login dan melakukan relasi (foreign key) ke `profiles` untuk mendapatkan Nama, Unit, dan Nomor WhatsApp saat submit maupun saat ditampilkan di dashboard admin.

### 3. Struktur Data / Field Form Izin

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| Tanggal Izin (Mulai) | Date | Ya | Idealnya diajukan H-1 sebelum hari izin |
| Tanggal Selesai | Date | Kondisional | Muncul/wajib diisi jika toggle "Izin lebih dari 1 hari" diaktifkan; default = sama dengan Tanggal Mulai |
| **Jenis Izin** (kategori umum) | Dropdown (single-select) | Ya | Lihat daftar opsi di bawah |
| **Jenis Waktu Izin** | Dropdown (single-select) | Ya | 4 opsi konsisten: `Seharian Penuh` / `Datang Terlambat` / `Pulang Lebih Awal` / `Sebagian Jam Kerja` |
| Permohonan Izin (Keterangan) | Textarea | Ya | Detail/alasan spesifik, melengkapi kategori di atas |
| Bukti Izin | File upload (multi-file, image/pdf) | Kondisional (lihat aturan di bawah) | |
| Sudah Diizinkan Kepala Unit? | Toggle/Radio: Sudah / Belum | Ya | Jika "Belum" → hentikan submit, tampilkan pesan (lihat poin 5) |
| Bukti Screenshot Izin Kepala Unit | File upload (image) | Ya, jika "Sudah Diizinkan" = Sudah | |

*(Nama Lengkap, Unit, Nomor WhatsApp tidak masuk tabel ini karena diambil otomatis dari `profiles` pegawai yang login — lihat poin 2.)*

Simpan pengajuan pada tabel baru (mis. `leave_requests`) yang direlasikan ke `profiles(id)` dan ke `academic_years(id)` (isi otomatis dengan tahun pelajaran aktif saat submit, untuk keperluan rekap per tahun pelajaran).

### 3a. Status Pengajuan (enum eksplisit)
Gunakan status: `MENUNGGU` / `DISETUJUI` / `DITOLAK` / `PERLU_REVISI`. (Berbeda dari modul Koreksi Presensi yang tidak punya `PERLU_REVISI`.)

### 4. Opsi Dropdown "Jenis Izin" (kategori umum)
```
Sakit
Keperluan Keluarga
Terlambat/Kendala Perjalanan
Duka Cita (Kedukaan)
Acara Khusus (Wisuda/Pernikahan/Ibadah)
Mudik/Perjalanan Luar Kota
Pendidikan/Akademik
Kedinasan/Tugas Kantor
Administrasi Pribadi
Lainnya
```

### 5. Aturan Validasi & Logika Kondisional
- **Branching "Sudah Diizinkan Kepala Unit?"**: jika pegawai memilih **"Belum"**, form TIDAK melanjutkan ke field berikutnya. Tampilkan pesan: *"Silakan minta izin kepala unit terlebih dahulu sebelum mengajukan form ini."* dan blok submit sepenuhnya (bukan hanya warning).
- **Bukti Izin wajib bersyarat** berdasarkan Jenis Izin:
  - **Wajib**: Sakit (jika >1 hari), Duka Cita, Acara Khusus, Administrasi Pribadi
  - **Opsional dengan catatan**: Sakit (1 hari, kasus mendadak), Terlambat/Kendala Perjalanan, Keperluan Keluarga mendadak
  - Jika field ini opsional dan dikosongkan, tampilkan checkbox konfirmasi: *"Saya menyatakan tidak ada bukti fisik untuk izin ini, dan bersedia melengkapi jika diminta Yayasan."*
- **Tanggal Izin**: validasi soft-warning jika diajukan H-0 atau tanggal lampau (kecuali Jenis Izin = Sakit/Duka Cita mendadak), dengan pesan: *"Idealnya izin diajukan H-1. Lanjutkan pengajuan?"*

### 6. Dashboard Validasi (Admin/HR)
- List semua pengajuan izin dengan filter: Unit, Jenis Izin, Status Validasi (Menunggu/Disetujui/Ditolak/Perlu Revisi), rentang tanggal.
- Admin bisa membuka detail pengajuan, lihat semua bukti (foto/dokumen), lalu set status: **Disetujui / Ditolak / Perlu Revisi** + kolom catatan admin.
- Setelah divalidasi, Kepala Unit terkait bisa melihat status pengajuan pegawainya (read-only, tidak bisa ubah).
- Pegawai juga bisa melihat status pengajuannya sendiri (riwayat + status).

### 7. Laporan/Rekap
Buat halaman rekap otomatis (bisa difilter per periode & unit):
- Jumlah izin per Jenis Izin (untuk lihat pola: sakit, keperluan keluarga, dll)
- Jumlah izin per Unit
- Rata-rata durasi izin
- Opsi export ke Excel/CSV (pakai library `xlsx` seperti modul Feedback)

### 8. Counter Izin per Tahun Pelajaran Aktif (WAJIB)
Semua counter/agregat di bawah discope ke tahun pelajaran aktif (`academic_years WHERE is_active`), berdasarkan `academic_year_id` pada tabel pengajuan:
- **Pegawai (tab "Izin Saya")**: tampilkan total jumlah pengajuan izin miliknya pada tahun pelajaran aktif + rincian per Jenis Izin dan daftar riwayatnya.
- **Kepala Unit (tab "Unit Saya")**: tampilkan tabel pegawai di unitnya beserta jumlah izin masing-masing pada tahun pelajaran aktif, dengan drill-down ke rincian (read-only). Scope unit mengikuti pola `020_employee_leaves.sql`.
- Implementasikan agregasi via RPC/`view` Postgres (pola serupa rekap Feedback) agar hitungan konsisten dengan RLS.

### 9. Integrasi Google Drive untuk Penyimpanan Bukti (WAJIB)
Semua file bukti (**Bukti Izin** dan **Bukti Screenshot Izin Kepala Unit**) TIDAK disimpan sebagai file/blob di server aplikasi maupun di Supabase Storage (untuk menghemat kuota Supabase). File-file tersebut harus diteruskan dan disimpan di **Google Drive**, dan yang disimpan di database aplikasi hanya metadata + link-nya. Implementasikan sebagai berikut:

- Gunakan **Google Drive API** dengan autentikasi **Service Account** (bukan OAuth per-pegawai). Karena deploy di Cloudflare Worker, panggil Drive REST API menggunakan **JWT service account yang ditandatangani via WebCrypto/`fetch`**, bukan library Node yang tak kompatibel dengan runtime Worker.
- Siapkan satu folder root di Google Drive Yayasan (misal "Bukti Perizinan Pegawai"), lalu share folder tersebut ke email service account dengan akses **Editor**.
- Upload dilakukan di **Server Action / Route Handler** (server-side), bukan dari client.
- Struktur subfolder otomatis per pengajuan, contoh: `/Bukti Perizinan Pegawai/{tahun-bulan}/{full_name}_{tanggal_izin}/`.
- Setelah upload berhasil, simpan ke database hanya: `drive_file_id`, `drive_view_link` (webViewLink), `file_name`, `mime_type`, `uploaded_at`. Jangan simpan file biner di server aplikasi maupun storage lain (Supabase Storage, S3, local disk).
- **Permission file (keputusan default): restricted** — jangan "Anyone with link". Batasi ke domain/akses internal Yayasan; admin/HR & kepala unit terkait mengakses via link. Tampilkan bukti di UI sebagai tombol "Lihat Bukti" yang membuka `drive_view_link` di tab baru.
- Tangani error upload Drive secara graceful (retry sekali, lalu pesan error jelas ke pegawai). Jangan biarkan submission gagal total hanya karena upload Drive gagal — pertimbangkan queue/retry di background.
- Simpan credential service account sebagai secret/env, jangan hardcode. Env yang dibutuhkan:
  - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` (isi JSON service account)
  - `GOOGLE_DRIVE_LEAVE_FOLDER_ID` (ID folder root "Bukti Perizinan Pegawai")

### 10. Catatan Teknis Tambahan
- Ikuti pola migration & RLS existing (`is_hrd()`/`is_admin()`/`is_kepala_unit()`, trigger `update_updated_at_column()`, index FK). Tambahkan migration baru bernomor urut mengikuti folder `supabase/migrations/`.
- Modul ini terpisah dari modul **Koreksi Presensi** (lihat prompt terpisah), meski data dari kedua modul sebaiknya bisa disandingkan dalam satu laporan kehadiran gabungan (join by `user_id` + Tanggal) tanpa mencampur logika approval-nya.
- Notifikasi WhatsApp/email otomatis: **tidak perlu diimplementasikan untuk saat ini** (belum ada integrasi WA API di sistem). Cukup andalkan status di aplikasi.

---

*Prompt ini sudah disesuaikan dengan stack `hub.nurussunnah.com` (Next.js 16 + Supabase + Cloudflare/OpenNext).*
