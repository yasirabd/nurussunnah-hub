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

function Assert-Throws {
  param(
    [Parameter(Mandatory)][scriptblock]$Action,
    [Parameter(Mandatory)][string]$ExpectedMessage,
    [Parameter(Mandatory)][string]$Name
  )

  try {
    & $Action
  } catch {
    if (-not $_.Exception.Message.Contains($ExpectedMessage)) {
      throw "$Name expected error containing '$ExpectedMessage' but got '$($_.Exception.Message)'."
    }
    $script:Passed++
    return
  }

  throw "$Name expected an exception."
}

function New-FakeRuntime {
  param(
    [object[]]$Running = @(),
    [object[]]$Ready = @(),
    [bool]$RepositoryOk = $true,
    [bool]$NineRouterOk = $true,
    [bool]$OpenCodexOk = $true
  )

  $trace = [System.Collections.Generic.List[string]]::new()
  $runtime = @{
    AssertDependencies = { $trace.Add("dependencies") }.GetNewClosure()
    GetRunningItems = { param($owner, $project) $trace.Add("running"); return $Running }.GetNewClosure()
    GetReadyItems = { param($owner, $project) $trace.Add("ready"); return $Ready }.GetNewClosure()
    AssertRepository = {
      $trace.Add("repository")
      if (-not $RepositoryOk) { throw "Repository preflight failed" }
    }.GetNewClosure()
    EnsureNineRouter = {
      $trace.Add("9router")
      if (-not $NineRouterOk) { throw "9router startup timed out" }
    }.GetNewClosure()
    SetIssueRunning = { param($item) $trace.Add("set-running:$($item.IssueNumber)") }.GetNewClosure()
    SetIssueReady = { param($item) $trace.Add("set-ready:$($item.IssueNumber)") }.GetNewClosure()
    OpenCodex = {
      param($item, $initialPrompt)
      $trace.Add("codex:$($item.IssueNumber)")
      if (-not $OpenCodexOk) { throw "Terminal failed" }
    }.GetNewClosure()
    WriteLog = { param($level, $message) $trace.Add("log:$level") }.GetNewClosure()
  }

  return [pscustomobject]@{ Runtime = $runtime; Trace = $trace }
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

$queueItem = [pscustomobject]@{ IssueNumber = 42; Title = "Queued"; ItemId = "ITEM"; Url = "url" }

$fake = New-FakeRuntime -Running @($queueItem) -Ready @($queueItem)
Assert-Equal "Busy" (Invoke-CodexKanban $fake.Runtime "yasirabd" 1) "busy queue"
Assert-True (-not $fake.Trace.Contains("ready")) "busy queue skips ready lookup"

$fake = New-FakeRuntime
Assert-Equal "Idle" (Invoke-CodexKanban $fake.Runtime "yasirabd" 1) "empty queue"

$fake = New-FakeRuntime -Ready @($queueItem) -RepositoryOk $false
Assert-Throws { Invoke-CodexKanban $fake.Runtime "yasirabd" 1 } "Repository preflight failed" "repository failure"
Assert-True (-not $fake.Trace.Contains("9router")) "repository failure skips router"
Assert-True (-not $fake.Trace.Contains("set-running:42")) "repository failure skips mutation"

$fake = New-FakeRuntime -Ready @($queueItem) -NineRouterOk $false
Assert-Throws { Invoke-CodexKanban $fake.Runtime "yasirabd" 1 } "9router startup timed out" "router failure"
Assert-True (-not $fake.Trace.Contains("set-running:42")) "router failure skips mutation"

$fake = New-FakeRuntime -Ready @($queueItem)
Assert-Equal "DryRun" (Invoke-CodexKanban $fake.Runtime "yasirabd" 1 -DryRun) "dry run"
Assert-True (-not $fake.Trace.Contains("set-running:42")) "dry run skips mutation"
Assert-True (-not $fake.Trace.Contains("codex:42")) "dry run skips terminal"

$fake = New-FakeRuntime -Ready @($queueItem)
Assert-Equal "Started" (Invoke-CodexKanban $fake.Runtime "yasirabd" 1) "successful launch"
Assert-True ($fake.Trace.IndexOf("set-running:42") -lt $fake.Trace.IndexOf("codex:42")) "status changes before terminal"

$fake = New-FakeRuntime -Ready @($queueItem) -OpenCodexOk $false
Assert-Throws { Invoke-CodexKanban $fake.Runtime "yasirabd" 1 } "Terminal failed" "terminal rollback"
Assert-True ($fake.Trace.Contains("set-ready:42")) "terminal failure restores ready"

Write-Output "$script:Passed PowerShell assertions passed"
