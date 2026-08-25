# Codex Kanban Lokal

Workflow ini memakai GitHub Issues dan GitHub Projects sebagai antrean, lalu
membuka satu sesi Codex CLI interaktif hanya ketika operator menjalankan command
manual. GitHub Free cukup
untuk board, issue, label, branch, dan Pull Request pada workflow lokal ini.
Biaya atau batas penggunaan 9router/model AI terpisah dari GitHub.

## 1. Prerequisite

Jalankan PowerShell sebagai user Windows biasa. Instal GitHub CLI:

```powershell
winget install --id GitHub.cli
```

Pastikan perintah berikut tersedia:

```powershell
git --version
gh --version
codex --version
9router
```

Hentikan `9router` lagi setelah memastikan perintahnya dikenali jika Anda belum
ingin membiarkannya berjalan. Launcher akan memulainya saat port `20128` belum
aktif.

## 2. Login GitHub CLI

```powershell
gh auth login
gh auth refresh -s project
gh auth status
```

Scope `project` diperlukan untuk membaca urutan kartu dan mengubah Status.

## 3. Buat GitHub Project

Buat satu personal Project pada akun `yasirabd`. Status harus ditulis persis:

```text
Backlog -> Ready -> Doing -> Done
```

Aktifkan workflow bawaan Project berikut melalui UI GitHub:

- otomatis tambahkan issue dari repository `nurussunnah-hub` ke `Backlog`;
- ketika issue ditutup, pindahkan kartunya ke `Done`.

Cari nomor Project:

```powershell
gh project list --owner yasirabd
```

Workflow ini memakai Project `Nurussunnah Hub` nomor `2`.

## 4. Validasi Setup

Jalankan tanpa mutasi terlebih dahulu:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber 2 `
  -WhatIf
```

Setup memvalidasi dependency, login, akses Project, dan empat Status.
Setup kemudian akan membuat label berikut ketika dijalankan tanpa
`-WhatIf`:

- `bug`
- `feature`
- `codex-ready`
- `codex-running`

## 5. Dry-Run Launcher

```powershell
npm run codex:kanban:dry-run
```

Dry-run memeriksa dependency, autentikasi, antrean, working tree, default
branch, dan kesiapan 9router. Mode ini tidak menjalankan `git pull`, tidak
memulai 9router, tidak mengubah label/Status, dan tidak membuka terminal.

Log launcher disimpan di:

```text
%LOCALAPPDATA%\NurusSunnahHub\CodexKanban\launcher.log
```

## 6. Aktifkan Mode Manual

Jalankan setup tanpa `-WhatIf` untuk menyinkronkan label dan menghapus Scheduled
Task lama jika masih ada:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber 2
```

Tidak ada proses polling yang berjalan setelah setup selesai. PowerShell,
9router, dan Codex hanya dipanggil ketika command manual dijalankan.

## 7. Menjalankan Codex Saat Dibutuhkan

1. Buat issue melalui template Bug atau Fitur.
2. Lengkapi masalah/tujuan dan hasil akhir.
3. Pindahkan kartu ke `Ready`.
4. Tambahkan label `codex-ready`.
5. Buka PowerShell di root repository.
6. Jalankan:

```powershell
npm run codex:kanban
```

Jika tidak ada issue yang memenuhi syarat, launcher menampilkan `Idle` dan
selesai tanpa memulai 9router atau membuka Windows Terminal.

Launcher menolak memulai ketika working tree kotor, branch bukan default branch,
`git pull --ff-only` gagal, atau ada issue `codex-running` lain. Jika port
`127.0.0.1:20128` belum aktif, launcher menjalankan `cmd.exe /c 9router`,
menunggu maksimal 30 detik, lalu membuka Windows Terminal dan Codex CLI.

Ketika berhasil, label menjadi `codex-running` dan kartu pindah ke `Doing`.
Codex diminta membuat branch, menjalankan test/lint/build, dan membuka Pull
Request dengan `Closes #<ISSUE_NUMBER>`.

## 8. Review dan Selesai

Review Pull Request secara manual. Setelah merge, GitHub menutup issue melalui
`Closes #...`; workflow Project memindahkan kartu ke `Done`.

Workflow ini tidak auto-merge, tidak deploy, tidak menjalankan migration, dan
tidak mengubah data production.

## 9. Recovery

Jika terminal tertutup tanpa Pull Request, label `codex-running` sengaja tetap
terpasang agar issue tidak dipilih lagi pada command manual berikutnya.

Lanjutkan sesi terakhir:

```powershell
codex resume --last
```

Atau pulihkan issue secara manual:

- ganti `codex-running` menjadi `codex-ready` dan pindahkan ke `Ready` untuk
  memulai ulang;
- pindahkan ke `Backlog` jika requirement perlu diperjelas.

Jika startup terminal gagal, launcher otomatis mengembalikan label dan Status
ke `Ready`.

## 10. Menghapus Polling Lama

Setup mode manual sudah menghapus Scheduled Task lama. Jika perlu melakukan
pembersihan langsung tanpa menghapus issue, Project, atau label:

```powershell
Unregister-ScheduledTask `
  -TaskName "NurusSunnahHub Codex Kanban" `
  -Confirm:$false
```

Log lokal dapat dihapus manual dari `%LOCALAPPDATA%\NurusSunnahHub\CodexKanban`
jika tidak lagi diperlukan.
