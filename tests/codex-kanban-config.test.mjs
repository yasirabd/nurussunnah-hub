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
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/test-codex-kanban-launcher.ps1",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("production launcher keeps safety boundaries", () => {
  const source = read("scripts/codex-kanban-launcher.ps1");
  const queueFunction = source.match(/function Get-ProjectQueueItems \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(queueFunction, "Get-ProjectQueueItems function must exist");
  assert.match(source, /Local\\NurusSunnahHubCodexKanban/);
  assert.match(source, /Set-Location.*Split-Path/s);
  assert.match(source, /git status --porcelain/);
  assert.match(source, /git pull --ff-only/);
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /20128/);
  assert.match(source, /9router/);
  assert.match(source, /-WindowStyle Hidden/);
  assert.match(source, /--sandbox workspace-write/);
  assert.match(source, /--ask-for-approval on-request/);
  assert.match(source, /Resolve-CodexCommandPath "9router"/);
  assert.match(source, /Resolve-CodexCommandPath "codex"/);
  assert.match(source, /New-NineRouterArguments/);
  assert.match(source, /New-CodexTerminalArguments/);
  assert.doesNotMatch(source, /cmd\.exe[\s\S]*?9router/);
  assert.doesNotMatch(source, /"-Command", \$command/);
  assert.doesNotMatch(queueFunction, /"--field"/);
  assert.doesNotMatch(source, /reset --hard|checkout --|git stash/);
});

test("Codex kanban is invoked manually with the configured project", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(
    packageJson.scripts["codex:kanban"],
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/codex-kanban-launcher.ps1 -ProjectOwner yasirabd -ProjectNumber 2",
  );
  assert.equal(
    packageJson.scripts["codex:kanban:dry-run"],
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/codex-kanban-launcher.ps1 -ProjectOwner yasirabd -ProjectNumber 2 -DryRun",
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

test("Codex kanban guide documents manual execution and recovery", () => {
  const source = read("docs/codex-kanban.md");
  assert.match(source, /winget install --id GitHub\.cli/);
  assert.match(source, /gh auth refresh -s project/);
  assert.match(source, /Backlog.*Ready.*Doing.*Done/s);
  assert.match(source, /codex-ready/);
  assert.match(source, /npm run codex:kanban/);
  assert.match(source, /npm run codex:kanban:dry-run/);
  assert.match(source, /Unregister-ScheduledTask/);
  assert.match(source, /codex resume --last/);
  assert.match(source, /EncodedCommand/);
  assert.match(source, /0x80070002/);
  assert.doesNotMatch(source, /Tunggu maksimal satu menit|berjalan setiap satu menit|Instal Scheduled Task/);
});
