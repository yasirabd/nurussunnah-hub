# Codex Kanban Terminal Launch Fix Design

## Goal

Make `npm run codex:kanban` reliably start 9router and an interactive Codex CLI
session on Windows when both commands are installed as PowerShell scripts by
npm.

The GitHub Project trigger, one-active-issue rule, repository safety checks,
Codex sandbox flags, and issue rollback behavior remain unchanged.

## Root Cause

The launcher currently passes a raw PowerShell script to `wt.exe` through
`Start-Process -ArgumentList`. The script contains a semicolon between prompt
decoding and the Codex invocation. Because the complete script is not preserved
as one quoted argument, Windows Terminal interprets the text after the semicolon
as another terminal command and tries to launch this literal command directly:

```text
codex --sandbox workspace-write --ask-for-approval on-request $p
```

Windows then reports `0x80070002` because the local installation exposes
`codex.ps1`, not a directly launchable `codex.exe` at that boundary.

The same environment exposes `9router.ps1`, while `cmd.exe /c 9router` cannot
resolve it. That path is currently hidden when port `20128` is already open but
would fail when the launcher needs to start 9router itself.

## Selected Approach

Use PowerShell `-EncodedCommand` at both process boundaries.

The launcher will resolve `codex` and `9router` with PowerShell's `Get-Command`,
build a PowerShell script that invokes the resolved command path, encode the
complete script as UTF-16LE Base64, and pass only the encoded token to the child
PowerShell process. The Base64 token contains no shell separators, so
`Start-Process` and `wt.exe` cannot split the script at its semicolon or spaces.

Alternatives rejected:

- A temporary `.ps1` file adds lifecycle and cleanup behavior for no benefit.
- Opening legacy PowerShell directly avoids `wt.exe` but changes the agreed
  interactive terminal experience.
- Adding quotes around the raw `-Command` value remains fragile across
  `Start-Process`, `wt.exe`, and PowerShell parsing layers.

## Components

### Command Resolution

A small library function will resolve a required command to a concrete path.
It will accept installed applications and external PowerShell scripts and fail
with the existing actionable dependency error when no usable path exists.

The production launcher will resolve dependencies once during preflight and use
the resolved `codex` and `9router` paths when constructing child commands.

### PowerShell Encoding

A pure library function will encode a complete PowerShell script using the
UTF-16LE format required by Windows PowerShell `-EncodedCommand`. Keeping this
function in `codex-kanban-lib.ps1` makes round-trip behavior testable without
opening a terminal.

### 9router Startup

When port `127.0.0.1:20128` is closed, the launcher will start hidden
`powershell.exe` with `-EncodedCommand`. The decoded script will invoke the
resolved 9router path. The existing 30-second readiness loop remains the source
of truth for successful startup.

### Codex Terminal Startup

The launcher will continue opening Windows Terminal in the repository root.
Its child command will be:

```text
powershell.exe -NoExit -EncodedCommand <token>
```

The decoded token will reconstruct the issue prompt, invoke the resolved Codex
command path, and preserve these required flags:

```text
--sandbox workspace-write --ask-for-approval on-request
```

The prompt remains Base64-embedded inside the child script so issue text cannot
be reinterpreted as PowerShell syntax.

## Runtime Flow

1. Validate Git, GitHub CLI, Codex, 9router, Windows Terminal, and PowerShell.
2. Reject an existing `codex-running` issue or an ineligible repository.
3. Select the first `Ready` issue with label `codex-ready`.
4. Start the resolved 9router script through encoded PowerShell when its port is
   closed, then wait for port readiness.
5. Move the issue to `Doing` and replace `codex-ready` with `codex-running`.
6. Open Windows Terminal with one encoded child PowerShell command.
7. The child PowerShell invokes the resolved Codex script with the issue prompt.

## Error Handling

- Missing or unusable command paths fail before any issue mutation.
- 9router startup timeout leaves the issue in `Ready` because mutation has not
  occurred yet.
- A synchronous Windows Terminal startup failure restores the issue label and
  Project status to `Ready` through the existing rollback path.
- The launcher will not log the decoded issue prompt.
- Existing recovery behavior for a terminal closed after successful startup is
  unchanged: the operator can use `codex resume --last` or reset the issue.

## Testing

Implementation follows test-driven development:

1. Add a failing round-trip test for UTF-16LE PowerShell command encoding.
2. Add a failing regression test proving Windows Terminal arguments use
   `-EncodedCommand`, do not use raw `-Command`, and decode to one Codex script
   containing the required safety flags.
3. Add a failing test proving 9router startup is constructed for PowerShell and
   the resolved script path rather than `cmd.exe /c 9router`.
4. Implement the smallest launcher and library changes that satisfy those tests.
5. Run the native PowerShell tests, the Codex Kanban contract tests, and the full
   repository test suite.
6. Perform a launcher dry-run to verify GitHub and repository preflight without
   mutating the board or opening a terminal.

## Out Of Scope

- Changing GitHub Project statuses, labels, or queue selection.
- Starting more than one Codex issue.
- Automatically merging, deploying, or running migrations.
- Replacing Windows Terminal or changing Codex approval and sandbox settings.
