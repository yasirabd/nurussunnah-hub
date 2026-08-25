# Codex Kanban Terminal Launch Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the manual Kanban launcher reliably start npm-installed `9router.ps1` and `codex.ps1` without Windows Terminal splitting the Codex command.

**Architecture:** Add pure PowerShell helpers that resolve external command paths, construct safely quoted invocation scripts, and encode complete scripts for `powershell.exe -EncodedCommand`. Use those helpers at the hidden 9router process boundary and the interactive Windows Terminal boundary while preserving the existing queue, safety, and rollback flow.

**Tech Stack:** Windows PowerShell 5.1, Windows Terminal CLI, Node.js test runner, GitHub CLI.

---

### Task 1: Add failing command-encoding regression tests

**Files:**
- Modify: `scripts/test-codex-kanban-launcher.ps1`

- [ ] **Step 1: Add assertions for command resolution and UTF-16LE round trips**

Append tests that define a known script path, request an encoded child argument list, decode its final token, and require the original script to survive exactly:

```powershell
$knownPowerShell = (Get-Command powershell.exe).Source
Assert-Equal $knownPowerShell (Resolve-CodexCommandPath "powershell.exe") "external command path"
Assert-Throws { Resolve-CodexCommandPath "missing-codex-command-for-test" } "is not available in PATH" "missing external command"

$childScript = "`$value = 'one; two'; Write-Output `$value"
$encodedArguments = @(New-EncodedPowerShellArguments $childScript)
$encodedIndex = [Array]::IndexOf($encodedArguments, "-EncodedCommand")
Assert-True ($encodedIndex -ge 0) "encoded arguments select EncodedCommand"
$decodedScript = [Text.Encoding]::Unicode.GetString(
  [Convert]::FromBase64String($encodedArguments[$encodedIndex + 1])
)
Assert-Equal $childScript $decodedScript "encoded command round trip"
```

- [ ] **Step 2: Replace the old terminal-command-only assertions with boundary assertions**

Require a concrete npm-style Codex path, one encoded Windows Terminal command, no raw `-Command`, and a decoded script that still contains the safety flags and prompt decoder:

```powershell
$codexPath = "C:\Users\Example User\AppData\Roaming\npm\codex.ps1"
$terminalArguments = @(
  New-CodexTerminalArguments "C:\repo path" "Prompt with 'quotes' and `$variables" $codexPath
)
Assert-Equal "-d" $terminalArguments[0] "terminal working-directory switch"
Assert-Equal "C:\repo path" $terminalArguments[1] "terminal working directory"
Assert-True (-not $terminalArguments.Contains("-Command")) "terminal avoids raw Command"
$terminalEncodedIndex = [Array]::IndexOf($terminalArguments, "-EncodedCommand")
Assert-True ($terminalEncodedIndex -ge 0) "terminal uses EncodedCommand"
$decodedTerminalCommand = [Text.Encoding]::Unicode.GetString(
  [Convert]::FromBase64String($terminalArguments[$terminalEncodedIndex + 1])
)
Assert-True ($decodedTerminalCommand.Contains("FromBase64String")) "terminal command decodes prompt"
Assert-True ($decodedTerminalCommand.Contains("& 'C:\Users\Example User\AppData\Roaming\npm\codex.ps1'")) "terminal invokes resolved codex path"
Assert-True ($decodedTerminalCommand.Contains("--sandbox workspace-write")) "terminal command uses workspace sandbox"
Assert-True ($decodedTerminalCommand.Contains("--ask-for-approval on-request")) "terminal command asks for approval"
Assert-True (-not $decodedTerminalCommand.Contains("Prompt with")) "terminal command hides raw prompt"
```

- [ ] **Step 3: Add the 9router process-boundary regression test**

```powershell
$routerPath = "C:\Users\Example User\AppData\Roaming\npm\9router.ps1"
$routerArguments = @(New-NineRouterArguments $routerPath)
Assert-True (-not $routerArguments.Contains("/c")) "router avoids cmd shell"
$routerEncodedIndex = [Array]::IndexOf($routerArguments, "-EncodedCommand")
$decodedRouterCommand = [Text.Encoding]::Unicode.GetString(
  [Convert]::FromBase64String($routerArguments[$routerEncodedIndex + 1])
)
Assert-Equal "& 'C:\Users\Example User\AppData\Roaming\npm\9router.ps1'" $decodedRouterCommand "router invokes resolved path"
```

- [ ] **Step 4: Run the native test and verify RED**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-codex-kanban-launcher.ps1
```

Expected: FAIL because `Resolve-CodexCommandPath`, `New-EncodedPowerShellArguments`, `New-CodexTerminalArguments`, and `New-NineRouterArguments` do not exist.

### Task 2: Implement encoded process-boundary helpers

**Files:**
- Modify: `scripts/codex-kanban-lib.ps1`
- Test: `scripts/test-codex-kanban-launcher.ps1`

- [ ] **Step 1: Add command path resolution**

Add a helper that returns a concrete path and rejects aliases, functions, or missing commands:

```powershell
function Resolve-CodexCommandPath {
  param([Parameter(Mandatory)][string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $command -or [string]::IsNullOrWhiteSpace([string]$command.Path)) {
    throw "Required command '$Name' is not available in PATH."
  }

  return [string]$command.Path
}
```

- [ ] **Step 2: Add safe PowerShell literal and encoding helpers**

```powershell
function ConvertTo-PowerShellSingleQuotedLiteral {
  param([Parameter(Mandatory)][string]$Value)

  return "'$($Value.Replace("'", "''"))'"
}

function New-EncodedPowerShellArguments {
  param(
    [Parameter(Mandatory)][string]$Command,
    [switch]$NoExit
  )

  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
  $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass")
  if ($NoExit) {
    $arguments += "-NoExit"
  }
  $arguments += @("-EncodedCommand", $encoded)
  return $arguments
}
```

- [ ] **Step 3: Construct the encoded 9router and Codex boundaries**

Replace `New-CodexTerminalCommand` and add argument builders:

```powershell
function New-CodexTerminalCommand {
  param(
    [Parameter(Mandatory)][string]$Prompt,
    [Parameter(Mandatory)][string]$CodexPath
  )

  $encodedPrompt = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Prompt))
  $codexLiteral = ConvertTo-PowerShellSingleQuotedLiteral $CodexPath
  return "`$p=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$encodedPrompt')); & $codexLiteral --sandbox workspace-write --ask-for-approval on-request `$p"
}

function New-CodexTerminalArguments {
  param(
    [Parameter(Mandatory)][string]$WorkingDirectory,
    [Parameter(Mandatory)][string]$Prompt,
    [Parameter(Mandatory)][string]$CodexPath
  )

  $childArguments = @(New-EncodedPowerShellArguments (New-CodexTerminalCommand $Prompt $CodexPath) -NoExit)
  return @("-d", $WorkingDirectory, "powershell.exe") + $childArguments
}

function New-NineRouterArguments {
  param([Parameter(Mandatory)][string]$NineRouterPath)

  $routerLiteral = ConvertTo-PowerShellSingleQuotedLiteral $NineRouterPath
  return @(New-EncodedPowerShellArguments "& $routerLiteral")
}
```

- [ ] **Step 4: Run the native test and verify GREEN**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-codex-kanban-launcher.ps1
```

Expected: all PowerShell assertions pass.

- [ ] **Step 5: Commit the tested helper behavior**

```powershell
git add scripts/codex-kanban-lib.ps1 scripts/test-codex-kanban-launcher.ps1
git commit -m "fix: encode Codex terminal commands"
```

### Task 3: Wire resolved scripts into the production launcher

**Files:**
- Modify: `scripts/codex-kanban-launcher.ps1`
- Modify: `tests/codex-kanban-config.test.mjs`
- Test: `scripts/test-codex-kanban-launcher.ps1`
- Test: `tests/codex-kanban-config.test.mjs`

- [ ] **Step 1: Add a failing production contract test**

Extend `production launcher keeps safety boundaries` with:

```javascript
assert.match(source, /Resolve-CodexCommandPath "9router"/);
assert.match(source, /Resolve-CodexCommandPath "codex"/);
assert.match(source, /New-NineRouterArguments/);
assert.match(source, /New-CodexTerminalArguments/);
assert.doesNotMatch(source, /cmd\.exe[\s\S]*?9router/);
assert.doesNotMatch(source, /"-Command", \$command/);
```

Remove the preceding contract assertion that requires `/cmd\.exe/`, because the
repaired launcher no longer uses Command Prompt to start 9router.

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```powershell
npm run test:codex-kanban
```

Expected: FAIL because the production launcher still uses `cmd.exe /c 9router` and raw `-Command`.

- [ ] **Step 3: Resolve and cache npm-installed command paths during preflight**

Add script state near the existing Project metadata cache:

```powershell
$script:CodexPath = $null
$script:NineRouterPath = $null
```

Update `AssertDependencies` so generic dependencies still use
`Assert-CommandAvailable`, then resolve the two npm scripts:

```powershell
foreach ($commandName in @("git", "gh", "wt.exe", "powershell.exe")) {
  Assert-CommandAvailable $commandName
}
$script:CodexPath = Resolve-CodexCommandPath "codex"
$script:NineRouterPath = Resolve-CodexCommandPath "9router"
Invoke-CheckedCommand "gh" @("auth", "status") | Out-Null
```

- [ ] **Step 4: Replace the 9router and Windows Terminal process arguments**

In `Ensure-NineRouter`, replace `cmd.exe /c 9router` with:

```powershell
$arguments = @(New-NineRouterArguments $script:NineRouterPath)
Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WindowStyle Hidden
```

Update the dry-run log to say that the resolved 9router PowerShell script would
be started.

In `Open-CodexTerminal`, replace raw `-Command` arguments with:

```powershell
$arguments = @(
  New-CodexTerminalArguments (Get-Location).Path $Prompt $script:CodexPath
)
Start-Process -FilePath "wt.exe" -ArgumentList $arguments
```

Keep the safety-flag assertion against the decoded source command before
starting Windows Terminal.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm run test:codex-kanban
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-codex-kanban-launcher.ps1
```

Expected: 6 Node contract tests pass and every native PowerShell assertion
passes.

- [ ] **Step 6: Commit the production wiring**

```powershell
git add scripts/codex-kanban-launcher.ps1 tests/codex-kanban-config.test.mjs
git commit -m "fix: launch npm scripts through PowerShell"
```

### Task 4: Document and verify the repaired workflow

**Files:**
- Modify: `docs/codex-kanban.md`
- Modify: `tests/codex-kanban-config.test.mjs`

- [ ] **Step 1: Add a failing documentation contract**

Require the operator guide to mention encoded PowerShell startup and the
`0x80070002` recovery symptom:

```javascript
assert.match(source, /EncodedCommand/);
assert.match(source, /0x80070002/);
```

- [ ] **Step 2: Run the contract test and verify RED**

Run `npm run test:codex-kanban`.

Expected: FAIL because the guide does not yet mention either term.

- [ ] **Step 3: Update the operator guide**

Document that npm-installed `9router.ps1` and `codex.ps1` are resolved by the
launcher and passed through `powershell.exe -EncodedCommand`. Add a recovery
note explaining that `0x80070002` from a version before this fix can leave the
issue in `Doing`/`codex-running`; the operator should restore `Ready` and
`codex-ready` once before retrying with the updated launcher.

- [ ] **Step 4: Run focused and full verification**

Run:

```powershell
npm run test:codex-kanban
npm test
npx tsc --noEmit
npm run build
npm run codex:kanban:dry-run
git diff --check
```

Expected:

- Codex Kanban contract tests pass.
- Full repository tests report zero failures.
- TypeScript exits `0`.
- Production build exits `0`.
- Dry-run exits without opening 9router or Windows Terminal; `Busy`, `Idle`, or
  `DryRun` is acceptable according to current board state.
- `git diff --check` exits `0`.

- [ ] **Step 5: Commit documentation and final regression contract**

```powershell
git add docs/codex-kanban.md tests/codex-kanban-config.test.mjs
git commit -m "docs: explain encoded Codex startup"
```
