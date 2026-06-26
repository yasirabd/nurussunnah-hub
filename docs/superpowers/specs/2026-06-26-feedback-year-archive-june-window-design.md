# Feedback Tahun Pelajaran Arsip dan Batas Pengisian Juni

## Context

Halaman `Feedback Rekan Kerja` saat ini selalu memakai tahun pelajaran aktif. Setelah Admin mengganti tahun pelajaran aktif, pegawai tidak punya cara untuk memilih tahun pelajaran sebelumnya, sehingga feedback yang diterima pada periode lama tidak tampil di halaman.

User menyetujui aturan baru: pengisian feedback rekan kerja hanya dibuka dari 1 Juni 00:00 sampai 30 Juni 23:59 WIB setiap tahun. Di luar rentang itu, pegawai hanya boleh melihat feedback yang diterima.

## Goals

1. Pegawai dapat melihat feedback masuk dari tahun pelajaran sebelumnya.
2. Halaman feedback memiliki pemilih tahun pelajaran.
3. Pengisian dan perubahan feedback hanya bisa dilakukan pada tahun pelajaran aktif selama bulan Juni WIB.
4. Aturan penguncian berlaku di UI dan di database, sehingga submit langsung ke RPC tetap ditolak.
5. HRD/Admin/Kepala Unit tetap dapat melihat monitoring sesuai hak akses untuk tahun pelajaran yang dipilih.

## Non-Goals

1. Tidak menambah email reminder atau job terjadwal.
2. Tidak mengubah aturan anonimitas feedback masuk pegawai.
3. Tidak mengubah scope target rekan kerja selain penguncian periode.
4. Tidak membuat setting tanggal dinamis di UI pada batch ini.

## Recommended Approach

Gunakan satu halaman yang sama dengan query parameter `year=<academic_year_id>`.

Jika query `year` kosong, halaman memilih tahun pelajaran aktif. Jika query berisi tahun pelajaran valid, halaman membaca data feedback untuk tahun tersebut. Semua kartu read/monitoring memakai tahun terpilih.

Form pengisian hanya aktif bila tahun terpilih adalah tahun pelajaran aktif dan waktu server dalam zona Asia/Jakarta berada pada bulan Juni, mulai 1 Juni 00:00:00 sampai sebelum 1 Juli 00:00:00. Batas "30 Juni 23:59" direpresentasikan sebagai `now_wib < 1 Juli 00:00:00`, agar detik terakhir bulan Juni tetap diterima.

## User Experience

Halaman menampilkan selector `Tahun Pelajaran` di header. Defaultnya tahun pelajaran aktif.

Status periode tampil sebagai badge:

- `Periode pengisian dibuka` jika tahun terpilih aktif dan sekarang bulan Juni WIB.
- `Periode pengisian ditutup` jika tahun terpilih aktif tetapi sekarang bukan bulan Juni WIB.
- `Arsip tahun pelajaran` jika tahun terpilih bukan tahun aktif.

Saat periode pengisian dibuka, pegawai melihat target feedback dan dapat mengisi atau memperbarui feedback.

Saat periode pengisian tertutup atau tahun arsip dipilih, pegawai tetap melihat `Feedback Masuk`, tetapi form pengisian tidak dapat digunakan. Area `Daftar Rekan` diganti dengan kartu informatif singkat yang menjelaskan bahwa pengisian sedang terkunci, agar tidak terlihat seperti data hilang.

HRD/Admin/Kepala Unit memakai selector yang sama. Monitoring dan feedback teridentifikasi membaca tahun terpilih.

## Data Flow

1. Server page membaca semua `academic_years`, diurutkan dari terbaru.
2. Server page menentukan `selectedYear` dari query `year`, fallback ke tahun aktif.
3. Server page menghitung `canSubmitFeedback`:
   - `selectedYear.id === activeYear.id`
   - bulan saat ini di Asia/Jakarta adalah Juni.
4. Server page memanggil RPC feedback dengan `selectedYear.id`.
5. `FeedbackTargetCarousel` menerima `canSubmitFeedback` dan pesan lock.
6. `submitFeedbackAction` tetap mengirim ke RPC yang sama.
7. RPC `submit_peer_feedback` menolak submit jika bukan bulan Juni WIB atau tahun yang dikirim bukan tahun aktif.

## Database Rules

`submit_peer_feedback` perlu guard tambahan:

- Autentikasi tetap wajib.
- `p_academic_year_id` harus sama dengan `academic_years.id` yang `is_active = true`.
- Waktu saat ini dalam zona `Asia/Jakarta` harus berada pada bulan Juni.

Contoh logika Postgres:

```sql
extract(month from (now() at time zone 'Asia/Jakarta')) = 6
```

Untuk menjaga konsistensi dengan UI, fungsi dapat memakai helper SQL kecil seperti `public.is_feedback_submission_open()` yang mengembalikan boolean. Helper ini memudahkan test query dan mengurangi duplikasi.

## Security and Privacy

Identitas pemberi feedback tetap tidak dibuka untuk pegawai. Pegawai tetap menggunakan RPC `get_received_feedback_anonymous`.

HRD/Admin tetap memakai RPC `get_feedback_identified`. Kepala Unit tetap hanya mendapat monitoring scoped tanpa identitas pemberi.

Karena RPC memakai `SECURITY DEFINER`, fungsi harus tetap memiliki `SET search_path = public`, revoke execute dari `public`, grant hanya ke `authenticated`, dan validasi `auth.uid()` sebelum operasi tulis.

## Error Handling

Jika tahun pelajaran query tidak valid, halaman fallback ke tahun aktif. Jika tidak ada tahun aktif, halaman menampilkan empty state yang sudah ada.

Jika user submit di luar periode, RPC mengembalikan error:

`Pengisian feedback hanya dibuka pada bulan Juni.`

Jika user submit untuk tahun arsip, RPC mengembalikan error:

`Feedback hanya dapat diisi untuk tahun pelajaran aktif.`

## Testing

Tambahkan helper tanggal murni yang menerima `Date` sebagai input, sehingga batas periode bisa diuji tanpa bergantung pada jam aktual. Minimal test:

- 31 Mei WIB: submit tertutup.
- 1 Juni 00:00 WIB: submit terbuka.
- 30 Juni 23:59 WIB: submit terbuka.
- 1 Juli 00:00 WIB: submit tertutup.

Verifikasi implementasi:

- TypeScript check.
- Build Next.js.
- SQL migration review untuk fungsi RPC.
- Manual smoke test halaman `/dashboard/feedback` dengan dan tanpa query `year`.

## Implementation Notes

Perubahan utama akan menyentuh:

- `src/app/dashboard/feedback/page.tsx`
- `src/app/dashboard/feedback/feedback-target-carousel.tsx`
- `src/app/dashboard/feedback/actions.ts`
- `supabase/migrations/*`
- `src/types/database.ts` bila signature atau return type berubah.

Migration harus dibuat lewat Supabase CLI jika tersedia, bukan nama manual, mengikuti workflow Supabase di repo.
