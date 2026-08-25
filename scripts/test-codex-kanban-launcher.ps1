$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "codex-kanban-lib.ps1")

$script:Passed = 0

function Assert-Equal {
  param(
    $Expected,
    $Actual,
    [Parameter(Mandatory)][string]$Name
  )

  if ($Expected -ne $Actual) {
    throw "$Name expected '$Expected' but got '$Actual'."
  }

  $script:Passed++
}

function Assert-True {
  param(
    [bool]$Condition,
    [Parameter(Mandatory)][string]$Name
  )

  if (-not $Condition) {
    throw "$Name expected true."
  }

  $script:Passed++
}

Assert-Equal "perbaiki-ekspor-laporan" (ConvertTo-CodexSlug "Perbaiki ekspor laporan!") "slug"
Assert-Equal "task" (ConvertTo-CodexSlug "---") "fallback slug"
Assert-Equal "codex/issue-42-perbaiki-ekspor" (Get-CodexBranchName 42 "Perbaiki ekspor") "branch"

$prompt = New-CodexPrompt 42
Assert-True ($prompt.Contains("gh issue view 42")) "prompt reads issue"
Assert-True ($prompt.Contains("npm test")) "prompt tests"
Assert-True ($prompt.Contains("npm run lint")) "prompt lints"
Assert-True ($prompt.Contains("npm run build")) "prompt builds"
Assert-True ($prompt.Contains('Closes #42')) "prompt closes issue"
Assert-True ($prompt.Contains("Jangan menjalankan deploy")) "prompt blocks deploy"

$items = @(
  [pscustomobject]@{ IssueNumber = 9; Title = "Second"; ItemId = "B"; Url = "b" },
  [pscustomobject]@{ IssueNumber = 7; Title = "First"; ItemId = "A"; Url = "a" }
)
Assert-Equal 9 (Select-CodexQueueItem $items).IssueNumber "project order wins"
Assert-Equal $null (Select-CodexQueueItem @()) "empty queue"

Write-Output "$script:Passed PowerShell assertions passed"
