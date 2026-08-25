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
