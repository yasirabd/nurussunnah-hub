# Google Form Final — Konfirmasi Penawaran Kerja & Data PKWT
**Yayasan Islam Nurus Sunnah**

> Dokumen acuan pembuatan Google Form. Tiap field mencantumkan **tipe input**, **wajib/opsional**, **validasi**, dan **pemetaan ke database** (kolom Supabase) untuk memudahkan proses intake → PKWT.

---

## Pengaturan Form (Settings)

- **Collect email addresses**: ON (Verified) → memudahkan identifikasi pengisi.
- **Limit to 1 response**: ON (pengisi harus login Google — wajib karena ada upload file).
- **Make this a quiz**: OFF.
- **Section branching**: aktif (lihat Section 1).
- File upload (Section 5) otomatis tersimpan ke **Google Drive** form owner → kolom Sheet berisi **URL file**.

### Catatan kolom Google Sheet (untuk parser intake TSV)
Urutan kolom di Sheet respons:
1. `Timestamp` (otomatis)
2. `Email Address` (karena Collect email = ON)
3. Lalu kolom mengikuti **urutan pertanyaan** di bawah (atas → bawah, lintas section).

> Field branching (alamat domisili, alasan menolak) tetap memiliki kolom di Sheet; **kosong** bila tidak diisi. Parser harus toleran sel kosong.

> **Urutan kolom aktual (implementasi parser `src/lib/intake-parse.mjs`):**
> `0 Timestamp, 1 Email Address, 2 Nama Lengkap, 3 Unit Penempatan, 4 Posisi yang Ditawarkan,`
> `5 Bersedia?, 6 Alasan menolak, 7 Nama sesuai KTP, 8 NIK, 9 Tempat Lahir, 10 Tanggal Lahir,`
> `11 Jenis Kelamin, 12 Status Pernikahan, 13 Pendidikan Terakhir, 14 Program studi, 15 Alamat KTP,`
> `16 Alamat domisili, 17 Nomor WhatsApp, 18 Email aktif, 19 Nama kontak darurat,`
> `20 Hubungan kontak darurat, 21 No HP kontak darurat, 22 Tgl sesuai surat?, 23 Usulan tgl mulai,`
> `24 Keterangan tgl, 25 Ukuran seragam, 26 URL KTP, 27 URL pas foto, 28 Pernyataan.`
> Catatan: **Unit Penempatan mendahului Posisi**; tidak ada pertanyaan "domisili sama?"; kolom 23–24 (usulan tanggal & keterangan) **tidak disimpan** ke database (hanya konfirmasi kesiapan).

---

## Deskripsi Form (header)

```
Alhamdulillah, selamat atas kelulusan Ustadz/Ustadzah dalam proses seleksi pegawai
Yayasan Islam Nurus Sunnah.

Form ini digunakan untuk:
- Mengonfirmasi kesediaan menerima penawaran kerja.
- Melengkapi data yang diperlukan dalam penyusunan Perjanjian Kerja Waktu Tertentu (PKWT).

Mohon mengisi seluruh data dengan benar sesuai identitas resmi.
```

---

# SECTION 1 — Konfirmasi Penawaran Kerja

| # | Pertanyaan | Tipe | Wajib | Validasi / Pilihan | → Kolom DB |
|---|-----------|------|-------|--------------------|-----------|
| 1 | Nama Lengkap (sesuai Surat Penawaran) | Short answer | Ya | — | (cek silang) |
| 2 | Posisi yang Ditawarkan | Dropdown | Ya | Daftar posisi (sesuaikan) | `position_histories.position_name` (acuan) |
| 3 | Unit Penempatan | Dropdown | Ya | Daftar `units.name` | `home_unit_id` (acuan) |
| 4 | Apakah Ustadz/Ustadzah bersedia menerima penawaran kerja ini? | Multiple choice | Ya | • Ya, saya bersedia bergabung • Tidak, saya belum dapat menerima | arsip |

### Branching pada pertanyaan #4
- **"Ya, saya bersedia bergabung"** → lanjut ke **Section 2**.
- **"Tidak, ..."** → lanjut ke **Section 1b** (alasan), lalu **Submit** (form selesai).

## SECTION 1b — Alasan (hanya jika menolak)

| # | Pertanyaan | Tipe | Wajib | → Kolom DB |
|---|-----------|------|-------|-----------|
| 5 | Mohon sampaikan alasan tidak menerima penawaran. | Paragraph | Ya | arsip |

> Setelah section ini → **Submit form** (Go to: Submit form).

---

# SECTION 2 — Data Identitas

| # | Pertanyaan | Tipe | Wajib | Validasi / Pilihan | → Kolom DB |
|---|-----------|------|-------|--------------------|-----------|
| 6 | Nama lengkap sesuai KTP | Short answer | Ya | — | `profiles.full_name` |
| 7 | NIK (Nomor Induk Kependudukan) | Short answer | Ya | Regex 16 digit: `^\d{16}$` | `profiles.nik` *(kolom baru)* |
| 8 | Tempat lahir | Short answer | Ya | — | `profiles.birth_place` |
| 9 | Tanggal lahir | Date | Ya | Format tanggal | `profiles.birth_date` |
| 10 | Jenis kelamin | Multiple choice | Ya | • Laki-laki • Perempuan | `profiles.gender` (L/P) |
| 11 | Status pernikahan | Multiple choice | Ya | • Belum Menikah • Menikah • Duda/Janda | `profiles.marital_status` |
| 12 | Pendidikan terakhir | Multiple choice | Ya | • SMA/SMK/Sederajat • D3 • S1 • S2 • S3 | `profiles.last_education` |
| 13 | Program studi / jurusan | Short answer | Ya | — | `profiles.study_program` |
| 14 | Alamat sesuai KTP | Paragraph | Ya | — | `profiles.address_ktp` |
| 15 | Apakah alamat domisili sama dengan alamat KTP? | Multiple choice | Ya | • Ya • Tidak | (penentu #16) |
| 16 | Alamat domisili (isi jika berbeda) | Paragraph | Tidak* | — | `profiles.address_domicile` |
| 17 | Nomor WhatsApp aktif | Short answer | Ya | Regex: `^(\+62|62|0)8\d{7,12}$` | `profiles.phone` |
| 18 | Email aktif | Short answer | Ya | Validasi email | `profiles.email` |

> *#16 ditampilkan/diisi hanya jika #15 = "Tidak". Google Form tidak bisa branching dalam 1 section, jadi gunakan teks bantuan: "Kosongkan jika sama dengan KTP." Saat intake, HRD set `address_domicile = address_ktp` bila kosong.

---

# SECTION 3 — Kontak Darurat

| # | Pertanyaan | Tipe | Wajib | → Kolom DB |
|---|-----------|------|-------|-----------|
| 19 | Nama kontak darurat | Short answer | Ya | `employee_intake.emergency_name` |
| 20 | Hubungan dengan kontak darurat | Short answer | Ya | `employee_intake.emergency_relation` |
| 21 | Nomor HP kontak darurat | Short answer | Ya | `employee_intake.emergency_phone` |

---

# SECTION 4 — Data Kepegawaian

| # | Pertanyaan | Tipe | Wajib | Validasi / Pilihan | → Kolom DB |
|---|-----------|------|-------|--------------------|-----------|
| 22 | Apakah tanggal mulai bekerja sesuai dengan Surat Penawaran Kerja? | Multiple choice | Ya | • Ya • Tidak | arsip |
| 23 | Tanggal usulan mulai bekerja (isi jika "Tidak") | Date | Tidak | — | `employee_intake.proposed_start_date` |
| 24 | Keterangan (isi jika "Tidak") | Paragraph | Tidak | — | `employee_intake.start_date_note` |
| 25 | Ukuran seragam | Multiple choice | Ya | • XS • S • M • L • XL • XXL • XXXL | `employee_intake.uniform_size` |

---

# SECTION 5 — Upload Dokumen

| # | Pertanyaan | Tipe | Wajib | Ketentuan | → Kolom DB |
|---|-----------|------|-------|-----------|-----------|
| 26 | Upload scan/foto KTP | File upload | Ya | Image/PDF, maks 10 MB, 1 file | `employee_intake.ktp_url` |
| 27 | Upload pas foto formal | File upload | Ya | Image, maks 10 MB, 1 file | `employee_intake.photo_url` → juga `profiles.avatar_url` |

> File tersimpan otomatis di Google Drive milik form. Sheet menyimpan **URL**. Supabase hanya menyimpan URL (tidak menyalin file).

---

# SECTION 6 — Pernyataan

Tipe: **Checkboxes** (semua wajib dicentang). → arsip (tidak masuk DB).

```
[ ] Saya telah membaca dan memahami seluruh isi Surat Penawaran Kerja.
[ ] Saya bersedia menerima penawaran kerja dari Yayasan Islam Nurus Sunnah.
[ ] Saya bersedia menandatangani Perjanjian Kerja Waktu Tertentu (PKWT) sesuai ketentuan Yayasan.
[ ] Saya bersedia mengikuti proses onboarding dan masa probation sesuai kebijakan Yayasan.
[ ] Saya menyatakan bahwa seluruh data dan dokumen yang saya berikan adalah benar
    serta dapat dipertanggungjawabkan.
```

> Saran teknis: buat **satu** pertanyaan Checkboxes berisi 5 item, dengan **Response validation → "Select at least 5"** agar semua wajib dicentang.

---

# Pesan Setelah Submit (Confirmation message)

```
Jazakumullahu khairan.

Konfirmasi Ustadz/Ustadzah telah kami terima.

HRD akan melakukan verifikasi data dan menghubungi Ustadz/Ustadzah terkait
penandatanganan PKWT serta jadwal onboarding.

Semoga Allah Subhanahu wa Ta'ala memberikan kemudahan dan keberkahan.
```

---

## Ringkasan Pemetaan Data (Form → Supabase)

### Masuk `profiles` (data pegawai permanen)
`full_name`, `nik`*, `birth_place`, `birth_date`, `gender`, `marital_status`, `last_education`, `study_program`, `address_ktp`, `address_domicile`, `phone`, `email`, `avatar_url` (dari pas foto).
*Kolom `nik` perlu ditambahkan via migrasi.*

### Masuk `employee_intake` (tabel baru, data rekrutmen/PKWT)
`emergency_name`, `emergency_relation`, `emergency_phone`, `uniform_size`, `proposed_start_date`, `start_date_note`, `ktp_url`, `photo_url`.

### Diisi HRD saat intake (bukan dari calon)
`employee_no` (NIY), `home_unit_id`, `position_name`, `employee_status`, `active_status`, roles, password awal (`bismillahns`, `must_change_password = true`).

### Arsip Google Sheet saja (tidak masuk DB)
Konfirmasi Ya/Tidak (#4), alasan menolak (#5), tanggal sesuai surat? (#22), 5 checkbox pernyataan (Section 6).

### Diisi saat generate PKWT (di luar scope intake — tabel `pkwt_contracts` ke depan)
Tugas tambahan, atasan langsung, koordinasi, masa kontrak (mulai–selesai), komponen gaji & tunjangan.
