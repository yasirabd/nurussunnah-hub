Set-StrictMode -Version Latest

function ConvertTo-CodexSlug {
  param([Parameter(Mandatory)][string]$Title)

  $slug = ($Title.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "task"
  }

  if ($slug.Length -gt 48) {
    $slug = $slug.Substring(0, 48).Trim("-")
  }

  return $slug
}

function Get-CodexBranchName {
  param(
    [Parameter(Mandatory)][int]$IssueNumber,
    [Parameter(Mandatory)][string]$Title
  )

  return "codex/issue-$IssueNumber-$(ConvertTo-CodexSlug $Title)"
}

function New-CodexPrompt {
  param([Parameter(Mandatory)][int]$IssueNumber)

  return @"
Kerjakan GitHub issue #$IssueNumber di repository nurussunnah-hub.

1. Baca issue menggunakan gh issue view $IssueNumber.
2. Periksa kode dan pastikan kebutuhan cukup jelas.
3. Jika ambigu atau berisiko, jangan menebak; jelaskan pertanyaannya.
4. Buat branch codex/issue-$IssueNumber-<slug>.
5. Implementasikan perubahan sekecil dan sefokus mungkin.
6. Tambahkan atau perbarui test jika relevan.
7. Jalankan npm test, npm run lint, dan npm run build.
8. Jangan menjalankan deploy, migration, atau mengubah data production.
9. Buat Pull Request yang mencantumkan "Closes #$IssueNumber".
"@
}

function Select-CodexQueueItem {
  param([object[]]$Items)

  if (-not $Items -or $Items.Count -eq 0) {
    return $null
  }

  return $Items[0]
}
