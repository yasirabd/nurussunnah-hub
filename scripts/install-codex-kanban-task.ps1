[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$ProjectOwner,
  [Parameter(Mandatory)][int]$ProjectNumber,
  [string]$TaskName = "NurusSunnahHub Codex Kanban"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "codex-kanban-lib.ps1")

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

function Invoke-CheckedGh {
  param([Parameter(Mandatory)][string[]]$Arguments)

  $output = & gh @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "gh $($Arguments -join ' ') failed: $($output -join ' ')"
  }
}

foreach ($commandName in @(
  "git", "gh", "codex", "9router", "powershell.exe",
  "Get-ScheduledTask", "Unregister-ScheduledTask"
)) {
  Assert-CommandAvailable $commandName
}

try {
  Invoke-CheckedGh @("auth", "status")
  $project = Invoke-GhJson @("project", "view", "$ProjectNumber", "--owner", $ProjectOwner, "--format", "json")
  $fields = Invoke-GhJson @("project", "field-list", "$ProjectNumber", "--owner", $ProjectOwner, "--format", "json")
} catch {
  throw "$($_.Exception.Message) If project access is missing, run: gh auth refresh -s project"
}

if ([string]::IsNullOrWhiteSpace([string]$project.id)) {
  throw "GitHub Project did not return a project node ID."
}

$statusField = @($fields.fields) | Where-Object { $_.name -eq "Status" } | Select-Object -First 1
if ($null -eq $statusField) {
  throw "GitHub Project is missing the Status field."
}

foreach ($statusName in @("Backlog", "Ready", "Doing", "Done")) {
  if ($null -eq (@($statusField.options) | Where-Object { $_.name -eq $statusName } | Select-Object -First 1)) {
    throw "GitHub Project Status is missing the '$statusName' option."
  }
}

$labels = @(
  @{ Name = "bug"; Color = "D73A4A"; Description = "Something is not working" },
  @{ Name = "feature"; Color = "0E8A16"; Description = "New feature or improvement" },
  @{ Name = "codex-ready"; Color = "1D76DB"; Description = "Ready for the local Codex launcher" },
  @{ Name = "codex-running"; Color = "FBCA04"; Description = "Currently handled by Codex" }
)

foreach ($label in $labels) {
  if ($PSCmdlet.ShouldProcess("GitHub label '$($label.Name)'", "Create or update")) {
    Invoke-CheckedGh @(
      "label", "create", $label.Name,
      "--color", $label.Color,
      "--description", $label.Description,
      "--force"
    )
  }
}

$legacyTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $legacyTask -and $PSCmdlet.ShouldProcess("Scheduled Task '$TaskName'", "Unregister legacy polling")) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Write-Output "Codex kanban manual setup validation completed. Run: npm run codex:kanban"
