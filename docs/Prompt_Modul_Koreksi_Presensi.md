# Prompt: Modul Form Koreksi Presensi — hub.nurussunnah.com

Gunakan prompt di bawah ini untuk AI coding assistant (Claude Code, Cursor, dll) yang mengerjakan aplikasi `hub.nurussunnah.com`.

---

## PROMPT

Saya sedang mengembangkan aplikasi internal `hub.nurussunnah.com` untuk Yayasan Islam Nurus Sunnah. Saya ingin membangun **modul Form Koreksi Presensi**. Modul ini KHUSUS untuk kasus di mana pegawai sebenarnya **tetap masuk kerja**, tapi datanya tidak tercatat di sistem presensi (misal lupa tap kartu, kartu hilang, dll). Ini BUKAN form izin — jangan digabung dengan modul Izin, karena beda alur approval dan beda dampak ke laporan kehadiran.

### 0. Stack & Arsitektur yang Sudah Ada (WAJIB diikuti)
Aplikasi ini sudah berjalan dengan stack berikut — sesuaikan seluruh implementasi dengannya, jangan memperkenalkan stack baru:
- **Framework**: Next.js 16 (App Router, Server Actions) + React 19 + TypeScript.
- **Database & Auth**: Supabase (Postgres + Row Level Security + Supabase Auth). `employee_id` = `auth.uid()`.
- **UI**: shadcn/ui + Radix + Tailwind v4, form pakai `react-hook-form` + `zod`, notifikasi UI pakai `sonner`.
- **Export**: library `xlsx` (sudah dipakai di modul Feedback untuk export Excel).
- **Deploy**: Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`). Perhatikan runtime edge/worker — hindari dependency Node berat; untuk Google Drive gunakan pemanggilan REST API + JWT service account via `fetch`.

**Data master pegawai sudah ada di tabel `profiles`** (bukan tabel bernama "pegawai"):
- Nama Lengkap → `profiles.full_name`
- Nomor WhatsApp → `profiles.phone`
- Unit → `profiles.home_unit_id` (FK ke `units`, ambil `units.name`)

**Role sudah ada** via enum `user_role_enum`: `PEGAWAI`, `KEPALA_UNIT`, `HRD`, `ADMIN` (multi-role, tabel `user_roles`). Tersedia helper RLS `is_hrd()`, `is_admin()`, `is_kepala_unit()`, dan trigger `update_updated_at_column()`. Scope Kepala Unit ke pegawai unitnya mengikuti pola migration `020_employee_leaves.sql`. Tahun pelajaran aktif dibaca dari `academic_years WHERE is_active`.

### 1. Kenapa Terpisah dari Modul Izin
- **Izin** = pegawai tidak masuk/telat/pulang awal karena suatu alasan, butuh persetujuan Kepala Unit sebelum submit.
- **Koreksi Presensi** = pegawai masuk kerja penuh, hanya datanya tidak tercatat karena kendala teknis/kelalaian kecil. Approval cukup dari admin/HR, tidak perlu izin Kepala Unit terlebih dahulu.
- Jika digabung, laporan rekap kehadiran jadi bias: orang yang sebenarnya masuk penuh bisa tercatat seolah-olah izin.

### 1a. Struktur Menu & Tab (mengikuti pola sidebar existing)
Tambahkan **satu menu sidebar** "Koreksi Presensi" di `/dashboard/attendance-corrections` (tampil untuk semua role). Di dalamnya gunakan **tab** yang di-gate per role, mengikuti pola `getVisibleNavItems` di `src/components/layout/app-sidebar.tsx`:
- Tab **Ajukan Koreksi** — semua role (form auto-fill dari profil).
- Tab **Koreksi Saya** — semua role (riwayat sendiri + counter tahun pelajaran aktif, lihat poin 8a).
- Tab **Unit Saya** — hanya `KEPALA_UNIT` (read-only koreksi pegawai unitnya, read-only).
- Tab **Validasi** — hanya `HRD`/`ADMIN` (approve/reject + catatan admin; TANPA jalur approval Kepala Unit).
- Tab **Rekap** — hanya `HRD`/`ADMIN` (agregat + export Excel).

### 2. Alur Bisnis
1. Pegawai menyadari ada kendala presensi (lupa tap, kartu hilang, dll) pada hari itu atau H+1.
2. Pegawai submit **Form Koreksi Presensi** di aplikasi, dengan bukti pendukung jika ada (misal foto kartu rusak, atau tidak ada bukti untuk kasus lupa tap).
3. Admin/HR memvalidasi. Saat **Disetujui**, sistem melakukan koreksi data presensi (lihat poin 4a), lalu status berubah menjadi Disetujui/Ditolak.
4. Pegawai bisa melihat status pengajuannya.

### 3. Data Pegawai Sudah Tersedia di Aplikasi
Field **Nama Lengkap**, **Unit**, dan **Nomor WhatsApp** SUDAH ADA di `profiles` (bukan input manual). Saat pegawai login dan membuka Form Koreksi Presensi, ketiga field ini harus:
- Otomatis terisi (auto-fill/read-only) dari data akun pegawai yang sedang login, ATAU
- Ditampilkan sebagai info profil ringkas di atas form (non-editable).

Jangan buat field input teks bebas untuk ketiganya. Form ini cukup mengambil `employee_id` (= `auth.uid()`) dari sesi login dan melakukan relasi (foreign key) ke `profiles` untuk mendapatkan Nama, Unit, dan Nomor WhatsApp.

### 4. Struktur Data / Field Form Koreksi Presensi

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| Tanggal Kejadian | Date | Ya | Tanggal presensi yang ingin dikoreksi; relasikan ke record `attendance_records` hari tsb (lihat poin 4a) |
| **Jenis Koreksi Presensi** | Dropdown (single-select) | Ya | Lihat daftar opsi di bawah |
| Waktu yang Perlu Dikoreksi | Dropdown: Masuk / Pulang / Keduanya | Ya | |
| Keterangan | Textarea | Ya | Penjelasan singkat kejadian |
| Bukti Pendukung | File upload (image/pdf) | Opsional | Misal foto kartu rusak; untuk kasus "lupa tap" biasanya tidak ada bukti fisik |

*(Nama Lengkap, Unit, Nomor WhatsApp tidak masuk tabel ini karena diambil otomatis dari `profiles` pegawai yang login — lihat poin 3.)*

Simpan pengajuan pada tabel baru (mis. `attendance_corrections`) yang direlasikan ke `profiles(id)` dan ke `academic_years(id)` (isi otomatis dengan tahun pelajaran aktif saat submit, untuk rekap per tahun pelajaran).

### 4a. Tabel Presensi (BUAT BARU)
Sistem saat ini BELUM punya tabel presensi. Buat tabel presensi minimal, lalu relasikan koreksi ke tabel ini:
- Tabel `attendance_records` dengan kolom minimal:
  - `id uuid pk`
  - `user_id uuid` (FK `profiles(id)`)
  - `date date` (tanggal presensi)
  - `check_in timestamptz null`
  - `check_out timestamptz null`
  - `source text` (mis. `DEVICE`, `MANUAL`, `CORRECTION`)
  - `academic_year_id uuid` (FK `academic_years(id)`)
  - `note text null`
  - `created_at` / `updated_at` (+ trigger `update_updated_at_column()`)
  - unique `(user_id, date)`
- Ikuti pola RLS existing: pegawai baca record miliknya; kepala unit baca record pegawai unitnya (pola `020_employee_leaves.sql`); HRD/ADMIN full akses.
- **Saat koreksi Disetujui**: lakukan `upsert` otomatis ke `attendance_records` untuk `(user_id, Tanggal Kejadian)` sesuai "Waktu yang Perlu Dikoreksi" (isi/ubah `check_in`/`check_out`) dengan `source = CORRECTION`. Jangan mengandalkan koreksi manual di luar sistem.

### 5. Opsi Dropdown "Jenis Koreksi Presensi"
```
Lupa Tap Kartu (Masuk/Pulang)
Kartu Tertinggal/Tidak Dibawa
Kartu Hilang/Rusak
Kendala Sistem/Perangkat Presensi
```

### 5a. Status Pengajuan (enum eksplisit)
Gunakan status: `MENUNGGU` / `DISETUJUI` / `DITOLAK`. (Tidak ada `PERLU_REVISI`, berbeda dari modul Izin.)

### 6. Aturan Validasi & Logika Kondisional
- **Batas waktu pengajuan**: sebaiknya dibatasi maksimal H+2 dari tanggal kejadian, untuk mencegah koreksi mundur yang sulit diverifikasi. Tampilkan warning jika melebihi batas, dan opsional: butuh approval tambahan dari admin jika lewat batas.
- **Tidak ada branching approval Kepala Unit** — beda dengan modul Izin, form ini langsung ke antrian validasi admin/HR.
- Jika "Jenis Koreksi" = Kartu Hilang/Rusak, tampilkan info tambahan: *"Segera laporkan ke admin untuk pembuatan kartu pengganti."*

### 7. Dashboard Validasi (Admin/HR)
- List semua pengajuan koreksi dengan filter: Unit, Jenis Koreksi, Status Validasi (Menunggu/Disetujui/Ditolak), rentang tanggal.
- Admin bisa membuka detail pengajuan, lihat bukti (jika ada), lalu set status: **Disetujui / Ditolak** + kolom catatan admin.
- Saat status "Disetujui", sistem otomatis meng-upsert `attendance_records` (lihat poin 4a). Sediakan juga ringkasan hasil koreksi yang diterapkan.
- Pegawai bisa melihat status pengajuannya sendiri (riwayat + status).

### 8. Laporan/Rekap
Buat halaman rekap otomatis (bisa difilter per periode & unit):
- Jumlah koreksi presensi per Jenis Koreksi
- Jumlah koreksi presensi per Unit
- Pegawai dengan frekuensi koreksi presensi tinggi (untuk deteksi pola)
- Opsi export ke Excel/CSV (pakai library `xlsx` seperti modul Feedback)

### 8a. Counter Koreksi per Tahun Pelajaran Aktif (WAJIB)
Semua counter/agregat discope ke tahun pelajaran aktif (`academic_years WHERE is_active`), berdasarkan `academic_year_id`:
- **Pegawai (tab "Koreksi Saya")**: total jumlah pengajuan koreksi miliknya pada tahun pelajaran aktif + rincian per Jenis Koreksi + daftar riwayat.
- **Kepala Unit (tab "Unit Saya")**: tabel pegawai di unitnya beserta jumlah koreksi masing-masing pada tahun pelajaran aktif, read-only. Scope unit mengikuti pola `020_employee_leaves.sql`.
- Implementasikan agregasi via RPC/`view` Postgres agar konsisten dengan RLS.

### 9. Integrasi Google Drive untuk Penyimpanan Bukti (WAJIB)
File **Bukti Pendukung** TIDAK disimpan sebagai file/blob di server aplikasi maupun di Supabase Storage (untuk menghemat kuota Supabase). File tersebut harus diteruskan dan disimpan di **Google Drive**, dan yang disimpan di database aplikasi hanya metadata + link-nya. Implementasikan sebagai berikut:

- Gunakan **Google Drive API** dengan autentikasi **Service Account** (bukan OAuth per-pegawai). Karena deploy di Cloudflare Worker, panggil Drive REST API menggunakan **JWT service account yang ditandatangani via WebCrypto/`fetch`**.
- Siapkan satu folder root di Google Drive Yayasan (misal "Bukti Koreksi Presensi") atau subfolder di dalam folder Bukti Perizinan — sesuaikan struktur Drive yang diinginkan. Share ke email service account dengan akses **Editor**.
- Upload dilakukan di **Server Action / Route Handler** (server-side), dan hanya dijalankan jika pegawai benar-benar melampirkan file (field opsional).
- Struktur subfolder otomatis per pengajuan, contoh: `/Bukti Koreksi Presensi/{tahun-bulan}/{full_name}_{tanggal_kejadian}/`.
- Setelah upload berhasil, simpan ke database hanya: `drive_file_id`, `drive_view_link` (webViewLink), `file_name`, `mime_type`, `uploaded_at`. Jangan simpan file biner di server aplikasi maupun storage lain (Supabase Storage, S3, local disk).
- **Permission file (keputusan default): restricted** — jangan "Anyone with link". Batasi ke akses internal Yayasan; tampilkan bukti di UI sebagai tombol "Lihat Bukti" yang membuka `drive_view_link` di tab baru.
- Tangani error upload Drive secara graceful (retry sekali, lalu pesan error jelas). Jangan biarkan submission gagal total hanya karena upload Drive gagal.
- Simpan credential service account sebagai secret/env. Env yang dibutuhkan:
  - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` (isi JSON service account)
  - `GOOGLE_DRIVE_CORRECTION_FOLDER_ID` (ID folder root "Bukti Koreksi Presensi")

### 10. Catatan Teknis Tambahan
- Ikuti pola migration & RLS existing (`is_hrd()`/`is_admin()`/`is_kepala_unit()`, trigger `update_updated_at_column()`, index FK). Tambahkan migration baru bernomor urut mengikuti folder `supabase/migrations/`.
- Modul ini terpisah dari modul **Izin** (lihat prompt terpisah), meski data dari kedua modul sebaiknya bisa disandingkan dalam satu laporan kehadiran gabungan (join by `user_id` + Tanggal) tanpa mencampur logika approval-nya.
- Notifikasi WhatsApp/email otomatis: **tidak perlu diimplementasikan untuk saat ini** (belum ada integrasi WA API di sistem). Cukup andalkan status di aplikasi.

---

*Prompt ini sudah disesuaikan dengan stack `hub.nurussunnah.com` (Next.js 16 + Supabase + Cloudflare/OpenNext).*
