# Codex Kanban Manual Runner Design

## Goal

Replace the one-minute Windows Scheduled Task polling with an explicit repository command so PowerShell and Codex only start when the operator requests them.

## Operator Workflow

1. Create or update a GitHub issue.
2. Move the issue to `Ready` and add the `codex-ready` label.
3. Open PowerShell in the repository root.
4. Run `npm run codex:kanban`.
5. The launcher selects the first eligible issue, starts 9router when required, changes the issue to `Doing`/`codex-running`, and opens the interactive Codex CLI session.

If no eligible issue exists, the command logs `Idle` and exits without starting 9router or Codex.

## Repository Changes

- Add a `codex:kanban` script to `package.json` that invokes `scripts/codex-kanban-launcher.ps1` with owner `yasirabd` and Project number `2`.
- Change the installer into setup-only behavior: validate GitHub access and Project statuses, create the required labels, and remove any existing `NurusSunnahHub Codex Kanban` Scheduled Task.
- Remove Scheduled Task registration code and prerequisites from the installer.
- Update tests so they require the manual package command and reject recurring task registration.
- Update `docs/codex-kanban.md` to describe manual execution and removal of the legacy scheduled task.

## Runtime Boundaries

- The launcher behavior remains unchanged after manual invocation.
- 9router is only started when a queued issue is selected and port `20128` is closed.
- Windows Terminal is only opened when a queued issue is selected.
- Only one issue can be active because the existing mutex and `codex-running` guard remain in place.
- The workflow never auto-merges, deploys, migrates, or changes production data.

## Migration

Running the updated installer removes the existing recurring Scheduled Task if present. The operation is idempotent: repeated setup runs keep labels synchronized and leave the task absent.

The manual command must also be documented for direct use without rerunning setup:

```powershell
Unregister-ScheduledTask -TaskName "NurusSunnahHub Codex Kanban" -Confirm:$false
npm run codex:kanban
```

## Error Handling

- Missing `gh`, GitHub authentication, Project access, or required statuses fails setup with an actionable error.
- A dirty repository, non-default branch, unavailable 9router, or terminal launch failure continues to use the launcher's existing safety and rollback behavior.
- Removing an already absent Scheduled Task is treated as success.

## Verification

- Contract tests confirm `package.json` exposes `codex:kanban` with Project `2` and owner `yasirabd`.
- Installer tests confirm recurring Scheduled Task registration is absent and legacy task removal is supported.
- Existing PowerShell orchestration tests continue to pass.
- A setup dry-run performs no mutation.
- A manual launcher dry-run returns `Idle` on an empty queue.
- The Windows Scheduled Task no longer exists after migration.
