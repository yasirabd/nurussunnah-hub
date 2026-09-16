# Menu Peraturan dan SK Yayasan

Status: Disetujui untuk implementasi oleh pengguna pada 16 September 2026.

## Keputusan yang disepakati

- Satu menu berisi tata tertib pegawai dan SK yayasan tentang aturan umum.
- SK individual, termasuk pengangkatan, mutasi, dan sanksi seseorang, di luar cakupan.
- Dokumen berupa PDF yang dapat dibaca langsung di website.
- Seluruh pegawai dapat membaca dokumen.
- HRD dan Admin mengelola, mengunggah, dan menerbitkan dokumen; pegawai lainnya hanya membaca.
- Halaman utama hanya menampilkan aturan yang berlaku.
- Dokumen yang dicabut atau diganti tetap tersedia dalam arsip dengan penanda Tidak Berlaku.
- Tidak ada tombol atau pencatatan Saya sudah membaca.
- Unggahan disimpan sebagai draf; HRD/Admin memeriksa PDF kemudian menekan Terbitkan.
- Tanggal mulai berlaku wajib diisi. Hanya aturan yang sudah berlaku boleh diterbitkan; tidak ada publikasi terjadwal atau pengumuman aturan masa depan pada versi awal.
- Pegawai boleh mengunduh PDF selain membacanya langsung di website.
- PDF disimpan di bucket privat Supabase Storage dan diakses melalui login Hub.
- PDF yang sudah diterbitkan tidak boleh ditimpa. Dokumen pengganti dibuat sebagai draf; penerbitannya sekaligus mengarsipkan aturan lama.

## Rancangan tampilan

- Menu Peraturan & SK Yayasan tersedia pada navigasi desktop dan seluler.
- Dua tampilan untuk pegawai: Berlaku sebagai tampilan awal, dan Arsip. Draf hanya terlihat oleh HRD/Admin.
- Daftar menampilkan judul, jenis dokumen, nomor jika ada, tanggal mulai berlaku, dan status. Pencarian sederhana berdasarkan judul/nomor serta filter Tata Tertib atau SK Yayasan.
- Halaman detail memiliki alamat tetap berdasarkan ID dokumen, pembaca PDF di website, dan tombol Unduh PDF.
- Detail arsip selalu menampilkan Tidak Berlaku beserta tautan pengganti jika ada. Alamat detail lama tetap dapat dibuka sebagai arsip.
- HRD/Admin memiliki aksi Tambah Dokumen, Edit Draf, Terbitkan, Buat Pengganti, dan Arsipkan. Tidak ada penghapusan permanen dokumen terbit dalam versi awal.

## Data dan alur

Formulir memuat judul wajib, jenis wajib (Tata Tertib/SK Yayasan), nomor dokumen (wajib untuk SK), tanggal mulai berlaku wajib, dan satu PDF wajib sebelum penerbitan. Batas awal unggahan 10 MiB.

Satu tabel menyimpan metadata dokumen, lokasi berkas privat, status (draf/berlaku/arsip), referensi dokumen yang digantikan bila ada, serta pelaku dan waktu pembuatan, penerbitan, dan pengarsipan. Tidak menyimpan aktivitas membaca pegawai.

1. HRD/Admin mengisi metadata dan mengunggah PDF sebagai draf. Pegawai tidak dapat membaca metadata maupun berkas draf.
2. HRD/Admin membuka pratinjau dan menekan Terbitkan. Server memastikan PDF tersedia dan tanggal mulai berlaku tidak melewati hari ini di Asia/Jakarta.
3. Untuk pengganti, draf menunjuk satu dokumen lama yang masih berlaku. Dokumen lama tetap berlaku selama draf belum diterbitkan.
4. Penerbitan pengganti dan pengarsipan dokumen lama berlangsung dalam satu transaksi database. Pemeriksaan ulang status mencegah dua penerbitan bersamaan mengganti dokumen lama yang sama.
5. Arsipkan dapat digunakan tanpa pengganti ketika aturan dicabut. Tanggal dan pelaku pengarsipan dicatat.

Dokumen terbit dan arsip tidak diedit langsung. Koreksi dibuat sebagai dokumen pengganti. Versi awal hanya mendukung penggantian keseluruhan satu dokumen; perubahan sebagian pasal atau penggabungan beberapa aturan tidak diotomatisasi.

## Penyimpanan dan keamanan

- Gunakan bucket privat khusus aturan, terpisah dari PDF kepegawaian individual. Supabase sudah menjadi dependensi aplikasi.
- Hak baca metadata dan objek Storage ditegakkan dengan RLS, bukan hanya menyembunyikan tombol. Pegawai dengan akses Hub membaca dokumen berlaku/arsip; HRD/Admin juga membaca dan mengelola draf. Akses anonim ditolak.
- Pembaca memperoleh URL bertanda tangan berumur pendek setelah pemeriksaan akses. URL berkas tidak dibuat publik permanen; tautan rujukan yang dibagikan adalah halaman detail Hub.
- Validasi judul, jenis, nomor SK, tanggal, ukuran, MIME, dan penanda PDF di server sebelum menerima unggahan. Batasi operasi Storage agar PDF terbit tidak dapat ditimpa atau dihapus melalui API langsung.
- Identitas pelaku dan waktu perubahan berasal dari sesi/server. Transisi status dilakukan melalui operasi database yang memeriksa peran dan keadaan terkini; penulisan langsung tidak boleh melewati aturan tersebut.

## Kegagalan dan aksesibilitas

- Unggahan gagal tidak menerbitkan dokumen. Simpan metadata hanya setelah unggahan berhasil; kegagalan penyimpanan metadata memicu pembersihan objek baru, dengan pencatatan bila pembersihan gagal.
- Penggantian berkas draf tidak membuang berkas sebelumnya sebelum perubahan berhasil disimpan.
- Kegagalan penerbitan pengganti mempertahankan aturan lama sebagai berlaku; transaksi dibatalkan sepenuhnya.
- Pembaca memiliki judul yang dapat diakses, navigasi keyboard, pesan kegagalan, dan aksi coba lagi/unduh. Pratinjau diuji di desktop dan seluler. Mulai dengan kemampuan PDF browser; bila browser seluler sasaran tidak menampilkan PDF di halaman, gunakan renderer PDF untuk memenuhi pembacaan di website sebelum fitur dinyatakan selesai.
- Keadaan daftar kosong dan hasil pencarian kosong memiliki keterangan yang jelas.

## Verifikasi implementasi

- Pegawai tidak dapat mengubah data, menerbitkan, atau membaca draf, termasuk melalui API database dan Storage langsung.
- HRD/Admin dapat membuat draf, membaca pratinjau, menerbitkan, dan mengarsipkan. Pengguna tanpa login ditolak.
- Tanggal masa depan, berkas non-PDF, ukuran berlebih, dan metadata wajib kosong ditolak.
- Penggantian berhasil menerbitkan satu dokumen baru dan mengarsipkan dokumen lama secara atomik; kegagalan dan penerbitan bersamaan tidak merusak status.
- Berkas terbit/arsip tidak dapat ditimpa atau dihapus, termasuk melalui Storage langsung.
- Arsip tetap dapat dibaca/diunduh dan ditandai Tidak Berlaku. Draf tidak muncul di daftar pegawai.
- Pembacaan PDF, unduhan, navigasi keyboard, serta tampilan desktop/seluler diverifikasi. Jalankan pemeriksaan tipe, lint, dan build sesuai perubahan.

## Di luar cakupan

SK individual, tanda tangan digital, persetujuan berjenjang, pencatatan sudah membaca, notifikasi, pencarian isi PDF/OCR, publikasi terjadwal, dan editor isi PDF.

## Konteks aplikasi

Menu Dokumen Kepegawaian saat ini dibatasi untuk HRD/Admin dan berfungsi membuat surat penawaran kerja. Menu aturan umum memiliki fungsi dan pembaca yang berbeda.

Repositori memiliki integrasi Google Drive untuk unggahan dan migrasi bucket privat Supabase Storage untuk PDF surat pernyataan kerja. Supabase Storage dipilih agar akses dokumen mengikuti login Hub tanpa pengaturan izin Google Drive terpisah; bucket aturan memiliki kebijakan akses tersendiri.

## Implementasi dan penerapan

- Route: `/dashboard/policies`, `/dashboard/policies/new`, `/dashboard/policies/[id]`, dan endpoint PDF `/dashboard/policies/[id]/file`.
- Terapkan `supabase/migrations/043_policy_documents.sql` sebelum merilis menu. Migrasi menambah tabel, bucket privat, RLS, RPC, dan perlindungan objek PDF; tidak mengubah dokumen atau aturan yang sudah ada.
- Unggahan menggunakan `SUPABASE_SERVICE_ROLE_KEY` di server setelah pemeriksaan hak akses. Variabel ini sudah digunakan aplikasi; tidak dikirim ke browser.
- Pembaca menggunakan PDF.js agar dapat merender di ponsel. Font, CMap, dan decoder disalin ke `public/pdfjs` oleh `scripts/prepare-pdf-assets.mjs` saat instalasi dan sebelum build. Hanya aset pustaka ini yang melewati middleware login; seluruh PDF pegawai tetap privat.
- URL Storage ditandatangani selama 60 detik; tautan rujukan permanen tetap halaman detail Hub.

## Bukti pengujian lokal

- 206 tes Node lulus, termasuk validasi metadata/PDF serta penjagaan server action baru.
- Skrip `scripts/check-policy-db.mjs` menjalankan migrasi dalam PostgreSQL lokal sementara melalui PGlite: anon/pegawai/HRD/Admin, RLS metadata/Storage, penolakan mutasi langsung, draf usang, tanggal masa depan, larangan perubahan PDF, rollback penggantian kedua, arsip, akun nonaktif, dan wajib ganti password.
- Skrip SQL dapat dijalankan dengan `node scripts/check-policy-db.mjs <lokasi-instalasi-pglite>/dist/index.js`. PGlite hanya alat pengujian sementara, bukan dependensi produksi. Fixture merepresentasikan tabel auth/profile/Storage minimal; pengujian ini bukan pengujian Storage API Supabase live atau dua koneksi PostgreSQL paralel.
- Pembaca diuji dengan Edge headless pada viewport 1280x900 dan 390x844: rendering dua halaman, navigasi, teks, unduhan, tidak ada luapan horizontal, kegagalan pemuatan dan coba lagi. Route/berkas fixture sementara dihapus setelah pengujian.
- Pemeriksaan TypeScript dan lint berkas fitur lulus. Lint global masih menemukan error lama di keluaran build/worktree dan modul kebersihan; tidak diperbaiki dalam fitur ini.
- Build produksi Next.js dan bundel Cloudflare berhasil. Fixture pengujian tidak masuk ke daftar route hasil build.
- Pengguna telah menjalankan migrasi di SQL Editor Supabase. Verifikasi baca langsung mengonfirmasi seluruh kolom tabel tersedia, bucket `policy-pdfs` privat, batas 10 MiB, MIME hanya `application/pdf`, dan akses tabel anonim ditolak. Verifikasi tidak mengubah data. Deployment aplikasi dan smoke test unggah/publikasi melalui aplikasi live masih diperlukan.
