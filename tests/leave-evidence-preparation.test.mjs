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

test("leave evidence enforces 5 MB for its single photo", () => {
  assert.match(
    form,
    /prepareEvidenceFiles\(selectedFiles, \{\s*maxFileBytes: EVIDENCE_MAX_FILE_BYTES,\s*convertToJpeg: true,\s*allowOriginalOnDecodeFailure: true/
  );
  assert.match(form, /Maksimal 1 foto, 5 MB/);
  assert.match(form, /Foto yang lebih besar akan diperkecil otomatis/);
  assert.doesNotMatch(form, /EVIDENCE_MAX_TOTAL_BYTES/);
  assert.doesNotMatch(form, /totalFileBytes/);
});

test("leave evidence keeps prepared files outside the native file input", () => {
  assert.match(form, /unitHeadPreparedEvidenceRef/);
  assert.match(form, /leavePreparedEvidenceRef/);
  assert.match(form, /submitPreparedLeaveRequest/);
  assert.match(form, /applyPreparedLeaveEvidence\(formData/);
  assert.doesNotMatch(form, /replaceInputFiles/);
});

test("server rejects oversized leave evidence before persisting the request", () => {
  const validation = action.indexOf("validateSingleEvidenceImage");
  const persist = action.indexOf('supabase.rpc("submit_leave_request"');

  assert.ok(validation >= 0, "server size validation is missing");
  assert.ok(validation < persist, "file sizes must be validated before persistence");
  assert.match(action, /validateSingleEvidenceImage/);
});
