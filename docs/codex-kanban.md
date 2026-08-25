# Codex Kanban Lokal

Workflow ini memakai GitHub Issues dan GitHub Projects sebagai antrean, lalu
membuka satu sesi Codex CLI interaktif di komputer Windows. GitHub Free cukup
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

Nomor pada kolom `NUMBER` digunakan sebagai `<PROJECT_NUMBER>` pada perintah di
bagian berikut.

## 4. Validasi Installer

Jalankan tanpa mutasi terlebih dahulu:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber <PROJECT_NUMBER> `
  -WhatIf
```

Installer memvalidasi dependency, login, akses Project, dan empat Status.
Installer kemudian akan membuat label berikut ketika dijalankan tanpa
`-WhatIf`:

- `bug`
- `feature`
- `codex-ready`
- `codex-running`

## 5. Dry-Run Launcher

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\codex-kanban-launcher.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber <PROJECT_NUMBER> `
  -DryRun
```

Dry-run memeriksa dependency, autentikasi, antrean, working tree, default
branch, dan kesiapan 9router. Mode ini tidak menjalankan `git pull`, tidak
memulai 9router, tidak mengubah label/Status, dan tidak membuka terminal.

Log launcher disimpan di:

```text
%LOCALAPPDATA%\NurusSunnahHub\CodexKanban\launcher.log
```

## 6. Instal Scheduled Task

Setelah `-WhatIf` dan `-DryRun` berhasil:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber <PROJECT_NUMBER>
```

Task `NurusSunnahHub Codex Kanban` berjalan setiap satu menit hanya ketika user
Windows sedang login. Named mutex memastikan dua polling tidak berjalan
bersamaan.

## 7. Memulai Task Codex

1. Buat issue melalui template Bug atau Fitur.
2. Lengkapi masalah/tujuan dan hasil akhir.
3. Pindahkan kartu ke `Ready`.
4. Tambahkan label `codex-ready`.
5. Tunggu maksimal satu menit.

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
terpasang agar task tidak dimulai ulang otomatis.

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

## 10. Uninstall

Hapus Scheduled Task tanpa menghapus issue, Project, atau label:

```powershell
Unregister-ScheduledTask `
  -TaskName "NurusSunnahHub Codex Kanban" `
  -Confirm:$false
```

Log lokal dapat dihapus manual dari `%LOCALAPPDATA%\NurusSunnahHub\CodexKanban`
jika tidak lagi diperlukan.
