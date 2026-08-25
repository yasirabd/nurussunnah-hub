# Desain: Kanban GitHub dan Launcher Lokal Codex

**Tanggal:** 25 Agustus 2026
**Status:** Disetujui
**Repository:** `nurussunnah-hub`

## 1. Tujuan

Menyediakan alur kerja pribadi yang menyimpan bug dan fitur dalam satu GitHub
Project, lalu membuka sesi Codex CLI lokal secara semi-otomatis ketika sebuah
issue telah siap dikerjakan.

Sistem harus:

- menangani bug dan fitur;
- menjalankan maksimal satu task pada satu waktu;
- memastikan 9router aktif sebelum Codex dibuka;
- menjaga perubahan pada branch terpisah;
- menghasilkan Pull Request untuk ditinjau dan di-merge manual;
- tidak pernah deploy, menjalankan migration, atau mengubah data production.

## 2. Ruang lingkup

### Termasuk

- GitHub Project dengan empat status.
- Dua GitHub Issue Form: bug dan fitur.
- Label sebagai gerbang automasi.
- PowerShell launcher lokal.
- Windows Task Scheduler untuk polling berkala.
- Preflight repository, GitHub CLI, 9router, dan Codex CLI.
- Pembukaan sesi Codex interaktif dengan prompt issue.
- Mode dry-run dan pengujian launcher.
- Dokumentasi instalasi dan pemulihan manual.

### Tidak termasuk

- Auto-merge Pull Request.
- Auto-deploy.
- Beberapa task atau worktree paralel.
- Codex GitHub Action di cloud.
- Notion atau sinkronisasi dua arah.
- Integrasi khusus Sentry/Cloudflare pada tahap awal. Sumber otomatis dapat
  membuat issue berlabel `bug` di kemudian hari tanpa mengubah arsitektur.

## 3. Struktur kanban

Satu GitHub Project menggunakan empat status:

| Status | Makna |
|---|---|
| `Backlog` | Ide fitur dan laporan bug yang belum siap dikerjakan |
| `Ready` | Task jelas dan siap diberikan kepada Codex |
| `Doing` | Codex sedang bekerja atau Pull Request sedang ditinjau |
| `Done` | Pull Request sudah di-merge dan issue ditutup |

Urutan kartu pada setiap kolom menjadi prioritas. Tidak ada field Size, Area,
Source, atau Priority pada versi awal.

Label minimum:

- `bug`
- `feature`
- `codex-ready`
- `codex-running`

`codex-ready` adalah gerbang eksplisit. Memindahkan kartu ke `Ready` saja tidak
menjalankan launcher; pengguna juga memasang label ini setelah isi issue selesai
ditinjau.

Workflow bawaan GitHub Project menambahkan semua issue repository ke `Backlog`.
Ini berlaku untuk issue yang dibuat manual maupun issue bug yang kelak dibuat
oleh CI atau monitoring production.

## 4. Format issue

### Bug

```markdown
## Masalah
Apa yang tidak bekerja?

## Cara reproduksi
Langkah singkat untuk memunculkan error.

## Hasil yang diharapkan
Apa yang seharusnya terjadi?

## Bukti
Error log atau screenshot jika ada.
```

### Fitur

```markdown
## Tujuan
Apa yang ingin ditambahkan?

## Perilaku
Bagaimana fitur digunakan?

## Selesai jika
- [ ] Kriteria hasil pertama
- [ ] Kriteria hasil kedua
```

Issue Form memberi label `bug` atau `feature` secara otomatis. Sebuah issue
boleh diberi `codex-ready` jika tujuan, hasil akhir, dan bukti yang relevan sudah
cukup jelas untuk dikerjakan tanpa keputusan produk tambahan.

## 5. Arsitektur

```text
GitHub Issue + Project
        |
        | polling setiap 1 menit
        v
PowerShell launcher lokal
        |
        | preflight dan named mutex
        v
9router pada 127.0.0.1:20128
        |
        | provider siap
        v
Windows Terminal + Codex CLI interaktif
        |
        | branch dan Pull Request
        v
GitHub Issue + Project
```

Windows Task Scheduler menjalankan launcher hanya ketika pengguna sedang login,
agar Windows Terminal dapat terlihat. Launcher menggunakan named mutex lokal
untuk mencegah dua proses berjalan bersamaan.

Repository dan default branch ditemukan dari remote Git saat instalasi.
Nomor GitHub Project diberikan sebagai parameter wajib kepada installer dan
disimpan sebagai argumen Scheduled Task; tidak ada token atau secret yang
ditulis ke repository.

## 6. Pemilihan task

Pada setiap polling, launcher:

1. berhenti jika named mutex sedang dimiliki proses lain;
2. berhenti jika ada issue terbuka berlabel `codex-running`;
3. mengambil issue terbuka berlabel `codex-ready`;
4. memilih issue paling awal menurut urutan kartu pada kolom `Ready`;
5. menjalankan preflight sebelum mengubah label atau status.

Hanya satu issue boleh aktif. Issue lain tetap berada di `Ready` sampai Pull
Request task aktif telah dibuat dan task tidak lagi berlabel `codex-running`.

## 7. Preflight

Launcher memastikan:

- `git`, `gh`, `codex`, dan perintah `9router` tersedia;
- `gh auth status` berhasil;
- working tree bersih;
- repository berada pada default branch;
- `git pull --ff-only` berhasil;
- tidak ada task lain berlabel `codex-running`;
- 9router siap menerima koneksi.

Jika working tree kotor, branch salah, atau pull gagal, launcher berhenti tanpa
mengubah label dan status issue. Launcher tidak melakukan reset, stash, checkout
paksa, atau operasi destruktif.

## 8. Startup 9router

Codex dikonfigurasi memakai provider `9router` pada
`http://127.0.0.1:20128/v1`. Launcher terlebih dahulu memeriksa port `20128`.

Jika port belum aktif, launcher menjalankan:

```powershell
Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/c", "9router" `
  -WindowStyle Hidden
```

Launcher memeriksa port setiap satu detik selama maksimal 30 detik. Jika port
tetap belum siap, proses berhenti, issue tetap `Ready`, dan error dicatat secara
lokal. Launcher tidak mematikan 9router setelah sesi Codex selesai karena
layanan tersebut dapat dipakai aplikasi lain.

## 9. Pembukaan sesi Codex

Setelah seluruh preflight lulus, launcher:

1. mengganti label `codex-ready` menjadi `codex-running`;
2. memindahkan kartu dari `Ready` ke `Doing`;
3. membuka Windows Terminal pada root repository;
4. menjalankan Codex dengan sandbox `workspace-write` dan approval
   `on-request`;
5. menyertakan nomor issue dalam prompt awal.

Prompt awal:

```text
Kerjakan GitHub issue #<NUMBER> di repository nurussunnah-hub.

1. Baca issue menggunakan gh issue view <NUMBER>.
2. Periksa kode dan pastikan kebutuhan cukup jelas.
3. Jika ambigu atau berisiko, jangan menebak; jelaskan pertanyaannya.
4. Buat branch codex/issue-<NUMBER>-<slug>.
5. Implementasikan perubahan sekecil dan sefokus mungkin.
6. Tambahkan atau perbarui test jika relevan.
7. Jalankan npm test, npm run lint, dan npm run build.
8. Jangan menjalankan deploy, migration, atau mengubah data production.
9. Buat Pull Request yang mencantumkan "Closes #<NUMBER>".
```

`<NUMBER>` dan `<slug>` pada desain ini selalu diganti launcher dengan nomor
issue dan slug judul aktual; keduanya bukan teks literal atau keputusan yang
masih tertunda.

Sesi tetap interaktif. Pengguna dapat meninjau rencana, memberi instruksi
tambahan, dan menyetujui operasi yang memerlukan approval.

## 10. Penyelesaian dan pemulihan

Jika Codex berhasil:

- perubahan berada pada branch `codex/issue-<NUMBER>-<slug>`;
- Pull Request mencantumkan `Closes #<NUMBER>`;
- kartu tetap `Doing` selama Pull Request terbuka;
- merge menutup issue dan workflow bawaan GitHub Project memindahkannya ke
  `Done`.

Jika task ambigu, Codex tidak membuat perubahan spekulatif. Codex mengembalikan
issue ke `Backlog`, menghapus `codex-running`, dan menambahkan pertanyaan pada
issue atau menyampaikannya di sesi.

Jika sesi ditutup tanpa Pull Request, label `codex-running` tetap terpasang agar
launcher tidak mengulang task tanpa sepengetahuan pengguna. Pemulihan dilakukan
manual dengan salah satu pilihan:

- lanjutkan sesi dengan `codex resume --last`;
- kembalikan issue ke `Ready` dan ganti label menjadi `codex-ready`;
- pindahkan issue ke `Backlog` jika spesifikasinya perlu diperbaiki.

## 11. Penanganan kegagalan

| Kondisi | Perilaku |
|---|---|
| `gh`, `git`, `codex`, atau `9router` tidak tersedia | Berhenti dan tampilkan dependency yang hilang |
| GitHub CLI belum login | Berhenti tanpa mengubah issue |
| Working tree kotor | Berhenti tanpa stash atau reset |
| `git pull --ff-only` gagal | Berhenti dan minta penyelesaian manual |
| 9router tidak siap dalam 30 detik | Berhenti; issue tetap `Ready` |
| Task lain sedang berjalan | Task baru tetap mengantre |
| Gagal mengubah label/status | Jangan membuka Codex |
| Terminal gagal dibuka setelah status berubah | Kembalikan label ke `codex-ready` dan status ke `Ready` |
| Sesi berakhir tanpa Pull Request | Pertahankan `codex-running` untuk pemeriksaan manual |

Log lokal tidak menyimpan token, isi autentikasi, atau environment variable
sensitif.

## 12. Struktur file

```text
.github/ISSUE_TEMPLATE/bug.yml
.github/ISSUE_TEMPLATE/feature.yml
scripts/codex-kanban-launcher.ps1
scripts/install-codex-kanban-task.ps1
scripts/test-codex-kanban-launcher.ps1
docs/codex-kanban.md
```

`install-codex-kanban-task.ps1` membuat atau memperbarui Scheduled Task dengan
interval satu menit dan mode `Run only when user is logged on`.

## 13. Verifikasi

Launcher menyediakan `-DryRun`. Mode ini menjalankan pemeriksaan dependency,
autentikasi, repository, issue queue, dan 9router, tetapi tidak:

- mengubah label atau status;
- menjalankan `git pull`;
- memulai 9router;
- membuka Windows Terminal;
- membuka sesi Codex.

Pengujian skrip mencakup:

- tidak ada issue siap;
- satu atau beberapa issue siap;
- task lain sedang berjalan;
- working tree kotor;
- 9router sudah aktif;
- 9router perlu dijalankan;
- timeout startup 9router;
- kegagalan perubahan status;
- pembentukan prompt dan branch name;
- mode dry-run tidak menghasilkan perubahan eksternal.

Verifikasi manual sebelum aktivasi:

1. jalankan launcher dengan `-DryRun`;
2. buat satu issue uji dan beri `codex-ready`;
3. pastikan 9router tidak dijalankan dua kali;
4. pastikan hanya satu Windows Terminal terbuka;
5. pastikan kartu pindah ke `Doing`;
6. tutup sesi tanpa PR dan pastikan task tidak diulang;
7. lanjutkan atau reset task secara manual;
8. buat PR uji, merge, dan pastikan issue serta kartu menjadi `Done`.
