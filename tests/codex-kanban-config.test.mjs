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
  assert.match(source, /Local\\NurusSunnahHubCodexKanban/);
  assert.match(source, /Set-Location.*Split-Path/s);
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
