# Desain: Generator Carousel Lomba Kebersihan Nurus Sunnah 2026

**Tanggal:** 13 Agustus 2026
**Status:** Disetujui, siap masuk rencana implementasi
**Route:** `/kebersihan` (publik, tanpa login) — target `hub.nurussunnah.com/kebersihan`

---

## 1. Ruang lingkup

### Termasuk

Satu halaman publik di repo ini yang mengubah 4 foto area kerja menjadi 4 slide
Instagram carousel 1080×1350 bertemplate resmi, plus caption otomatis dan format
share WhatsApp. Seluruh pemrosesan gambar terjadi di browser peserta.

### Tidak termasuk

- Dokumen juknis, rubrik penilaian, mekanisme juri, timeline, dan template pesan
  WhatsApp naratif — semua itu disusun terpisah oleh PIC menggunakan Claude Design.
- Database, login, akun peserta, dashboard admin, penyimpanan submission,
  ranking, dan histori peserta. Tidak ada satu pun dari ini yang dibangun.
- Halaman `/kebersihan/juknis`. Dibatalkan atas permintaan PIC.
- Verifikasi visual otomatis (pixel diff) atas hasil render kanvas.

### Batasan yang mengikat desain

Lomba berlangsung **Sabtu, 15 Agustus 2026** — dua hari dari tanggal desain ini.
Peserta adalah guru dan karyawan yang membuka link dari grup WhatsApp di HP
Android maupun iPhone. Karena itu prioritas desain adalah **tidak gagal di HP
peserta**, bukan kecanggihan interaksi. Setiap kali ada pilihan antara solusi
elegan dan solusi yang perilakunya identik di semua browser, spec ini memilih
yang kedua.

---

## 2. Keputusan yang sudah diambil

| Topik | Keputusan | Alasan |
|---|---|---|
| Crop foto | Slider zoom + slider posisi (`<input type=range>`) | Perilaku identik di Android/iPhone/WebView. Pinch-zoom bentrok dengan zoom halaman di in-app browser WhatsApp, dan `react-easy-crop`/Cropper.js berarti dependency baru dua hari sebelum hari-H |
| Mesin render | Canvas 2D API langsung (`drawImage` + `fillText`) | Deterministik, tanpa dependency, dan seluruh geometrinya bisa dipisah ke `.mjs` murni lalu diuji `node --test` |
| Band identitas | Putih, bukan hijau tua | Wordmark logo berwarna hitam; di atas hijau tua akan hilang. Band putih menampilkan logo asli tanpa perlu diwarnai ulang |
| Aset logo | Satu file `logo.png`; emblem di-crop saat render | Tidak perlu aset kedua maupun perkakas build; angka crop ikut teruji |
| Pengambilan file | Web Share API, fallback download per slide | Sekali tap → 4 gambar masuk share sheet → "Simpan ke Foto" atau langsung Instagram |
| Daftar unit | Dropdown 9 unit + "Unit lainnya" (input bebas) | Menjaga konsistensi penulisan untuk rekap juri, tapi unit yang belum terdaftar tetap bisa ikut |
| Struktur halaman | Satu halaman scroll, bukan wizard multi-route | State ada di memori; satu salah-tap "back" di HP akan menghapus semua foto yang sudah diatur |

---

## 3. Struktur file

```
public/kebersihan/logo.png                  aset dari PIC (1240×1550, RGBA)

src/app/kebersihan/page.tsx                 shell server + metadata
src/app/kebersihan/_components/
    generator-client.tsx                    state + orkestrasi
    area-form.tsx                           unit / nama area / anggota
    photo-slot.tsx                          1 slot: pilih foto + slider zoom & posisi
    slide-preview.tsx                       <canvas> preview 4 slide
    export-actions.tsx                      share sheet / download / copy caption
    in-app-browser-notice.tsx               banner "buka di Chrome/Safari"

src/lib/kebersihan/
    slide-layout.mjs   + .d.mts   PURE      geometri seluruh zona tiap slide
    photo-fit.mjs      + .d.mts   PURE      cover-crop + clamp zoom/offset
    text-fit.mjs       + .d.mts   PURE      wrap, shrink-to-fit, tracked text
    caption.mjs        + .d.mts   PURE      caption Instagram + format share WA
    filenames.mjs      + .d.mts   PURE      nama file slide
    units.mjs          + .d.mts   PURE      daftar unit
    render-slide.ts                         satu-satunya modul yang menyentuh Canvas
    fonts.ts                                resolve family next/font untuk ctx.font

src/lib/auth/public-routes.mjs + .d.mts     isPublicRoute(pathname)
src/lib/supabase/middleware.ts              memakai isPublicRoute
```

**Aturan pemisahan:** modul `.mjs` tidak boleh mengimpor apa pun dari `next`,
`react`, atau API browser. Modul tersebut hanya menerima angka dan string, dan
mengembalikan angka dan string. `render-slide.ts` mengonsumsi objek zona dari
`slide-layout.mjs` lalu memanggil `drawImage`/`fillText` — ia tidak menghitung
koordinat sendiri.

Fungsi pengukuran teks diserahkan sebagai parameter (`measure: (text, font) =>
number`), sehingga `text-fit.mjs` bisa diuji dengan stub tanpa browser dan
dipakai dengan `ctx.measureText` di produksi.

---

## 4. Route publik

`isPublicRoute` sekarang dipisah menjadi fungsi murni karena middleware yang ada
memakai `.includes(url.pathname)` (exact match) sehingga tidak bisa menangani
sub-path.

```js
// src/lib/auth/public-routes.mjs
export const AUTH_PASS_THROUGH_ROUTES = [
  '/auth/callback', '/auth/logout', '/auth/reset-password',
]

const PUBLIC_EXACT_ROUTES = [
  '/auth/login', '/auth/forgot-password', '/register',
  ...AUTH_PASS_THROUGH_ROUTES,
]

const PUBLIC_PREFIX_ROUTES = ['/kebersihan']

export function isPublicRoute(pathname) {
  if (PUBLIC_EXACT_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIX_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
```

Perilaku yang harus tetap sama setelah perubahan:

- Tanpa sesi, `/dashboard*` tetap diarahkan ke `/auth/login`.
- Dengan sesi, route `/auth/*` selain pass-through tetap diarahkan ke `/dashboard`.
- `/kebersihan` terbuka baik bagi pengunjung tanpa sesi maupun yang sudah login.
- Middleware tetap tidak menyentuh tabel `profiles` (dijaga oleh
  `tests/cloudflare-middleware.test.mjs`).

---

## 5. Spesifikasi template carousel

### 5.1 Kanvas dan zona utama

Kanvas **1080 × 1350** (rasio 4:5). Margin global **M = 56** untuk semua elemen.

| Zona | x | y | w | h | Keterangan |
|---|---|---|---|---|---|
| Foto | 0 | 0 | 1080 | 1080 | Full-bleed, persegi |
| Hairline | 0 | 1080 | 1080 | 5 | Merah `#C1121F` pada x 0–180, emas `#C9A227` pada x 180–1080 |
| Band identitas | 0 | 1085 | 1080 | 265 | Putih |

Luas zona foto = 1080 × 1080 = 1.166.400 px², dari total 1080 × 1350 =
1.458.000 px² → **80,0%**. Angka ini jatuh tepat di tengah target 75–85% dan
berasal dari grid yang bersih (1080/1350 = 4/5), bukan hasil kira-kira.
1085 + 265 = 1350, sehingga tidak ada celah maupun tumpang tindih.

### 5.2 Scrim

Scrim adalah gradien hijau tua `#0E4527` di atas foto, satu-satunya cara teks
dijamin terbaca di atas foto apa pun.

| Scrim | Rect | Gradien vertikal |
|---|---|---|
| Atas | (0, 0, 1080, 200) | alpha 0,82 pada y=0 → alpha 0 pada y=200 |
| Bawah | (0, 700, 1080, 380) | alpha 0 pada y=700 → alpha 0,86 pada y=1080 |

Pada slide 4 mode dua foto, scrim bawah tetap memakai rect yang sama; seluruh
rentang 700–1080 berada di dalam foto bawah (544–1080), jadi tidak melintasi gap.

### 5.3 Strip atas (identik di keempat slide)

| Elemen | Posisi | Gaya |
|---|---|---|
| Plate emblem | rounded rect (56, 40, 96, 96), r=20, fill putih | Emblem fit-contain di kotak dalam (65, 49, 78, 78) |
| Eyebrow | x=172, baseline 76 | 26px / 600 / tracking 2,5 / putih — `LOMBA KEBERSIHAN NURUS SUNNAH 2026` |
| Sub-eyebrow | x=172, baseline 110 | 20px / 500 / tracking 1 / putih 82% — `HUT RI KE-81 • INDONESIA BERDAULAT, ADIL, DAN MAKMUR` |
| Badge HUT RI | rounded rect (904, 36, 120, 64), r=14, fill putih | `HUT RI` 17px/600/tracking 2 hijau, baseline 62, center x=964; `KE-81` 26px/700 merah `#C1121F`, baseline 90, center x=964 |

Badge berakhir di x = 904 + 120 = 1024, menyisakan margin kanan 56 — simetris
dengan plate di margin kiri 56. Lebar tersedia untuk sub-eyebrow adalah
172 → 880 (904 − 24) = 708px; teksnya terukur ±598px, jadi muat.

### 5.4 Band identitas (identik di keempat slide)

Kolom kiri (x 56–806) dan kolom kanan (x 830–1024).

| Elemen | Posisi | Gaya |
|---|---|---|
| Bar aksen | rect (56, 1132, 6, 100) | fill `#176D3F` |
| Nama area | x=80, baseline 1172, lebar maks 726 | 54px / 700 / `#176D3F` — shrink-to-fit 54→40, lalu ellipsis |
| Nama unit | x=80, baseline 1218, lebar maks 726 | 32px / 500 / `#3D6B52` — ellipsis bila lebih |
| Baris value | x=80, baseline 1282 | 24px / 600 / tracking 1,6 / `#C9A227` — `CERDAS • MANDIRI • BERKARAKTER QUR'ANI` |
| Emblem | fit-contain di kotak (830, 1102, 194, 142) | — |
| Handle | center x=927, baseline 1282 | 20px / 600 / `#176D3F` — `@nurussunnah.ig` |

Baris value dan handle berbagi baseline 1282, sehingga kedua kolom terlihat
duduk pada garis yang sama.

### 5.5 Pembeda tiap slide

Kicker memakai emas terang `#E3B251` karena berada di atas scrim gelap; baris
value di band memakai emas gelap `#C9A227` karena berada di atas putih. Dua tint
emas ini adalah aturan yang berlaku umum di template: **emas terang di atas
gelap, emas gelap di atas terang.**

| Slide | Kicker | Headline |
|---|---|---|
| 1 — Hero | — | `BERSIH TEMPATNYA` / `BANGGA MENJAGANYA` — 92px/700/tracking −1, putih, line-height 98, baseline terakhir 1032 |
| 2 — Wide View | `CERDAS DALAM MENATA` — 24px/600/tracking 1,6, baseline 950 | `BERSIH • RAPI • NYAMAN` — 62px/700/tracking −0,5, baseline 1024 |
| 3 — Detail | `TERTIB • RAPI • BERTANGGUNG JAWAB` — sama | `DETAIL YANG KAMI JAGA` — sama, baseline 1024 |
| 4 — Improvement | lihat 5.6 | lihat 5.6 |

Semua headline melewati shrink-to-fit dengan lebar maks 968 (= 1080 − 2×56).
Rentang ukuran: display 92→72, headline 62→48, headline slide 4 56→44.
`BANGGA MENJAGANYA` pada 92px terukur ±969px — praktis menyentuh batas, jadi
shrink-to-fit di sini bukan pengaman teoretis melainkan jalur yang benar-benar
akan terpakai.

### 5.6 Slide 4 — dua mode

Slot foto kelima (`before`) bersifat **opsional**. Ia yang membuat kriteria
*Improvement* bisa dinilai juri, tetapi tidak boleh menghalangi area yang tidak
punya foto sebelum.

**Mode satu foto** (slot `before` kosong):

- Zona foto penuh (0, 0, 1080, 1080)
- Kicker `SUDUT KEBANGGAAN AREA KAMI`, baseline 900
- Headline `KAMI MENJAGA,` / `BUKAN HANYA MEMBERSIHKAN` — 56px/700, line-height 66, baseline 964 dan 1030

**Mode dua foto** (slot `before` terisi):

| Elemen | Rect |
|---|---|
| Foto SEBELUM | (0, 0, 1080, 536) |
| Gap | (0, 536, 1080, 8) — fill putih |
| Foto SESUDAH | (0, 544, 1080, 536) |

536 + 8 + 536 = 1080, jadi grid utama tidak berubah.

- Pill `SEBELUM`: rounded rect (56, 468, auto, 44), r=22, padding-x 22, fill putih, teks 22px/700/tracking 2 warna `#176D3F`
- Pill `SESUDAH`: rounded rect (56, 568, auto, 44), spesifikasi sama, fill `#176D3F`, teks putih
- Kicker `CERDAS MENATA • MANDIRI MENJAGA • AMANAH DALAM BERKHIDMAT` — 22px/600/tracking 1,4, baseline 966
- Headline `SEBELUM & SESUDAH` — 56px/700, baseline 1030

Kedua pill sengaja diletakkan mengapit gap (satu di bawah foto atas, satu di
atas foto bawah) supaya tidak bertabrakan dengan plate emblem dan badge HUT RI di
strip atas.

### 5.7 Palet

| Token | Hex | Pemakaian |
|---|---|---|
| Hijau primer | `#176D3F` | Teks band, bar aksen, pill SESUDAH, plate |
| Hijau scrim | `#0E4527` | Gradien scrim atas & bawah |
| Putih | `#FFFFFF` | Band, plate, badge, headline, gap slide 4 |
| Merah | `#C1121F` | **Hanya dua tempat:** 180px pertama hairline, dan `KE-81` |
| Emas terang | `#E3B251` | Kicker di atas scrim |
| Emas gelap | `#C9A227` | Hairline, baris value di band |
| Hijau muted | `#3D6B52` | Nama unit di band |

Merah dibatasi pada dua tempat itu saja — inilah mekanisme konkret yang menjaga
arahan "jangan membuat desain terlalu dominan merah-putih". Emas hadir hanya
sebagai hairline dan teks kecil, tidak pernah sebagai bidang.

Hijau primer `#176D3F` dan emas `#E3B251` diambil dari token brand yang sudah
ada di `src/app/globals.css`. Emas brand diturunkan ke `#C9A227` khusus untuk
teks dan hairline agar kontrasnya memadai di atas putih.

### 5.8 Turunan aset logo

`public/kebersihan/logo.png` berukuran 1240×1550, RGBA dengan latar transparan.
Wordmark `YAYASAN ISLAM` dan `SEMARANG` berwarna hitam, sehingga logo utuh hanya
boleh dipakai di atas bidang terang.

Emblem (mihrab + bintang delapan + base kitab, tanpa wordmark) diambil saat
render lewat source-rect `drawImage`:

```js
export const EMBLEM_CROP = { sx: 96, sy: 16, sw: 1048, sh: 1140 }
```

Rasio emblem = 1048/1140 ≈ 0,919, berbeda dari rasio logo utuh 0,800. Karena
itu penempatan emblem **selalu** melalui `fitContain(srcAspect, box)`, tidak
pernah dengan lebar yang di-hardcode.

Nilai `EMBLEM_CROP` di atas adalah estimasi dari inspeksi visual dan **wajib
diverifikasi mata** pada langkah implementasi: render emblem besar sekali, pastikan
tidak ada potongan wordmark yang terbawa dan tidak ada ujung mihrab yang
terpotong, lalu setel angkanya bila perlu.

Logo utuh dipakai di hero halaman web (lewat `next/image`) dan tidak dipakai di
kanvas.

### 5.9 Font pada kanvas

`next/font` menghasilkan nama family ter-hash, jadi `ctx.font` tidak boleh
di-hardcode.

1. `await document.fonts.ready`
2. Baca `getComputedStyle(document.body).fontFamily` sebagai string family
3. Panggil `document.fonts.load()` untuk setiap kombinasi weight+size yang
   dipakai (500, 600, 700), lalu tunggu semuanya
4. Bila langkah 2–3 gagal, pakai stack fallback
   `system-ui, -apple-system, "Segoe UI", Arial, sans-serif`

Tanpa langkah ini, `fillText` bisa jatuh ke serif default dan seluruh slide
terlihat seperti dokumen Word.

**Tracking (letter-spacing) digambar manual per karakter**, tidak memakai
`ctx.letterSpacing`, karena properti itu belum ada di Safari lama. Perhitungan
advance-nya adalah fungsi murni di `text-fit.mjs` sehingga bisa diuji.

Geist adalah variable font; bila sebuah browser membulatkan weight 500/600 ke
400/700, dampak visualnya kecil dan diterima.

---

## 6. Struktur halaman

Satu halaman scroll, urutan seksi mengikuti file konsep:

| # | Seksi | Isi |
|---|---|---|
| 1 | Hero | Logo utuh, `LOMBA KEBERSIHAN AREA KERJA`, `Yayasan Islam Nurus Sunnah 2026`, `Sabtu, 15 Agustus 2026`, tagline `Bersih Tempatnya, Bangga Menjaganya`, baris value, CTA **BUAT CAROUSEL** (scroll ke generator) |
| 2 | Petunjuk singkat | 4 kartu: **Siapkan Foto → Upload → Download → Posting** |
| 3 | Generator | Unit (dropdown + "Unit lainnya"), Nama area, Anggota (+ Tambah Anggota), Foto 1–4, Foto "sebelum" (opsional) |
| 4 | Preview | 4 kanvas preview |
| 5 | Download | **SIMPAN 4 SLIDE** (share sheet) + tombol per slide sebagai fallback |
| 6 | Caption | Caption otomatis + **COPY CAPTION**; teks share WhatsApp + **COPY** |
| 7 | Instruksi akhir | Posting Carousel → Tag @nurussunnah.ig → Copy Link → Share ke Grup SI Nurus Sunnah |

Tiap slot foto diberi label fungsinya, bukan hanya nomor: *Foto 1 — Hero*,
*Foto 2 — Wide View (kondisi menyeluruh)*, *Foto 3 — Detail*,
*Foto 4 — Improvement / Sustainability*, *Foto sebelum (opsional)*.

Seksi 3 memuat pernyataan tegas: **"Foto diproses di HP Anda dan tidak diunggah
ke server."** Ini bukan sekadar catatan teknis — inilah yang membuat pegawai,
khususnya akhwat, nyaman memakai generator, dan ia benar secara faktual karena
tidak ada satu pun `fetch` atau server action di halaman ini.

### Daftar unit

`units.mjs` mengekspor:

```
Yayasan
KB-TK Islam Nurus Sunnah
SD Islam Nurus Sunnah
SMP Islam Nurus Sunnah
MA Nurus Sunnah
PPTQ Nurus Sunnah
Pondok Nurus Sunnah
TPA Nurus Sunnah
NUSA Boarding School
Unit lainnya   → membuka input teks bebas
```

Penulisan persis tiap unit sebaiknya dikonfirmasi PIC sebelum sosialisasi;
mengubahnya hanya menyentuh satu file ini.

---

## 7. State dan alur data

Seluruh state ada di klien. Tidak ada server action, tidak ada `fetch`, tidak ada
database.

```
unit         string          nilai dropdown
unitOther    string          dipakai bila unit === 'Unit lainnya'
area         string
members      string[]        minimal 1 nama
slots        Record<SlotId, { bitmap, zoom, offsetX, offsetY }>
                             SlotId = 1|2|3|4|'before'
renders      Blob[]          hasil generate
```

Alur satu foto:

```
File
 → createImageBitmap, turunkan ke ≤2400px sisi panjang
 → simpan bitmap di state
 → tiap perubahan slider: render ke canvas preview 360×450
 → tombol Generate: render ulang 1080×1350, toBlob('image/jpeg', 0.92)
```

**Geometri selalu dihitung pada 1080×1350; preview hanya menerapkan
`ctx.scale(1/3)`.** Ini menghapus kemungkinan dua sumber kebenaran layout —
apa yang tampak di preview identik dengan yang diekspor — sekaligus menjaga
slider tetap ringan di HP kelas menengah.

### Kendali posisi: sumbu ditentukan oleh slack

Cover-crop menyisakan kelonggaran hanya pada sumbu yang lebih panjang dari kotak
tujuan. Foto landscape 4:3 yang dipotong ke kotak persegi memotong **sisi
kiri-kanan**, jadi yang dibutuhkan adalah kendali horizontal — bukan vertikal.
Sebaliknya foto landscape yang masuk ke zona split slide 4 (1080×536) memotong
atas-bawah. Karena itu satu slider vertikal saja tidak cukup.

`photo-fit.mjs` mengembalikan `slack: { x, y }` dalam piksel sumber, dan
`photo-slot.tsx` **hanya menampilkan slider untuk sumbu yang slack-nya > 0**:

| Kondisi | Slider yang muncul |
|---|---|
| Landscape → kotak persegi, zoom 1 | zoom + posisi horizontal |
| Portrait → kotak persegi, zoom 1 | zoom + posisi vertikal |
| Persegi → kotak persegi, zoom 1 | zoom saja |
| Zoom > 1 (apa pun sumbernya) | zoom + horizontal + vertikal |

`zoom`, `offsetX`, dan `offsetY` semuanya di-clamp oleh `photo-fit.mjs` sehingga
tepi kosong tidak mungkin muncul: `zoom` minimum adalah skala cover, dan kedua
offset dibatasi pada tepi gambar.

### Nama file ekspor

```
Kebersihan-2026_{unitSlug}_{areaSlug}_Slide-{n}.jpg
```

Slug: karakter non `[A-Za-z0-9]` diganti `-`, dirapatkan, dipangkas, maksimum 32
karakter per segmen. Nomor slide ikut di nama agar urutan carousel tidak tertukar
saat peserta memilih gambar di Instagram — ini mitigasi langsung atas risiko
"urutan carousel salah".

---

## 8. Caption dan format share

`caption.mjs` mengekspor tiga fungsi murni.

### `instagramCaption({ unit, area, members })`

```
🇮🇩 Bersih Tempatnya, Bangga Menjaganya

Dalam semangat HUT ke-81 Republik Indonesia, kami berikhtiar menjaga tempat
kami bekerja dan berkhidmat agar tetap bersih, rapi, nyaman, dan terawat.

📍 Area: {AREA}
🏫 Unit: {UNIT}

Anggota area:
1. {ANGGOTA_1}
2. {ANGGOTA_2}

Di Nurus Sunnah, kami belajar untuk cerdas dalam menata, mandiri dalam menjaga,
dan menjadikan kebersihan sebagai bagian dari amanah dalam berkhidmat.

Karena rasa memiliki tidak cukup hanya diucapkan. Ia terlihat dari bagaimana
kita menjaga tempat yang telah Allah amanahkan kepada kita.

Bersih Tempatnya, Bangga Menjaganya.
Cerdas • Mandiri • Berkarakter Qur'ani

@nurussunnah.ig

#LombaKebersihanNurusSunnah #BersihTempatnyaBanggaMenjaganya #NurusSunnah
#HUTRI81 #CerdasMandiriBerkarakterQurani
```

Tepat 5 hashtag, sesuai batas maksimum 4–5.

### `instagramCaptionShort({ unit, area, members })`

Versi singkat: tagline, area, unit, daftar anggota, satu baris value, mention,
hashtag yang sama. Untuk peserta yang ingin caption tidak panjang.

### `whatsappSubmission({ unit, area, members, link })`

```
🇮🇩 Lomba Kebersihan Nurus Sunnah 2026

🏫 Unit: {UNIT}
📍 Area: {AREA}

👥 Anggota:
1. {ANGGOTA_1}

🔗 Instagram:
{LINK}
```

Bila `link` kosong, barisnya menjadi `(tempel link postingan di sini)` sehingga
peserta tahu apa yang harus dilengkapi setelah posting. Halaman ini tidak
menyediakan kolom input link — peserta menempelkannya langsung di WhatsApp.

Daftar anggota selalu bernomor dan **selalu memuat seluruh nama** yang diisi,
karena keikutsertaan dinilai per tim area, bukan per individu.

---

## 9. Penanganan kegagalan

| Risiko | Penanganan |
|---|---|
| Foto HEIC dari iPhone gagal di-decode | Tangkap error decode, tampilkan: *"Format foto ini tidak didukung browser. Pilih foto JPG/PNG, atau ubah setelan Kamera iPhone ke 'Paling Kompatibel'."* |
| Foto 12MP bikin kehabisan memori di HP low-end | Turunkan ke ≤2400px sisi panjang sebelum disimpan di state, mengikuti pola yang sudah ada di `src/lib/evidence-upload-client.ts` |
| Web Share API tidak tersedia | Feature-detect `navigator.canShare({ files })`; bila tidak ada, tampilkan 4 tombol download terpisah. Preview juga tetap bisa long-press-save |
| Dibuka dari in-app browser WhatsApp | Deteksi UA WebView → banner "Buka di Chrome/Safari", karena download dan share sheet tidak andal di sana |
| Nama family `next/font` ter-hash | Prosedur di 5.9; gagal → stack fallback, teks tidak pernah jadi serif default |
| `logo.png` gagal dimuat | Render wordmark teks sebagai ganti emblem; ekspor tetap berjalan. Generator tidak boleh gagal total hanya karena satu aset |
| Clipboard API diblokir | Fallback `textarea` + `select()`; caption selalu tampil sebagai teks yang bisa diblok manual |
| Area atau anggota kosong | Tombol Generate disabled, pesan inline di field yang bersangkutan |
| Nama area sangat panjang | Shrink-to-fit 54→40px lalu ellipsis; layout band tidak pernah rusak |
| Peserta hanya mengunggah 3 foto | Generate disabled sampai slot 1–4 terisi; slot `before` tetap opsional |

---

## 10. Rencana test

Semua test memakai `node --test tests/*.test.mjs` (perintah `npm test` yang sudah ada).

```
tests/kebersihan-slide-layout.test.mjs
  · zona foto tepat 80,0% dari area kanvas
  · foto + hairline + band = 1350, tanpa celah dan tanpa tumpang tindih
  · slide 4 mode dua foto: dua zona sama tinggi + gap 8px = 1080
  · margin kiri dan kanan konsisten 56 di keempat slide
  · badge HUT RI berakhir tepat pada margin kanan (simetris dengan plate)

tests/kebersihan-photo-fit.test.mjs
  · sumber landscape, portrait, dan persegi selalu menutup penuh kotak tujuan
  · zoom di bawah skala cover di-clamp → tepi kosong tidak mungkin terjadi
  · offsetX di-clamp pada tepi kiri dan kanan gambar
  · offsetY di-clamp pada tepi atas dan bawah gambar
  · slack: landscape → kotak persegi memberi slack.x > 0 dan slack.y === 0
  · slack: portrait → kotak persegi memberi slack.y > 0 dan slack.x === 0
  · slack: landscape → zona split 1080×536 memberi slack.y > 0
  · zoom > 1 memberi slack pada kedua sumbu
  · fitContain menghormati rasio emblem 0,919 tanpa distorsi

tests/kebersihan-text-fit.test.mjs        (measure di-stub)
  · headline panjang di-wrap pada batas lebar 968
  · nama area panjang: 54px → turun bertahap → 40px → ellipsis
  · advance tracked-text sama dengan lebar teks + tracking × (jumlah karakter − 1)

tests/kebersihan-caption.test.mjs
  · caption memuat unit, area, dan SELURUH anggota dalam urutan bernomor
  · caption memuat @nurussunnah.ig
  · jumlah hashtag maksimum 5
  · versi singkat tetap memuat seluruh anggota
  · format share WA memuat Unit, Area, Anggota, dan Link
  · link kosong menghasilkan placeholder, bukan baris kosong

tests/kebersihan-filenames.test.mjs
  · nomor slide 1..4 ikut di nama file
  · slug ter-sanitasi dan dipangkas 32 karakter

tests/kebersihan-public-route.test.mjs
  · isPublicRoute('/kebersihan') true
  · isPublicRoute('/kebersihan/apa-pun') true
  · isPublicRoute('/dashboard') false
  · isPublicRoute('/auth/login') true
  · middleware memakai isPublicRoute (asersi teks sumber, mengikuti pola
    tests/cloudflare-middleware.test.mjs)
```

Test yang sudah ada wajib tetap lulus, khususnya
`tests/cloudflare-middleware.test.mjs` dan
`tests/password-change-access-gate.test.mjs`, karena keduanya menyentuh
middleware yang sama.

### Verifikasi manual

Otomasi tidak menjangkau hasil visual. Sebelum sosialisasi, buka `/kebersihan`
dan periksa:

1. Emblem tidak membawa potongan wordmark dan ujung mihrab tidak terpotong
   (setel `EMBLEM_CROP` bila perlu)
2. Teks memakai Geist, bukan serif fallback
3. Keempat slide terlihat sebagai satu design system
4. Slider zoom dan posisi terasa wajar di HP asli, bukan hanya di DevTools
5. Share sheet benar-benar memunculkan 4 gambar di satu HP Android dan satu iPhone
6. Nama area panjang tidak merusak band

---

## 11. Yang membuat rancangan ini tahan dua hari

- Tidak ada dependency baru. Semua dibangun dari Canvas API, React, dan Tailwind
  yang sudah ada di repo.
- Bagian paling berisiko (kanvas) dipersempit ke satu modul tipis; seluruh
  aritmatikanya berada di `.mjs` murni yang teruji.
- Tidak ada database, tidak ada upload, tidak ada state server — jadi tidak ada
  migrasi, tidak ada kuota storage, dan tidak ada yang bisa rusak di sisi server
  pada hari-H.
- Setiap kegagalan yang terduga punya jalur mundur yang tetap menghasilkan 4
  slide, bukan halaman error.
