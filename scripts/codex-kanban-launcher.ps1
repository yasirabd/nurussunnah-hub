[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ProjectOwner,
  [Parameter(Mandatory)][int]$ProjectNumber,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "codex-kanban-lib.ps1")

$mutex = [Threading.Mutex]::new($false, "Local\NurusSunnahHubCodexKanban")
if (-not $mutex.WaitOne(0)) {
  exit 0
}

$logDirectory = Join-Path $env:LOCALAPPDATA "NurusSunnahHub\CodexKanban"
$logPath = Join-Path $logDirectory "launcher.log"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

function Write-LauncherLog {
  param(
    [Parameter(Mandatory)][string]$Level,
    [Parameter(Mandatory)][string]$Message
  )

  $line = "{0:o} [{1}] {2}" -f (Get-Date), $Level.ToUpperInvariant(), $Message
  Add-Content -LiteralPath $logPath -Value $line
  Write-Output $line
}

function Assert-CommandAvailable {
  param([Parameter(Mandatory)][string]$Name)

  if ($null -eq (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available in PATH."
  }
}

function Invoke-GhJson {
  param([Parameter(Mandatory)][string[]]$Arguments)

  $output = & gh @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "gh $($Arguments -join ' ') failed: $($output -join ' ')"
  }

  return (($output -join "`n") | ConvertFrom-Json)
}

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory)][string]$Command,
    [Parameter(Mandatory)][string[]]$Arguments
  )

  $output = & $Command @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed: $($output -join ' ')"
  }

  return $output
}

$script:ProjectMetadata = $null

function Get-ProjectMetadataCached {
  if ($null -eq $script:ProjectMetadata) {
    $projectJson = Invoke-GhJson @("project", "view", "$ProjectNumber", "--owner", $ProjectOwner, "--format", "json")
    $fieldsJson = Invoke-GhJson @("project", "field-list", "$ProjectNumber", "--owner", $ProjectOwner, "--format", "json")
    $script:ProjectMetadata = Get-CodexProjectMetadata $projectJson $fieldsJson
  }

  return $script:ProjectMetadata
}

function Get-ProjectQueueItems {
  param([Parameter(Mandatory)][string]$Query)

  $response = Invoke-GhJson @(
    "project", "item-list", "$ProjectNumber",
    "--owner", $ProjectOwner,
    "--query", $Query,
    "--field", "Status",
    "--limit", "100",
    "--format", "json"
  )
  return @(ConvertTo-CodexQueueItems $response)
}

function Set-ProjectStatus {
  param(
    [Parameter(Mandatory)][string]$ItemId,
    [Parameter(Mandatory)][string]$OptionId
  )

  $metadata = Get-ProjectMetadataCached
  Invoke-CheckedCommand "gh" @(
    "project", "item-edit",
    "--id", $ItemId,
    "--project-id", $metadata.ProjectId,
    "--field-id", $metadata.StatusFieldId,
    "--single-select-option-id", $OptionId
  ) | Out-Null
}

function Set-IssueRunning {
  param([Parameter(Mandatory)]$Item)

  Invoke-CheckedCommand "gh" @(
    "issue", "edit", "$($Item.IssueNumber)",
    "--remove-label", "codex-ready",
    "--add-label", "codex-running"
  ) | Out-Null

  try {
    Set-ProjectStatus $Item.ItemId (Get-ProjectMetadataCached).DoingOptionId
  } catch {
    Invoke-CheckedCommand "gh" @(
      "issue", "edit", "$($Item.IssueNumber)",
      "--remove-label", "codex-running",
      "--add-label", "codex-ready"
    ) | Out-Null
    throw
  }
}

function Set-IssueReady {
  param([Parameter(Mandatory)]$Item)

  Invoke-CheckedCommand "gh" @(
    "issue", "edit", "$($Item.IssueNumber)",
    "--remove-label", "codex-running",
    "--add-label", "codex-ready"
  ) | Out-Null

  try {
    Set-ProjectStatus $Item.ItemId (Get-ProjectMetadataCached).ReadyOptionId
  } catch {
    Invoke-CheckedCommand "gh" @(
      "issue", "edit", "$($Item.IssueNumber)",
      "--remove-label", "codex-ready",
      "--add-label", "codex-running"
    ) | Out-Null
    throw
  }
}

function Assert-RepositoryReady {
  $changes = & git status --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect the Git working tree."
  }
  if (-not [string]::IsNullOrWhiteSpace(($changes -join "`n"))) {
    throw "Repository preflight failed: working tree is not clean."
  }

  $repo = Invoke-GhJson @("repo", "view", "--json", "defaultBranchRef")
  $defaultBranch = [string]$repo.defaultBranchRef.name
  $currentBranch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $currentBranch -ne $defaultBranch) {
    throw "Repository preflight failed: expected branch '$defaultBranch' but found '$currentBranch'."
  }

  if (-not $DryRun) {
    $pullOutput = & git pull --ff-only 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "git pull --ff-only failed: $($pullOutput -join ' ')"
    }
  }
}

function Ensure-NineRouter {
  if (Test-TcpPort "127.0.0.1" 20128 500) {
    Write-LauncherLog "Info" "9router is already listening on port 20128."
    return
  }

  if ($DryRun) {
    Write-LauncherLog "Info" "Dry-run: would start 9router with cmd.exe /c 9router."
    return
  }

  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "9router" -WindowStyle Hidden
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-TcpPort "127.0.0.1" 20128 500) {
      Write-LauncherLog "Info" "9router became ready after $attempt second(s)."
      return
    }
  }

  throw "9router startup timed out after 30 seconds."
}

function Open-CodexTerminal {
  param(
    [Parameter(Mandatory)]$Item,
    [Parameter(Mandatory)][string]$Prompt
  )

  $command = New-CodexTerminalCommand $Prompt
  $codexSafetyFlags = "--sandbox workspace-write --ask-for-approval on-request"
  if (-not $command.Contains($codexSafetyFlags)) {
    throw "Codex terminal command is missing the required safety flags."
  }

  Start-Process -FilePath "wt.exe" -ArgumentList @(
    "-d", (Get-Location).Path,
    "powershell.exe", "-NoExit", "-Command", $command
  )
}

$runtime = @{
  AssertDependencies = {
    foreach ($commandName in @("git", "gh", "codex", "9router", "wt.exe", "powershell.exe")) {
      Assert-CommandAvailable $commandName
    }
    Invoke-CheckedCommand "gh" @("auth", "status") | Out-Null
  }
  GetRunningItems = { param($owner, $project) Get-ProjectQueueItems "label:codex-running is:issue is:open" }
  GetReadyItems = { param($owner, $project) Get-ProjectQueueItems "status:Ready label:codex-ready is:issue is:open" }
  AssertRepository = { Assert-RepositoryReady }
  EnsureNineRouter = { Ensure-NineRouter }
  SetIssueRunning = { param($item) Set-IssueRunning $item }
  SetIssueReady = { param($item) Set-IssueReady $item }
  OpenCodex = { param($item, $prompt) Open-CodexTerminal $item $prompt }
  WriteLog = { param($level, $message) Write-LauncherLog $level $message }
}

try {
  $result = Invoke-CodexKanban $runtime $ProjectOwner $ProjectNumber -DryRun:$DryRun
  Write-LauncherLog "Info" "Launcher result: $result"
} catch {
  Write-LauncherLog "Error" $_.Exception.Message
  Write-Error $_
  exit 1
} finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
