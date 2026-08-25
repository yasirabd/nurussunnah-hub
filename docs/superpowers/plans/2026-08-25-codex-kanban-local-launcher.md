# Codex Kanban Local Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-only local launcher that polls a personal GitHub Project, starts 9router when needed, and opens one interactive Codex CLI session for the highest queued issue.

**Architecture:** Put pure formatting and orchestration logic in a dot-sourced PowerShell library with an injected runtime hashtable. The production entry point supplies GitHub, Git, TCP, logging, and Windows Terminal adapters; native PowerShell tests supply fakes so state transitions are verified without changing GitHub or opening applications.

**Tech Stack:** PowerShell 5.1+, Windows Task Scheduler, GitHub CLI, GitHub Projects, Git, Codex CLI, Node.js built-in test runner.

---

## File Map

- Create `.github/ISSUE_TEMPLATE/bug.yml`: compact bug intake form.
- Create `.github/ISSUE_TEMPLATE/feature.yml`: compact feature intake form.
- Create `scripts/codex-kanban-lib.ps1`: pure helpers and injected-runtime orchestration.
- Create `scripts/codex-kanban-launcher.ps1`: production adapters and entry point.
- Create `scripts/install-codex-kanban-task.ps1`: validation, labels, and Scheduled Task installer.
- Create `scripts/test-codex-kanban-launcher.ps1`: dependency-free PowerShell tests.
- Create `tests/codex-kanban-config.test.mjs`: repository and PowerShell runner contracts.
- Create `docs/codex-kanban.md`: setup, dry-run, recovery, and uninstall guide.
- Modify `package.json`: add `test:codex-kanban`.

## Stable Interfaces

```powershell
ConvertTo-CodexSlug -Title <string>
Get-CodexBranchName -IssueNumber <int> -Title <string>
New-CodexPrompt -IssueNumber <int>
Select-CodexQueueItem -Items <object[]>
Invoke-CodexKanban -Runtime <hashtable> -ProjectOwner <string> -ProjectNumber <int> [-DryRun]
```

Queue items always use:

```powershell
[pscustomobject]@{
  IssueNumber = 123
  Title       = "Perbaiki ekspor laporan"
  ItemId      = "PVTI_item_node_id"
  Url         = "https://github.com/yasirabd/nurussunnah-hub/issues/123"
}
```

### Task 1: Issue Forms and Contract Test

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/ISSUE_TEMPLATE/feature.yml`
- Create: `tests/codex-kanban-config.test.mjs`

- [ ] **Step 1: Write the failing contract test**

Create `tests/codex-kanban-config.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("bug and feature issue forms keep the agreed fields", () => {
  const bug = read(".github/ISSUE_TEMPLATE/bug.yml");
  assert.match(bug, /labels:\s*\["bug"\]/);
  for (const label of ["Masalah", "Cara reproduksi", "Hasil yang diharapkan", "Bukti"]) {
    assert.match(bug, new RegExp(label));
  }

  const feature = read(".github/ISSUE_TEMPLATE/feature.yml");
  assert.match(feature, /labels:\s*\["feature"\]/);
  for (const label of ["Tujuan", "Perilaku", "Selesai jika"]) {
    assert.match(feature, new RegExp(label));
  }
});

test("PowerShell launcher tests pass on Windows", { skip: process.platform !== "win32" }, () => {
  const result = spawnSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    "scripts/test-codex-kanban-launcher.ps1",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/codex-kanban-config.test.mjs`

Expected: FAIL because the forms and PowerShell test runner do not exist.

- [ ] **Step 3: Create the bug form**

Create `.github/ISSUE_TEMPLATE/bug.yml` with `labels: ["bug"]` and four required textarea fields: `Masalah`, `Cara reproduksi`, `Hasil yang diharapkan`, and optional `Bukti`.

```yaml
name: Bug
description: Laporkan sesuatu yang tidak bekerja
title: ""
labels: ["bug"]
body:
  - type: textarea
    id: problem
    attributes: { label: Masalah, description: "Apa yang tidak bekerja?" }
    validations: { required: true }
  - type: textarea
    id: reproduction
    attributes: { label: Cara reproduksi, description: "Langkah singkat untuk memunculkan error." }
    validations: { required: true }
  - type: textarea
    id: expected
    attributes: { label: Hasil yang diharapkan, description: "Apa yang seharusnya terjadi?" }
    validations: { required: true }
  - type: textarea
    id: evidence
    attributes: { label: Bukti, description: "Error log atau screenshot jika ada." }
```

- [ ] **Step 4: Create the feature form**

Create `.github/ISSUE_TEMPLATE/feature.yml`:

```yaml
name: Fitur
description: Usulkan fitur atau peningkatan baru
title: ""
labels: ["feature"]
body:
  - type: textarea
    id: goal
    attributes: { label: Tujuan, description: "Apa yang ingin ditambahkan?" }
    validations: { required: true }
  - type: textarea
    id: behavior
    attributes: { label: Perilaku, description: "Bagaimana fitur digunakan?" }
    validations: { required: true }
  - type: textarea
    id: done
    attributes:
      label: Selesai jika
      description: Tuliskan acceptance criteria sebagai checklist Markdown.
      placeholder: |-
        - [ ] Kriteria hasil pertama
        - [ ] Kriteria hasil kedua
    validations: { required: true }
```

- [ ] **Step 5: Run the form-only test and verify GREEN**

Run: `node --test --test-name-pattern="issue forms" tests/codex-kanban-config.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .github/ISSUE_TEMPLATE/bug.yml .github/ISSUE_TEMPLATE/feature.yml tests/codex-kanban-config.test.mjs
git commit -m "feat: add Codex kanban issue forms"
```

### Task 2: Pure PowerShell Helpers

**Files:**
- Create: `scripts/codex-kanban-lib.ps1`
- Create: `scripts/test-codex-kanban-launcher.ps1`

- [ ] **Step 1: Write failing helper tests**

Create a native harness with `Assert-Equal` and `Assert-True`, dot-source the library, and assert:

```powershell
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
```

Also pass two queue objects and assert `Select-CodexQueueItem` returns the first item, preserving GitHub Project order.

- [ ] **Step 2: Run tests and verify RED**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-codex-kanban-launcher.ps1`

Expected: FAIL because the library does not exist.

- [ ] **Step 3: Implement helpers**

Create `scripts/codex-kanban-lib.ps1`:

```powershell
Set-StrictMode -Version Latest

function ConvertTo-CodexSlug {
  param([Parameter(Mandatory)][string]$Title)
  $slug = ($Title.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) { return "task" }
  if ($slug.Length -gt 48) { $slug = $slug.Substring(0, 48).Trim("-") }
  return $slug
}

function Get-CodexBranchName {
  param([int]$IssueNumber, [string]$Title)
  return "codex/issue-$IssueNumber-$(ConvertTo-CodexSlug $Title)"
}

function Select-CodexQueueItem {
  param([object[]]$Items)
  if (-not $Items -or $Items.Count -eq 0) { return $null }
  return $Items[0]
}
```

Implement `New-CodexPrompt` with the approved text:

```powershell
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
```

`<slug>` is a runtime instruction for the interactive agent, not an unresolved implementation value.

- [ ] **Step 4: Run tests and verify GREEN**

Run the native PowerShell test and then `node --test tests/codex-kanban-config.test.mjs`.

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/codex-kanban-lib.ps1 scripts/test-codex-kanban-launcher.ps1
git commit -m "feat: add Codex launcher core helpers"
```

### Task 3: Injected-Runtime State Machine

**Files:**
- Modify: `scripts/codex-kanban-lib.ps1`
- Modify: `scripts/test-codex-kanban-launcher.ps1`

- [ ] **Step 1: Add failing orchestration tests**

Create a fake runtime hashtable whose scriptblocks append events to a trace. Test these exact cases: existing `codex-running` item returns `Busy`; empty ready queue returns `Idle`; dirty repository and 9router timeout happen before mutations; dry-run returns `DryRun`; success changes status before opening Codex; terminal failure calls rollback.

```powershell
$runtime = @{
  AssertDependencies = { $trace.Add("dependencies") }
  GetRunningItems = { param($owner, $project) return $running }
  GetReadyItems = { param($owner, $project) return $ready }
  AssertRepository = { if (-not $repositoryOk) { throw "Repository preflight failed" } }
  EnsureNineRouter = { if (-not $routerOk) { throw "9router startup timed out" } }
  SetIssueRunning = { param($item) $trace.Add("running:$($item.IssueNumber)") }
  SetIssueReady = { param($item) $trace.Add("ready:$($item.IssueNumber)") }
  OpenCodex = { param($item, $prompt) $trace.Add("codex:$($item.IssueNumber)") }
  WriteLog = { param($level, $message) $trace.Add("log:$level") }
}
```

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL because `Invoke-CodexKanban` is undefined.

- [ ] **Step 3: Implement the state machine**

```powershell
function Invoke-CodexKanban {
  param([hashtable]$Runtime, [string]$ProjectOwner, [int]$ProjectNumber, [switch]$DryRun)

  & $Runtime.AssertDependencies
  $running = @(& $Runtime.GetRunningItems $ProjectOwner $ProjectNumber)
  if ($running.Count -gt 0) { return "Busy" }

  $ready = @(& $Runtime.GetReadyItems $ProjectOwner $ProjectNumber)
  $item = Select-CodexQueueItem $ready
  if ($null -eq $item) { return "Idle" }

  & $Runtime.AssertRepository
  & $Runtime.EnsureNineRouter
  $prompt = New-CodexPrompt $item.IssueNumber
  if ($DryRun) { return "DryRun" }

  & $Runtime.SetIssueRunning $item
  try {
    & $Runtime.OpenCodex $item $prompt
  } catch {
    & $Runtime.SetIssueReady $item
    throw
  }
  return "Started"
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the native PowerShell test. Expected: every state and rollback assertion passes.

- [ ] **Step 5: Commit**

```bash
git add scripts/codex-kanban-lib.ps1 scripts/test-codex-kanban-launcher.ps1
git commit -m "feat: orchestrate Codex kanban queue"
```

### Task 4: Production Launcher Adapters

**Files:**
- Create: `scripts/codex-kanban-launcher.ps1`
- Modify: `scripts/test-codex-kanban-launcher.ps1`
- Modify: `tests/codex-kanban-config.test.mjs`

- [ ] **Step 1: Add failing safety contract tests**

Require the production source to contain the agreed mutex, clean-tree check, fast-forward-only pull, 9router endpoint, hidden startup, and Codex safety flags, while rejecting destructive Git commands:

```js
test("production launcher keeps safety boundaries", () => {
  const source = read("scripts/codex-kanban-launcher.ps1");
  assert.match(source, /Local\\NurusSunnahHubCodexKanban/);
  assert.match(source, /git status --porcelain/);
  assert.match(source, /git pull --ff-only/);
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /20128/);
  assert.match(source, /cmd\.exe/);
  assert.match(source, /9router/);
  assert.match(source, /-WindowStyle Hidden/);
  assert.match(source, /--sandbox workspace-write/);
  assert.match(source, /--ask-for-approval on-request/);
  assert.doesNotMatch(source, /reset --hard|checkout --|git stash/);
});
```

Add native tests for TCP timeout behavior, Project JSON mapping, status command arguments, and prompt Base64 round-trip. All tests use fixtures and do not call GitHub or start processes.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/codex-kanban-config.test.mjs`

Expected: FAIL because `scripts/codex-kanban-launcher.ps1` does not exist.

- [ ] **Step 3: Implement parameters, mutex, and logging**

Create the launcher entry point:

```powershell
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
if (-not $mutex.WaitOne(0)) { exit 0 }

$logDirectory = Join-Path $env:LOCALAPPDATA "NurusSunnahHub\CodexKanban"
$logPath = Join-Path $logDirectory "launcher.log"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
```

Wrap orchestration in `try/catch/finally`; append timestamped messages without tokens, release the mutex in `finally`, and exit nonzero on errors.

- [ ] **Step 4: Implement GitHub Project adapters**

Read ordered items with:

```powershell
gh project item-list $ProjectNumber `
  --owner $ProjectOwner `
  --query "status:Ready label:codex-ready is:issue is:open" `
  --field Status --limit 100 --format json
```

Use `label:codex-running is:issue is:open` for the active query. Map the returned JSON to the stable queue item shape.

Resolve project node ID with `gh project view ... --format json`. Resolve the Status field ID and the `Ready` and `Doing` option IDs with `gh project field-list ... --format json`. Fail with a named missing field/option error rather than choosing another status.

`SetIssueRunning` must run, checking every exit code:

```powershell
gh issue edit $item.IssueNumber --remove-label codex-ready --add-label codex-running
gh project item-edit --id $item.ItemId --project-id $projectId --field-id $statusFieldId --single-select-option-id $doingOptionId
```

`SetIssueReady` reverses the labels and sets the `Ready` option. If changing the Project status fails after the label succeeds, immediately restore the original labels before throwing.

- [ ] **Step 5: Implement repository preflight**

Require `git`, `gh`, `codex`, `9router`, `wt.exe`, and `powershell.exe`. Run `gh auth status`. Confirm `git status --porcelain` is empty. Obtain `defaultBranchRef.name` from `gh repo view --json defaultBranchRef`, require the current branch to match, and run `git pull --ff-only` only when `-DryRun` is false.

- [ ] **Step 6: Implement 9router readiness**

Use `TcpClient.BeginConnect` with a 500 ms timeout instead of `Test-NetConnection`:

```powershell
function Test-TcpPort([string]$HostName, [int]$Port, [int]$TimeoutMs = 500) {
  $client = [Net.Sockets.TcpClient]::new()
  try {
    $result = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
    $client.EndConnect($result)
    return $true
  } catch { return $false } finally { $client.Dispose() }
}
```

If `127.0.0.1:20128` is closed, dry-run only logs the intended startup. A real run executes:

```powershell
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "9router" -WindowStyle Hidden
```

Poll once per second for 30 attempts, then throw `9router startup timed out after 30 seconds.` without changing the issue.

- [ ] **Step 7: Implement safe Codex TUI launch**

Encode the prompt before passing it through PowerShell so issue content cannot become shell syntax:

```powershell
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($prompt))
$command = "`$p=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$encoded')); codex --sandbox workspace-write --ask-for-approval on-request `$p"
Start-Process -FilePath "wt.exe" -ArgumentList @(
  "-d", (Get-Location).Path,
  "powershell.exe", "-NoExit", "-Command", $command
)
```

The launcher does not wait for the interactive TUI to exit. A successful `Start-Process` leaves the issue `codex-running`; a thrown launch error triggers the library rollback.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run the native PowerShell suite and `node --test tests/codex-kanban-config.test.mjs`.

Expected: PASS; no external state changes.

- [ ] **Step 9: Commit**

```bash
git add scripts/codex-kanban-launcher.ps1 scripts/test-codex-kanban-launcher.ps1 tests/codex-kanban-config.test.mjs
git commit -m "feat: add local Codex kanban launcher"
```

### Task 5: Installer and Scheduled Task

**Files:**
- Create: `scripts/install-codex-kanban-task.ps1`
- Modify: `scripts/test-codex-kanban-launcher.ps1`
- Modify: `tests/codex-kanban-config.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing installer tests**

Add source contracts for labels, four status names, a one-minute trigger, interactive logon, limited privileges, and `SupportsShouldProcess`:

```js
test("installer registers the scheduled task safely", () => {
  const source = read("scripts/install-codex-kanban-task.ps1");
  for (const value of ["codex-ready", "codex-running", "Backlog", "Ready", "Doing", "Done"]) {
    assert.match(source, new RegExp(value));
  }
  assert.match(source, /SupportsShouldProcess/);
  assert.match(source, /New-TimeSpan -Minutes 1/);
  assert.match(source, /LogonType Interactive/);
  assert.match(source, /RunLevel Limited/);
});
```

Add native tests for the Scheduled Task argument builder, including a repository path containing spaces.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL because the installer does not exist.

- [ ] **Step 3: Implement validation and idempotent labels**

Use this interface:

```powershell
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$ProjectOwner,
  [Parameter(Mandatory)][int]$ProjectNumber,
  [string]$TaskName = "NurusSunnahHub Codex Kanban"
)
```

Before mutations, require commands, run `gh auth status`, read the Project and Status field, and require exactly named `Backlog`, `Ready`, `Doing`, and `Done`. When project access fails, print `gh auth refresh -s project` as the remediation.

After validation, create/update labels with `gh label create ... --force`:

```text
bug            D73A4A
feature        0E8A16
codex-ready    1D76DB
codex-running  FBCA04
```

- [ ] **Step 4: Register the Scheduled Task**

Build a fully quoted absolute launcher path and register:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) -RepetitionInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal `
  -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Principal $principal -Description "Open one local Codex session for the first codex-ready issue." -Force
```

Guard label and task mutations with `$PSCmdlet.ShouldProcess`, so `-WhatIf` performs validation only.

- [ ] **Step 5: Add the focused package command**

Add to `package.json`:

```json
"test:codex-kanban": "node --test tests/codex-kanban-config.test.mjs"
```

- [ ] **Step 6: Run tests and prerequisite dry-run**

Run: `npm run test:codex-kanban`

Expected: PASS.

Run the installer with `-ProjectOwner yasirabd -ProjectNumber 1 -WhatIf`.

Expected in the current machine state: a clear `gh` prerequisite error and no Scheduled Task. The value `1` is test input only, not the production Project number.

- [ ] **Step 7: Commit**

```bash
git add scripts/install-codex-kanban-task.ps1 scripts/test-codex-kanban-launcher.ps1 tests/codex-kanban-config.test.mjs package.json
git commit -m "feat: install Codex kanban scheduled task"
```

### Task 6: Setup and Recovery Guide

**Files:**
- Create: `docs/codex-kanban.md`
- Modify: `tests/codex-kanban-config.test.mjs`

- [ ] **Step 1: Add a failing documentation test**

Require the guide to contain `winget install --id GitHub.cli`, `gh auth refresh -s project`, the four statuses, `codex-ready`, `-DryRun`, `codex resume --last`, and `Unregister-ScheduledTask`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:codex-kanban`

Expected: FAIL because the guide does not exist.

- [ ] **Step 3: Write the operator guide**

Document this exact sequence:

1. install GitHub CLI with `winget install --id GitHub.cli`;
2. authenticate with `gh auth login` and `gh auth refresh -s project`;
3. create a personal Project with `Backlog`, `Ready`, `Doing`, and `Done`;
4. enable built-in auto-add and closed-item-to-Done workflows;
5. run the installer with the actual Project number and `-WhatIf`;
6. run the launcher with the same values and `-DryRun`;
7. install the Scheduled Task for real;
8. test one disposable issue;
9. recover with `codex resume --last`, restore `codex-ready`, or move the issue to `Backlog`;
10. uninstall with `Unregister-ScheduledTask -TaskName "NurusSunnahHub Codex Kanban" -Confirm:$false`.

State that GitHub Free covers this local workflow and 9router/model usage is separate.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm run test:codex-kanban`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/codex-kanban.md tests/codex-kanban-config.test.mjs
git commit -m "docs: explain Codex kanban setup"
```

### Task 7: Full Verification and Controlled Activation

**Files:**
- Modify only already-scoped files if verification reveals a defect.

- [ ] **Step 1: Run native PowerShell tests**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-codex-kanban-launcher.ps1`

Expected: all assertions pass with no external changes.

- [ ] **Step 2: Run focused and full repository tests**

Run: `npm run test:codex-kanban`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Run static and build verification**

Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` separately.

Expected: every command exits 0; diff check has no output.

- [ ] **Step 4: Install GitHub CLI only with explicit approval if still missing**

Run: `winget install --id GitHub.cli`

Expected: `gh --version` succeeds. This networked system-level change requires the environment approval mechanism.

- [ ] **Step 5: Authenticate and identify the real Project number**

Run:

```powershell
gh auth login
gh auth refresh -s project
gh project list --owner yasirabd
```

Use the actual numeric Project number returned here. Do not reuse the test value `1` unless it is genuinely the target.

- [ ] **Step 6: Validate without mutation**

Run installer `-WhatIf` and launcher `-DryRun` with `-ProjectOwner yasirabd` and the actual Project number.

Expected: dependencies, auth, statuses, repository, and 9router readiness validate; no label, task, process, terminal, or repository changes occur.

- [ ] **Step 7: Register the task with approval**

Run the installer without `-WhatIf` using the actual Project number.

Expected: four labels exist and `NurusSunnahHub Codex Kanban` is registered for the current interactive user every minute.

- [ ] **Step 8: Perform one controlled issue test**

Create a disposable issue, add it to the Project, move it to `Ready`, and add `codex-ready`. Verify one 9router listener, one terminal, transition to `Doing`/`codex-running`, the correct prompt, no automatic rerun after closing the TUI, and successful `codex resume --last` recovery.

- [ ] **Step 9: Commit verification fixes only when needed**

If verification required source changes, commit only those scoped fixes with `git commit -m "fix: complete Codex kanban verification"`. Skip this step when the tree is clean.
