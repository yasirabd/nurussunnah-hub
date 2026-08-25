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

function Invoke-CodexKanban {
  param(
    [Parameter(Mandatory)][hashtable]$Runtime,
    [Parameter(Mandatory)][string]$ProjectOwner,
    [Parameter(Mandatory)][int]$ProjectNumber,
    [switch]$DryRun
  )

  & $Runtime.AssertDependencies

  $running = @(& $Runtime.GetRunningItems $ProjectOwner $ProjectNumber)
  if ($running.Count -gt 0) {
    & $Runtime.WriteLog "Info" "A Codex issue is already running."
    return "Busy"
  }

  $ready = @(& $Runtime.GetReadyItems $ProjectOwner $ProjectNumber)
  $item = Select-CodexQueueItem $ready
  if ($null -eq $item) {
    & $Runtime.WriteLog "Info" "No codex-ready issue found."
    return "Idle"
  }

  & $Runtime.AssertRepository
  & $Runtime.EnsureNineRouter
  $prompt = New-CodexPrompt $item.IssueNumber

  if ($DryRun) {
    & $Runtime.WriteLog "Info" "Dry-run selected issue #$($item.IssueNumber)."
    return "DryRun"
  }

  & $Runtime.SetIssueRunning $item
  try {
    & $Runtime.OpenCodex $item $prompt
  } catch {
    & $Runtime.SetIssueReady $item
    throw
  }

  return "Started"
}

function ConvertTo-CodexQueueItems {
  param([Parameter(Mandatory)]$ProjectResponse)

  foreach ($item in @($ProjectResponse.items)) {
    $content = $item.content
    if ($null -eq $content -or $null -eq $content.number) {
      continue
    }

    [pscustomobject]@{
      IssueNumber = [int]$content.number
      Title = [string]$content.title
      ItemId = [string]$item.id
      Url = [string]$content.url
    }
  }
}

function Get-CodexProjectMetadata {
  param(
    [Parameter(Mandatory)]$ProjectJson,
    [Parameter(Mandatory)]$FieldsJson
  )

  $statusField = @($FieldsJson.fields) | Where-Object { $_.name -eq "Status" } | Select-Object -First 1
  if ($null -eq $statusField) {
    throw "GitHub Project is missing the Status field."
  }

  $readyOption = @($statusField.options) | Where-Object { $_.name -eq "Ready" } | Select-Object -First 1
  $doingOption = @($statusField.options) | Where-Object { $_.name -eq "Doing" } | Select-Object -First 1
  if ($null -eq $readyOption) {
    throw "GitHub Project Status is missing the Ready option."
  }
  if ($null -eq $doingOption) {
    throw "GitHub Project Status is missing the Doing option."
  }

  return [pscustomobject]@{
    ProjectId = [string]$ProjectJson.id
    StatusFieldId = [string]$statusField.id
    ReadyOptionId = [string]$readyOption.id
    DoingOptionId = [string]$doingOption.id
  }
}

function Test-TcpPort {
  param(
    [Parameter(Mandatory)][string]$HostName,
    [Parameter(Mandatory)][int]$Port,
    [int]$TimeoutMs = 500
  )

  $client = [Net.Sockets.TcpClient]::new()
  try {
    $result = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne($TimeoutMs)) {
      return $false
    }
    $client.EndConnect($result)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function New-CodexTerminalCommand {
  param([Parameter(Mandatory)][string]$Prompt)

  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Prompt))
  return "`$p=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$encoded')); codex --sandbox workspace-write --ask-for-approval on-request `$p"
}
