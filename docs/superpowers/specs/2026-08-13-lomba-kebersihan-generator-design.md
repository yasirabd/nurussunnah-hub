# Desain: Generator Carousel Lomba 5R Nurus Sunnah 2026

**Tanggal:** 13 Agustus 2026
**Status:** Revisi 3 — lomba diketahui berkerangka 5R, bukan sekadar kebersihan
**Route:** `/kebersihan` (publik, tanpa login) — target `hub.nurussunnah.com/kebersihan`

> **Revisi 3 mengubah kerangka lombanya, bukan mekanismenya.** Lomba ini adalah
> **Lomba 5R — Ringkas, Rapi, Resik, Rawat, Rajin** (padanan Indonesia untuk 5S
> Jepang), di mana Resik hanya satu dari lima. Seluruh arsitektur, rasterisasi,
> route, dan struktur foto revisi 2 tetap berlaku. Yang berubah: penyebutan
> lomba di slide dan halaman, teks caption, hashtag, dan penambahan `SLOT_PRINCIPLES`
> yang menamai R mana yang dinilai dari tiap foto.
>
> Karena teks itu tercetak **di dalam slide** hasil port desain, berkas rujukan
> `docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html` ikut disunting
> agar port dan rujukannya tidak berselisih. **Proyek Claude Design milik PIC
> belum diperbarui**, jadi berkas rujukan di repo inilah yang sekarang berlaku.

> **Revisi 2 mengganti keputusan inti revisi 1.** Revisi 1 menggambar slide manual
> dengan Canvas 2D karena belum ada desain resmi. Desain resmi kini tersedia
> (Claude Design, `Twibbon Lomba Kebersihan v2.dc.html`) dan terlalu kaya untuk
> digambar ulang dengan tangan. Seluruh tabel piksel Canvas di revisi 1 gugur dan
> digantikan bab 6–9 di bawah. Yang tetap berlaku dari revisi 1: ruang lingkup,
> route publik, daftar unit, caption, nama file, penanganan in-app browser, dan
> jaminan privasi foto.

---

## 1. Ruang lingkup

### Termasuk

Satu halaman publik yang mengubah **5 foto** area kerja menjadi **4 slide**
Instagram carousel 1080×1350 memakai template resmi hasil desain PIC, plus
caption otomatis dan format share WhatsApp. Seluruh pemrosesan gambar terjadi di
browser peserta.

### Tidak termasuk

- Dokumen juknis, rubrik penilaian, mekanisme juri, dan timeline — disusun
  terpisah oleh PIC menggunakan Claude Design.
- Database, login, akun peserta, dashboard admin, penyimpanan submission,
  ranking, dan histori peserta.
- Verifikasi visual otomatis (pixel diff) atas hasil rasterisasi.
- Perubahan desain slide. Desain di-port **apa adanya**; spec ini tidak
  menambah, mengurangi, atau menata ulang elemen visual apa pun.

### Batasan yang mengikat

Lomba berlangsung **Sabtu, 15 Agustus 2026** — dua hari dari tanggal spec ini.
Peserta adalah guru dan karyawan yang membuka link dari grup WhatsApp di HP
Android maupun iPhone. Prioritasnya **tidak gagal di HP peserta**, bukan
kecanggihan interaksi.

---

## 2. Sumber desain

Sumber kebenaran visual adalah proyek Claude Design milik PIC:

```
project 8c89dc12-e8d7-42b9-a915-e211986419ad  "Twibbon Lomba Kebersihan"
  Twibbon Lomba Kebersihan v2.dc.html     ← yang di-implementasi
  assets/logo.png
  assets/hut81.webp
```

`image-slot.js` dan `support.js` adalah runtime Claude Design (drag-drop
placeholder dan bridge editor). **Keduanya tidak di-port.** Padanannya di aplikasi
kita adalah `photo-slot.tsx` dengan slider crop. Satu-satunya hal yang diambil
dari `image-slot.js` adalah perilakunya: slot mengisi penuh kontainernya dengan
`cover`.

Bila desain di Claude Design berubah setelah spec ini, port di repo tidak ikut
berubah otomatis — perubahan harus dibawa manual.

---

## 3. Keputusan

| Topik | Keputusan | Alasan |
|---|---|---|
| Mesin render | **DOM/CSS asli + rasterisasi klien** (`modern-screenshot`) | Desain punya ±200 elemen berposisi dengan gradient berlapis, `clip-path`, multi-shadow, dan rotasi. Menggambar ulang di Canvas 2D butuh 1500+ baris dan berhari-hari iterasi — tidak mungkin selesai Sabtu dan pasti melenceng dari desain |
| Font | **Self-host ketiga family** via `next/font/local` | Dua alasan: (a) build Cloudflare pernah pecah karena `next/font/google` menghasilkan URL WOFF2 usang yang 404; (b) rasterizer hanya bisa meng-embed font same-origin — URL Google Fonts akan gagal CORS |
| Crop foto | Slider zoom + slider posisi (`<input type=range>`) | Perilaku identik di Android/iPhone/WebView. Pinch-zoom bentrok dengan zoom halaman di in-app browser WhatsApp |
| Jumlah foto | **5 wajib** (hero, wide, detail, sebelum, sesudah) | Slide 4 desain menampilkan dua foto berdampingan; tidak ada mode satu foto |
| Pengambilan file | Web Share API, fallback download per slide | Sekali tap → 4 gambar masuk share sheet → "Simpan ke Foto" atau langsung Instagram |
| Daftar unit | Dropdown 9 unit + "Unit lainnya" (input bebas) | Konsistensi penulisan untuk rekap juri, tapi unit yang belum terdaftar tetap bisa ikut |
| Struktur halaman | Satu halaman scroll, bukan wizard multi-route | State ada di memori; satu salah-tap "back" di HP menghapus semua foto yang sudah diatur |

---

## 4. Struktur file

```
public/kebersihan/logo.png                  dari assets/logo.png
public/kebersihan/hut81.webp                dari assets/hut81.webp

src/app/fonts/plus-jakarta-sans-{400,600,700,800}.woff2
src/app/fonts/lora-italic-{500,600}.woff2
src/app/fonts/amiri-{400,700}.woff2

src/app/kebersihan/page.tsx                 shell server + metadata
src/app/kebersihan/kebersihan-fonts.ts      next/font/local ketiga family
src/app/kebersihan/_components/
    generator-client.tsx                    state + orkestrasi
    area-form.tsx                           unit / nama area / anggota
    photo-slot.tsx                          1 slot: pilih foto + slider
    slide-stage.tsx                         wrapper scale untuk preview
    export-actions.tsx                      share sheet / download / copy caption
    in-app-browser-notice.tsx               banner "buka di Chrome/Safari"
    slides/
        slide-hero.tsx                      port SLIDE 1
        slide-wide.tsx                      port SLIDE 2
        slide-detail.tsx                    port SLIDE 3
        slide-improvement.tsx               port SLIDE 4
        decorations.tsx                     sapu, botol semprot, ember,
                                            bunting, sparkle, gelembung
        promo-bar.tsx                        bar emas SPMB
        slide-frame.tsx                      akar 1080×1350 + header bersama

src/lib/kebersihan/
    crop-axes.mjs      + .d.mts   PURE      sumbu slider yang perlu ditampilkan
    slot-sizes.mjs     + .d.mts   PURE      dimensi tiap slot foto
    caption.mjs        + .d.mts   PURE      caption Instagram + format share WA
    filenames.mjs      + .d.mts   PURE      nama file slide
    units.mjs          + .d.mts   PURE      daftar unit
    rasterize.ts                            modern-screenshot + warm-up + retry
    image-decode.ts                         decode & downscale foto peserta

src/lib/auth/public-routes.mjs + .d.mts     isPublicRoute(pathname)
src/lib/supabase/middleware.ts              memakai isPublicRoute
```

Modul `.mjs` tidak boleh mengimpor apa pun dari `next`, `react`, atau API
browser — hanya menerima dan mengembalikan angka dan string, sehingga bisa diuji
dengan `node --test` tanpa browser.

---

## 5. Route publik

Middleware yang ada memakai `.includes(url.pathname)` (exact match) sehingga
tidak bisa menangani sub-path. Keputusannya dipindah ke fungsi murni:

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

Perilaku yang wajib tetap sama:

- Tanpa sesi, `/dashboard*` tetap diarahkan ke `/auth/login`.
- Dengan sesi, `/auth/*` selain pass-through tetap diarahkan ke `/dashboard`.
- `/kebersihan` terbuka bagi pengunjung tanpa sesi maupun yang sudah login.
- Middleware tetap tidak menyentuh tabel `profiles`
  (dijaga `tests/cloudflare-middleware.test.mjs`).

---

## 6. Port desain

### 6.1 Aturan port

Setiap slide menjadi satu komponen React yang me-render div akar
`position:relative; width:1080px; height:1350px; overflow:hidden`, isinya
dipindahkan dari desain dengan **nilai yang sama persis** — warna, ukuran,
offset, rotasi, `clip-path`, `border-radius`, dan shadow tidak diubah.

Style inline desain dipindah ke `style={{ … }}` React. Nilai yang berulang di
banyak tempat (warna, gradient kartu hijau, gradient bar emas) diangkat menjadi
konstanta di `slides/tokens.ts` agar tidak ada angka yang menyimpang diam-diam
antar slide.

Blok yang identik di beberapa slide dijadikan komponen bersama:

| Komponen | Muncul di |
|---|---|
| `promo-bar.tsx` — bar emas SPMB | slide 1, 2, 3, 4 |
| header logo + judul + HUT-81 | slide 2, 3, 4 |
| bunting 24 segitiga | slide 2, 3, 4 |
| kartu hijau (gradient 145° + 4 shadow) | slide 2, 3, 4 |
| sapu, botol semprot, ember, sparkle, gelembung | tersebar |

Slide 3 adalah cermin slide 2 (radius foto, sisi kartu, dan sisi ilustrasi
ditukar). Keduanya tetap ditulis sebagai dua komponen terpisah, bukan satu
komponen ber-prop `mirrored` — perbedaannya bukan sekadar cermin (warna
ilustrasi, isi kicker, dan susunan sparkle berbeda), dan menyatukannya justru
menyulitkan penelusuran saat desain direvisi.

### 6.2 Yang diparameterkan

Desain hanya punya dua prop, dan itu tidak bertambah:

| Prop | Muncul di |
|---|---|
| `areaName` | slide 1 (44px), slide 2, 3, 4 (dalam `{{ areaName }} — {{ unitName }}`) |
| `unitName` | idem |

`bunting` bukan input peserta melainkan nilai turunan: 24 elemen berselang-seling
`#FDFCF8` dan `#B7212A`.

**Daftar anggota tidak muncul di slide mana pun** — ia hanya masuk caption.
Ini sesuai desain dan tidak diubah.

### 6.3 Slot foto

Lima slot, dimensi diambil dari kontainer masing-masing di desain:

| Slot id | Slide | Lebar × tinggi | Rasio |
|---|---|---|---|
| `hero` | 1 | 1080 × 1350 | 0,800 |
| `wide` | 2 | 1008 × 880 | 1,145 |
| `detail` | 3 | 1008 × 880 | 1,145 |
| `before` | 4 | 620 × 440 | 1,409 |
| `after` | 4 | 740 × 450 | 1,644 |

### 6.3.1 R yang dinilai tiap slot

`SLOT_PRINCIPLES` menamai prinsip mana yang dibuktikan oleh tiap foto, dan
ditampilkan sebagai lencana di atas pemilih fotonya. Tanpa ini peserta menebak
apa yang dicari juri dari sebuah frame.

| Slot | R yang dinilai |
|---|---|
| `hero` | — (foto sampul, bukan bukti satu prinsip) |
| `wide` | Ringkas & Rapi |
| `detail` | Resik |
| `before` | Rawat & Rajin |
| `after` | Rawat & Rajin |

Struktur foto **tidak berubah** dari revisi 2. Lima slot yang sama tetap
memberi makan empat slide yang sama; yang bertambah hanya penamaan prinsipnya.
Alternatif "satu foto per R" ditolak karena akan mengubah makna tiap slot dan
memaksa desain slide dirombak dua hari sebelum lomba.

Kelima R juga muncul di slide itu sendiri: `Ringkas • Rapi • resik` sebagai
headline slide 2, `RESIK SAMPAI SUDUT` sebagai kicker slide 3, dan
`RAWAT & RAJIN` sebagai kicker baru di kartu slide 4. Sebuah test menolak
keadaan di mana salah satu R tidak disebut di slide mana pun.

`wide` dan `detail` berasal dari kontainer `top:130 left:36 right:36 bottom:340`
pada kanvas 1080×1350 → 1008 × 880.

Tiap slot berisi:

```html
<img style="width:100%; height:100%; object-fit:cover;
            object-position:{x}% {y}%; transform:scale({zoom});" />
```

`object-fit:cover` menjamin slot selalu terisi penuh, dan `object-position`
di-clamp otomatis oleh browser pada 0%–100% — jadi tepi kosong tidak mungkin
muncul tanpa perlu perhitungan clamp manual. Ini penyederhanaan nyata
dibanding revisi 1, yang harus menghitung clamp sendiri karena Canvas tidak
punya padanan `object-fit`.

### 6.4 Sumbu slider

`crop-axes.mjs` menentukan slider mana yang ditampilkan, karena menampilkan
slider pada sumbu yang tidak punya kelonggaran hanya membingungkan peserta:

```js
positionAxes(imgW, imgH, boxW, boxH, zoom) -> { x: boolean, y: boolean }
```

| Kondisi | Slider |
|---|---|
| Foto lebih "lebar" dari slot, zoom 1 | zoom + horizontal |
| Foto lebih "tinggi" dari slot, zoom 1 | zoom + vertikal |
| Rasio foto sama dengan slot, zoom 1 | zoom saja |
| zoom > 1 | zoom + horizontal + vertikal |

---

## 7. Font

Tiga family, di-self-host di `src/app/fonts/` dan dimuat dengan
`next/font/local` di `kebersihan-fonts.ts`:

| Family | Weight | Subset | Dipakai untuk |
|---|---|---|---|
| Plus Jakarta Sans | 400, 600, 700, 800 | latin | Seluruh teks utama |
| Lora | 500, 600 — **italic** | latin | Kata beraksen: *bangga menjaganya*, *nyaman*, *kami jaga*, *bukan hanya membersihkan* |
| Amiri | 400, 700 | arabic | Hadits `الطُّهُورُ شَطْرُ الْإِيمَانِ` di slide 1 |

Ketiganya diekspos sebagai CSS variable dan dipakai hanya di dalam subtree
`/kebersihan`, sehingga tidak mengubah tipografi dashboard.

Repo sudah punya Noto Sans Arabic self-hosted untuk salam Arab di halaman login.
**Amiri tidak menggantikannya** — keduanya hidup berdampingan karena dipakai di
tempat berbeda dengan karakter tipografi berbeda.

Berkas WOFF2 diunduh sekali saat implementasi lalu di-commit ke repo. Setelah
itu build tidak pernah lagi menghubungi Google Fonts.

---

## 8. Aset

| Sumber lokal | Tujuan | Keterangan |
|---|---|---|
| `Downloads/logo nurussunnah (4).png` | `public/kebersihan/logo.png` | 1240×1550, RGBA transparan |
| `Downloads/81_RI_2026.svg.webp` | `public/kebersihan/hut81.webp` | Logo resmi HUT RI ke-81 "Indonesia Berdaulat, Adil dan Makmur" |

Keduanya dirujuk sebagai path same-origin agar rasterizer dapat meng-inline-nya
tanpa masalah CORS.

Desain memakai logo utuh (dengan wordmark) di atas plate krem `#FDFCF8` dan di
header krem — jadi wordmark hitamnya selalu berada di atas bidang terang. Masalah
kontras yang dibahas di revisi 1 sudah diselesaikan oleh desain itu sendiri, dan
**crop emblem tidak lagi diperlukan**.

---

## 9. Rasterisasi

`rasterize.ts` membungkus `modern-screenshot`:

```ts
domToJpeg(node, { width: 1080, height: 1350, quality: 0.92, scale: 1 })
```

Empat hal yang wajib benar:

1. **Node yang dirasterisasi harus berukuran penuh 1080×1350.** Preview
   memperkecil dengan `transform: scale(k)` pada wrapper luar
   (`slide-stage.tsx`); node slide di dalamnya tetap 1080×1350 dan itulah yang
   diserahkan ke rasterizer. `transform` tidak mengubah ukuran layout, jadi satu
   node yang sama melayani preview dan ekspor — tidak ada dua sumber kebenaran.
2. **Warm-up.** Panggilan pertama di Safari kerap kehilangan font atau gambar
   yang belum sempat ter-embed. Render dilakukan dua kali dan hasil pertama
   dibuang.
3. **Font siap sebelum render.** `await document.fonts.ready` sebelum panggilan
   pertama.
4. **Urut, bukan paralel.** Empat slide dirasterisasi berurutan agar HP kelas
   menengah tidak kehabisan memori.

Skala preview dihitung dari lebar kontainer (`ResizeObserver`):
`k = containerWidth / 1080`, dan tinggi wrapper `1350 × k`.

---

## 10. State dan alur data

Seluruh state ada di klien. Tidak ada server action, tidak ada `fetch`, tidak ada
database.

```
unit         string        nilai dropdown
unitOther    string        dipakai bila unit === 'Unit lainnya'
area         string
members      string[]      minimal 1 nama
slots        Record<SlotId, { src, imgW, imgH, zoom, posX, posY }>
                           SlotId = 'hero'|'wide'|'detail'|'before'|'after'
renders      Blob[]        hasil rasterisasi
```

Alur satu foto:

```
File
 → decode, turunkan ke ≤2400px sisi panjang, jadikan object URL
 → simpan src + dimensi asli di state
 → slider mengubah zoom / posX / posY → CSS berubah, preview langsung ikut
 → tombol Generate: rasterisasi 4 slide berurutan → Blob[]
```

Karena crop dikerjakan CSS, menggeser slider **tidak** memicu render ulang
gambar — hanya perubahan properti CSS. Ini yang membuatnya tetap ringan di HP.

Object URL dibebaskan (`URL.revokeObjectURL`) saat foto diganti atau komponen
dilepas.

### Nama file ekspor

```
Kebersihan-2026_{unitSlug}_{areaSlug}_Slide-{n}.jpg
```

Slug: karakter non `[A-Za-z0-9]` diganti `-`, dirapatkan, dipangkas, maksimum 32
karakter per segmen. Nomor slide ikut di nama agar urutan carousel tidak tertukar
saat peserta memilih gambar di Instagram.

---

## 11. Halaman

| # | Seksi | Isi |
|---|---|---|
| 1 | Hero | Logo, nama lomba, `Sabtu, 15 Agustus 2026`, tagline, value, CTA **BUAT CAROUSEL** |
| 2 | Petunjuk | 4 kartu: **Siapkan Foto → Upload → Download → Posting** |
| 3 | Generator | Unit, Nama area, Anggota, dan 5 slot foto berlabel fungsi |
| 4 | Preview | 4 slide ter-scale |
| 5 | Download | **SIMPAN 4 SLIDE** (share sheet) + tombol per slide |
| 6 | Caption | Caption otomatis + **COPY**; teks share WhatsApp + **COPY** |
| 7 | Instruksi akhir | Posting → Tag @nurussunnah.ig → Copy Link → Share ke Grup SI Nurus Sunnah |

Label slot: *Foto 1 — Hero*, *Foto 2 — Wide View (kondisi menyeluruh)*,
*Foto 3 — Detail*, *Foto 4 — SEBELUM*, *Foto 5 — SESUDAH*.

Seksi 3 memuat pernyataan **"Foto diproses di HP Anda dan tidak diunggah ke
server."** Ini benar secara faktual karena tidak ada satu pun `fetch` atau server
action di halaman ini, dan inilah yang membuat pegawai — khususnya akhwat —
nyaman memakainya.

### Daftar unit

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

Penulisan persisnya perlu dikonfirmasi PIC sebelum sosialisasi; mengubahnya hanya
menyentuh `units.mjs`.

---

## 12. Caption dan format share

`caption.mjs` mengekspor tiga fungsi murni: `instagramCaption`,
`instagramCaptionShort`, dan `whatsappSubmission`.

### `instagramCaption({ unit, area, members })`

```
🇮🇩 Bersih Tempatnya, Bangga Menjaganya

Hari ini kami membenahi tempat kami sendiri. Menyisihkan barang yang tidak
lagi terpakai, mengembalikan sisanya ke tempatnya, lalu membersihkan sampai
ke sudut. Pekerjaan yang sederhana, tapi rasanya berbeda setelah selesai.

📍 {AREA}
🏫 {UNIT}

Terima kasih untuk yang mengerjakannya bersama-sama:
1. {ANGGOTA_1}
2. {ANGGOTA_2}

Bagi kami, 5R bukan soal dinilai, tapi soal merawat tempat yang Allah
titipkan. Semoga yang kami benahi hari ini menjadi kebiasaan, bukan kerja
sekali jalan.

Selamat HUT ke-81 Republik Indonesia.
Indonesia Berdaulat, Adil, dan Makmur.

Bersih Tempatnya, Bangga Menjaganya
Ringkas • Rapi • Resik • Rawat • Rajin
Cerdas • Mandiri • Berkarakter Qur'ani

@nurussunnah.ig

#Lomba5RNurusSunnah #RingkasRapiResikRawatRajin
#BersihTempatnyaBanggaMenjaganya #NurusSunnah #HUTRI81
```

Tepat 5 hashtag.

**Nada.** Kehangatan datang dari detail konkret dan kalimat pendek, bukan dari
kata sifat. Draf pertama membuka seperti siaran pers ("Dalam semangat HUT ke-81
Republik Indonesia, kami berikhtiar…") dan membacakan ketiga value dalam satu
paragraf tersendiri, sehingga terasa kelembagaan alih-alih manusiawi. Daftar
anggota juga dibuka dengan ucapan terima kasih, bukan label "Anggota area:".

**Emoji.** Hanya 🇮🇩 📍 🏫 di caption, dan 🇮🇩 📍 🏫 👥 🔗 di teks WhatsApp.
Bendera adalah pasangan regional indicator `U+1F1EE U+1F1E9`; **Windows
menampilkannya sebagai huruf "ID"** karena Segoe UI Emoji tidak memuat glyph
bendera negara, sedangkan Android, iOS, dan Instagram menampilkannya sebagai
bendera. Ini bukan kerusakan encoding. Sebuah test menguji code point-nya
persis, karena `scripts/seed.mjs` di repo ini membuktikan mojibake bisa terjadi.

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

Bila `link` kosong, barisnya menjadi `(tempel link postingan di sini)`. Halaman
tidak menyediakan kolom input link — peserta menempelkannya di WhatsApp.

Daftar anggota selalu bernomor dan memuat **seluruh** nama, karena penilaian
dilakukan per tim area.

---

## 13. Penanganan kegagalan

| Risiko | Penanganan |
|---|---|
| **Rasterisasi gagal di iOS Safari** | Warm-up render ganda; bila tetap gagal, tombol **Coba Lagi** yang merender ulang satu slide, dan pesan yang menyarankan buka di Safari biasa |
| Foto HEIC dari iPhone gagal di-decode | Pesan: *"Format foto ini tidak didukung browser. Pilih foto JPG/PNG, atau ubah setelan Kamera iPhone ke 'Paling Kompatibel'."* |
| Foto 12MP bikin kehabisan memori | Turunkan ke ≤2400px sisi panjang sebelum dipakai, mengikuti pola `src/lib/evidence-upload-client.ts` |
| Font belum termuat saat rasterisasi | `await document.fonts.ready` + warm-up; font self-host jadi tidak ada request lintas origin |
| Aset logo / HUT-81 gagal dimuat | Rasterisasi ditunda sampai `img.decode()` kedua aset selesai; bila gagal, ekspor dihentikan dengan pesan jelas — lebih baik daripada mengirim slide tanpa logo |
| Web Share API tidak tersedia | Feature-detect `navigator.canShare({ files })` → 4 tombol download terpisah |
| Dibuka dari in-app browser WhatsApp | Deteksi UA WebView → banner "Buka di Chrome/Safari" |
| Clipboard API diblokir | Fallback `textarea` + `select()`; caption selalu tampil sebagai teks yang bisa diblok manual |
| Area / anggota / foto belum lengkap | Tombol Generate disabled sampai kelima slot dan seluruh field terisi |
| Nama area sangat panjang | Desain memakai teks satu baris; port menambahkan `overflow-wrap` dan batas lebar agar membungkus, tidak meluber keluar kanvas |

---

## 14. Rencana test

`node --test tests/*.test.mjs` (perintah `npm test` yang sudah ada).

```
tests/kebersihan-crop-axes.test.mjs
  · foto landscape → slot hero (0,800) memberi slack horizontal saja
  · foto portrait  → slot wide (1,145) memberi slack vertikal saja
  · rasio sama dengan slot → tidak ada slider posisi
  · zoom > 1 memberi slack pada kedua sumbu

tests/kebersihan-slot-sizes.test.mjs
  · kelima slot punya lebar dan tinggi positif
  · slot wide dan detail berukuran sama (1008 × 880)
  · slot hero berukuran penuh 1080 × 1350

tests/kebersihan-caption.test.mjs
  · caption memuat unit, area, dan SELURUH anggota bernomor
  · caption memuat @nurussunnah.ig
  · jumlah hashtag maksimum 5
  · versi singkat tetap memuat seluruh anggota
  · format share WA memuat Unit, Area, Anggota, Link
  · link kosong menghasilkan placeholder, bukan baris kosong

tests/kebersihan-filenames.test.mjs
  · nomor slide 1..4 ikut di nama file
  · slug ter-sanitasi dan dipangkas 32 karakter

tests/kebersihan-public-route.test.mjs
  · isPublicRoute('/kebersihan') dan '/kebersihan/apa-pun' true
  · isPublicRoute('/dashboard') false
  · isPublicRoute('/auth/login') true
  · middleware memakai isPublicRoute (asersi teks sumber)

tests/kebersihan-slide-contract.test.mjs        (asersi teks sumber)
  · keempat komponen slide memakai width 1080px dan height 1350px
  · font Amiri, Lora, dan Plus Jakarta Sans dimuat lewat next/font/local,
    bukan next/font/google
  · berkas WOFF2 ada di src/app/fonts/ dan berukuran wajar
```

Test yang sudah ada wajib tetap lulus, khususnya
`tests/cloudflare-middleware.test.mjs`, `tests/local-arabic-font.test.mjs`, dan
`tests/password-change-access-gate.test.mjs`.

Selain itu `npx tsc --noEmit` dan `npm run build` harus bersih.

### Verifikasi manual

Otomasi tidak menjangkau hasil visual. Sebelum sosialisasi:

1. Bandingkan keempat slide hasil ekspor dengan desain Claude Design
   berdampingan — warna, rotasi, dan posisi ilustrasi
2. Hadits Arab tampil dengan Amiri dan harakatnya utuh
3. Kata italic Lora tampil italic, bukan tegak
4. Logo dan HUT-81 muncul di hasil ekspor, bukan hanya di preview
5. **Ekspor berhasil di satu iPhone dan satu Android asli** — ini pengujian
   yang paling menentukan, karena di situlah risiko terbesar berada
6. Share sheet memunculkan keempat gambar
7. Nama area panjang tidak meluber keluar kanvas
