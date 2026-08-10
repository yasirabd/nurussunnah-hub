import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(
  "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
  "utf8"
);
const action = readFileSync(
  "src/app/dashboard/leave-requests/actions.ts",
  "utf8"
);

test("evidence preparation reads the input before awaiting", () => {
  // React pools/nullifies `currentTarget` after an await, so the handler must
  // capture `event.target` (stable) rather than `event.currentTarget`.
  assert.doesNotMatch(
    form,
    /const input = event\.currentTarget/,
    "event.currentTarget is null after the first await — use event.target"
  );
  assert.match(form, /const input = event\.target/);
});

test("leave evidence enforces 5 MB for each file instead of a combined limit", () => {
  assert.match(form, /prepareEvidenceFiles\(selectedFiles, \{\s*maxFileBytes: EVIDENCE_MAX_FILE_BYTES/);
  assert.match(form, /Maksimal 5 MB per file/);
  assert.match(form, /Foto yang lebih besar akan diperkecil otomatis/);
  assert.doesNotMatch(form, /EVIDENCE_MAX_TOTAL_BYTES/);
  assert.doesNotMatch(form, /totalFileBytes/);
});

test("server rejects oversized leave evidence before persisting the request", () => {
  const validation = action.indexOf("validateEvidenceFileSizes(evidence);");
  const persist = action.indexOf('supabase.rpc("submit_leave_request"');

  assert.ok(validation >= 0, "server size validation is missing");
  assert.ok(validation < persist, "file sizes must be validated before persistence");
  assert.match(action, /EVIDENCE_MAX_FILE_BYTES/);
  assert.match(action, /melebihi batas 5 MB/);
});
