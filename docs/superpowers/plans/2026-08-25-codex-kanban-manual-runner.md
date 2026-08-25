# Codex Kanban Manual Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-minute Scheduled Task polling with the explicit `npm run codex:kanban` command and remove the legacy task safely.

**Architecture:** Keep the existing launcher and its queue, mutex, 9router, rollback, and Codex TUI behavior unchanged. Convert the installer into idempotent setup/migration logic that validates GitHub, synchronizes labels, and unregisters the legacy task; expose the configured launcher through a repository-local npm script.

**Tech Stack:** PowerShell 5.1+, Windows Task Scheduler cmdlets, GitHub CLI, npm scripts, Node.js built-in test runner.

---

## File Map

- Modify `package.json`: add the manual `codex:kanban` command.
- Modify `scripts/install-codex-kanban-task.ps1`: remove recurring task registration and unregister the legacy task.
- Modify `scripts/codex-kanban-lib.ps1`: remove the unused Scheduled Task argument builder.
- Modify `scripts/test-codex-kanban-launcher.ps1`: remove tests for the deleted argument builder.
- Modify `tests/codex-kanban-config.test.mjs`: enforce manual-runner and no-polling contracts.
- Modify `docs/codex-kanban.md`: document setup migration, manual execution, and recovery.

### Task 1: Manual Command and Legacy Task Migration

**Files:**
- Modify: `tests/codex-kanban-config.test.mjs`
- Modify: `package.json`
- Modify: `scripts/install-codex-kanban-task.ps1`
- Modify: `scripts/codex-kanban-lib.ps1`
- Modify: `scripts/test-codex-kanban-launcher.ps1`

- [ ] **Step 1: Create a feature branch**

Run:

```powershell
git switch -c fix/codex-kanban-manual-runner
```

Expected: Git reports a new branch based on `main`.

- [ ] **Step 2: Write the failing manual-runner contract test**

Replace the existing installer test in `tests/codex-kanban-config.test.mjs` and add a package-script assertion:

```js
test("Codex kanban is invoked manually with the configured project", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(
    packageJson.scripts["codex:kanban"],
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/codex-kanban-launcher.ps1 -ProjectOwner yasirabd -ProjectNumber 2",
  );
});

test("installer removes legacy polling instead of registering it", () => {
  const installer = read("scripts/install-codex-kanban-task.ps1");
  const library = read("scripts/codex-kanban-lib.ps1");
  for (const value of ["codex-ready", "codex-running", "Backlog", "Ready", "Doing", "Done"]) {
    assert.match(installer, new RegExp(value));
  }
  assert.match(installer, /SupportsShouldProcess/);
  assert.match(installer, /Get-ScheduledTask/);
  assert.match(installer, /Unregister-ScheduledTask/);
  assert.doesNotMatch(installer, /Register-ScheduledTask|New-ScheduledTaskAction|New-ScheduledTaskTrigger|New-ScheduledTaskPrincipal|New-TimeSpan -Minutes 1/);
  assert.doesNotMatch(library, /function New-ScheduledTaskArgumentString/);
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
node --test --test-name-pattern="manually|legacy polling" tests/codex-kanban-config.test.mjs
```

Expected: FAIL because `codex:kanban` is missing, the installer still registers a recurring task, and the old helper still exists.

- [ ] **Step 4: Add the manual npm command**

Add this entry to `package.json` under `scripts`:

```json
"codex:kanban": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/codex-kanban-launcher.ps1 -ProjectOwner yasirabd -ProjectNumber 2"
```

- [ ] **Step 5: Convert the installer to setup and migration behavior**

In `scripts/install-codex-kanban-task.ps1`, keep the existing parameters for backward compatibility, but change prerequisites to:

```powershell
foreach ($commandName in @(
  "git", "gh", "codex", "9router", "powershell.exe",
  "Get-ScheduledTask", "Unregister-ScheduledTask"
)) {
  Assert-CommandAvailable $commandName
}
```

Delete the `$launcherPath`, `$arguments`, `$action`, `$trigger`, `$principal`, and `Register-ScheduledTask` block. Replace it with:

```powershell
$legacyTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $legacyTask -and $PSCmdlet.ShouldProcess("Scheduled Task '$TaskName'", "Unregister legacy polling")) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Write-Output "Codex kanban manual setup validation completed. Run: npm run codex:kanban"
```

This preserves `-WhatIf`: GitHub labels and legacy-task removal remain guarded by `ShouldProcess`.

- [ ] **Step 6: Remove dead Scheduled Task helper code**

Delete `New-ScheduledTaskArgumentString` from `scripts/codex-kanban-lib.ps1`:

```powershell
function New-ScheduledTaskArgumentString {
  param(
    [Parameter(Mandatory)][string]$LauncherPath,
    [Parameter(Mandatory)][string]$ProjectOwner,
    [Parameter(Mandatory)][int]$ProjectNumber
  )

  if ($LauncherPath.Contains('"') -or $ProjectOwner.Contains('"')) {
    throw "Scheduled Task arguments cannot contain quote characters."
  }

  return "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`" -ProjectOwner `"$ProjectOwner`" -ProjectNumber $ProjectNumber"
}
```

Delete the corresponding `$scheduledArguments` assertions at the end of `scripts/test-codex-kanban-launcher.ps1`.

- [ ] **Step 7: Run focused and native tests and verify GREEN**

Run:

```powershell
node --test --test-name-pattern="manually|legacy polling" tests/codex-kanban-config.test.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-codex-kanban-launcher.ps1
npm run test:codex-kanban
```

Expected: all commands exit `0`; the native PowerShell suite reports all assertions passed.

- [ ] **Step 8: Commit the manual runner implementation**

```powershell
git add package.json scripts/install-codex-kanban-task.ps1 scripts/codex-kanban-lib.ps1 scripts/test-codex-kanban-launcher.ps1 tests/codex-kanban-config.test.mjs
git commit -m "fix: run Codex kanban only on demand"
```

### Task 2: Manual Operator Documentation

**Files:**
- Modify: `tests/codex-kanban-config.test.mjs`
- Modify: `docs/codex-kanban.md`

- [ ] **Step 1: Write the failing documentation contract**

Replace the current documentation test with:

```js
test("Codex kanban guide documents manual execution and recovery", () => {
  const source = read("docs/codex-kanban.md");
  assert.match(source, /winget install --id GitHub\.cli/);
  assert.match(source, /gh auth refresh -s project/);
  assert.match(source, /Backlog.*Ready.*Doing.*Done/s);
  assert.match(source, /codex-ready/);
  assert.match(source, /npm run codex:kanban/);
  assert.match(source, /Unregister-ScheduledTask/);
  assert.match(source, /codex resume --last/);
  assert.doesNotMatch(source, /Tunggu maksimal satu menit|berjalan setiap satu menit|Instal Scheduled Task/);
});
```

- [ ] **Step 2: Run the documentation test and verify RED**

Run:

```powershell
node --test --test-name-pattern="manual execution" tests/codex-kanban-config.test.mjs
```

Expected: FAIL because the guide still instructs the operator to install and wait for recurring polling.

- [ ] **Step 3: Rewrite setup and execution sections for manual mode**

Update `docs/codex-kanban.md` so the operational sequence is:

````markdown
## 6. Aktifkan Mode Manual

Jalankan setup tanpa `-WhatIf` untuk menyinkronkan label dan menghapus Scheduled Task lama jika masih ada:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber 2
```

Tidak ada proses polling yang berjalan setelah setup selesai.

## 7. Menjalankan Codex Saat Dibutuhkan

1. Pindahkan satu issue ke `Ready`.
2. Tambahkan label `codex-ready`.
3. Buka PowerShell di root repository.
4. Jalankan:

```powershell
npm run codex:kanban
```

Jika tidak ada issue yang memenuhi syarat, launcher menampilkan `Idle` dan selesai.
````

Keep the existing safety, PR review, and recovery sections, but remove all instructions to wait for a one-minute Scheduled Task. Explain that Windows Terminal opens only after the manual command selects an eligible issue.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm run test:codex-kanban
```

Expected: `6/6` configuration tests pass.

- [ ] **Step 5: Commit documentation**

```powershell
git add docs/codex-kanban.md tests/codex-kanban-config.test.mjs
git commit -m "docs: explain manual Codex kanban command"
```

### Task 3: Runtime Migration and Full Verification

**Files:**
- Modify only scoped files if verification reveals a defect.

- [ ] **Step 1: Validate setup without mutation**

Ensure the current shell can find GitHub CLI, then run:

```powershell
$env:Path = "D:\Program Files\GitHub CLI;" + $env:Path
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber 2 `
  -WhatIf
```

Expected: label synchronization and legacy task removal are reported as `What if`; no state changes occur.

- [ ] **Step 2: Remove the active legacy Scheduled Task**

Run the same setup without `-WhatIf`:

```powershell
$env:Path = "D:\Program Files\GitHub CLI;" + $env:Path
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\install-codex-kanban-task.ps1 `
  -ProjectOwner yasirabd `
  -ProjectNumber 2
```

Expected: labels remain synchronized and `NurusSunnahHub Codex Kanban` is unregistered.

- [ ] **Step 3: Verify the recurring task is absent**

Run:

```powershell
$task = Get-ScheduledTask -TaskName "NurusSunnahHub Codex Kanban" -ErrorAction SilentlyContinue
if ($null -ne $task) { throw "Legacy Scheduled Task still exists." }
```

Expected: exit `0` with no PowerShell window reopening automatically after one minute.

- [ ] **Step 4: Validate the manual command without starting Codex**

Run:

```powershell
$env:Path = "D:\Program Files\GitHub CLI;" + $env:Path
npm run codex:kanban -- -DryRun
```

Expected: the command exits `0` with `Idle` when no ready item exists, or `DryRun` when an eligible issue exists; it does not mutate labels/statuses or open Windows Terminal.

- [ ] **Step 5: Run full verification**

Run separately:

```powershell
npm test
npx tsc --noEmit
$env:NEXT_TELEMETRY_DISABLED = "1"
npm run build
git diff --check
git status --short --branch
```

Expected: `187/187` repository tests pass, TypeScript and build exit `0`, diff check is clean, and only intended commits are present. Run `npm run lint` and record the known unrelated baseline errors without modifying those files.

- [ ] **Step 6: Commit verification fixes only if needed**

If scoped fixes were required:

```powershell
git add package.json scripts/install-codex-kanban-task.ps1 scripts/codex-kanban-lib.ps1 scripts/test-codex-kanban-launcher.ps1 tests/codex-kanban-config.test.mjs docs/codex-kanban.md
git commit -m "fix: complete manual Codex kanban migration"
```

Skip this step when the tree is clean.
