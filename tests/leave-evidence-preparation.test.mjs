import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(
  "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
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

test("evidence size check compares against the correct sibling input", () => {
  // `bukti_izin` must be compared against the unit-head input and vice versa.
  const branch = form.match(
    /input\.name === "bukti_izin"\s*\?\s*(\w+)\.current\s*:\s*(\w+)\.current/
  );
  assert.ok(branch, "sibling-input selection branch not found");
  assert.equal(branch[1], "unitHeadEvidenceRef");
  assert.equal(branch[2], "leaveEvidenceRef");
});
